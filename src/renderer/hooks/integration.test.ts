/**
 * integration.test.ts - React Hooks統合テスト
 *
 * Phase 3.2.2 Task 5: Custom Hooks統合テスト
 * 複数Hooks間の連携動作とパフォーマンスの検証
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// テスト対象の統合Hooks
import {
  useCompleteSettingsManagement,
  useLightweightSettings,
  usePerformanceFocusedSettings,
  useCrossSettings,
  HookUtils,
  type UseCompleteSettingsManagementOptions,
  type UseLightweightSettingsOptions,
  type UsePerformanceFocusedSettingsOptions,
  type UseCrossSettingsOptions,
} from './index';

// 基本Hooksモック
vi.mock('./useSettingsSection', () => ({
  useSettingsSection: vi.fn(() => ({
    data: { windowSize: { width: 800, height: 600, preset: 'medium' } },
    isLoading: false,
    isInitialized: true,
    error: null,
    loadSettings: vi.fn().mockResolvedValue(undefined),
    updateSettings: vi.fn().mockResolvedValue(undefined),
    resetSettings: vi.fn().mockResolvedValue(undefined),
    isReady: true,
    validationErrors: [],
  })),
  useWindowSettingsSection: vi.fn(),
  useChatSettingsSection: vi.fn(),
  useThemeSettingsSection: vi.fn(),
  useExpressionSettingsSection: vi.fn(),
}));

vi.mock('./useSettingsLifecycle', () => ({
  useSettingsLifecycle: vi.fn(() => ({
    lifecycleState: {
      isInitialized: true,
      isDisposed: false,
      hasError: false,
      mountTime: Date.now(),
    },
    initialize: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    reset: vi.fn().mockResolvedValue(undefined),
    handleError: vi.fn(),
    isReady: true,
  })),
}));

vi.mock('./useSettingsForm', () => ({
  useSettingsForm: vi.fn(() => ({
    form: {
      formState: { isDirty: false, isSubmitting: false, isValid: true },
      getValues: vi.fn(() => ({})),
      reset: vi.fn(),
    },
    section: {},
    lifecycle: {},
    formState: { isDirty: false, isSubmitting: false, isValid: true },
    validationResult: { isValid: true, errors: [], fieldErrors: {} },
    operations: {
      submit: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn(),
      resetToDefaults: vi.fn().mockResolvedValue(undefined),
      validateForm: vi.fn(() => ({ isValid: true, errors: [] })),
      clearErrors: vi.fn(),
    },
    canSubmit: true,
    hasUnsavedChanges: false,
    isReady: true,
  })),
}));

vi.mock('./useSettingsPerformance', () => ({
  useSettingsPerformance: vi.fn(() => ({
    metrics: {
      renderMetrics: {
        averageRenderTime: 5,
        maxRenderTime: 10,
        renderCount: 100,
        efficiencyScore: 95,
      },
      memoryMetrics: {
        heapUsed: 50000000,
        heapTotal: 100000000,
        memoryUsagePercent: 50,
        potentialLeaks: 0,
      },
      operationMetrics: {
        totalOperations: 50,
        averageOperationTime: 25,
        errorCount: 1,
        successRate: 98,
      },
      healthScore: 95,
    },
    alerts: [],
    isMonitoring: true,
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn(),
    resetMetrics: vi.fn(),
    trackOperation: vi.fn(() => ({ end: vi.fn(() => 50), abort: vi.fn() })),
    trackRender: vi.fn(),
    checkMemoryUsage: vi.fn().mockResolvedValue(undefined),
    detectMemoryLeaks: vi.fn(),
    generateReport: vi.fn(() => 'Performance Report'),
    getDetailedMetrics: vi.fn(() => ({ summary: { totalOperations: 50, totalErrors: 1 } })),
    getOptimizationSuggestions: vi.fn(() => ['パフォーマンスは良好です']),
  })),
  useBasicPerformanceMonitoring: vi.fn(),
  useAdvancedPerformanceMonitoring: vi.fn(() => ({
    metrics: {
      renderMetrics: { averageRenderTime: 3, efficiencyScore: 98 },
      memoryMetrics: { memoryUsagePercent: 30, potentialLeaks: 0 },
      operationMetrics: { successRate: 99 },
      healthScore: 98,
    },
    alerts: [],
    isMonitoring: true,
    getOptimizationSuggestions: vi.fn(() => ['高度な最適化が適用されています']),
  })),
}));

describe('React Hooks統合テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Console mocks
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useCompleteSettingsManagement', () => {
    it('全機能が統合されて動作する', () => {
      const options: UseCompleteSettingsManagementOptions = {
        section: 'window',
        componentName: 'TestCompleteComponent',
        enablePerformanceMonitoring: true,
        enableAutoSave: true,
      };

      const { result } = renderHook(() => useCompleteSettingsManagement(options));

      // 各Hookの戻り値が含まれている
      expect(result.current.section).toBeDefined();
      expect(result.current.lifecycle).toBeDefined();
      expect(result.current.form).toBeDefined();
      expect(result.current.performance).toBeDefined();

      // 統合操作が定義されている
      expect(result.current.initialize).toBeInstanceOf(Function);
      expect(result.current.cleanup).toBeInstanceOf(Function);
      expect(result.current.reset).toBeInstanceOf(Function);

      // 統合状態が正しい
      expect(result.current.isReady).toBe(true);
      expect(result.current.hasErrors).toBe(false);
      expect(result.current.overallHealth).toBe(95);
    });

    it('初期化操作が正しく動作する', async () => {
      const options: UseCompleteSettingsManagementOptions = {
        section: 'window',
        componentName: 'TestInitComponent',
      };

      const { result } = renderHook(() => useCompleteSettingsManagement(options));

      await act(async () => {
        await result.current.initialize();
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Initializing TestInitComponent')
      );
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('initialized successfully'));
    });

    it('クリーンアップ操作が正しく動作する', () => {
      const options: UseCompleteSettingsManagementOptions = {
        section: 'window',
        componentName: 'TestCleanupComponent',
      };

      const { result } = renderHook(() => useCompleteSettingsManagement(options));

      act(() => {
        result.current.cleanup();
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Cleaning up TestCleanupComponent')
      );
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('cleaned up'));
    });

    it('リセット操作が正しく動作する', async () => {
      const options: UseCompleteSettingsManagementOptions = {
        section: 'window',
        componentName: 'TestResetComponent',
      };

      const { result } = renderHook(() => useCompleteSettingsManagement(options));

      await act(async () => {
        await result.current.reset();
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Resetting TestResetComponent')
      );
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('reset completed'));
    });
  });

  describe('useLightweightSettings', () => {
    it('軽量版が正しく動作する', () => {
      const options: UseLightweightSettingsOptions = {
        section: 'chat',
        componentName: 'TestLightComponent',
      };

      const { result } = renderHook(() => useLightweightSettings(options));

      expect(result.current.section).toBeDefined();
      expect(result.current.form).toBeDefined();
      expect(result.current.isReady).toBe(true);

      // パフォーマンス監視やライフサイクルは含まれない（軽量版）
      expect(result.current).not.toHaveProperty('performance');
      expect(result.current).not.toHaveProperty('lifecycle');
    });

    it('基本機能のみが有効になっている', () => {
      const options: UseLightweightSettingsOptions = {
        section: 'theme',
      };

      const { result } = renderHook(() => useLightweightSettings(options));

      // セクション管理とフォーム機能のみ
      expect(result.current.section.isReady).toBe(true);
      expect(result.current.form.isReady).toBe(true);
      expect(result.current.isReady).toBe(true);
    });
  });

  describe('usePerformanceFocusedSettings', () => {
    it('パフォーマンス重視版が正しく動作する', () => {
      const options: UsePerformanceFocusedSettingsOptions = {
        section: 'window',
        componentName: 'TestPerfComponent',
        strictMode: true,
      };

      const { result } = renderHook(() => usePerformanceFocusedSettings(options));

      expect(result.current.section).toBeDefined();
      expect(result.current.lifecycle).toBeDefined();
      expect(result.current.performance).toBeDefined();

      // パフォーマンス関連の状態
      expect(result.current.isOptimized).toBe(true); // healthScore(98) > strictMode(90)
      expect(result.current.suggestions).toEqual(['高度な最適化が適用されています']);
    });

    it('strictMode=falseで閾値が調整される', () => {
      const options: UsePerformanceFocusedSettingsOptions = {
        section: 'window',
        strictMode: false,
      };

      const { result } = renderHook(() => usePerformanceFocusedSettings(options));

      // より緩い閾値（70）で判定される
      expect(result.current.isOptimized).toBe(true); // healthScore(98) > 70
    });
  });

  describe('useCrossSettings', () => {
    it('複数セクション管理が正しく動作する', () => {
      const options: UseCrossSettingsOptions = {
        sections: ['window', 'chat', 'theme'],
        componentName: 'TestCrossComponent',
        enableSync: true,
      };

      const { result } = renderHook(() => useCrossSettings(options));

      // 各セクションが管理されている
      expect(result.current.sections).toBeDefined();
      expect(result.current.sectionsCount).toBe(3);

      // ライフサイクル管理
      expect(result.current.lifecycle).toBeDefined();

      // 統合状態
      expect(result.current.allReady).toBe(true);
      expect(result.current.hasAnyError).toBe(false);

      // 同期機能
      expect(result.current.syncAllSections).toBeInstanceOf(Function);
    });

    it('セクション同期が正しく動作する', async () => {
      const options: UseCrossSettingsOptions = {
        sections: ['window', 'chat'],
        enableSync: true,
      };

      const { result } = renderHook(() => useCrossSettings(options));

      await act(async () => {
        await result.current.syncAllSections();
      });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Syncing 2 sections'));
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('All sections synced successfully')
      );
    });

    it('同期無効時は同期処理をスキップする', async () => {
      const options: UseCrossSettingsOptions = {
        sections: ['window'],
        enableSync: false,
      };

      const { result } = renderHook(() => useCrossSettings(options));

      await act(async () => {
        await result.current.syncAllSections();
      });

      // 同期処理がスキップされる
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('Syncing'));
    });
  });

  describe('HookUtils', () => {
    it('設定データの比較が正しく動作する', () => {
      const data1 = { width: 800, height: 600 };
      const data2 = { width: 800, height: 600 };
      const data3 = { width: 1024, height: 768 };

      expect(HookUtils.compareSettingsData(data1, data2)).toBe(true);
      expect(HookUtils.compareSettingsData(data1, data3)).toBe(false);
    });

    it('エラー状態の集約が正しく動作する', () => {
      const hooks = [
        { error: null },
        { error: new Error('Test Error 1') },
        { error: undefined },
        { error: new Error('Test Error 2') },
      ];

      const errors = HookUtils.aggregateErrors(hooks);

      expect(errors).toHaveLength(2);
      expect(errors[0].message).toBe('Test Error 1');
      expect(errors[1].message).toBe('Test Error 2');
    });

    it('準備状態の検証が正しく動作する', () => {
      const readyHooks = [{ isReady: true }, { isReady: true }];
      const notReadyHooks = [{ isReady: true }, { isReady: false }];

      expect(HookUtils.validateReadiness(readyHooks)).toBe(true);
      expect(HookUtils.validateReadiness(notReadyHooks)).toBe(false);
    });

    it('パフォーマンスサマリーが正しく生成される', () => {
      const mockPerformanceHook = {
        metrics: {
          healthScore: 85,
          renderMetrics: { averageRenderTime: 12 },
          memoryMetrics: { memoryUsagePercent: 65 },
          operationMetrics: { successRate: 95 },
        },
      } as any;

      const summary = HookUtils.generatePerformanceSummary(mockPerformanceHook);

      expect(summary.score).toBe(85);
      expect(summary.status).toBe('good'); // 75-89 range
      expect(summary.keyMetrics.renderTime).toBe(12);
      expect(summary.keyMetrics.memoryUsage).toBe(65);
      expect(summary.keyMetrics.errorRate).toBe(5); // 100 - 95
    });

    it('パフォーマンススコア別ステータス判定', () => {
      const createMockHook = (score: number) =>
        ({
          metrics: {
            healthScore: score,
            renderMetrics: { averageRenderTime: 0 },
            memoryMetrics: { memoryUsagePercent: 0 },
            operationMetrics: { successRate: 100 },
          },
        }) as any;

      expect(HookUtils.generatePerformanceSummary(createMockHook(95)).status).toBe('excellent');
      expect(HookUtils.generatePerformanceSummary(createMockHook(80)).status).toBe('good');
      expect(HookUtils.generatePerformanceSummary(createMockHook(65)).status).toBe('fair');
      expect(HookUtils.generatePerformanceSummary(createMockHook(45)).status).toBe('poor');
    });
  });

  describe('エラーハンドリング統合', () => {
    it('初期化エラーが適切に処理される', async () => {
      // ライフサイクル初期化エラーをモック
      const { useSettingsLifecycle } = await import('./useSettingsLifecycle');
      (useSettingsLifecycle as any).mockReturnValueOnce({
        lifecycleState: { isInitialized: false, isDisposed: false, hasError: true },
        initialize: vi.fn().mockRejectedValue(new Error('Init failed')),
        dispose: vi.fn(),
        reset: vi.fn(),
        isReady: false,
      });

      const options: UseCompleteSettingsManagementOptions = {
        section: 'window',
      };

      const { result } = renderHook(() => useCompleteSettingsManagement(options));

      await expect(
        act(async () => {
          await result.current.initialize();
        })
      ).rejects.toThrow('Init failed');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize'),
        expect.any(Error)
      );
    });

    it('リセットエラーが適切に処理される', async () => {
      // フォームリセットエラーをモック
      const { useSettingsForm } = await import('./useSettingsForm');
      (useSettingsForm as any).mockReturnValueOnce({
        form: {},
        section: {},
        lifecycle: {},
        formState: {},
        validationResult: {},
        operations: {
          resetToDefaults: vi.fn().mockRejectedValue(new Error('Reset failed')),
        },
        isReady: true,
      });

      const options: UseCompleteSettingsManagementOptions = {
        section: 'window',
      };

      const { result } = renderHook(() => useCompleteSettingsManagement(options));

      await expect(
        act(async () => {
          await result.current.reset();
        })
      ).rejects.toThrow('Reset failed');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to reset'),
        expect.any(Error)
      );
    });
  });

  describe('パフォーマンス統合', () => {
    it('高負荷状況での動作が安定している', () => {
      const options: UseCompleteSettingsManagementOptions = {
        section: 'window',
        enablePerformanceMonitoring: true,
        enableRealTimeMonitoring: true,
      };

      const { result, rerender } = renderHook(() => useCompleteSettingsManagement(options));

      // 複数回レンダリングしても安定
      for (let i = 0; i < 10; i++) {
        rerender();
        expect(result.current.isReady).toBe(true);
        expect(result.current.overallHealth).toBeGreaterThanOrEqual(90);
      }
    });

    it('メモリ効率が適切に管理されている', () => {
      const { result, rerender } = renderHook(() =>
        useCompleteSettingsManagement({
          section: 'window',
        })
      );

      const firstRender = result.current;
      rerender();
      const secondRender = result.current;

      // 主要なプロパティが保持されている
      expect(firstRender.isReady).toBe(secondRender.isReady);
      expect(firstRender.hasErrors).toBe(secondRender.hasErrors);
      expect(firstRender.overallHealth).toBe(secondRender.overallHealth);

      // 関数が定義されている
      expect(typeof firstRender.initialize).toBe('function');
      expect(typeof secondRender.initialize).toBe('function');
    });
  });
});
