/**
 * IPC通信の統一されたエラーハンドリングシステム
 */

import { 
  createErrorResponse, 
  IPCResponse, 
  ValidationResult 
} from './types';

/**
 * エラーの種類を分類
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  NETWORK = 'network',
  FILE_SYSTEM = 'file_system',
  WINDOW_MANAGEMENT = 'window_management',
  SETTINGS = 'settings',
  CHAT = 'chat',
  VRM = 'vrm',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

/**
 * エラーの重要度レベル
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 構造化されたエラー情報
 */
export interface StructuredError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  originalError?: unknown;
  context?: Record<string, unknown>;
  timestamp: string;
  handler: string;
  method: string;
  retryable: boolean;
  retryCount?: number;
  maxRetries?: number;
}

/**
 * リトライ設定
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
}

/**
 * 統一されたIPCエラーハンドリングクラス
 */
export class IPCErrorHandler {
  private static errorLog: StructuredError[] = [];
  private static readonly MAX_LOG_SIZE = 1000;
  
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBackoff: true
  };

  private static readonly ERROR_MESSAGES: Record<string, string> = {
    // バリデーションエラー
    'REQUIRED': 'この項目は必須です',
    'INVALID_TYPE': '入力形式が正しくありません',
    'TOO_SHORT': '文字数が不足しています',
    'TOO_LONG': '文字数が上限を超えています',
    'INVALID_PATTERN': '形式が正しくありません',
    'XSS_DETECTED': '危険な文字が含まれています',
    'NOT_INTEGER': '整数を入力してください',
    'TOO_SMALL': '値が小さすぎます',
    'TOO_LARGE': '値が大きすぎます',
    'INVALID_VALUE': '無効な値です',
    
    // ファイルシステムエラー
    'FILE_NOT_FOUND': 'ファイルが見つかりません',
    'PERMISSION_DENIED': 'ファイルへのアクセス権限がありません',
    'DISK_FULL': 'ディスクの空き容量が不足しています',
    
    // ネットワークエラー
    'NETWORK_ERROR': 'ネットワーク接続エラーです',
    'TIMEOUT': '処理がタイムアウトしました',
    'SERVER_ERROR': 'サーバーエラーが発生しました',
    
    // ウィンドウ管理エラー
    'WINDOW_NOT_FOUND': 'ウィンドウが見つかりません',
    'WINDOW_DESTROYED': 'ウィンドウが破棄されています',
    
    // 設定エラー
    'SETTINGS_CORRUPT': '設定ファイルが破損しています',
    'SETTINGS_READONLY': '設定ファイルが読み取り専用です',
    
    // チャットエラー
    'CHAT_SERVICE_UNAVAILABLE': 'チャットサービスが利用できません',
    'API_KEY_INVALID': 'APIキーが無効です',
    'RATE_LIMIT_EXCEEDED': 'リクエスト制限に達しました',
    
    // システムエラー
    'SYSTEM_RESOURCE_EXHAUSTED': 'システムリソースが不足しています',
    'UNKNOWN_VALIDATOR': '不明なバリデーターです',
    'VALIDATION_ERROR': 'バリデーション処理でエラーが発生しました'
  };

  /**
   * エラーIDを生成
   */
  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * エラーカテゴリを推定
   */
  private static categorizeError(error: unknown, context?: Record<string, unknown>): ErrorCategory {
    if (!error) return ErrorCategory.UNKNOWN;
    
    const message = error.message || error.toString() || '';
    const lowerMessage = message.toLowerCase();
    
    // コンテキストベースの分類
    if (context?.handler) {
      const handler = context.handler.toLowerCase();
      if (handler.includes('settings')) return ErrorCategory.SETTINGS;
      if (handler.includes('chat')) return ErrorCategory.CHAT;
      if (handler.includes('vrm') || handler.includes('window')) return ErrorCategory.VRM;
    }
    
    // メッセージベースの分類
    if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }
    if (lowerMessage.includes('permission') || lowerMessage.includes('access')) {
      return ErrorCategory.PERMISSION;
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('timeout') || lowerMessage.includes('connection')) {
      return ErrorCategory.NETWORK;
    }
    if (lowerMessage.includes('file') || lowerMessage.includes('directory') || lowerMessage.includes('path')) {
      return ErrorCategory.FILE_SYSTEM;
    }
    if (lowerMessage.includes('window') || lowerMessage.includes('display')) {
      return ErrorCategory.WINDOW_MANAGEMENT;
    }
    
    // エラータイプベースの分類
    if (error.code === 'ENOENT') return ErrorCategory.FILE_SYSTEM;
    if (error.code === 'EACCES' || error.code === 'EPERM') return ErrorCategory.PERMISSION;
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') return ErrorCategory.NETWORK;
    
    return ErrorCategory.UNKNOWN;
  }

  /**
   * エラーの重要度を判定
   */
  private static assessSeverity(error: unknown, category: ErrorCategory): ErrorSeverity {
    if (!error) return ErrorSeverity.LOW;
    
    const message = error.message || error.toString() || '';
    const lowerMessage = message.toLowerCase();
    
    // 重要度の高いキーワード
    if (lowerMessage.includes('critical') || lowerMessage.includes('fatal') || 
        lowerMessage.includes('crash') || lowerMessage.includes('corrupt')) {
      return ErrorSeverity.CRITICAL;
    }
    
    // カテゴリベースの重要度
    switch (category) {
      case ErrorCategory.VALIDATION:
        return ErrorSeverity.LOW;
      case ErrorCategory.PERMISSION:
      case ErrorCategory.FILE_SYSTEM:
        return ErrorSeverity.HIGH;
      case ErrorCategory.NETWORK:
      case ErrorCategory.CHAT:
        return ErrorSeverity.MEDIUM;
      case ErrorCategory.WINDOW_MANAGEMENT:
      case ErrorCategory.VRM:
        return ErrorSeverity.HIGH;
      case ErrorCategory.SETTINGS:
        return ErrorSeverity.HIGH;
      case ErrorCategory.SYSTEM:
        return ErrorSeverity.CRITICAL;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * ユーザーフレンドリーなエラーメッセージを生成
   */
  private static generateUserMessage(error: unknown, category: ErrorCategory): string {
    if (!error) return 'エラーが発生しました';
    
    const message = error.message || error.toString() || '';
    
    // バリデーションエラーの場合はコードから変換
    if (error.code && this.ERROR_MESSAGES[error.code]) {
      return this.ERROR_MESSAGES[error.code];
    }
    
    // カテゴリベースのメッセージ
    switch (category) {
      case ErrorCategory.VALIDATION:
        return '入力内容に問題があります。内容を確認してください。';
      case ErrorCategory.PERMISSION:
        return 'アクセス権限がありません。管理者として実行してください。';
      case ErrorCategory.NETWORK:
        return 'ネットワーク接続を確認してください。';
      case ErrorCategory.FILE_SYSTEM:
        return 'ファイル操作でエラーが発生しました。ファイルパスとアクセス権限を確認してください。';
      case ErrorCategory.WINDOW_MANAGEMENT:
        return 'ウィンドウ操作でエラーが発生しました。アプリケーションを再起動してください。';
      case ErrorCategory.SETTINGS:
        return '設定の保存・読み込みでエラーが発生しました。';
      case ErrorCategory.CHAT:
        return 'チャット機能でエラーが発生しました。APIキーとネットワーク接続を確認してください。';
      case ErrorCategory.VRM:
        return '3D表示でエラーが発生しました。VRMファイルを確認してください。';
      case ErrorCategory.SYSTEM:
        return 'システムエラーが発生しました。アプリケーションを再起動してください。';
      default:
        return `エラーが発生しました: ${message}`;
    }
  }

  /**
   * エラーがリトライ可能かどうか判定
   */
  private static isRetryable(category: ErrorCategory, error: unknown): boolean {
    switch (category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.CHAT:
        return true;
      case ErrorCategory.FILE_SYSTEM:
        // 一時的なファイルロックなどはリトライ可能
        return error.code === 'EBUSY' || error.code === 'EMFILE';
      case ErrorCategory.VALIDATION:
      case ErrorCategory.PERMISSION:
        return false;
      default:
        return false;
    }
  }

  /**
   * 構造化されたエラーを作成
   */
  public static createStructuredError(
    error: unknown,
    handler: string,
    method: string,
    context?: Record<string, unknown>
  ): StructuredError {
    const category = this.categorizeError(error, { ...context, handler });
    const severity = this.assessSeverity(error, category);
    const userMessage = this.generateUserMessage(error, category);
    const retryable = this.isRetryable(category, error);
    
    const structuredError: StructuredError = {
      id: this.generateErrorId(),
      category,
      severity,
      message: error?.message || error?.toString() || 'Unknown error',
      userMessage,
      originalError: error,
      context,
      timestamp: new Date().toISOString(),
      handler,
      method,
      retryable,
      retryCount: 0,
      maxRetries: retryable ? this.DEFAULT_RETRY_CONFIG.maxAttempts : 0
    };
    
    return structuredError;
  }

  /**
   * エラーをログに記録
   */
  public static logError(structuredError: StructuredError): void {
    // ログサイズ制限
    if (this.errorLog.length >= this.MAX_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(-this.MAX_LOG_SIZE + 100);
    }
    
    this.errorLog.push(structuredError);
    
    // コンソール出力
    const logLevel = this.getLogLevel(structuredError.severity);
    const logMessage = `[${structuredError.handler}:${structuredError.method}] ${structuredError.message}`;
    
    switch (logLevel) {
      case 'error':
        console.error(`${structuredError.timestamp} ERROR ${logMessage}`, {
          id: structuredError.id,
          category: structuredError.category,
          context: structuredError.context
        });
        break;
      case 'warn':
        console.warn(`${structuredError.timestamp} WARN ${logMessage}`, {
          id: structuredError.id,
          category: structuredError.category
        });
        break;
      default:
        console.log(`${structuredError.timestamp} INFO ${logMessage}`, {
          id: structuredError.id,
          category: structuredError.category
        });
    }
  }

  /**
   * ログレベルを取得
   */
  private static getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      default:
        return 'info';
    }
  }

  /**
   * バリデーションエラーからIPCレスポンスを作成
   */
  public static handleValidationError(
    validation: ValidationResult,
    handler: string,
    method: string
  ): IPCResponse {
    const errorMessages = validation.errors.map(e => e.message).join(', ');
    const structuredError = this.createStructuredError(
      new Error(`Validation failed: ${errorMessages}`),
      handler,
      method,
      { validationErrors: validation.errors }
    );
    
    this.logError(structuredError);
    
    return createErrorResponse(structuredError.userMessage);
  }

  /**
   * 汎用エラーからIPCレスポンスを作成
   */
  public static handleError(
    error: unknown,
    handler: string,
    method: string,
    context?: Record<string, unknown>
  ): IPCResponse {
    const structuredError = this.createStructuredError(error, handler, method, context);
    this.logError(structuredError);
    
    return createErrorResponse(structuredError.userMessage);
  }

  /**
   * リトライ可能な処理を実行
   */
  public static async executeWithRetry<T>(
    operation: () => Promise<T>,
    handler: string,
    method: string,
    retryConfig: Partial<RetryConfig> = {},
    context?: Record<string, unknown>
  ): Promise<T> {
    const config = { ...this.DEFAULT_RETRY_CONFIG, ...retryConfig };
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const structuredError = this.createStructuredError(error, handler, method, context);
        structuredError.retryCount = attempt;
        
        if (!structuredError.retryable || attempt === config.maxAttempts) {
          this.logError(structuredError);
          throw error;
        }
        
        // リトライ前の遅延
        const delay = config.exponentialBackoff 
          ? Math.min(config.baseDelay * Math.pow(2, attempt - 1), config.maxDelay)
          : config.baseDelay;
        
        console.warn(`[${handler}:${method}] リトライ ${attempt}/${config.maxAttempts} (${delay}ms後)`, {
          error: structuredError.message,
          id: structuredError.id
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * エラーログの取得
   */
  public static getErrorLog(filters?: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    handler?: string;
    since?: Date;
    limit?: number;
  }): StructuredError[] {
    let filteredLog = this.errorLog;
    
    if (filters) {
      if (filters.category) {
        filteredLog = filteredLog.filter(e => e.category === filters.category);
      }
      if (filters.severity) {
        filteredLog = filteredLog.filter(e => e.severity === filters.severity);
      }
      if (filters.handler) {
        filteredLog = filteredLog.filter(e => e.handler === filters.handler);
      }
      if (filters.since) {
        filteredLog = filteredLog.filter(e => new Date(e.timestamp) >= filters.since);
      }
      if (filters.limit) {
        filteredLog = filteredLog.slice(-filters.limit);
      }
    }
    
    return filteredLog;
  }

  /**
   * エラー統計の取得
   */
  public static getErrorStats(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    byHandler: Record<string, number>;
  } {
    const stats = {
      total: this.errorLog.length,
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      byHandler: {} as Record<string, number>
    };
    
    // カテゴリ別統計
    Object.values(ErrorCategory).forEach(category => {
      stats.byCategory[category] = 0;
    });
    
    // 重要度別統計
    Object.values(ErrorSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });
    
    // 統計計算
    this.errorLog.forEach(error => {
      stats.byCategory[error.category]++;
      stats.bySeverity[error.severity]++;
      stats.byHandler[error.handler] = (stats.byHandler[error.handler] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * エラーログのクリア
   */
  public static clearErrorLog(): void {
    this.errorLog = [];
    console.log('[IPCErrorHandler] エラーログをクリアしました');
  }
}