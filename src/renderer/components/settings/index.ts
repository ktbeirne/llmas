/**
 * index.ts - 設定コンポーネント統合エクスポート
 * 
 * Phase 3.5.2.2: Settings画面のReact化
 * 設定関連コンポーネントの統合エクスポート
 */

// Main Settings Window
export { default as SettingsWindow } from './SettingsWindow';
export type { SettingsWindowProps, SettingsTab } from './SettingsWindow';

// Settings Tabs
export { default as DisplaySettingsTab } from './DisplaySettingsTab';
export type { DisplaySettingsTabProps } from './DisplaySettingsTab';

export { default as ChatSettingsTab } from './ChatSettingsTab';
export type { ChatSettingsTabProps } from './ChatSettingsTab';

export { default as ExpressionSettingsTab } from './ExpressionSettingsTab';
export type { ExpressionSettingsTabProps } from './ExpressionSettingsTab';

// デフォルトエクスポート（オブジェクト形式）
const SettingsComponents = {
  SettingsWindow,
  DisplaySettingsTab,
  ChatSettingsTab,
  ExpressionSettingsTab,
} as const;

export default SettingsComponents;

/**
 * 使用例とドキュメント
 * 
 * @example
 * // 個別インポート
 * import { SettingsWindow, DisplaySettingsTab } from './components/settings';
 * 
 * // 型定義インポート
 * import type { SettingsWindowProps, SettingsTab } from './components/settings';
 * 
 * // 名前空間インポート
 * import SettingsComponents from './components/settings';
 * const { SettingsWindow } = SettingsComponents;
 * 
 * // 基本的な使用例
 * <SettingsWindow 
 *   initialTab="display"
 *   onClose={() => console.log('Settings closed')}
 * />
 */
