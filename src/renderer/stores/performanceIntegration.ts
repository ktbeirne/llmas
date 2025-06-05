/**
 * performanceIntegration.ts - React版パフォーマンス・エラーハンドリング統合
 *
 * Phase 3.2.1 Task 4: BaseSettingsComponentのPerformanceManager/ErrorHandlerとの統合
 * React環境でのパフォーマンス監視とエラー管理の最適化
 */

import PerformanceManager from '../../settings/core/PerformanceManager';
import ErrorHandler from '../../settings/core/ErrorHandler';
import type { ErrorStrategy } from '../../settings/core/BaseTypes';

import type { SettingsSection } from './settingsStore';

/**
 * React向けパフォーマンス管理拡張
 */
export class ReactPerformanceManager extends PerformanceManager {
  private reactMetrics = new Map<
    string,
    {
      renderCount: number;
      lastRenderTime: number;
      avgRenderTime: number;
      maxRenderTime: number;
      memoryLeaks: number;
    }
  >();

  /**
   * Reactコンポーネントのレンダリング性能追跡
   */
  trackReactRender(componentName: string, renderTime: number): void {
    const existing = this.reactMetrics.get(componentName);

    if (existing) {
      existing.renderCount++;
      existing.lastRenderTime = renderTime;
      existing.avgRenderTime =
        (existing.avgRenderTime * (existing.renderCount - 1) + renderTime) / existing.renderCount;
      existing.maxRenderTime = Math.max(existing.maxRenderTime, renderTime);
    } else {
      this.reactMetrics.set(componentName, {
        renderCount: 1,
        lastRenderTime: renderTime,
        avgRenderTime: renderTime,
        maxRenderTime: renderTime,
        memoryLeaks: 0,
      });
    }

    // パフォーマンス警告
    if (renderTime > 16) {
      // 60fps threshold
      console.warn(
        `[React Performance] ${componentName} render took ${renderTime.toFixed(2)}ms (>16ms for 60fps)`
      );
    }

    // 平均レンダリング時間の監視
    const metrics = this.reactMetrics.get(componentName)!;
    if (metrics.renderCount > 10 && metrics.avgRenderTime > 10) {
      console.warn(
        `[React Performance] ${componentName} average render time is ${metrics.avgRenderTime.toFixed(2)}ms (may need optimization)`
      );
    }
  }

  /**
   * メモリリーク検出
   */
  detectMemoryLeak(componentName: string): void {
    const metrics = this.reactMetrics.get(componentName);
    if (metrics) {
      metrics.memoryLeaks++;

      if (metrics.memoryLeaks > 5) {
        console.error(
          `[React Performance] Potential memory leak detected in ${componentName} (${metrics.memoryLeaks} leaks)`
        );
      }
    }
  }

  /**
   * React特化のパフォーマンス情報取得
   */
  getReactMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};

    this.reactMetrics.forEach((value, key) => {
      metrics[key] = {
        ...value,
        efficiencyScore: this.calculateEfficiencyScore(value),
      };
    });

    return metrics;
  }

  /**
   * 効率性スコア計算（0-100）
   */
  private calculateEfficiencyScore(metrics: any): number {
    const renderScore = Math.max(0, 100 - metrics.avgRenderTime * 2); // 50ms = 0点
    const memoryScore = Math.max(0, 100 - metrics.memoryLeaks * 20); // 5回リーク = 0点

    return Math.round((renderScore + memoryScore) / 2);
  }

  /**
   * Reactメトリクスのリセット
   */
  resetReactMetrics(): void {
    this.reactMetrics.clear();
    console.log('[React Performance] React metrics reset');
  }
}

/**
 * React向けエラーハンドリング拡張
 */
export class ReactErrorHandler extends ErrorHandler {
  private componentErrors = new Map<
    string,
    {
      errorCount: number;
      lastError: Error;
      lastErrorTime: number;
      errorTypes: Set<string>;
    }
  >();

  /**
   * Reactコンポーネントエラーハンドリング
   */
  static handleReactError(
    componentName: string,
    error: Error,
    errorInfo?: {
      componentStack?: string;
      errorBoundary?: string;
    }
  ): void {
    const handler = new ReactErrorHandler();
    handler.trackComponentError(componentName, error);

    const strategy: ErrorStrategy = {
      context: `React:${componentName}`,
      showToUser: true,
      retry: false,
      severity: 'high', // React エラーは重要度高
      fallback: () => handler.executeReactErrorFallback(componentName, error),
    };

    // 詳細なエラー情報をログ
    console.group(`[React Error] ${componentName}`);
    console.error('Error:', error);
    console.error('Component Stack:', errorInfo?.componentStack);
    console.error('Error Boundary:', errorInfo?.errorBoundary);
    console.groupEnd();

    // 基底クラスのエラーハンドリング実行
    ErrorHandler.handle(error, strategy);
  }

  /**
   * コンポーネントエラー追跡
   */
  private trackComponentError(componentName: string, error: Error): void {
    const existing = this.componentErrors.get(componentName);

    if (existing) {
      existing.errorCount++;
      existing.lastError = error;
      existing.lastErrorTime = Date.now();
      existing.errorTypes.add(error.constructor.name);
    } else {
      this.componentErrors.set(componentName, {
        errorCount: 1,
        lastError: error,
        lastErrorTime: Date.now(),
        errorTypes: new Set([error.constructor.name]),
      });
    }

    // 頻発エラーの警告
    const metrics = this.componentErrors.get(componentName)!;
    if (metrics.errorCount > 3) {
      console.error(
        `[React Error] ${componentName} has frequent errors (${metrics.errorCount} times)`
      );
    }
  }

  /**
   * Reactエラー用フォールバック処理
   */
  private executeReactErrorFallback(componentName: string, error: Error): void {
    console.log(`[React Error] Executing fallback for ${componentName}`);

    // エラー境界での表示用フォールバックUI情報を提供
    const fallbackInfo = {
      componentName,
      errorMessage: error.message,
      timestamp: new Date().toISOString(),
      suggestion: this.getSuggestionForError(error),
    };

    // グローバルイベントでフォールバック情報を通知
    window.dispatchEvent(
      new CustomEvent('react-error-fallback', {
        detail: fallbackInfo,
      })
    );
  }

  /**
   * エラータイプに基づく提案取得
   */
  private getSuggestionForError(error: Error): string {
    const errorType = error.constructor.name;

    switch (errorType) {
      case 'TypeError':
        return 'データの型を確認してください。nullまたはundefinedの可能性があります。';
      case 'ReferenceError':
        return '変数またはプロパティが定義されていません。';
      case 'RangeError':
        return '配列のインデックスまたは数値の範囲を確認してください。';
      case 'SyntaxError':
        return 'コードの構文に問題があります。';
      default:
        return 'ページを再読み込みするか、設定をリセットしてみてください。';
    }
  }

  /**
   * コンポーネントエラー統計取得
   */
  getComponentErrorStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    this.componentErrors.forEach((value, key) => {
      stats[key] = {
        errorCount: value.errorCount,
        lastErrorTime: new Date(value.lastErrorTime).toISOString(),
        errorTypes: Array.from(value.errorTypes),
        stability: this.calculateStabilityScore(value),
      };
    });

    return stats;
  }

  /**
   * 安定性スコア計算（0-100）
   */
  private calculateStabilityScore(metrics: any): number {
    // エラー回数が少ないほど高スコア
    const errorScore = Math.max(0, 100 - metrics.errorCount * 10);

    // 最近のエラーは減点
    const timeSinceLastError = Date.now() - metrics.lastErrorTime;
    const timeScore = Math.min(100, timeSinceLastError / (1000 * 60 * 60)); // 1時間で満点

    return Math.round((errorScore + timeScore) / 2);
  }

  /**
   * エラー統計リセット
   */
  resetErrorStats(): void {
    this.componentErrors.clear();
    console.log('[React Error] Error statistics reset');
  }
}

/**
 * Settings専用パフォーマンス・エラー管理インテグレーター
 */
export class SettingsPerformanceIntegrator {
  private performanceManager = new ReactPerformanceManager();
  private errorHandler = new ReactErrorHandler();
  private sectionMetrics = new Map<
    SettingsSection,
    {
      operationCount: number;
      totalTime: number;
      averageTime: number;
      errorCount: number;
      lastActivity: number;
    }
  >();

  /**
   * 設定セクション操作の追跡開始
   */
  startSettingsOperation(section: SettingsSection, operation: string): string {
    const operationId = `${section}:${operation}:${Date.now()}`;
    this.performanceManager.start(operationId);
    return operationId;
  }

  /**
   * 設定セクション操作の追跡終了
   */
  endSettingsOperation(operationId: string, section: SettingsSection): number {
    const duration = this.performanceManager.end(operationId);
    this.updateSectionMetrics(section, duration, false);
    return duration;
  }

  /**
   * 設定セクションエラーの記録
   */
  recordSettingsError(section: SettingsSection, error: Error, operation: string): void {
    this.updateSectionMetrics(section, 0, true);

    ReactErrorHandler.handleReactError(
      `Settings${section.charAt(0).toUpperCase() + section.slice(1)}Component`,
      error,
      { componentStack: `Settings > ${section} > ${operation}` }
    );
  }

  /**
   * セクションメトリクス更新
   */
  private updateSectionMetrics(section: SettingsSection, duration: number, isError: boolean): void {
    const existing = this.sectionMetrics.get(section);

    if (existing) {
      if (!isError) {
        existing.operationCount++;
        existing.totalTime += duration;
        existing.averageTime = existing.totalTime / existing.operationCount;
      } else {
        existing.errorCount++;
      }
      existing.lastActivity = Date.now();
    } else {
      this.sectionMetrics.set(section, {
        operationCount: isError ? 0 : 1,
        totalTime: duration,
        averageTime: duration,
        errorCount: isError ? 1 : 0,
        lastActivity: Date.now(),
      });
    }
  }

  /**
   * 総合パフォーマンス情報取得
   */
  getComprehensiveMetrics(): {
    performance: any;
    errors: any;
    sections: any;
    summary: {
      totalOperations: number;
      totalErrors: number;
      overallHealth: number;
    };
  } {
    const performance = this.performanceManager.getPerformanceLog();
    const reactMetrics = this.performanceManager.getReactMetrics();
    const errors = this.errorHandler.getComponentErrorStats();

    // セクション別統計
    const sections: Record<string, any> = {};
    let totalOperations = 0;
    let totalErrors = 0;

    this.sectionMetrics.forEach((value, key) => {
      sections[key] = {
        ...value,
        healthScore: this.calculateSectionHealth(value),
      };
      totalOperations += value.operationCount;
      totalErrors += value.errorCount;
    });

    // 全体的な健康度スコア
    const errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;
    const overallHealth = Math.round(Math.max(0, 100 - errorRate * 100));

    return {
      performance: {
        ...performance,
        react: reactMetrics,
      },
      errors,
      sections,
      summary: {
        totalOperations,
        totalErrors,
        overallHealth,
      },
    };
  }

  /**
   * セクション健康度計算
   */
  private calculateSectionHealth(metrics: any): number {
    const operationScore = Math.min(100, metrics.operationCount * 2); // 50操作で満点
    const speedScore = Math.max(0, 100 - metrics.averageTime / 10); // 1000ms = 0点
    const errorScore = Math.max(0, 100 - metrics.errorCount * 25); // 4エラー = 0点

    return Math.round((operationScore + speedScore + errorScore) / 3);
  }

  /**
   * メトリクスのリセット
   */
  resetAllMetrics(): void {
    this.performanceManager.resetPerformanceLog();
    this.performanceManager.resetReactMetrics();
    this.errorHandler.resetErrorStats();
    this.sectionMetrics.clear();

    console.log('[Settings Performance] All metrics reset');
  }

  /**
   * パフォーマンスレポート出力
   */
  generatePerformanceReport(): string {
    const metrics = this.getComprehensiveMetrics();

    let report = '=== Settings Performance Report ===\n\n';

    // 概要
    report += `Overall Health: ${metrics.summary.overallHealth}%\n`;
    report += `Total Operations: ${metrics.summary.totalOperations}\n`;
    report += `Total Errors: ${metrics.summary.totalErrors}\n\n`;

    // セクション別詳細
    report += '=== Section Details ===\n';
    Object.entries(metrics.sections).forEach(([section, data]: [string, any]) => {
      report += `${section}: Health ${data.healthScore}%, Ops ${data.operationCount}, Errors ${data.errorCount}, Avg ${data.averageTime.toFixed(2)}ms\n`;
    });

    // React コンポーネント詳細
    if (Object.keys(metrics.performance.react).length > 0) {
      report += '\n=== React Components ===\n';
      Object.entries(metrics.performance.react).forEach(([component, data]: [string, any]) => {
        report += `${component}: Efficiency ${data.efficiencyScore}%, Renders ${data.renderCount}, Avg ${data.avgRenderTime.toFixed(2)}ms\n`;
      });
    }

    return report;
  }

  /**
   * パフォーマンス監視の有効化（開発環境用）
   */
  enableDevelopmentMonitoring(): void {
    if (process.env.NODE_ENV === 'development') {
      // 定期的なパフォーマンスレポート出力
      setInterval(() => {
        const report = this.generatePerformanceReport();
        console.group('[Settings Performance] Periodic Report');
        console.log(report);
        console.groupEnd();
      }, 30000); // 30秒間隔

      console.log('[Settings Performance] Development monitoring enabled');
    }
  }
}

// シングルトンインスタンス
export const settingsPerformanceIntegrator = new SettingsPerformanceIntegrator();

// 開発環境でのモニタリング自動有効化
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  settingsPerformanceIntegrator.enableDevelopmentMonitoring();
}

// クラスは個別にエクスポート済み
