/**
 * Runtime Validation - FSD Phase 1 Completion
 * 実行時型検証とタイプセーフティ強化
 */

import { performance } from 'perf_hooks';

import { z } from 'zod';

import { 
  position2DSchema,
  position3DSchema,
  rotation3DSchema,
  animationConfigSchema,
  performanceMetricsSchema,
  featureStateSchema,
  appEventMapSchema,
  apiResponseSchema,
  errorInfoSchema,
  themeSchema,
} from './validation';

// Validation result types
export interface ValidationSuccess<T> {
  success: true;
  data: T;
  errors: null;
}

export interface ValidationFailure {
  success: false;
  data: null;
  errors: string[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// Core validation function
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): ValidationResult<T> {
  try {
    const parsed = schema.parse(data);
    return {
      success: true,
      data: parsed,
      errors: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => {
        const path = err.path.join('.');
        const contextStr = context ? ` (${context})` : '';
        return `${path}: ${err.message}${contextStr}`;
      });
      
      return {
        success: false,
        data: null,
        errors,
      };
    }
    
    return {
      success: false,
      data: null,
      errors: [error instanceof Error ? error.message : 'Unknown validation error'],
    };
  }
}

// Safe validation (returns null instead of throwing)
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T | null {
  const result = validateData(schema, data);
  return result.success ? result.data : null;
}

// Validation with default value
export function validateWithDefault<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  defaultValue: T
): T {
  const result = safeValidate(schema, data);
  return result !== null ? result : defaultValue;
}

// Async validation
export async function validateAsync<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): Promise<ValidationResult<T>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(validateData(schema, data, context));
    }, 0);
  });
}

// Validation decorators for development
export function validateInput<T>(schema: z.ZodSchema<T>) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      // Validate first argument
      if (args.length > 0) {
        const validation = validateData(schema, args[0], `${target.constructor.name}.${propertyName}`);
        if (!validation.success) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        args[0] = validation.data;
      }
      
      return method.apply(this, args);
    };
  };
}

// Specialized validators for common types
export const validators = {
  // Position validators
  position2D: (data: unknown) => validateData(position2DSchema, data, 'Position2D'),
  position3D: (data: unknown) => validateData(position3DSchema, data, 'Position3D'),
  rotation3D: (data: unknown) => validateData(rotation3DSchema, data, 'Rotation3D'),
  
  // Configuration validators
  animationConfig: (data: unknown) => validateData(animationConfigSchema, data, 'AnimationConfig'),
  
  // Performance validators
  performanceMetrics: (data: unknown) => validateData(performanceMetricsSchema, data, 'PerformanceMetrics'),
  
  // State validators
  featureState: (data: unknown) => validateData(featureStateSchema, data, 'FeatureState'),
  
  // Event validators
  appEvent: (data: unknown) => validateData(appEventMapSchema, data, 'AppEvent'),
  
  // API validators
  apiResponse: (data: unknown) => validateData(apiResponseSchema, data, 'ApiResponse'),
  
  // Error validators
  errorInfo: (data: unknown) => validateData(errorInfoSchema, data, 'ErrorInfo'),
  
  // Theme validators
  theme: (data: unknown) => validateData(themeSchema, data, 'Theme'),
};

// Safe accessors with validation
export class SafeAccessor<T> {
  private schema: z.ZodSchema<T>;
  private data: T;

  constructor(schema: z.ZodSchema<T>, data: unknown) {
    const validation = validateData(schema, data);
    if (!validation.success) {
      throw new Error(`Invalid data: ${validation.errors.join(', ')}`);
    }
    this.schema = schema;
    this.data = validation.data;
  }

  get(): T {
    return this.data;
  }

  update(newData: Partial<T>): SafeAccessor<T> {
    const merged = { ...this.data, ...newData };
    return new SafeAccessor(this.schema, merged);
  }

  validate(): ValidationResult<T> {
    return validateData(this.schema, this.data);
  }
}

// Type guard factory
export function createTypeGuard<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): data is T => {
    const result = safeValidate(schema, data);
    return result !== null;
  };
}

// Common type guards
export const isPosition2D = createTypeGuard(position2DSchema);
export const isPosition3D = createTypeGuard(position3DSchema);
export const isRotation3D = createTypeGuard(rotation3DSchema);
export const isAnimationConfig = createTypeGuard(animationConfigSchema);
export const isPerformanceMetrics = createTypeGuard(performanceMetricsSchema);
export const isFeatureState = createTypeGuard(featureStateSchema);
export const isAppEvent = createTypeGuard(appEventMapSchema);
export const isApiResponse = createTypeGuard(apiResponseSchema);
export const isErrorInfo = createTypeGuard(errorInfoSchema);
export const isTheme = createTypeGuard(themeSchema);

// Validation middleware for feature stores
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (config: any) => (set: any, get: any, api: any) => {
    const store = config(
      (partial: any) => {
        // Validate state updates
        if (typeof partial === 'function') {
          set((state: T) => {
            const newState = partial(state);
            const validation = validateData(schema, newState, 'Store Update');
            if (!validation.success) {
              console.warn('Store validation failed:', validation.errors);
              return state; // Don't update if validation fails
            }
            return validation.data;
          });
        } else {
          const validation = validateData(schema, partial, 'Store Partial Update');
          if (validation.success) {
            set(validation.data);
          } else {
            console.warn('Store validation failed:', validation.errors);
          }
        }
      },
      get,
      api
    );

    // Validate initial state
    const initialState = get();
    const validation = validateData(schema, initialState, 'Initial Store State');
    if (!validation.success) {
      console.warn('Initial store state validation failed:', validation.errors);
    }

    return store;
  };
}

// Performance-aware validation
export class PerformanceValidator {
  private validationCounts: Map<string, number> = new Map();
  private validationTimes: Map<string, number[]> = new Map();

  validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    context: string
  ): ValidationResult<T> {
    const start = performance.now();
    const result = validateData(schema, data, context);
    const end = performance.now();
    
    const duration = end - start;
    
    // Track performance metrics
    this.validationCounts.set(context, (this.validationCounts.get(context) || 0) + 1);
    
    const times = this.validationTimes.get(context) || [];
    times.push(duration);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
    
    this.validationTimes.set(context, times);
    
    // Warn about slow validations
    if (duration > 10) { // 10ms threshold
      console.warn(`Slow validation detected: ${context} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }

  getStats(context: string) {
    const count = this.validationCounts.get(context) || 0;
    const times = this.validationTimes.get(context) || [];
    
    if (times.length === 0) {
      return { count: 0, avgTime: 0, maxTime: 0, minTime: 0 };
    }
    
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    
    return { count, avgTime, maxTime, minTime };
  }

  getAllStats() {
    const allStats: Record<string, ReturnType<typeof this.getStats>> = {};
    
    for (const context of this.validationCounts.keys()) {
      allStats[context] = this.getStats(context);
    }
    
    return allStats;
  }
}

// Global performance validator instance
export const performanceValidator = new PerformanceValidator();

// Development helpers
export const devValidation = {
  // Enable/disable validation in development
  enabled: process.env.NODE_ENV === 'development',
  
  // Conditional validation
  validate<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
    if (!this.enabled) {
      return data as T;
    }
    
    const result = validateData(schema, data, context);
    if (!result.success) {
      throw new Error(`Development validation failed: ${result.errors.join(', ')}`);
    }
    
    return result.data;
  },
  
  // Assert-style validation
  assert<T>(schema: z.ZodSchema<T>, data: unknown, message?: string): asserts data is T {
    if (!this.enabled) return;
    
    const result = validateData(schema, data);
    if (!result.success) {
      throw new Error(message || `Assertion failed: ${result.errors.join(', ')}`);
    }
  },
  
  // Safe console logging with validation
  logValidated<T>(schema: z.ZodSchema<T>, data: unknown, label?: string) {
    if (!this.enabled) return;
    
    const result = validateData(schema, data);
    if (result.success) {
      console.log(label || 'Validated data:', result.data);
    } else {
      console.error(label || 'Invalid data:', result.errors, data);
    }
  },
};