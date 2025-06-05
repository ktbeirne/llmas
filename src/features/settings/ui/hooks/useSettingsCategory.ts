/**
 * useSettingsCategory Hook - FSD Phase 2
 * カテゴリ別設定フックの実装（TDD: GREEN Phase）
 */

import { useEffect, useState, useCallback } from 'react';

import { settingsStore } from '../../model/settings-store';
import type { SettingsCategory, SettingsValidationError } from '../../types';

interface UseSettingsCategoryReturn<T> {
  // 現在の設定
  settings: T;
  
  // 一時的な変更（コミット前）
  tempSettings: Partial<T>;
  hasTempChanges: boolean;
  
  // アクション
  updateSettings: (updates: Partial<T>) => Promise<void>;
  setTempSettings: (updates: Partial<T>) => void;
  applyTempChanges: () => Promise<void>;
  discardTempChanges: () => void;
  validateSettings: (settings: Partial<T>) => SettingsValidationError[];
  resetToDefaults: () => Promise<void>;
}

/**
 * カテゴリ別設定管理用のReactフック
 * 
 * 特定のカテゴリの設定のみを扱いたいコンポーネント向け。
 * 一時的な変更の管理機能付き。
 * 
 * @example
 * ```tsx
 * function ChatSettingsComponent() {
 *   const {
 *     settings,
 *     tempSettings,
 *     hasTempChanges,
 *     setTempSettings,
 *     applyTempChanges,
 *     discardTempChanges,
 *     validateSettings
 *   } = useSettingsCategory<ChatSettings>('chat');
 * 
 *   const handleInputChange = (key: string, value: any) => {
 *     setTempSettings({ [key]: value });
 *   };
 * 
 *   const handleSave = async () => {
 *     const errors = validateSettings(tempSettings);
 *     if (errors.length === 0) {
 *       await applyTempChanges();
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <input
 *         value={tempSettings.apiKey ?? settings.apiKey}
 *         onChange={(e) => handleInputChange('apiKey', e.target.value)}
 *       />
 *       <button onClick={handleSave} disabled={!hasTempChanges}>
 *         Save
 *       </button>
 *       <button onClick={discardTempChanges} disabled={!hasTempChanges}>
 *         Cancel
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSettingsCategory<T>(category: SettingsCategory): UseSettingsCategoryReturn<T> {
  const [settings, setSettings] = useState<T>(() => 
    settingsStore.getSettingsByCategory(category)
  );
  
  const [tempSettings, setTempSettings] = useState<Partial<T>>({});

  useEffect(() => {
    // カテゴリ別の変更を購読
    const unsubscribe = settingsStore.subscribeToCategory(category, (newSettings: T) => {
      setSettings(newSettings);
    });

    // クリーンアップ
    return unsubscribe;
  }, [category]);

  // 設定更新関数を動的に選択
  const getUpdateFunction = useCallback(() => {
    switch (category) {
      case 'chat':
        return settingsStore.updateChatSettings;
      case 'display':
        return settingsStore.updateDisplaySettings;
      case 'mouseFollow':
        return settingsStore.updateMouseFollowSettings;
      case 'expression':
        return settingsStore.updateExpressionSettings;
      case 'vrm':
        return settingsStore.updateVRMSettings;
      case 'audio':
        return settingsStore.updateAudioSettings;
      default:
        throw new Error(`Unknown category: ${category}`);
    }
  }, [category]);

  // バリデーション関数を動的に選択
  const getValidateFunction = useCallback(() => {
    switch (category) {
      case 'chat':
        return settingsStore.validateChatSettings;
      case 'display':
        return settingsStore.validateDisplaySettings;
      // 他のカテゴリのバリデーション関数は未実装の場合
      default:
        return () => [];
    }
  }, [category]);

  const updateSettings = async (updates: Partial<T>) => {
    const updateFn = getUpdateFunction();
    await updateFn(updates as any);
  };

  const applyTempChanges = async () => {
    if (Object.keys(tempSettings).length > 0) {
      await updateSettings(tempSettings);
      setTempSettings({});
    }
  };

  const discardTempChanges = () => {
    setTempSettings({});
  };

  const validateSettings = (settings: Partial<T>): SettingsValidationError[] => {
    const validateFn = getValidateFunction();
    return validateFn(settings as any);
  };

  const resetToDefaults = async () => {
    await settingsStore.resetCategory(category);
  };

  return {
    settings,
    tempSettings,
    hasTempChanges: Object.keys(tempSettings).length > 0,
    updateSettings,
    setTempSettings: (updates) => setTempSettings({ ...tempSettings, ...updates }),
    applyTempChanges,
    discardTempChanges,
    validateSettings,
    resetToDefaults
  };
}

// ストアにない更新関数のスタブ（将来実装予定）
if (!settingsStore.updateExpressionSettings) {
  (settingsStore as any).updateExpressionSettings = async () => {};
}
if (!settingsStore.updateVRMSettings) {
  (settingsStore as any).updateVRMSettings = async () => {};
}
if (!settingsStore.updateAudioSettings) {
  (settingsStore as any).updateAudioSettings = async () => {};
}