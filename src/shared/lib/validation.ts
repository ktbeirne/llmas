/**
 * Validation Schemas - FSD Phase 1 Completion
 * Zodを使用した型安全なバリデーション
 */

import { z } from 'zod';

// Base validation schemas
export const position2DSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const position3DSchema = position2DSchema.extend({
  z: z.number().finite(),
});

export const rotation3DSchema = z.object({
  pitch: z.number().min(-Math.PI).max(Math.PI),
  yaw: z.number().min(-Math.PI).max(Math.PI),
  roll: z.number().min(-Math.PI).max(Math.PI),
});

export const boundingBoxSchema = z.object({
  top: z.number().min(0),
  left: z.number().min(0),
  width: z.number().min(0),
  height: z.number().min(0),
});

// Configuration schemas
export const configurationBaseSchema = z.object({
  enabled: z.boolean(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});

export const animationConfigSchema = z.object({
  duration: z.number().positive(),
  delay: z.number().min(0).optional(),
  timing: z.object({
    type: z.enum(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier']),
    values: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  }).optional(),
  loop: z.union([z.boolean(), z.number().int().positive()]).optional(),
  autoReverse: z.boolean().optional(),
});

// Performance and metrics schemas
export const performanceMetricsSchema = z.object({
  renderTime: z.number().min(0),
  memoryUsage: z.number().min(0),
  cpuUsage: z.number().min(0).max(100),
  frameRate: z.number().min(0).max(240),
  timestamp: z.string().datetime(),
});

// Feature state schemas
export const loadingStateSchema = z.object({
  isLoading: z.boolean(),
  data: z.any().nullable(),
  error: z.instanceof(Error).nullable(),
  lastUpdated: z.string().nullable(),
});

export const featureStateSchema = loadingStateSchema.extend({
  isInitialized: z.boolean(),
  isEnabled: z.boolean(),
});

// Event schemas (based on events.ts)
export const mouseFollowEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('mouse-follow:enabled'),
    payload: z.object({
      enabled: z.boolean(),
      sensitivity: z.number().min(0).max(2),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('mouse-follow:position-changed'),
    payload: z.object({
      x: z.number(),
      y: z.number(),
      timestamp: z.number(),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('mouse-follow:settings-changed'),
    payload: z.object({
      sensitivity: z.number().min(0).max(2),
      smoothing: z.number().min(0).max(1),
    }),
    timestamp: z.number(),
  }),
]);

export const vrmEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('vrm:expression-changed'),
    payload: z.object({
      expression: z.string().min(1),
      intensity: z.number().min(0).max(1).optional(),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('vrm:animation-started'),
    payload: z.object({
      name: z.string().min(1),
      isIdle: z.boolean(),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('vrm:animation-ended'),
    payload: z.object({
      name: z.string().min(1),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('vrm:model-loaded'),
    payload: z.object({
      modelPath: z.string().min(1),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('vrm:head-orientation-changed'),
    payload: rotation3DSchema,
    timestamp: z.number(),
  }),
]);

export const chatEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('chat:message-sent'),
    payload: z.object({
      message: z.string().min(1),
      timestamp: z.number(),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('chat:message-received'),
    payload: z.object({
      response: z.string().min(1),
      timestamp: z.number(),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('chat:conversation-started'),
    payload: z.object({
      sessionId: z.string().uuid(),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('chat:conversation-ended'),
    payload: z.object({
      sessionId: z.string().uuid(),
    }),
    timestamp: z.number(),
  }),
]);

export const settingsEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('settings:changed'),
    payload: z.object({
      category: z.string().min(1),
      key: z.string().min(1),
      value: z.any(),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('settings:saved'),
    payload: z.object({
      category: z.string().min(1),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('settings:loaded'),
    payload: z.object({
      category: z.string().min(1),
      data: z.any(),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('settings:reset'),
    payload: z.object({
      category: z.string().min(1),
    }),
    timestamp: z.number(),
  }),
]);

export const appEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('app:ready'),
    payload: z.object({
      version: z.string().min(1),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('app:error'),
    payload: z.object({
      error: z.instanceof(Error),
      context: z.string(),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('app:shutdown'),
    payload: z.object({
      reason: z.string(),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('app:window-focus-changed'),
    payload: z.object({
      windowId: z.string(),
      focused: z.boolean(),
    }),
    timestamp: z.number(),
  }),
]);

export const mcpEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('mcp:server-connected'),
    payload: z.object({
      serverId: z.string().uuid(),
      serverName: z.string().min(1),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('mcp:server-disconnected'),
    payload: z.object({
      serverId: z.string().uuid(),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('mcp:tool-executed'),
    payload: z.object({
      toolId: z.string(),
      result: z.any(),
    }),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('mcp:tool-error'),
    payload: z.object({
      toolId: z.string(),
      error: z.instanceof(Error),
    }),
    timestamp: z.number(),
  }),
]);

// Combined event schema
export const appEventMapSchema = z.union([
  mouseFollowEventSchema,
  vrmEventSchema,
  chatEventSchema,
  settingsEventSchema,
  appEventSchema,
  mcpEventSchema,
]);

// API response schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  timestamp: z.string().datetime(),
});

export const paginatedResponseSchema = apiResponseSchema.extend({
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

// Error handling schemas
export const errorContextSchema = z.object({
  component: z.string().min(1),
  action: z.string().min(1),
  timestamp: z.string().datetime(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

export const errorInfoSchema = errorContextSchema.extend({
  error: z.instanceof(Error),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  recoverable: z.boolean(),
  retryCount: z.number().int().min(0).optional(),
});

// File and resource schemas
export const fileMetadataSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  size: z.number().int().min(0),
  type: z.string().min(1),
  lastModified: z.string().datetime(),
});

export const resourceInfoSchema = fileMetadataSchema.extend({
  isLoaded: z.boolean(),
  loadingProgress: z.number().min(0).max(1),
  dependencies: z.array(z.string()).optional(),
});

// Form validation schemas
export const selectOptionSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
  label: z.string().min(1),
  disabled: z.boolean().optional(),
});

// Theme schemas
export const themeColorsSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  surface: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  text: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  textSecondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  border: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  error: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  warning: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  success: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  info: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const themeSpacingSchema = z.object({
  xs: z.string(),
  sm: z.string(),
  md: z.string(),
  lg: z.string(),
  xl: z.string(),
});

export const themeSchema = z.object({
  name: z.string().min(1),
  colors: themeColorsSchema,
  spacing: themeSpacingSchema,
  borderRadius: z.string(),
  shadows: z.object({
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
  }),
});

// Export type inference helpers
export type Position2D = z.infer<typeof position2DSchema>;
export type Position3D = z.infer<typeof position3DSchema>;
export type Rotation3D = z.infer<typeof rotation3DSchema>;
export type BoundingBox = z.infer<typeof boundingBoxSchema>;
export type AnimationConfig = z.infer<typeof animationConfigSchema>;
export type PerformanceMetrics = z.infer<typeof performanceMetricsSchema>;
export type LoadingState = z.infer<typeof loadingStateSchema>;
export type FeatureState = z.infer<typeof featureStateSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;
export type ErrorInfo = z.infer<typeof errorInfoSchema>;
export type Theme = z.infer<typeof themeSchema>;