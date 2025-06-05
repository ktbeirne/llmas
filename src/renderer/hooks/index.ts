/**
 * index.ts - React Hooks統合エクスポートファイル
 *
 * Phase 3.2.2 Task 5: Custom Hooks統合エクスポート
 * 全てのカスタムHooksと型定義の統一インターフェース
 */

// Core Settings Hooks
export {
  useSettingsSection,
  useWindowSettingsSection,
  useChatSettingsSection,
  useThemeSettingsSection,
  useExpressionSettingsSection,
  type UseSettingsSectionReturn,
  type UseSettingsSectionOptions,
} from './useSettingsSection';

export {
  useSettingsLifecycle,
  useIntegratedSettingsLifecycle,
  type UseSettingsLifecycleReturn,
  type UseIntegratedSettingsLifecycleOptions,
  type LifecycleState,
  type ResourceManager,
  type ErrorContext,
} from './useSettingsLifecycle';

export {
  useSettingsForm,
  useWindowSettingsForm,
  useChatSettingsForm,
  useThemeSettingsForm,
  useExpressionSettingsForm,
  type UseSettingsFormReturn,
  type UseSettingsFormOptions,
  type FormState,
  type ValidationResult,
  type FormOperations,
} from './useSettingsForm';

export {
  useSettingsPerformance,
  useBasicPerformanceMonitoring,
  useAdvancedPerformanceMonitoring,
  type UseSettingsPerformanceReturn,
  type PerformanceMonitoringOptions,
  type PerformanceMetrics,
  type PerformanceAlert,
} from './useSettingsPerformance';

// Re-export store types for convenience
export type {
  SettingsSection,
  SettingsDataMap,
  WindowSettingsData,
  ChatSettingsData,
  ThemeSettingsData,
  ExpressionSettingsData,
} from '../stores/settingsStore';

export type { ValidationError } from '../stores/settingsValidation';

/**
 * 統合Hook組み合わせパターン
 */

import { useCallback } from 'react';

import type { SettingsSection } from '../stores/settingsStore';

import { useSettingsSection } from './useSettingsSection';
import { useSettingsLifecycle } from './useSettingsLifecycle';
import { useSettingsForm } from './useSettingsForm';
import { useSettingsPerformance, useAdvancedPerformanceMonitoring } from './useSettingsPerformance';

/**
 * 完全統合設定管理Hook
 * 全機能を統合した包括的なHook
 */
export interface UseCompleteSettingsManagementOptions {
  section: SettingsSection;
  componentName?: string;
  enablePerformanceMonitoring?: boolean;
  enableAutoSave?: boolean;
  autoSaveDelay?: number;
  enableRealTimeMonitoring?: boolean;
}

export interface UseCompleteSettingsManagementReturn {
  // 各Hookの戻り値
  section: ReturnType<typeof useSettingsSection>;
  lifecycle: ReturnType<typeof useSettingsLifecycle>;
  form: ReturnType<typeof useSettingsForm>;
  performance: ReturnType<typeof useSettingsPerformance>;

  // 統合操作
  initialize: () => Promise<void>;
  cleanup: () => void;
  reset: () => Promise<void>;

  // 統合状態
  isReady: boolean;
  hasErrors: boolean;
  overallHealth: number;
}

/**
 * 完全統合設定管理Hook
 *
 * @param options - 統合設定オプション
 * @returns 統合管理機能
 */
export function useCompleteSettingsManagement(
  options: UseCompleteSettingsManagementOptions
): UseCompleteSettingsManagementReturn {
  const {
    section,
    componentName = `Settings_${section}`,
    enablePerformanceMonitoring = true,
    enableAutoSave = true,
    autoSaveDelay = 2000,
    enableRealTimeMonitoring = true,
  } = options;

  // 各Hook初期化
  const sectionHook = useSettingsSection(section);
  const lifecycleHook = useSettingsLifecycle(componentName);
  const formHook = useSettingsForm({
    section,
    autoSave: enableAutoSave,
    autoSaveDelay,
    enableLifecycle: true,
    componentName,
  });
  const performanceHook = useSettingsPerformance({
    componentName,
    enableRealTimeMonitoring,
    trackMemoryUsage: true,
    trackRenderPerformance: true,
  });

  // 統合操作
  const initialize = useCallback(async (): Promise<void> => {
    console.log(`[useCompleteSettingsManagement] Initializing ${componentName}...`);

    try {
      // ライフサイクル初期化
      await lifecycleHook.initialize(componentName, [section]);

      // パフォーマンス監視開始
      if (enablePerformanceMonitoring) {
        performanceHook.startMonitoring(section);
      }

      console.log(`[useCompleteSettingsManagement] ${componentName} initialized successfully`);
    } catch (error) {
      console.error(
        `[useCompleteSettingsManagement] Failed to initialize ${componentName}:`,
        error
      );
      throw error;
    }
  }, [lifecycleHook, performanceHook, componentName, section, enablePerformanceMonitoring]);

  const cleanup = useCallback((): void => {
    console.log(`[useCompleteSettingsManagement] Cleaning up ${componentName}...`);

    lifecycleHook.dispose();
    performanceHook.stopMonitoring();

    console.log(`[useCompleteSettingsManagement] ${componentName} cleaned up`);
  }, [lifecycleHook, performanceHook, componentName]);

  const reset = useCallback(async (): Promise<void> => {
    console.log(`[useCompleteSettingsManagement] Resetting ${componentName}...`);

    try {
      await formHook.operations.resetToDefaults();
      performanceHook.resetMetrics();
      await lifecycleHook.reset();

      console.log(`[useCompleteSettingsManagement] ${componentName} reset completed`);
    } catch (error) {
      console.error(`[useCompleteSettingsManagement] Failed to reset ${componentName}:`, error);
      throw error;
    }
  }, [formHook, performanceHook, lifecycleHook, componentName]);

  // 統合状態計算
  const isReady =
    sectionHook.isReady &&
    lifecycleHook.isReady &&
    formHook.isReady &&
    (enablePerformanceMonitoring ? performanceHook.isMonitoring : true);

  const hasErrors =
    !!sectionHook.error ||
    lifecycleHook.lifecycleState.hasError ||
    performanceHook.alerts.some(alert => alert.severity === 'critical');

  const overallHealth = enablePerformanceMonitoring
    ? performanceHook.metrics.healthScore
    : isReady && !hasErrors
      ? 100
      : 50;

  return {
    // 各Hookの戻り値
    section: sectionHook,
    lifecycle: lifecycleHook,
    form: formHook,
    performance: performanceHook,

    // 統合操作
    initialize,
    cleanup,
    reset,

    // 統合状態
    isReady,
    hasErrors,
    overallHealth,
  };
}

/**
 * 軽量統合設定管理Hook（基本機能のみ）
 */
export interface UseLightweightSettingsOptions {
  section: SettingsSection;
  componentName?: string;
}

export function useLightweightSettings(options: UseLightweightSettingsOptions) {
  const { section, componentName = `LightSettings_${section}` } = options;

  const sectionHook = useSettingsSection(section);
  const formHook = useSettingsForm({
    section,
    enableLifecycle: false,
    autoSave: false,
    componentName,
  });

  return {
    section: sectionHook,
    form: formHook,
    isReady: sectionHook.isReady && formHook.isReady,
  };
}

/**
 * パフォーマンス重視統合Hook
 */
export interface UsePerformanceFocusedSettingsOptions {
  section: SettingsSection;
  componentName?: string;
  strictMode?: boolean;
}

export function usePerformanceFocusedSettings(options: UsePerformanceFocusedSettingsOptions) {
  const { section, componentName = `PerfSettings_${section}`, strictMode = true } = options;

  const sectionHook = useSettingsSection(section);
  const lifecycleHook = useSettingsLifecycle(componentName);
  const performanceHook = useAdvancedPerformanceMonitoring(componentName);

  return {
    section: sectionHook,
    lifecycle: lifecycleHook,
    performance: performanceHook,
    isOptimized: performanceHook.metrics.healthScore > (strictMode ? 90 : 70),
    suggestions: performanceHook.getOptimizationSuggestions(),
  };
}

/**
 * セクション横断統合Hook（複数セクション管理）
 */
export interface UseCrossSettingsOptions {
  sections: SettingsSection[];
  componentName?: string;
  enableSync?: boolean;
}

export function useCrossSettings(options: UseCrossSettingsOptions) {
  const { sections, componentName = 'CrossSettings', enableSync = true } = options;

  // 各セクションのHook
  const sectionHooks = sections.reduce(
    (hooks, section) => {
      hooks[section] = useSettingsSection(section);
      return hooks;
    },
    {} as Record<SettingsSection, ReturnType<typeof useSettingsSection>>
  );

  const lifecycleHook = useSettingsLifecycle(componentName);

  // 全セクションの状態監視
  const allReady = Object.values(sectionHooks).every(hook => hook.isReady);
  const hasAnyError = Object.values(sectionHooks).some(hook => !!hook.error);

  const syncAllSections = useCallback(async (): Promise<void> => {
    if (!enableSync) return;

    console.log(`[useCrossSettings] Syncing ${sections.length} sections...`);

    try {
      await Promise.all(Object.values(sectionHooks).map(hook => hook.loadSettings()));
      console.log(`[useCrossSettings] All sections synced successfully`);
    } catch (error) {
      console.error(`[useCrossSettings] Failed to sync sections:`, error);
      throw error;
    }
  }, [sectionHooks, sections.length, enableSync]);

  return {
    sections: sectionHooks,
    lifecycle: lifecycleHook,
    allReady,
    hasAnyError,
    syncAllSections,
    sectionsCount: sections.length,
  };
}

/**
 * Hookユーティリティ関数
 */
export const HookUtils = {
  /**
   * 設定データの比較
   */
  compareSettingsData: <T>(data1: T, data2: T): boolean => {
    return JSON.stringify(data1) === JSON.stringify(data2);
  },

  /**
   * エラー状態の集約
   */
  aggregateErrors: (hooks: Array<{ error?: Error | null }>): Error[] => {
    return hooks
      .map(hook => hook.error)
      .filter((error): error is Error => error !== null && error !== undefined);
  },

  /**
   * 準備状態の検証
   */
  validateReadiness: (hooks: Array<{ isReady: boolean }>): boolean => {
    return hooks.every(hook => hook.isReady);
  },

  /**
   * パフォーマンスサマリーの生成
   */
  generatePerformanceSummary: (
    performanceHook: ReturnType<typeof useSettingsPerformance>
  ): {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    keyMetrics: {
      renderTime: number;
      memoryUsage: number;
      errorRate: number;
    };
  } => {
    const { metrics } = performanceHook;
    const score = metrics.healthScore;

    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) status = 'excellent';
    else if (score >= 75) status = 'good';
    else if (score >= 60) status = 'fair';
    else status = 'poor';

    return {
      score,
      status,
      keyMetrics: {
        renderTime: metrics.renderMetrics.averageRenderTime,
        memoryUsage: metrics.memoryMetrics.memoryUsagePercent,
        errorRate: 100 - metrics.operationMetrics.successRate,
      },
    };
  },
};

/**
 * デフォルトエクスポート：最も一般的に使用されるHook
 */
export default useCompleteSettingsManagement;
