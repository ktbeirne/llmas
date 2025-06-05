/**
 * LazyWidgets - FSD Phase 3 Performance Optimization
 * Widget層のレイジーロード設定
 */

import { createLazyComponent } from './LazyLoadProvider';

// Widget lazy imports
export const LazyMascotView = createLazyComponent(
  () => import('@widgets/mascot-view').then(module => ({ default: module.MascotView })),
  {
    name: 'MascotView',
    preload: true, // メインビューなので事前ロード
  }
);

export const LazySettingsPanel = createLazyComponent(
  () => import('@widgets/settings-panel').then(module => ({ default: module.SettingsPanel })),
  {
    name: 'SettingsPanel',
    preload: false, // 設定は必要時のみロード
  }
);

// Feature lazy imports for advanced use cases
export const LazyChatFeature = createLazyComponent(
  () => import('@features/chat').then(module => ({ 
    default: () => {
      const { useChat } = module;
      return useChat();
    }
  })),
  {
    name: 'ChatFeature',
    preload: false,
  }
);

export const LazyVrmControlFeature = createLazyComponent(
  () => import('@features/vrm-control').then(module => ({ 
    default: () => {
      const { useVrmControl } = module;
      return useVrmControl();
    }
  })),
  {
    name: 'VrmControlFeature',
    preload: true, // VRM制御は重要なので事前ロード
  }
);

export const LazyMouseFollowFeature = createLazyComponent(
  () => import('@features/mouse-follow').then(module => ({ 
    default: () => {
      const { useMouseFollow } = module;
      return useMouseFollow();
    }
  })),
  {
    name: 'MouseFollowFeature',
    preload: true, // マウス追従は重要なので事前ロード
  }
);

export const LazySettingsFeature = createLazyComponent(
  () => import('@features/settings').then(module => ({ 
    default: () => {
      const { useSettings } = module;
      return useSettings();
    }
  })),
  {
    name: 'SettingsFeature',
    preload: false, // 設定は必要時のみロード
  }
);

export const LazyAnimationFeature = createLazyComponent(
  () => import('@features/animation').then(module => ({ 
    default: () => {
      const { useAnimation } = module;
      return useAnimation();
    }
  })),
  {
    name: 'AnimationFeature',
    preload: true, // アニメーションは重要なので事前ロード
  }
);

export const LazyMcpIntegrationFeature = createLazyComponent(
  () => import('@features/mcp-integration').then(module => ({ 
    default: () => {
      const { useMcpIntegration } = module;
      return useMcpIntegration();
    }
  })),
  {
    name: 'McpIntegrationFeature',
    preload: false, // MCP統合は必要時のみロード
  }
);

// Preload strategies
export const preloadCriticalWidgets = async () => {
  const { preloadBatch } = await import('./LazyLoadProvider');
  
  await preloadBatch([
    () => import('@widgets/mascot-view'),
    () => import('@features/vrm-control'),
    () => import('@features/mouse-follow'),
    () => import('@features/animation'),
  ], {
    sequential: false, // 並列ロード
  });
};

export const preloadSecondaryWidgets = async () => {
  const { preloadBatch } = await import('./LazyLoadProvider');
  
  await preloadBatch([
    () => import('@widgets/settings-panel'),
    () => import('@features/settings'),
    () => import('@features/chat'),
  ], {
    sequential: true, // 順次ロード（リソース競合を避ける）
    delay: 100, // 100ms間隔
  });
};

export const preloadOnDemandWidgets = async () => {
  const { preloadBatch } = await import('./LazyLoadProvider');
  
  await preloadBatch([
    () => import('@features/mcp-integration'),
  ], {
    sequential: true,
    delay: 200,
  });
};