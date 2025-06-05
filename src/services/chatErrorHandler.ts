/**
 * chatErrorHandler.ts - チャット用統一エラーハンドリング
 * 
 * TDD: GREEN Phase - テストを通すための実装
 */

// エラータイプの定義
export enum ChatErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  API = 'API',
  PERMISSION = 'PERMISSION',
  UNKNOWN = 'UNKNOWN'
}

// カスタムエラークラス
export class ChatError extends Error {
  constructor(
    public readonly type: ChatErrorType,
    message: string,
    public readonly originalError?: Error,
    public readonly details?: string,
    public readonly canRetry: boolean = false
  ) {
    super(message);
    this.name = 'ChatError';
  }
}

// エラーハンドリング結果
export interface ErrorHandlingResult {
  userMessage: string;
  shouldRetry: boolean;
  retryDelay?: number;
}

// リトライオプション
export interface RetryOptions {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff?: boolean;
}

// エラー統計
export interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  lastError?: ChatError;
}

// エラー通知コールバック
type ErrorCallback = (error: ChatError) => void;

/**
 * チャット機能用の統一エラーハンドラー
 */
export class ChatErrorHandler {
  private errorCallbacks: ErrorCallback[] = [];
  private errorStats: ErrorStatistics = {
    totalErrors: 0,
    errorsByType: {}
  };

  /**
   * エラーを分類する
   */
  classify(error: Error): ChatError {
    const errorMessage = error.message.toLowerCase();

    // APIキーエラー（リトライ不可）- invalidより前にチェック
    if (errorMessage.includes('api key')) {
      return new ChatError(
        ChatErrorType.PERMISSION,
        '設定に問題があります',
        error,
        'APIキーを確認してください'
      );
    }

    // ネットワークエラー
    if (errorMessage.includes('network') || 
        errorMessage.includes('timeout') || 
        errorMessage.includes('connection')) {
      return new ChatError(
        ChatErrorType.NETWORK,
        'ネットワークエラーが発生しました',
        error,
        undefined,
        true
      );
    }

    // バリデーションエラー
    if (errorMessage.includes('validation') || 
        errorMessage.includes('invalid')) {
      const details = errorMessage.split(':')[1]?.trim();
      return new ChatError(
        ChatErrorType.VALIDATION,
        '入力内容に問題があります',
        error,
        details
      );
    }

    // API エラー
    if (errorMessage.includes('api') || 
        errorMessage.includes('gemini') ||
        errorMessage.includes('rate limit')) {
      return new ChatError(
        ChatErrorType.API,
        'AI APIでエラーが発生しました',
        error,
        undefined,
        true
      );
    }

    // 不明なエラー
    return new ChatError(
      ChatErrorType.UNKNOWN,
      '予期しないエラーが発生しました',
      error
    );
  }

  /**
   * エラーを処理する
   */
  async handle(error: Error): Promise<ErrorHandlingResult> {
    const chatError = error instanceof ChatError ? error : this.classify(error);

    // 統計を更新
    this.updateStatistics(chatError);

    // ログ出力
    this.logError(chatError);

    // コールバック通知
    this.notifyCallbacks(chatError);

    // ユーザー向けメッセージを生成
    const userMessage = this.generateUserMessage(chatError);

    return {
      userMessage,
      shouldRetry: chatError.canRetry,
      retryDelay: chatError.canRetry ? this.getRetryDelay(chatError) : undefined
    };
  }

  /**
   * リトライ機能付きで関数を実行する
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    let lastError: Error | null = null;
    let retryCount = 0;

    while (retryCount <= options.maxRetries) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const chatError = this.classify(lastError);

        // リトライ不可能なエラーは即座に失敗
        if (!chatError.canRetry) {
          throw lastError;
        }

        // 最大リトライ回数を超えた場合
        if (retryCount === options.maxRetries) {
          throw new Error('最大リトライ回数を超えました');
        }

        // リトライ待機
        const delay = options.exponentialBackoff
          ? options.retryDelay * Math.pow(2, retryCount)
          : options.retryDelay;
        
        await this.sleep(delay);
        retryCount++;
      }
    }

    throw lastError ?? new Error('予期しないエラー');
  }

  /**
   * ChatErrorを表示用メッセージに変換する
   */
  toDisplayMessage(error: ChatError): string {
    let message = error.message;

    // 開発モードでは詳細情報を含める
    if (process.env.NODE_ENV === 'development' && error.details) {
      message += `\n詳細: ${error.details}`;
    }

    return message;
  }

  /**
   * エラー通知コールバックを登録する
   */
  onError(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * エラー統計を取得する
   */
  getStatistics(): ErrorStatistics {
    return { ...this.errorStats };
  }

  /**
   * エラー統計をリセットする
   */
  resetStatistics(): void {
    this.errorStats = {
      totalErrors: 0,
      errorsByType: {}
    };
  }

  // プライベートメソッド

  private updateStatistics(error: ChatError): void {
    this.errorStats.totalErrors++;
    this.errorStats.errorsByType[error.type] = 
      (this.errorStats.errorsByType[error.type] ?? 0) + 1;
    this.errorStats.lastError = error;
  }

  private logError(error: ChatError): void {
    console.error('[ChatError]', {
      type: error.type,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
      originalError: error.originalError
    });
  }

  private notifyCallbacks(error: ChatError): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (e) {
        console.error('Error callback failed:', e);
      }
    });
  }

  private generateUserMessage(error: ChatError): string {
    switch (error.type) {
      case ChatErrorType.NETWORK:
        return 'ネットワークエラーが発生しました。接続を確認してください。';
      case ChatErrorType.VALIDATION:
        return error.details 
          ? `入力内容に問題があります: ${error.details}`
          : '入力内容を確認してください。';
      case ChatErrorType.API:
        return 'AI APIでエラーが発生しました。しばらく待ってから再試行してください。';
      case ChatErrorType.PERMISSION:
        return '設定に問題があります。APIキーを確認してください。';
      default:
        return '予期しないエラーが発生しました。アプリケーションを再起動してください。';
    }
  }

  private getRetryDelay(error: ChatError): number {
    switch (error.type) {
      case ChatErrorType.NETWORK:
        return 1000; // 1秒
      case ChatErrorType.API:
        return 2000; // 2秒
      default:
        return 1000;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}