/**
 * Unified Error Handling System
 * アプリケーション全体のエラーハンドリング統一化
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  SYSTEM = 'system',
  VRM = 'vrm',
  RENDERING = 'rendering',
  UI = 'ui',
  NETWORK = 'network',
  STORAGE = 'storage',
  ELECTRON_API = 'electron-api'
}

export interface ErrorContext {
  service: string;
  method: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  metadata?: Record<string, any>;
  userMessage?: string;
  recoverable?: boolean;
}

export interface ErrorReport {
  id: string;
  timestamp: Date;
  error: Error;
  context: ErrorContext;
  stack?: string;
  userAgent?: string;
  systemInfo?: Record<string, any>;
}

export interface ErrorRecoveryAction {
  name: string;
  handler: () => Promise<boolean>;
  description: string;
}

export class UnifiedErrorHandler {
  private static instance: UnifiedErrorHandler | null = null;
  private errorReports: ErrorReport[] = [];
  private maxReports = 100;
  private errorCallbacks: Array<(report: ErrorReport) => void> = [];
  private recoveryActions: Map<string, ErrorRecoveryAction[]> = new Map();

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): UnifiedErrorHandler {
    if (!this.instance) {
      this.instance = new UnifiedErrorHandler();
    }
    return this.instance;
  }

  /**
   * エラーを報告し、適切な処理を実行
   */
  reportError(error: Error, context: ErrorContext): string {
    const report: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      error,
      context,
      stack: error.stack,
      userAgent: navigator?.userAgent,
      systemInfo: this.getSystemInfo()
    };

    this.addErrorReport(report);
    this.logError(report);
    this.notifyCallbacks(report);
    
    if (context.recoverable) {
      this.attemptRecovery(report);
    }

    return report.id;
  }

  /**
   * カテゴリ別のエラー処理メソッド
   */
  reportVRMError(error: Error, service: string, method: string, metadata?: Record<string, any>): string {
    return this.reportError(error, {
      service,
      method,
      category: ErrorCategory.VRM,
      severity: ErrorSeverity.MEDIUM,
      metadata,
      userMessage: 'VRMモデルの処理でエラーが発生しました',
      recoverable: true
    });
  }

  reportRenderingError(error: Error, service: string, method: string, metadata?: Record<string, any>): string {
    return this.reportError(error, {
      service,
      method,
      category: ErrorCategory.RENDERING,
      severity: ErrorSeverity.HIGH,
      metadata,
      userMessage: 'レンダリング処理でエラーが発生しました',
      recoverable: true
    });
  }

  reportUIError(error: Error, service: string, method: string, metadata?: Record<string, any>): string {
    return this.reportError(error, {
      service,
      method,
      category: ErrorCategory.UI,
      severity: ErrorSeverity.LOW,
      metadata,
      userMessage: 'ユーザーインターフェースでエラーが発生しました',
      recoverable: true
    });
  }

  reportElectronAPIError(error: Error, service: string, method: string, metadata?: Record<string, any>): string {
    return this.reportError(error, {
      service,
      method,
      category: ErrorCategory.ELECTRON_API,
      severity: ErrorSeverity.MEDIUM,
      metadata,
      userMessage: 'アプリケーション機能でエラーが発生しました',
      recoverable: false
    });
  }

  reportSystemError(error: Error, service: string, method: string, metadata?: Record<string, any>): string {
    return this.reportError(error, {
      service,
      method,
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.CRITICAL,
      metadata,
      userMessage: 'システムレベルのエラーが発生しました',
      recoverable: false
    });
  }

  /**
   * リカバリーアクション登録
   */
  registerRecoveryAction(category: ErrorCategory, action: ErrorRecoveryAction): void {
    const key = category.toString();
    if (!this.recoveryActions.has(key)) {
      this.recoveryActions.set(key, []);
    }
    this.recoveryActions.get(key)!.push(action);
  }

  /**
   * エラーコールバック登録
   */
  onError(callback: (report: ErrorReport) => void): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * エラーレポート取得
   */
  getErrorReports(category?: ErrorCategory, severity?: ErrorSeverity): ErrorReport[] {
    let reports = [...this.errorReports];

    if (category) {
      reports = reports.filter(r => r.context.category === category);
    }

    if (severity) {
      reports = reports.filter(r => r.context.severity === severity);
    }

    return reports.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * エラー統計取得
   */
  getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const category of Object.values(ErrorCategory)) {
      stats[category] = this.errorReports.filter(r => r.context.category === category).length;
    }

    for (const severity of Object.values(ErrorSeverity)) {
      stats[severity] = this.errorReports.filter(r => r.context.severity === severity).length;
    }

    stats.total = this.errorReports.length;
    return stats;
  }

  /**
   * エラーレポートクリア
   */
  clearErrorReports(): void {
    this.errorReports = [];
  }

  private setupGlobalErrorHandlers(): void {
    // グローバルエラーハンドラー
    window.addEventListener('error', (event) => {
      this.reportError(event.error || new Error(event.message), {
        service: 'GlobalErrorHandler',
        method: 'window.onerror',
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.HIGH,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        },
        recoverable: false
      });
    });

    // Promise rejection ハンドラー
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
        service: 'GlobalErrorHandler',
        method: 'unhandledrejection',
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.HIGH,
        metadata: { reason: event.reason },
        recoverable: false
      });
    });
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addErrorReport(report: ErrorReport): void {
    this.errorReports.push(report);
    
    // 最大数を超えた場合、古いレポートを削除
    if (this.errorReports.length > this.maxReports) {
      this.errorReports = this.errorReports.slice(-this.maxReports);
    }
  }

  private logError(report: ErrorReport): void {
    const { context, error, timestamp, id } = report;
    const prefix = `[${context.service}:${context.method}]`;
    const severityIcon = this.getSeverityIcon(context.severity);
    
    const logMessage = `${severityIcon} ${prefix} ${context.category.toUpperCase()} Error (${id})`;
    
    switch (context.severity) {
      case ErrorSeverity.LOW:
        console.info(logMessage, error);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(logMessage, error);
        break;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        console.error(logMessage, error);
        break;
    }

    if (context.metadata) {
      console.groupCollapsed(`${prefix} Error Details`);
      console.table(context.metadata);
      console.groupEnd();
    }
  }

  private getSeverityIcon(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW: return '💡';
      case ErrorSeverity.MEDIUM: return '⚠️';
      case ErrorSeverity.HIGH: return '🚨';
      case ErrorSeverity.CRITICAL: return '💥';
      default: return '❓';
    }
  }

  private notifyCallbacks(report: ErrorReport): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(report);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }

  private async attemptRecovery(report: ErrorReport): Promise<boolean> {
    const actions = this.recoveryActions.get(report.context.category.toString());
    if (!actions || actions.length === 0) {
      return false;
    }

    console.log(`🔄 Attempting recovery for ${report.context.category} error...`);

    for (const action of actions) {
      try {
        const success = await action.handler();
        if (success) {
          console.log(`✅ Recovery successful: ${action.description}`);
          return true;
        }
      } catch (recoveryError) {
        console.error(`❌ Recovery action failed: ${action.description}`, recoveryError);
      }
    }

    console.log(`❌ All recovery attempts failed for ${report.context.category} error`);
    return false;
  }

  private getSystemInfo(): Record<string, any> {
    return {
      platform: navigator?.platform,
      userAgent: navigator?.userAgent,
      language: navigator?.language,
      cookieEnabled: navigator?.cookieEnabled,
      onLine: navigator?.onLine,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const errorHandler = UnifiedErrorHandler.getInstance();

// Helper functions for common error patterns
export function handleAsyncError<T>(
  promise: Promise<T>,
  context: Omit<ErrorContext, 'category' | 'severity'>,
  category: ErrorCategory = ErrorCategory.SYSTEM,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
): Promise<T | null> {
  return promise.catch((error) => {
    errorHandler.reportError(error, { ...context, category, severity });
    return null;
  });
}

export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => R,
  context: Omit<ErrorContext, 'category' | 'severity'>,
  category: ErrorCategory = ErrorCategory.SYSTEM,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
): (...args: T) => R | null {
  return (...args: T): R | null => {
    try {
      return fn(...args);
    } catch (error) {
      errorHandler.reportError(error as Error, { ...context, category, severity });
      return null;
    }
  };
}