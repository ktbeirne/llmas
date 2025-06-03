/**
 * useSettingsPerformance.test.ts - useSettingsPerformance Hook単体テスト
 *
 * Phase 3.2.2 Task 4: パフォーマンス監視Hookのテスト実装
 * 簡素化されたテストスイート（メモリ効率重視）
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// テスト対象
import {
  useSettingsPerformance,
  useBasicPerformanceMonitoring,
  useAdvancedPerformanceMonitoring,
  type PerformanceMonitoringOptions,
} from './useSettingsPerformance';

// 最小限のモック
vi.mock('../stores/settingsStore', () => ({
  useSettingsStore: vi.fn(() => ({
    handleError: vi.fn(),
    dispose: vi.fn(),
  })),
}));

// 軽量化されたパフォーマンス統合モック
vi.mock('../stores/performanceIntegration', () => ({
  ReactPerformanceManager: vi.fn().mockImplementation(() => ({
    trackReactRender: vi.fn(),
    detectMemoryLeak: vi.fn(),
    resetReactMetrics: vi.fn(),
    getReactMetrics: vi.fn(() => ({})),
  })),
  SettingsPerformanceIntegrator: vi.fn().mockImplementation(() => ({
    startSettingsOperation: vi.fn(() => 'test-op-id'),
    endSettingsOperation: vi.fn(() => 50),
    resetAllMetrics: vi.fn(),
    getComprehensiveMetrics: vi.fn(() => ({
      summary: { totalOperations: 5, totalErrors: 0, overallHealth: 95 },
      sections: {},
      performance: { react: {} },
      errors: {},
    })),
    generatePerformanceReport: vi.fn(() => 'Test Report'),
  })),
  settingsPerformanceIntegrator: {
    startSettingsOperation: vi.fn(() => 'test-op-id'),
    endSettingsOperation: vi.fn(() => 50),
    resetAllMetrics: vi.fn(),
    getComprehensiveMetrics: vi.fn(() => ({
      summary: { totalOperations: 5, totalErrors: 0, overallHealth: 95 },
      sections: {},
      performance: { react: {} },
      errors: {},
    })),
    generatePerformanceReport: vi.fn(() => 'Test Report'),
  },
}));

describe('useSettingsPerformance Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Console mocks
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // 簡単なタイマーモック
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('基本機能', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() =>
        useSettingsPerformance({
          enableRealTimeMonitoring: false,
        })
      );

      expect(result.current.metrics).toBeDefined();
      expect(result.current.alerts).toEqual([]);
      expect(result.current.isMonitoring).toBe(false);

      expect(result.current.startMonitoring).toBeInstanceOf(Function);
      expect(result.current.stopMonitoring).toBeInstanceOf(Function);
      expect(result.current.resetMetrics).toBeInstanceOf(Function);
    });

    it('カスタムオプションで初期化される', () => {
      const options: PerformanceMonitoringOptions = {
        enableRealTimeMonitoring: false,
        componentName: 'TestComponent',
        trackMemoryUsage: false,
      };

      const { result } = renderHook(() => useSettingsPerformance(options));

      expect(result.current.isMonitoring).toBe(false);
    });

    it('デフォルトメトリクスが初期化される', () => {
      const { result } = renderHook(() =>
        useSettingsPerformance({
          enableRealTimeMonitoring: false,
        })
      );

      const { metrics } = result.current;

      expect(metrics.renderMetrics.averageRenderTime).toBe(0);
      expect(metrics.renderMetrics.efficiencyScore).toBe(100);
      expect(metrics.memoryMetrics.potentialLeaks).toBe(0);
      expect(metrics.operationMetrics.successRate).toBe(100);
      expect(metrics.healthScore).toBe(100);
    });
  });

  describe('監視制御', () => {
    it('監視開始が動作する', () => {
      const { result } = renderHook(() =>
        useSettingsPerformance({
          enableRealTimeMonitoring: false,
        })
      );

      expect(result.current.isMonitoring).toBe(false);

      act(() => {
        result.current.startMonitoring('window');
      });

      expect(result.current.isMonitoring).toBe(true);
    });

    it('監視停止が動作する', () => {
      const { result } = renderHook(() =>
        useSettingsPerformance({
          enableRealTimeMonitoring: false,
        })
      );

      act(() => {
        result.current.startMonitoring();
      });

      expect(result.current.isMonitoring).toBe(true);

      act(() => {
        result.current.stopMonitoring();
      });

      expect(result.current.isMonitoring).toBe(false);
    });

    it('メトリクスリセットが動作する', () => {
      const { result } = renderHook(() =>
        useSettingsPerformance({
          enableRealTimeMonitoring: false,
        })
      );

      act(() => {
        result.current.resetMetrics();
      });

      // メソッドが例外なく実行されることを確認
      expect(result.current.metrics).toBeDefined();
    });
  });

  describe('操作追跡', () => {
    it('操作追跡が動作する', () => {
      const { result } = renderHook(() =>
        useSettingsPerformance({
          enableRealTimeMonitoring: false,
        })
      );

      let tracker: any;

      act(() => {
        tracker = result.current.trackOperation('testOp', 'window');
      });

      expect(tracker).toBeDefined();
      expect(tracker.end).toBeInstanceOf(Function);
      expect(tracker.abort).toBeInstanceOf(Function);

      act(() => {
        const duration = tracker.end();
        expect(duration).toBe(50);
      });
    });

    it('レンダリング追跡が動作する', () => {
      const { result } = renderHook(() =>
        useSettingsPerformance({
          trackRenderPerformance: true,
          enableRealTimeMonitoring: false,
        })
      );

      act(() => {
        result.current.trackRender('TestComponent', 15);
      });

      // メソッドが例外なく実行されることを確認
      expect(true).toBe(true);
    });

    it('操作中断が動作する', () => {
      const { result } = renderHook(() =>
        useSettingsPerformance({
          enableRealTimeMonitoring: false,
        })
      );

      let tracker: any;

      act(() => {
        tracker = result.current.trackOperation('testOp', 'window');
      });

      act(() => {
        tracker.abort();
      });

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Operation testOp aborted')
      );
    });
  });

  describe('メモリ管理', () => {
    it('メモリ使用量チェックが動作する', async () => {
      const { result } = renderHook(() =>
        useSettingsPerformance({
          trackMemoryUsage: true,
          enableRealTimeMonitoring: false,
        })
      );

      await act(async () => {
        await result.current.checkMemoryUsage();
      });

      // メソッドが例外なく実行されることを確認
      expect(true).toBe(true);
    });

    it('メモリリーク検出が動作する', () => {
      const { result } = renderHook(() =>
        useSettingsPerformance({
          enableRealTimeMonitoring: false,
        })
      );

      act(() => {
        result.current.detectMemoryLeaks('TestComponent');
      });

      // メソッドが例外なく実行されることを確認
      expect(true).toBe(true);
    });
  });

  describe('レポート機能', () => {
    it('レポート生成が動作する', () => {
      const { result } = renderHook(() =>
        useSettingsPerformance({
          enableRealTimeMonitoring: false,
        })
      );

      const report = result.current.generateReport();

      expect(report).toBe('Test Report');
    });

    it('詳細メトリクス取得が動作する', () => {
      const { result } = renderHook(() =>
        useSettingsPerformance({
          enableRealTimeMonitoring: false,
        })
      );

      const metrics = result.current.getDetailedMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.summary.totalOperations).toBe(5);
    });

    it('最適化提案が生成される', () => {
      const { result } = renderHook(() =>
        useSettingsPerformance({
          enableRealTimeMonitoring: false,
        })
      );

      const suggestions = result.current.getOptimizationSuggestions();

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('ヘルパーHooks', () => {
    it('基本監視Hookが動作する', () => {
      const { result } = renderHook(() => useBasicPerformanceMonitoring('BasicComponent'));

      expect(result.current.metrics).toBeDefined();
      expect(result.current.startMonitoring).toBeInstanceOf(Function);
    });

    it('高度監視Hookが動作する', () => {
      const { result } = renderHook(() => useAdvancedPerformanceMonitoring('AdvancedComponent'));

      expect(result.current.metrics).toBeDefined();
      expect(result.current.alerts).toBeDefined();
    });
  });

  describe('エラーハンドリング', () => {
    it('重複監視開始時に警告される', () => {
      const { result } = renderHook(() =>
        useSettingsPerformance({
          enableRealTimeMonitoring: false,
        })
      );

      act(() => {
        result.current.startMonitoring();
      });

      expect(result.current.isMonitoring).toBe(true);

      act(() => {
        result.current.startMonitoring();
      });

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Monitoring is already active')
      );
    });
  });

  describe('パフォーマンス最適化', () => {
    it('戻り値がメモ化される', () => {
      const { result, rerender } = renderHook(() =>
        useSettingsPerformance({
          enableRealTimeMonitoring: false,
        })
      );

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
    });
  });
});
