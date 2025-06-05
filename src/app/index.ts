/**
 * App Layer - Public API
 * FSD Phase 3: アプリケーション層の公開インターフェース
 */

// Providers
export * from './providers';

// App metadata
export const appMeta = {
  name: 'llmdesktopmascot',
  version: '1.0.0',
  description: 'AI-powered desktop mascot with VRM support',
  architecture: 'Feature-Sliced Design (FSD)',
  performance: {
    lazyLoading: true,
    codesplitting: true,
    memoryOptimization: true,
    renderOptimization: true,
  },
  features: [
    'vrm-control',
    'mouse-follow',
    'chat',
    'settings',
    'animation',
    'mcp-integration',
  ],
  widgets: [
    'mascot-view',
    'settings-panel',
  ],
};