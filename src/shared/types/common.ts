/**
 * Common Types - FSD Phase 1 Completion
 * アプリケーション全体で使用される共通型定義
 */

import type { ReactNode } from 'react';

// Base utility types
export type NonNullable<T> = T extends null | undefined ? never : T;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Identity and versioning
export interface Identifiable {
  id: string;
}

export interface Timestamped {
  createdAt: string;
  updatedAt: string;
}

export interface Versioned {
  version: string;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Configuration and settings
export interface ConfigurationBase {
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Feature state patterns
export interface LoadingState<T = any> {
  isLoading: boolean;
  data: T | null;
  error: Error | null;
  lastUpdated: string | null;
}

export interface FeatureState<T = any> extends LoadingState<T> {
  isInitialized: boolean;
  isEnabled: boolean;
}

// Coordinates and positioning
export interface Position2D {
  x: number;
  y: number;
}

export interface Position3D extends Position2D {
  z: number;
}

export interface Rotation3D {
  pitch: number;
  yaw: number;
  roll: number;
}

export interface BoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

// Performance metrics
export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  cpuUsage: number;
  frameRate: number;
  timestamp: string;
}

// Feature capabilities
export interface FeatureCapabilities {
  canInterrupt: boolean;
  canPause: boolean;
  canQueue: boolean;
  maxConcurrent: number;
}

// Animation and timing
export interface TimingFunction {
  type: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier';
  values?: [number, number, number, number]; // for cubic-bezier
}

export interface AnimationConfig {
  duration: number;
  delay?: number;
  timing?: TimingFunction;
  loop?: boolean | number;
  autoReverse?: boolean;
}

// File and resource handling
export interface FileMetadata {
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: string;
}

export interface ResourceInfo extends FileMetadata {
  isLoaded: boolean;
  loadingProgress: number;
  dependencies?: string[];
}

// Error handling
export interface ErrorContext {
  component: string;
  action: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

export interface ErrorInfo extends ErrorContext {
  error: Error;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  retryCount?: number;
}

// Subscription and lifecycle
export interface Subscription {
  id: string;
  isActive: boolean;
  unsubscribe: () => void;
}

export interface LifecycleHooks {
  onInit?: () => void | Promise<void>;
  onStart?: () => void | Promise<void>;
  onStop?: () => void | Promise<void>;
  onDestroy?: () => void | Promise<void>;
  onError?: (error: Error) => void;
}

// Store patterns
export interface StoreActions<T> {
  reset: () => void;
  update: (partial: Partial<T>) => void;
  subscribe: (callback: (state: T) => void) => Subscription;
}

export interface Store<T> extends StoreActions<T> {
  getState: () => T;
  setState: (state: T | ((prev: T) => T)) => void;
}

// Component props patterns
export interface BaseComponentProps {
  className?: string;
  testId?: string;
  children?: ReactNode;
}

export interface InteractiveComponentProps extends BaseComponentProps {
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

// Form and input patterns
export interface FormFieldProps<T = any> extends BaseComponentProps {
  label?: string;
  placeholder?: string;
  value: T;
  onChange: (value: T) => void;
  error?: string;
  required?: boolean;
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

// Theme and styling
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  borderRadius: string;
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

// Development and debugging
export interface DebugInfo {
  component: string;
  props: Record<string, any>;
  state: Record<string, any>;
  renderCount: number;
  lastRender: string;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
  timestamp: string;
}

// Utility functions type definitions
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type NonEmptyArray<T> = [T, ...T[]];

// Constants for common values
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000,
} as const;

export const SCREEN_BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1440,
  WIDE: 1920,
} as const;

export const Z_INDEX = {
  DROPDOWN: 1000,
  MODAL: 2000,
  NOTIFICATION: 3000,
  TOOLTIP: 4000,
} as const;

// Type guards and utility functions
export const isValidPosition2D = (pos: any): pos is Position2D => {
  return typeof pos === 'object' && 
         typeof pos.x === 'number' && 
         typeof pos.y === 'number' &&
         !isNaN(pos.x) && !isNaN(pos.y);
};

export const isValidPosition3D = (pos: any): pos is Position3D => {
  return isValidPosition2D(pos) && 
         typeof pos.z === 'number' && 
         !isNaN(pos.z);
};

export const isLoadingState = <T>(state: any): state is LoadingState<T> => {
  return typeof state === 'object' &&
         typeof state.isLoading === 'boolean' &&
         typeof state.lastUpdated === 'string';
};

export const createEmptyLoadingState = <T>(): LoadingState<T> => ({
  isLoading: false,
  data: null,
  error: null,
  lastUpdated: null,
});

export const createInitialFeatureState = <T>(): FeatureState<T> => ({
  ...createEmptyLoadingState<T>(),
  isInitialized: false,
  isEnabled: true,
});