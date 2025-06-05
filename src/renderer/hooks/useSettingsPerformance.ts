/**
 * useSettingsPerformance.ts - 設定コンポーネントパフォーマンス監視Hook
 *
 * Phase 3.2.2 Task 4: React環境でのパフォーマンス最適化とリアルタイム監視
 * performanceIntegration.tsとの統合によるReact特化パフォーマンス管理
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import { useSettingsStore } from '../stores/settingsStore';
import {
  ReactPerformanceManager,
  SettingsPerformanceIntegrator,
  settingsPerformanceIntegrator,
} from '../stores/performanceIntegration';
import type { SettingsSection } from '../stores/settingsStore';

/**
 * パフォーマンス監視設定型定義
 */
export interface PerformanceMonitoringOptions {
  enableRealTimeMonitoring?: boolean;
  monitoringInterval?: number;
  componentName?: string;
  trackMemoryUsage?: boolean;
  trackRenderPerformance?: boolean;
  alertThresholds?: {
    renderTime?: number;
    memoryUsage?: number;
    errorRate?: number;
  };
}

/**
 * パフォーマンスメトリクス型定義
 */
export interface PerformanceMetrics {
  renderMetrics: {
    averageRenderTime: number;
    maxRenderTime: number;
    renderCount: number;
    efficiencyScore: number;
  };
  memoryMetrics: {
    heapUsed: number;
    heapTotal: number;
    memoryUsagePercent: number;
    potentialLeaks: number;
  };
  operationMetrics: {
    totalOperations: number;
    averageOperationTime: number;
    errorCount: number;
    successRate: number;
  };
  healthScore: number;
}

/**
 * パフォーマンス警告型定義
 */
export interface PerformanceAlert {
  type: 'render' | 'memory' | 'operation' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  suggestions: string[];
}

/**
 * useSettingsPerformance戻り値型定義
 */
export interface UseSettingsPerformanceReturn {
  // パフォーマンス監視
  metrics: PerformanceMetrics;
  alerts: PerformanceAlert[];
  isMonitoring: boolean;

  // 監視制御
  startMonitoring: (section?: SettingsSection) => void;
  stopMonitoring: () => void;
  resetMetrics: () => void;

  // 操作追跡
  trackOperation: (
    operationName: string,
    section: SettingsSection
  ) => {
    end: () => number;
    abort: () => void;
  };
  trackRender: (componentName: string, renderTime: number) => void;

  // メモリ管理
  checkMemoryUsage: () => Promise<void>;
  detectMemoryLeaks: (componentName: string) => void;

  // レポート生成
  generateReport: () => string;
  getDetailedMetrics: () => Record<string, any>;

  // 最適化提案
  getOptimizationSuggestions: () => string[];
}

/**
 * 設定コンポーネントパフォーマンス監視Hook
 *
 * @param options - パフォーマンス監視設定
 * @returns パフォーマンス監視機能
 */
export function useSettingsPerformance(
  options: PerformanceMonitoringOptions = {}
): UseSettingsPerformanceReturn {
  const {
    enableRealTimeMonitoring = true,
    monitoringInterval = 5000,
    componentName = 'SettingsComponent',
    trackMemoryUsage = true,
    trackRenderPerformance = true,
    alertThresholds = {
      renderTime: 16, // 60fps threshold
      memoryUsage: 80, // 80% memory usage
      errorRate: 5, // 5% error rate
    },
  } = options;

  // 内部状態管理
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderMetrics: {
      averageRenderTime: 0,
      maxRenderTime: 0,
      renderCount: 0,
      efficiencyScore: 100,
    },
    memoryMetrics: {
      heapUsed: 0,
      heapTotal: 0,
      memoryUsagePercent: 0,
      potentialLeaks: 0,
    },
    operationMetrics: {
      totalOperations: 0,
      averageOperationTime: 0,
      errorCount: 0,
      successRate: 100,
    },
    healthScore: 100,
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);

  // Store接続
  const store = useSettingsStore();

  // パフォーマンス管理インスタンス
  const performanceManagerRef = useRef<ReactPerformanceManager>(new ReactPerformanceManager());
  const integratorRef = useRef<SettingsPerformanceIntegrator>(settingsPerformanceIntegrator);

  // 監視関連のRef
  const monitoringIntervalRef = useRef<number | null>(null);
  const activeOperationsRef = useRef<Map<string, number>>(new Map());
  const componentNameRef = useRef<string>(componentName);

  // メトリクス更新関数
  const updateMetrics = useCallback(async (): Promise<void> => {
    try {
      const performanceManager = performanceManagerRef.current;
      const integrator = integratorRef.current;

      // Reactメトリクス取得
      const reactMetrics = performanceManager.getReactMetrics();
      const comprehensiveMetrics = integrator.getComprehensiveMetrics();

      // メモリ使用量取得
      let memoryInfo = { usedJSHeapSize: 0, totalJSHeapSize: 0 };
      if (
        typeof window !== 'undefined' &&
        'performance' in window &&
        'memory' in (window.performance as any)
      ) {
        memoryInfo = (window.performance as any).memory;
      }

      // 計算メトリクス
      const componentMetrics = reactMetrics[componentNameRef.current];
      const renderMetrics = componentMetrics
        ? {
            averageRenderTime: componentMetrics.avgRenderTime || 0,
            maxRenderTime: componentMetrics.maxRenderTime || 0,
            renderCount: componentMetrics.renderCount || 0,
            efficiencyScore: componentMetrics.efficiencyScore || 100,
          }
        : {
            averageRenderTime: 0,
            maxRenderTime: 0,
            renderCount: 0,
            efficiencyScore: 100,
          };

      const memoryUsagePercent =
        memoryInfo.totalJSHeapSize > 0
          ? (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100
          : 0;

      const memoryMetrics = {
        heapUsed: memoryInfo.usedJSHeapSize,
        heapTotal: memoryInfo.totalJSHeapSize,
        memoryUsagePercent,
        potentialLeaks: componentMetrics?.memoryLeaks || 0,
      };

      const { summary } = comprehensiveMetrics;
      const operationMetrics = {
        totalOperations: summary.totalOperations,
        averageOperationTime:
          summary.totalOperations > 0
            ? Object.values(comprehensiveMetrics.sections).reduce(
                (sum: number, section: any) => sum + section.averageTime,
                0
              ) / Object.keys(comprehensiveMetrics.sections).length
            : 0,
        errorCount: summary.totalErrors,
        successRate:
          summary.totalOperations > 0
            ? ((summary.totalOperations - summary.totalErrors) / summary.totalOperations) * 100
            : 100,
      };

      // 総合健康度スコア計算
      const healthScore = Math.round(
        renderMetrics.efficiencyScore * 0.4 +
          Math.max(0, 100 - memoryUsagePercent) * 0.3 +
          operationMetrics.successRate * 0.3
      );

      setMetrics({
        renderMetrics,
        memoryMetrics,
        operationMetrics,
        healthScore,
      });

      // 警告チェック
      await checkForAlerts(renderMetrics, memoryMetrics, operationMetrics);
    } catch (error) {
      console.error('[useSettingsPerformance] Failed to update metrics:', error);
    }
  }, [componentName]);

  // 警告チェック関数
  const checkForAlerts = useCallback(
    async (renderMetrics: any, memoryMetrics: any, operationMetrics: any): Promise<void> => {
      const newAlerts: PerformanceAlert[] = [];
      const now = Date.now();

      // レンダリング性能警告
      if (trackRenderPerformance && renderMetrics.averageRenderTime > alertThresholds.renderTime!) {
        newAlerts.push({
          type: 'render',
          severity:
            renderMetrics.averageRenderTime > alertThresholds.renderTime! * 2 ? 'high' : 'medium',
          message: `レンダリング時間が${renderMetrics.averageRenderTime.toFixed(2)}msです（推奨: ${alertThresholds.renderTime}ms以下）`,
          value: renderMetrics.averageRenderTime,
          threshold: alertThresholds.renderTime!,
          timestamp: now,
          suggestions: [
            'React.memoまたはuseMemoを使用してコンポーネントをメモ化する',
            '重い計算処理をuseCallbackでキャッシュする',
            'コンポーネントの分割を検討する',
          ],
        });
      }

      // メモリ使用量警告
      if (trackMemoryUsage && memoryMetrics.memoryUsagePercent > alertThresholds.memoryUsage!) {
        newAlerts.push({
          type: 'memory',
          severity: memoryMetrics.memoryUsagePercent > 90 ? 'critical' : 'high',
          message: `メモリ使用率が${memoryMetrics.memoryUsagePercent.toFixed(1)}%です`,
          value: memoryMetrics.memoryUsagePercent,
          threshold: alertThresholds.memoryUsage!,
          timestamp: now,
          suggestions: [
            'メモリリークがないかコンポーネントのクリーンアップを確認する',
            '使用していないデータをクリアする',
            'イメージやリソースの最適化を検討する',
          ],
        });
      }

      // エラー率警告
      if (operationMetrics.successRate < 100 - alertThresholds.errorRate!) {
        newAlerts.push({
          type: 'error',
          severity: operationMetrics.successRate < 90 ? 'critical' : 'high',
          message: `操作成功率が${operationMetrics.successRate.toFixed(1)}%です`,
          value: 100 - operationMetrics.successRate,
          threshold: alertThresholds.errorRate!,
          timestamp: now,
          suggestions: [
            'エラーハンドリングの改善',
            'バリデーション処理の強化',
            'リトライ機構の実装を検討する',
          ],
        });
      }

      // メモリリーク警告
      if (memoryMetrics.potentialLeaks > 3) {
        newAlerts.push({
          type: 'memory',
          severity: 'high',
          message: `潜在的なメモリリークが${memoryMetrics.potentialLeaks}件検出されました`,
          value: memoryMetrics.potentialLeaks,
          threshold: 3,
          timestamp: now,
          suggestions: [
            'useEffectのクリーンアップ関数を適切に実装する',
            'イベントリスナーの登録解除を確認する',
            'タイマーやインターバルのクリアを確認する',
          ],
        });
      }

      setAlerts(prev => [...prev.slice(-4), ...newAlerts].slice(-10)); // 最新10件を保持
    },
    [trackRenderPerformance, trackMemoryUsage, alertThresholds]
  );

  // 監視開始
  const startMonitoring = useCallback(
    (section?: SettingsSection): void => {
      if (isMonitoring) {
        console.warn('[useSettingsPerformance] Monitoring is already active');
        return;
      }

      console.log(
        `[useSettingsPerformance] Starting performance monitoring for ${componentNameRef.current}${section ? ` (section: ${section})` : ''}`
      );

      setIsMonitoring(true);

      if (enableRealTimeMonitoring) {
        monitoringIntervalRef.current = window.setInterval(() => {
          updateMetrics();
        }, monitoringInterval);
      }

      // 初期メトリクス更新
      updateMetrics();
    },
    [isMonitoring, enableRealTimeMonitoring, monitoringInterval, updateMetrics]
  );

  // 監視停止
  const stopMonitoring = useCallback((): void => {
    console.log(
      `[useSettingsPerformance] Stopping performance monitoring for ${componentNameRef.current}`
    );

    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }

    setIsMonitoring(false);
  }, []);

  // メトリクスリセット
  const resetMetrics = useCallback((): void => {
    console.log('[useSettingsPerformance] Resetting performance metrics');

    performanceManagerRef.current.resetReactMetrics();
    integratorRef.current.resetAllMetrics();

    setMetrics({
      renderMetrics: {
        averageRenderTime: 0,
        maxRenderTime: 0,
        renderCount: 0,
        efficiencyScore: 100,
      },
      memoryMetrics: {
        heapUsed: 0,
        heapTotal: 0,
        memoryUsagePercent: 0,
        potentialLeaks: 0,
      },
      operationMetrics: {
        totalOperations: 0,
        averageOperationTime: 0,
        errorCount: 0,
        successRate: 100,
      },
      healthScore: 100,
    });

    setAlerts([]);
  }, []);

  // 操作追跡
  const trackOperation = useCallback(
    (operationName: string, section: SettingsSection): { end: () => number; abort: () => void } => {
      const integrator = integratorRef.current;
      const operationId = integrator.startSettingsOperation(section, operationName);

      activeOperationsRef.current.set(operationId, Date.now());

      return {
        end: (): number => {
          activeOperationsRef.current.delete(operationId);
          return integrator.endSettingsOperation(operationId, section);
        },
        abort: (): void => {
          activeOperationsRef.current.delete(operationId);
          console.warn(`[useSettingsPerformance] Operation ${operationName} aborted`);
        },
      };
    },
    []
  );

  // レンダリング追跡
  const trackRender = useCallback(
    (componentName: string, renderTime: number): void => {
      if (trackRenderPerformance) {
        performanceManagerRef.current.trackReactRender(componentName, renderTime);
      }
    },
    [trackRenderPerformance]
  );

  // メモリ使用量チェック
  const checkMemoryUsage = useCallback(async (): Promise<void> => {
    if (!trackMemoryUsage) return;

    // ガベージコレクション実行（可能な場合）
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
        console.log('[useSettingsPerformance] Garbage collection triggered');
      } catch (error) {
        // GCが利用できない場合は無視
      }
    }

    // メトリクス更新
    await updateMetrics();
  }, [trackMemoryUsage, updateMetrics]);

  // メモリリーク検出
  const detectMemoryLeaks = useCallback((componentName: string): void => {
    performanceManagerRef.current.detectMemoryLeak(componentName);
  }, []);

  // レポート生成
  const generateReport = useCallback((): string => {
    return integratorRef.current.generatePerformanceReport();
  }, []);

  // 詳細メトリクス取得
  const getDetailedMetrics = useCallback((): Record<string, any> => {
    return integratorRef.current.getComprehensiveMetrics();
  }, []);

  // 最適化提案取得
  const getOptimizationSuggestions = useCallback((): string[] => {
    const suggestions: string[] = [];
    const { renderMetrics, memoryMetrics, operationMetrics, healthScore } = metrics;

    if (healthScore < 80) {
      suggestions.push('全体的なパフォーマンスの最適化が必要です');
    }

    if (renderMetrics.efficiencyScore < 70) {
      suggestions.push('Reactコンポーネントのレンダリング最適化（memo、useMemo、useCallback）');
      suggestions.push('コンポーネントの分割や遅延ローディングの検討');
    }

    if (memoryMetrics.memoryUsagePercent > 70) {
      suggestions.push('メモリ使用量の最適化（不要なデータのクリア、リソースの解放）');
    }

    if (operationMetrics.successRate < 95) {
      suggestions.push('エラーハンドリングの改善とユーザビリティの向上');
    }

    if (suggestions.length === 0) {
      suggestions.push('パフォーマンスは良好です。現在の実装を維持してください。');
    }

    return suggestions;
  }, [metrics]);

  // コンポーネント名更新
  useEffect(() => {
    componentNameRef.current = componentName;
  }, [componentName]);

  // 自動監視開始
  useEffect(() => {
    if (enableRealTimeMonitoring) {
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [enableRealTimeMonitoring, startMonitoring, stopMonitoring]);

  // アクティブ操作のクリーンアップ
  useEffect(() => {
    return () => {
      // 未完了の操作を警告
      if (activeOperationsRef.current.size > 0) {
        console.warn(
          `[useSettingsPerformance] ${activeOperationsRef.current.size} operations were not completed`
        );
        activeOperationsRef.current.clear();
      }
    };
  }, []);

  // 戻り値オブジェクト（メモ化）
  return useMemo(
    () => ({
      // パフォーマンス監視
      metrics,
      alerts,
      isMonitoring,

      // 監視制御
      startMonitoring,
      stopMonitoring,
      resetMetrics,

      // 操作追跡
      trackOperation,
      trackRender,

      // メモリ管理
      checkMemoryUsage,
      detectMemoryLeaks,

      // レポート生成
      generateReport,
      getDetailedMetrics,

      // 最適化提案
      getOptimizationSuggestions,
    }),
    [
      metrics,
      alerts,
      isMonitoring,
      startMonitoring,
      stopMonitoring,
      resetMetrics,
      trackOperation,
      trackRender,
      checkMemoryUsage,
      detectMemoryLeaks,
      generateReport,
      getDetailedMetrics,
      getOptimizationSuggestions,
    ]
  );
}

/**
 * シンプルなパフォーマンス監視Hook（基本設定）
 */
export const useBasicPerformanceMonitoring = (componentName: string) =>
  useSettingsPerformance({
    componentName,
    enableRealTimeMonitoring: true,
    monitoringInterval: 10000, // 10秒間隔
    trackMemoryUsage: false,
    trackRenderPerformance: true,
  });

/**
 * 詳細なパフォーマンス監視Hook（全機能有効）
 */
export const useAdvancedPerformanceMonitoring = (componentName: string) =>
  useSettingsPerformance({
    componentName,
    enableRealTimeMonitoring: true,
    monitoringInterval: 3000, // 3秒間隔
    trackMemoryUsage: true,
    trackRenderPerformance: true,
    alertThresholds: {
      renderTime: 10, // より厳しい閾値
      memoryUsage: 60,
      errorRate: 2,
    },
  });

export default useSettingsPerformance;
