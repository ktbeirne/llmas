/**
 * Settings Feature Public API - FSD Phase 2
 * 設定機能の公開API
 * 
 * このファイルは設定機能の唯一の公開インターフェースです。
 * 他の機能やウィジェットはこのAPIを通じてのみ設定機能にアクセスできます。
 */

export { settingsStore } from './model/settings-store';
export { SettingsPersistenceAdapter } from './lib/persistence-adapter';

// 型のエクスポート
export type {
  // 基本型
  AppSettings,
  SettingsCategory,
  SettingsChangeEvent,
  SettingsValidationError,
  SettingsExportData,
  
  // カテゴリ別設定型
  ChatSettings,
  DisplaySettings,
  ExpressionSettings,
  MouseFollowSettings,
  VRMSettings,
  AudioSettings
} from './types';

// エラークラスのエクスポート
export { SettingsLoadError, SettingsSaveError, SettingsValidationException } from './types';

// React Hooks
export { useSettings } from './ui/hooks/useSettings';
export { useSettingsCategory } from './ui/hooks/useSettingsCategory';

// 便利な関数とユーティリティ
import { settingsStore } from './model/settings-store';
import { SettingsPersistenceAdapter } from './lib/persistence-adapter';
import type { SettingsCategory, SettingsExportData } from './types';

/**
 * 設定機能の初期化
 * アプリケーション起動時に呼び出される
 */
export async function initializeSettings(): Promise<void> {
  const adapter = new SettingsPersistenceAdapter();
  await adapter.loadAllSettings();
  
  // ストアに設定を反映
  await settingsStore.loadSettings();
}

/**
 * 設定の保存
 * 全ての設定を永続化する
 */
export async function saveAllSettings(): Promise<boolean> {
  const adapter = new SettingsPersistenceAdapter();
  const currentSettings = settingsStore.getState().settings;
  
  const storeResult = await settingsStore.saveSettings();
  const persistResult = await adapter.saveAllSettings(currentSettings);
  
  return storeResult && persistResult;
}

/**
 * カテゴリ別の設定取得
 */
export function getSettingsByCategory<T>(category: SettingsCategory): T {
  return settingsStore.getSettingsByCategory(category);
}

/**
 * 設定変更の購読
 */
export function subscribeToSettings(callback: (state: any) => void): () => void {
  return settingsStore.subscribe(callback);
}

/**
 * カテゴリ別設定変更の購読
 */
export function subscribeToCategory<T>(
  category: SettingsCategory,
  callback: (settings: T) => void
): () => void {
  return settingsStore.subscribeToCategory(category, callback);
}

/**
 * 設定のリセット
 */
export async function resetSettings(category?: SettingsCategory): Promise<void> {
  if (category) {
    await settingsStore.resetCategory(category);
  } else {
    await settingsStore.resetToDefaults();
  }
  
  // 永続化層もリセット
  const adapter = new SettingsPersistenceAdapter();
  await adapter.resetSettings(category);
}

/**
 * 設定のエクスポート
 */
export function exportSettings(): SettingsExportData {
  return settingsStore.exportSettings();
}

/**
 * 設定のインポート
 */
export async function importSettings(data: SettingsExportData): Promise<boolean> {
  const result = await settingsStore.importSettings(data);
  
  if (result) {
    // インポート成功時は永続化
    await saveAllSettings();
  }
  
  return result;
}