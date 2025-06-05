/**
 * useSettingsSection.ts - セクション単位設定操作カスタムHook
 *
 * Phase 3.2.2 Task 1: BaseSettingsComponentの中核機能をReact Hook化
 * ZustandストアベースのCRUD操作とstate管理を提供
 */

import { useCallback, useEffect, useMemo } from 'react';

import { useSettingsStore } from '../stores/settingsStore';
import type { SettingsSection, SettingsDataMap, SettingsStoreState } from '../stores/settingsStore';

/**
 * useSettingsSection戻り値型定義
 */
export interface UseSettingsSectionReturn<T extends SettingsSection> {
  // データ状態
  data: SettingsDataMap[T] | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: Error | null;

  // 操作メソッド
  loadSettings: () => Promise<void>;
  updateSettings: (data: SettingsDataMap[T]) => Promise<void>;
  resetSettings: () => Promise<void>;
  refreshSettings: () => Promise<void>;

  // バリデーション
  validationErrors: SettingsStoreState['validation'][T];
  validateData: (data: SettingsDataMap[T]) => boolean;
  clearValidationErrors: () => void;

  // 便利な状態
  hasUnsavedChanges: boolean;
  isReady: boolean;
}

/**
 * セクション単位設定操作カスタムHook
 *
 * @param section - 操作対象の設定セクション
 * @returns セクション操作とstate
 */
export function useSettingsSection<T extends SettingsSection>(
  section: T
): UseSettingsSectionReturn<T> {
  // Zustand Store接続
  const store = useSettingsStore();

  // セクション固有データの取得（メモ化）
  const sectionData = useMemo(
    () => ({
      data: store[section],
      isLoading: store.isLoading[section],
      isInitialized: store.isInitialized[section],
      error: store.errors[section],
      validationErrors: store.validation[section],
    }),
    [
      store[section],
      store.isLoading[section],
      store.isInitialized[section],
      store.errors[section],
      store.validation[section],
      section,
    ]
  );

  // 操作メソッドの定義（useCallback使用でパフォーマンス最適化）
  const loadSettings = useCallback(async (): Promise<void> => {
    console.log(`[useSettingsSection] Loading ${section} settings...`);

    try {
      await store.loadSettings(section);
      console.log(`[useSettingsSection] ${section} settings loaded successfully`);
    } catch (error) {
      console.error(`[useSettingsSection] Failed to load ${section} settings:`, error);
      throw error;
    }
  }, [store, section]);

  const updateSettings = useCallback(
    async (data: SettingsDataMap[T]): Promise<void> => {
      console.log(`[useSettingsSection] Updating ${section} settings...`, data);

      try {
        await store.updateSettings(section, data);
        console.log(`[useSettingsSection] ${section} settings updated successfully`);
      } catch (error) {
        console.error(`[useSettingsSection] Failed to update ${section} settings:`, error);
        throw error;
      }
    },
    [store, section]
  );

  const resetSettings = useCallback(async (): Promise<void> => {
    console.log(`[useSettingsSection] Resetting ${section} settings to defaults...`);

    try {
      await store.resetSettings(section);
      console.log(`[useSettingsSection] ${section} settings reset successfully`);
    } catch (error) {
      console.error(`[useSettingsSection] Failed to reset ${section} settings:`, error);
      throw error;
    }
  }, [store, section]);

  const refreshSettings = useCallback(async (): Promise<void> => {
    console.log(`[useSettingsSection] Refreshing ${section} settings...`);

    try {
      // エラーをクリアしてから再読み込み
      store.clearErrors(section);
      await store.loadSettings(section);
      console.log(`[useSettingsSection] ${section} settings refreshed successfully`);
    } catch (error) {
      console.error(`[useSettingsSection] Failed to refresh ${section} settings:`, error);
      throw error;
    }
  }, [store, section]);

  // バリデーション操作
  const validateData = useCallback(
    (data: SettingsDataMap[T]): boolean => {
      const errors = store.validateSettings(section, data);
      return errors.length === 0;
    },
    [store, section]
  );

  const clearValidationErrors = useCallback((): void => {
    store.clearValidationErrors(section);
  }, [store, section]);

  // 便利な計算プロパティ
  const hasUnsavedChanges = useMemo((): boolean => {
    // バリデーションエラーがある場合は未保存変更ありとみなす
    return sectionData.validationErrors.length > 0;
  }, [sectionData.validationErrors]);

  const isReady = useMemo((): boolean => {
    return sectionData.isInitialized && !sectionData.isLoading && !sectionData.error;
  }, [sectionData.isInitialized, sectionData.isLoading, sectionData.error]);

  // 自動初期化（初回レンダリング時）
  useEffect(() => {
    if (!sectionData.isInitialized && !sectionData.isLoading) {
      console.log(`[useSettingsSection] Auto-initializing ${section} section...`);
      loadSettings().catch(error => {
        console.error(`[useSettingsSection] Auto-initialization failed for ${section}:`, error);
      });
    }
  }, [section, sectionData.isInitialized, sectionData.isLoading, loadSettings]);

  // 戻り値オブジェクト（メモ化）
  return useMemo(
    () => ({
      // データ状態
      data: sectionData.data,
      isLoading: sectionData.isLoading,
      isInitialized: sectionData.isInitialized,
      error: sectionData.error,

      // 操作メソッド
      loadSettings,
      updateSettings,
      resetSettings,
      refreshSettings,

      // バリデーション
      validationErrors: sectionData.validationErrors,
      validateData,
      clearValidationErrors,

      // 便利な状態
      hasUnsavedChanges,
      isReady,
    }),
    [
      sectionData,
      loadSettings,
      updateSettings,
      resetSettings,
      refreshSettings,
      validateData,
      clearValidationErrors,
      hasUnsavedChanges,
      isReady,
    ]
  );
}

/**
 * 特定セクション用の型付きHooks（型安全性向上）
 */
export const useWindowSettings = () => useSettingsSection('window');
export const useChatSettings = () => useSettingsSection('chat');
export const useThemeSettings = () => useSettingsSection('theme');
export const useExpressionSettings = () => useSettingsSection('expressions');

/**
 * 複数セクション同時操作Hook
 */
export interface UseMultipleSettingsSectionsReturn {
  sections: {
    [K in SettingsSection]: UseSettingsSectionReturn<K>;
  };
  loadAllSections: () => Promise<void>;
  isAnyLoading: boolean;
  hasAnyError: boolean;
  areAllReady: boolean;
}

export function useMultipleSettingsSections(): UseMultipleSettingsSectionsReturn {
  const windowSettings = useWindowSettings();
  const chatSettings = useChatSettings();
  const themeSettings = useThemeSettings();
  const expressionSettings = useExpressionSettings();

  const store = useSettingsStore();

  const loadAllSections = useCallback(async (): Promise<void> => {
    console.log('[useMultipleSettingsSections] Loading all sections...');

    try {
      await store.initializeAllSections();
      console.log('[useMultipleSettingsSections] All sections loaded successfully');
    } catch (error) {
      console.error('[useMultipleSettingsSections] Failed to load all sections:', error);
      throw error;
    }
  }, [store]);

  const isAnyLoading = useMemo(() => {
    return (
      windowSettings.isLoading ||
      chatSettings.isLoading ||
      themeSettings.isLoading ||
      expressionSettings.isLoading
    );
  }, [
    windowSettings.isLoading,
    chatSettings.isLoading,
    themeSettings.isLoading,
    expressionSettings.isLoading,
  ]);

  const hasAnyError = useMemo(() => {
    return !!(
      windowSettings.error ||
      chatSettings.error ||
      themeSettings.error ||
      expressionSettings.error
    );
  }, [windowSettings.error, chatSettings.error, themeSettings.error, expressionSettings.error]);

  const areAllReady = useMemo(() => {
    return (
      windowSettings.isReady &&
      chatSettings.isReady &&
      themeSettings.isReady &&
      expressionSettings.isReady
    );
  }, [
    windowSettings.isReady,
    chatSettings.isReady,
    themeSettings.isReady,
    expressionSettings.isReady,
  ]);

  return useMemo(
    () => ({
      sections: {
        window: windowSettings,
        chat: chatSettings,
        theme: themeSettings,
        expressions: expressionSettings,
      },
      loadAllSections,
      isAnyLoading,
      hasAnyError,
      areAllReady,
    }),
    [
      windowSettings,
      chatSettings,
      themeSettings,
      expressionSettings,
      loadAllSections,
      isAnyLoading,
      hasAnyError,
      areAllReady,
    ]
  );
}

export default useSettingsSection;
