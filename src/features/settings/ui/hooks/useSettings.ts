/**
 * useSettings Hook - FSD Phase 2
 * 設定フックの実装（TDD: GREEN Phase）
 */

import { useEffect, useState } from 'react';

import { settingsStore } from '../../model/settings-store';
import type {
  AppSettings,
  ChatSettings,
  DisplaySettings,
  MouseFollowSettings,
  SettingsCategory
} from '../../types';

interface UseSettingsReturn {
  // 状態
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  changedCategories: SettingsCategory[];
  
  // アクション
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<boolean>;
  updateChatSettings: (updates: Partial<ChatSettings>) => Promise<void>;
  updateDisplaySettings: (updates: Partial<DisplaySettings>) => Promise<void>;
  updateMouseFollowSettings: (updates: Partial<MouseFollowSettings>) => Promise<void>;
}

/**
 * 設定管理用のReactフック
 * 
 * @example
 * ```tsx
 * function SettingsComponent() {
 *   const {
 *     settings,
 *     isLoading,
 *     error,
 *     updateChatSettings,
 *     saveSettings
 *   } = useSettings();
 * 
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 * 
 *   return (
 *     <div>
 *       <input
 *         value={settings.chat.apiKey}
 *         onChange={(e) => updateChatSettings({ apiKey: e.target.value })}
 *       />
 *       <button onClick={saveSettings}>Save</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSettings(): UseSettingsReturn {
  const [state, setState] = useState(() => settingsStore.getState());

  useEffect(() => {
    // ストアの変更を購読
    const unsubscribe = settingsStore.subscribe((newState) => {
      setState(newState);
    });

    // クリーンアップ
    return unsubscribe;
  }, []);

  return {
    // 状態
    settings: state.settings,
    isLoading: state.isLoading,
    error: state.error,
    hasUnsavedChanges: settingsStore.hasUnsavedChanges(),
    changedCategories: settingsStore.getChangedCategories(),
    
    // アクション
    loadSettings: () => settingsStore.loadSettings(),
    saveSettings: () => settingsStore.saveSettings(),
    updateChatSettings: (updates) => settingsStore.updateChatSettings(updates),
    updateDisplaySettings: (updates) => settingsStore.updateDisplaySettings(updates),
    updateMouseFollowSettings: (updates) => settingsStore.updateMouseFollowSettings(updates)
  };
}