/**
 * Settings Panel Widget - Public API
 * FSD Phase 3: 設定パネルウィジェットの公開インターフェース
 */

// UI Components (UIコンポーネント)
export { SettingsPanel } from './ui/SettingsPanel';

// Models (モデル)
export { TabManager } from './model/tab-manager';

// Core Libraries (コアライブラリ)
export { SettingsCoordinator } from './lib/settings-coordinator';

// Widget Initialization Hook
export const useSettingsPanel = () => {
  return {
    TabManager,
    SettingsCoordinator,
    SettingsPanel
  };
};

// Widget Metadata
export const settingsPanelMeta = {
  name: 'settings-panel',
  version: '1.0.0',
  description: 'Unified settings management widget with tabbed interface',
  dependencies: [
    '@features/settings',
    '@features/vrm-control', 
    '@features/chat',
    '@features/mouse-follow'
  ],
  capabilities: [
    'tab-navigation',
    'real-time-updates',
    'settings-validation',
    'export-import',
    'keyboard-navigation',
    'accessibility-support'
  ]
};