/**
 * ErrorHandler
 * 
 * 統一されたエラーハンドリング戦略
 * 全設定コンポーネントで使用する共通エラー処理機能
 */

import { showErrorMessage } from '../utils/SettingsHelpers';

import type { 
  ErrorEntry, 
  ErrorStrategy,
  ErrorSeverity 
} from './BaseTypes';

/**
 * エラーハンドリングクラス
 */
export class ErrorHandler {
  private static errorLog: ErrorEntry[] = [];
  private static readonly MAX_LOG_SIZE = 100;
  private static readonly ERROR_RATE_LIMIT = 10; // 1分間のエラー数制限
  private static errorRateTracker = new Map<string, number[]>();

  /**
   * エラーを処理する
   */
  static handle(error: Error, strategy: ErrorStrategy): void {
    // エラーレート制限チェック
    if (!this.checkErrorRate(strategy.context)) {
      console.warn(`[ErrorHandler] エラーレート制限により処理をスキップ: ${strategy.context}`);
      return;
    }

    // エラーログ記録
    const entry: ErrorEntry = {
      timestamp: new Date(),
      error: error.message,
      stack: error.stack,
      context: strategy.context,
      severity: strategy.severity
    };

    this.logError(entry);

    // コンソール出力
    this.outputToConsole(error, strategy);

    // ユーザー通知
    if (strategy.showToUser) {
      this.notifyUser(error, strategy);
    }

    // フォールバック実行
    if (strategy.fallback) {
      this.executeFallback(strategy.fallback, strategy.context);
    }

    // 重要度高のエラーの場合、追加処理
    if (strategy.severity === 'high') {
      this.handleCriticalError(error, strategy);
    }
  }

  /**
   * エラーレート制限チェック
   */
  private static checkErrorRate(context: string): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000; // 1分前

    // 過去1分間のエラー履歴を取得
    let timestamps = this.errorRateTracker.get(context) || [];
    
    // 1分以上古いタイムスタンプを除去
    timestamps = timestamps.filter(timestamp => timestamp > oneMinuteAgo);
    
    // エラー数が制限内かチェック
    if (timestamps.length >= this.ERROR_RATE_LIMIT) {
      return false;
    }

    // 新しいタイムスタンプを追加
    timestamps.push(now);
    this.errorRateTracker.set(context, timestamps);
    
    return true;
  }

  /**
   * コンソールにエラー出力
   */
  private static outputToConsole(error: Error, strategy: ErrorStrategy): void {
    const prefix = `[${strategy.context}]`;
    
    switch (strategy.severity) {
      case 'high':
        console.error(prefix, error);
        break;
      case 'medium':
        console.warn(prefix, error);
        break;
      case 'low':
        console.log(prefix, error);
        break;
    }

    // スタックトレースを詳細出力（開発時のみ）
    if (process.env.NODE_ENV === 'development' && error.stack) {
      console.groupCollapsed(`${prefix} Stack Trace`);
      console.log(error.stack);
      console.groupEnd();
    }
  }

  /**
   * ユーザーに通知
   */
  private static notifyUser(error: Error, strategy: ErrorStrategy): void {
    if (strategy.retry) {
      this.showRetryableError(error, strategy);
    } else {
      const message = this.formatUserMessage(error, strategy);
      showErrorMessage(message, error);
    }
  }

  /**
   * リトライ可能エラーの表示
   */
  private static showRetryableError(error: Error, strategy: ErrorStrategy): void {
    const message = this.formatUserMessage(error, strategy);
    const fullMessage = `${message}\n\n再試行しますか？`;
    
    if (confirm(fullMessage)) {
      if (strategy.fallback) {
        this.executeFallback(strategy.fallback, strategy.context);
      }
    }
  }

  /**
   * ユーザー向けメッセージのフォーマット
   */
  private static formatUserMessage(error: Error, strategy: ErrorStrategy): string {
    const severityLabels = {
      low: '軽微な問題',
      medium: '問題',
      high: '重要な問題'
    };

    const severityLabel = severityLabels[strategy.severity];
    const baseMessage = `${strategy.context}で${severityLabel}が発生しました。`;

    // エラーの種類に応じたユーザーフレンドリーなメッセージ
    const userFriendlyMessage = this.getUserFriendlyMessage(error);
    
    if (userFriendlyMessage) {
      return `${baseMessage}\n\n${userFriendlyMessage}`;
    }

    return baseMessage;
  }

  /**
   * ユーザーフレンドリーなエラーメッセージを生成
   */
  private static getUserFriendlyMessage(error: Error): string {
    const message = error.message.toLowerCase();

    // ネットワーク関連エラー
    if (message.includes('network') || message.includes('fetch')) {
      return 'ネットワーク接続を確認してください。';
    }

    // ファイルアクセスエラー
    if (message.includes('file') || message.includes('path')) {
      return 'ファイルアクセスに問題があります。ファイルの場所と権限を確認してください。';
    }

    // API関連エラー
    if (message.includes('api') || message.includes('service')) {
      return 'サービスが一時的に利用できません。しばらく待ってから再試行してください。';
    }

    // バリデーションエラー
    if (message.includes('validation') || message.includes('invalid')) {
      return '入力された値に問題があります。入力内容を確認してください。';
    }

    // メモリ関連エラー
    if (message.includes('memory') || message.includes('heap')) {
      return 'メモリ不足です。不要なアプリケーションを終了して再試行してください。';
    }

    // 権限エラー
    if (message.includes('permission') || message.includes('unauthorized')) {
      return '必要な権限がありません。管理者に問い合わせてください。';
    }

    return '';
  }

  /**
   * フォールバック処理を安全に実行
   */
  private static executeFallback(fallback: () => void, context: string): void {
    try {
      console.log(`[ErrorHandler] フォールバック実行: ${context}`);
      fallback();
    } catch (fallbackError) {
      console.error(`[ErrorHandler] フォールバック実行エラー (${context}):`, fallbackError);
      
      // フォールバック失敗は重要度高として再処理
      this.handle(fallbackError as Error, {
        context: `${context}:フォールバック`,
        showToUser: false,
        retry: false,
        severity: 'high'
      });
    }
  }

  /**
   * 重要度高エラーの追加処理
   */
  private static handleCriticalError(error: Error, strategy: ErrorStrategy): void {
    // 重要エラーの通知（開発者向け）
    console.error('🚨 CRITICAL ERROR 🚨', {
      context: strategy.context,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // エラー詳細をローカルストレージに保存（デバッグ用）
    try {
      const criticalErrors = JSON.parse(localStorage.getItem('criticalErrors') || '[]');
      criticalErrors.push({
        context: strategy.context,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      // 最新10件のみ保持
      if (criticalErrors.length > 10) {
        criticalErrors.splice(0, criticalErrors.length - 10);
      }

      localStorage.setItem('criticalErrors', JSON.stringify(criticalErrors));
    } catch (storageError) {
      console.warn('[ErrorHandler] ローカルストレージ保存エラー:', storageError);
    }
  }

  /**
   * エラーをログに記録
   */
  private static logError(entry: ErrorEntry): void {
    this.errorLog.push(entry);
    
    // ログサイズ制限
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog.shift();
    }

    // 重要度高の場合、即座にコンソール出力
    if (entry.severity === 'high') {
      console.table([{
        時刻: entry.timestamp.toLocaleTimeString(),
        コンテキスト: entry.context,
        エラー: entry.error,
        重要度: entry.severity
      }]);
    }
  }

  /**
   * エラーログを取得
   */
  static getErrorLog(): ErrorEntry[] {
    return [...this.errorLog];
  }

  /**
   * 特定期間のエラーログを取得
   */
  static getErrorLogInRange(startTime: Date, endTime: Date): ErrorEntry[] {
    return this.errorLog.filter(entry => 
      entry.timestamp >= startTime && entry.timestamp <= endTime
    );
  }

  /**
   * 重要度別エラー統計を取得
   */
  static getErrorStatistics(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byContext: Record<string, number>;
    recentErrors: ErrorEntry[];
  } {
    const bySeverity: Record<ErrorSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0
    };

    const byContext: Record<string, number> = {};

    this.errorLog.forEach(entry => {
      bySeverity[entry.severity]++;
      byContext[entry.context] = (byContext[entry.context] || 0) + 1;
    });

    // 過去1時間のエラー
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentErrors = this.errorLog.filter(entry => entry.timestamp > oneHourAgo);

    return {
      total: this.errorLog.length,
      bySeverity,
      byContext,
      recentErrors
    };
  }

  /**
   * エラーログをクリア
   */
  static clearErrorLog(): void {
    this.errorLog = [];
    this.errorRateTracker.clear();
    console.log('[ErrorHandler] エラーログをクリアしました');
  }

  /**
   * 自動復旧処理
   */
  static createAutoRecoveryStrategy(
    operation: () => Promise<void>,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): () => Promise<void> {
    return async () => {
      let attempt = 0;
      
      while (attempt < maxRetries) {
        try {
          await operation();
          return; // 成功時は終了
        } catch (error) {
          attempt++;
          
          if (attempt >= maxRetries) {
            // 最大試行回数に達した場合
            this.handle(error as Error, {
              context: '自動復旧失敗',
              showToUser: true,
              retry: false,
              severity: 'high'
            });
            throw error;
          }
          
          // リトライ前の待機
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          
          console.log(`[ErrorHandler] 自動復旧試行 ${attempt}/${maxRetries}`);
        }
      }
    };
  }

  /**
   * エラー境界（React移行準備）
   */
  static createErrorBoundary(
    componentName: string,
    fallbackComponent?: () => HTMLElement
  ): (error: Error) => HTMLElement {
    return (error: Error) => {
      this.handle(error, {
        context: `ErrorBoundary:${componentName}`,
        showToUser: true,
        retry: true,
        severity: 'high',
        fallback: () => {
          if (fallbackComponent) {
            return fallbackComponent();
          }
        }
      });

      // フォールバックUI作成
      const errorElement = document.createElement('div');
      errorElement.className = 'error-boundary';
      errorElement.innerHTML = `
        <div style="
          padding: 20px;
          border: 1px solid #ff6b6b;
          border-radius: 8px;
          background-color: #ffe0e0;
          color: #d63031;
          text-align: center;
        ">
          <h3>⚠️ エラーが発生しました</h3>
          <p>${componentName}でエラーが発生しました。</p>
          <button onclick="location.reload()" style="
            padding: 8px 16px;
            background-color: #0984e3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">ページを再読み込み</button>
        </div>
      `;

      return errorElement;
    };
  }
}

export default ErrorHandler;