/**
 * IPCErrorHandler の単体テスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { 
  IPCErrorHandler, 
  ErrorCategory, 
  ErrorSeverity 
} from '@/main/ipc/IPCErrorHandler';

describe('IPCErrorHandler', () => {
  beforeEach(() => {
    // 各テスト前にエラーログをクリア
    IPCErrorHandler.clearErrorLog();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    vi.restoreAllMocks();
  });

  describe('エラーカテゴリの分類', () => {
    it('should categorize validation errors correctly', () => {
      const validationError = new Error('Invalid input validation failed');
      const structuredError = IPCErrorHandler.createStructuredError(
        validationError,
        'TestHandler',
        'testMethod'
      );

      expect(structuredError.category).toBe(ErrorCategory.VALIDATION);
    });

    it('should categorize permission errors correctly', () => {
      const permissionError = new Error('Permission denied access');
      permissionError.code = 'EACCES';
      
      const structuredError = IPCErrorHandler.createStructuredError(
        permissionError,
        'TestHandler',
        'testMethod'
      );

      expect(structuredError.category).toBe(ErrorCategory.PERMISSION);
    });

    it('should categorize network errors correctly', () => {
      const networkError = new Error('Network connection timeout');
      networkError.code = 'ETIMEDOUT';
      
      const structuredError = IPCErrorHandler.createStructuredError(
        networkError,
        'TestHandler',
        'testMethod'
      );

      expect(structuredError.category).toBe(ErrorCategory.NETWORK);
    });

    it('should categorize file system errors correctly', () => {
      const fsError = new Error('File not found');
      fsError.code = 'ENOENT';
      
      const structuredError = IPCErrorHandler.createStructuredError(
        fsError,
        'TestHandler',
        'testMethod'
      );

      expect(structuredError.category).toBe(ErrorCategory.FILE_SYSTEM);
    });

    it('should categorize by handler context', () => {
      const error = new Error('Some error');
      
      const settingsError = IPCErrorHandler.createStructuredError(
        error,
        'SettingsHandler',
        'testMethod'
      );
      
      const chatError = IPCErrorHandler.createStructuredError(
        error,
        'ChatHandler',
        'testMethod'
      );
      
      const vrmError = IPCErrorHandler.createStructuredError(
        error,
        'VRMHandler',
        'testMethod'
      );

      expect(settingsError.category).toBe(ErrorCategory.SETTINGS);
      expect(chatError.category).toBe(ErrorCategory.CHAT);
      expect(vrmError.category).toBe(ErrorCategory.VRM);
    });

    it('should default to unknown category for unclassifiable errors', () => {
      const unknownError = new Error('Some random error');
      
      const structuredError = IPCErrorHandler.createStructuredError(
        unknownError,
        'UnknownHandler',
        'testMethod'
      );

      expect(structuredError.category).toBe(ErrorCategory.UNKNOWN);
    });
  });

  describe('エラー重要度の評価', () => {
    it('should assign critical severity for critical keywords', () => {
      const criticalError = new Error('Fatal crash occurred');
      
      const structuredError = IPCErrorHandler.createStructuredError(
        criticalError,
        'TestHandler',
        'testMethod'
      );

      expect(structuredError.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should assign appropriate severity by category', () => {
      const validationError = new Error('validation failed');
      const permissionError = new Error('permission denied');
      const networkError = new Error('network error');
      
      const validationStructured = IPCErrorHandler.createStructuredError(
        validationError,
        'TestHandler',
        'testMethod'
      );
      
      const permissionStructured = IPCErrorHandler.createStructuredError(
        permissionError,
        'TestHandler',
        'testMethod'
      );
      
      const networkStructured = IPCErrorHandler.createStructuredError(
        networkError,
        'TestHandler',
        'testMethod'
      );

      expect(validationStructured.severity).toBe(ErrorSeverity.LOW);
      expect(permissionStructured.severity).toBe(ErrorSeverity.HIGH);
      expect(networkStructured.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('ユーザーメッセージの生成', () => {
    it('should generate user-friendly messages for validation errors', () => {
      const validationError = new Error('validation failed');
      
      const structuredError = IPCErrorHandler.createStructuredError(
        validationError,
        'TestHandler',
        'testMethod'
      );

      expect(structuredError.userMessage).toContain('入力内容に問題があります');
    });

    it('should use predefined messages for error codes', () => {
      const error = new Error('Required field missing');
      error.code = 'REQUIRED';
      
      const structuredError = IPCErrorHandler.createStructuredError(
        error,
        'TestHandler',
        'testMethod'
      );

      expect(structuredError.userMessage).toBe('この項目は必須です');
    });

    it('should provide category-specific messages', () => {
      const networkError = new Error('network connection failed');
      
      const structuredError = IPCErrorHandler.createStructuredError(
        networkError,
        'TestHandler',
        'testMethod'
      );

      expect(structuredError.userMessage).toContain('ネットワーク接続を確認してください');
    });
  });

  describe('リトライ可能性の判定', () => {
    it('should mark network errors as retryable', () => {
      const networkError = new Error('network timeout');
      
      const structuredError = IPCErrorHandler.createStructuredError(
        networkError,
        'TestHandler',
        'testMethod'
      );

      expect(structuredError.retryable).toBe(true);
    });

    it('should mark validation errors as non-retryable', () => {
      const validationError = new Error('validation failed');
      
      const structuredError = IPCErrorHandler.createStructuredError(
        validationError,
        'TestHandler',
        'testMethod'
      );

      expect(structuredError.retryable).toBe(false);
    });

    it('should mark specific file system errors as retryable', () => {
      const busyError = new Error('file busy');
      busyError.code = 'EBUSY';
      
      const structuredError = IPCErrorHandler.createStructuredError(
        busyError,
        'TestHandler',
        'testMethod'
      );

      expect(structuredError.retryable).toBe(true);
    });
  });

  describe('エラーログ管理', () => {
    it('should log errors correctly', () => {
      const error = new Error('Test error');
      const structuredError = IPCErrorHandler.createStructuredError(
        error,
        'TestHandler',
        'testMethod'
      );

      IPCErrorHandler.logError(structuredError);
      
      const errorLog = IPCErrorHandler.getErrorLog();
      expect(errorLog).toHaveLength(1);
      expect(errorLog[0].id).toBe(structuredError.id);
    });

    it('should limit log size', () => {
      // MAX_LOG_SIZE = 1000なので、1100個のエラーを追加
      for (let i = 0; i < 1100; i++) {
        const error = new Error(`Test error ${i}`);
        const structuredError = IPCErrorHandler.createStructuredError(
          error,
          'TestHandler',
          'testMethod'
        );
        IPCErrorHandler.logError(structuredError);
      }
      
      const errorLog = IPCErrorHandler.getErrorLog();
      expect(errorLog.length).toBeLessThanOrEqual(1000);
    });

    it('should filter error log correctly', () => {
      // 異なるカテゴリのエラーを追加
      const validationError = IPCErrorHandler.createStructuredError(
        new Error('validation'),
        'TestHandler',
        'testMethod'
      );
      const networkError = IPCErrorHandler.createStructuredError(
        new Error('network'),
        'TestHandler',
        'testMethod'
      );

      IPCErrorHandler.logError(validationError);
      IPCErrorHandler.logError(networkError);

      const validationLog = IPCErrorHandler.getErrorLog({ 
        category: ErrorCategory.VALIDATION 
      });
      const networkLog = IPCErrorHandler.getErrorLog({ 
        category: ErrorCategory.NETWORK 
      });

      expect(validationLog).toHaveLength(1);
      expect(networkLog).toHaveLength(1);
      expect(validationLog[0].category).toBe(ErrorCategory.VALIDATION);
      expect(networkLog[0].category).toBe(ErrorCategory.NETWORK);
    });

    it('should filter by severity', () => {
      const lowError = IPCErrorHandler.createStructuredError(
        new Error('validation'),
        'TestHandler',
        'testMethod'
      );
      const criticalError = IPCErrorHandler.createStructuredError(
        new Error('critical system failure'),
        'TestHandler',
        'testMethod'
      );

      IPCErrorHandler.logError(lowError);
      IPCErrorHandler.logError(criticalError);

      const criticalLog = IPCErrorHandler.getErrorLog({ 
        severity: ErrorSeverity.CRITICAL 
      });

      expect(criticalLog).toHaveLength(1);
      expect(criticalLog[0].severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should filter by time range', () => {
      const pastDate = new Date(Date.now() - 1000);
      const error = IPCErrorHandler.createStructuredError(
        new Error('test'),
        'TestHandler',
        'testMethod'
      );

      IPCErrorHandler.logError(error);

      const recentLog = IPCErrorHandler.getErrorLog({ since: pastDate });
      const futureLog = IPCErrorHandler.getErrorLog({ 
        since: new Date(Date.now() + 1000) 
      });

      expect(recentLog).toHaveLength(1);
      expect(futureLog).toHaveLength(0);
    });

    it('should limit results', () => {
      // 5個のエラーを追加
      for (let i = 0; i < 5; i++) {
        const error = IPCErrorHandler.createStructuredError(
          new Error(`error ${i}`),
          'TestHandler',
          'testMethod'
        );
        IPCErrorHandler.logError(error);
      }

      const limitedLog = IPCErrorHandler.getErrorLog({ limit: 3 });
      expect(limitedLog).toHaveLength(3);
    });
  });

  describe('エラー統計', () => {
    it('should calculate error statistics correctly', () => {
      // 異なるタイプのエラーを追加
      const errors = [
        { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW },
        { category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM },
        { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW },
        { category: ErrorCategory.SYSTEM, severity: ErrorSeverity.CRITICAL }
      ];

      errors.forEach((errorInfo, i) => {
        const error = new Error(errorInfo.category);
        const structuredError = IPCErrorHandler.createStructuredError(
          error,
          'TestHandler',
          `testMethod${i}`
        );
        // 手動でカテゴリと重要度を設定（テスト用）
        structuredError.category = errorInfo.category;
        structuredError.severity = errorInfo.severity;
        IPCErrorHandler.logError(structuredError);
      });

      const stats = IPCErrorHandler.getErrorStats();

      expect(stats.total).toBe(4);
      expect(stats.byCategory[ErrorCategory.VALIDATION]).toBe(2);
      expect(stats.byCategory[ErrorCategory.NETWORK]).toBe(1);
      expect(stats.byCategory[ErrorCategory.SYSTEM]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.LOW]).toBe(2);
      expect(stats.bySeverity[ErrorSeverity.MEDIUM]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.CRITICAL]).toBe(1);
    });
  });

  describe('IPCレスポンス作成', () => {
    it('should handle validation errors correctly', () => {
      const validationResult = {
        isValid: false,
        errors: [
          { field: 'test', message: 'Required field', code: 'REQUIRED', value: null },
          { field: 'test2', message: 'Too long', code: 'TOO_LONG', value: 'test' }
        ],
        warnings: []
      };

      const response = IPCErrorHandler.handleValidationError(
        validationResult,
        'TestHandler',
        'testMethod'
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeTruthy();
    });

    it('should handle generic errors correctly', () => {
      const error = new Error('Generic error');
      
      const response = IPCErrorHandler.handleError(
        error,
        'TestHandler',
        'testMethod'
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeTruthy();
    });
  });

  describe('リトライ機能', () => {
    it('should retry operations on retryable errors', async () => {
      let attemptCount = 0;
      const operation = vi.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('network timeout');
        }
        return 'success';
      });

      const result = await IPCErrorHandler.executeWithRetry(
        operation,
        'TestHandler',
        'testMethod',
        { maxAttempts: 3, baseDelay: 10 }
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('validation failed'));

      await expect(
        IPCErrorHandler.executeWithRetry(
          operation,
          'TestHandler',
          'testMethod',
          { maxAttempts: 3, baseDelay: 10 }
        )
      ).rejects.toThrow('validation failed');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect max retry attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('network timeout'));

      await expect(
        IPCErrorHandler.executeWithRetry(
          operation,
          'TestHandler',
          'testMethod',
          { maxAttempts: 2, baseDelay: 10 }
        )
      ).rejects.toThrow('network timeout');

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should apply exponential backoff', async () => {
      let attemptCount = 0;
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      global.setTimeout = vi.fn().mockImplementation((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0); // 即座に実行
      });

      const operation = vi.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('network timeout');
        }
        return 'success';
      });

      await IPCErrorHandler.executeWithRetry(
        operation,
        'TestHandler',
        'testMethod',
        { maxAttempts: 3, baseDelay: 100, exponentialBackoff: true }
      );

      expect(delays).toHaveLength(2); // 2回のリトライ
      expect(delays[0]).toBe(100);   // 1回目: 100ms
      expect(delays[1]).toBe(200);   // 2回目: 200ms

      global.setTimeout = originalSetTimeout;
    });

    it('should respect max delay', async () => {
      let attemptCount = 0;
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      global.setTimeout = vi.fn().mockImplementation((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0);
      });

      const operation = vi.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 4) {
          throw new Error('network timeout');
        }
        return 'success';
      });

      await IPCErrorHandler.executeWithRetry(
        operation,
        'TestHandler',
        'testMethod',
        { 
          maxAttempts: 4, 
          baseDelay: 1000, 
          maxDelay: 1500,
          exponentialBackoff: true 
        }
      );

      expect(delays[0]).toBe(1000);  // 1回目: 1000ms
      expect(delays[1]).toBe(1500);  // 2回目: 1500ms (最大値で制限)
      expect(delays[2]).toBe(1500);  // 3回目: 1500ms (最大値で制限)

      global.setTimeout = originalSetTimeout;
    });
  });

  describe('コンソール出力', () => {
    it('should log errors to console with appropriate level', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const error = new Error('test error');
      const structuredError = IPCErrorHandler.createStructuredError(
        error,
        'TestHandler',
        'testMethod'
      );
      structuredError.severity = ErrorSeverity.HIGH;

      IPCErrorHandler.logError(structuredError);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/ERROR.*TestHandler:testMethod.*test error/),
        expect.objectContaining({
          id: structuredError.id,
          category: structuredError.category,
          context: structuredError.context
        })
      );

      consoleSpy.mockRestore();
    });

    it('should log warnings for medium severity', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const error = new Error('test warning');
      const structuredError = IPCErrorHandler.createStructuredError(
        error,
        'TestHandler',
        'testMethod'
      );
      structuredError.severity = ErrorSeverity.MEDIUM;

      IPCErrorHandler.logError(structuredError);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/WARN.*TestHandler:testMethod.*test warning/),
        expect.objectContaining({
          id: structuredError.id,
          category: structuredError.category
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('エラーIDの生成', () => {
    it('should generate unique error IDs', () => {
      const error1 = IPCErrorHandler.createStructuredError(
        new Error('test1'),
        'TestHandler',
        'testMethod'
      );
      
      const error2 = IPCErrorHandler.createStructuredError(
        new Error('test2'),
        'TestHandler',
        'testMethod'
      );

      expect(error1.id).not.toBe(error2.id);
      expect(error1.id).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(error2.id).toMatch(/^err_\d+_[a-z0-9]+$/);
    });
  });

  describe('エラーログのクリア', () => {
    it('should clear error log', () => {
      const error = IPCErrorHandler.createStructuredError(
        new Error('test'),
        'TestHandler',
        'testMethod'
      );
      IPCErrorHandler.logError(error);

      expect(IPCErrorHandler.getErrorLog()).toHaveLength(1);

      IPCErrorHandler.clearErrorLog();

      expect(IPCErrorHandler.getErrorLog()).toHaveLength(0);
    });
  });

  describe('エッジケース', () => {
    it('should handle null/undefined errors gracefully', () => {
      const nullError = IPCErrorHandler.createStructuredError(
        null,
        'TestHandler',
        'testMethod'
      );
      
      const undefinedError = IPCErrorHandler.createStructuredError(
        undefined,
        'TestHandler',
        'testMethod'
      );

      expect(nullError.category).toBe(ErrorCategory.UNKNOWN);
      expect(nullError.severity).toBe(ErrorSeverity.LOW);
      expect(undefinedError.category).toBe(ErrorCategory.UNKNOWN);
      expect(undefinedError.severity).toBe(ErrorSeverity.LOW);
    });

    it('should handle errors without message', () => {
      const errorWithoutMessage = {};
      
      const structuredError = IPCErrorHandler.createStructuredError(
        errorWithoutMessage,
        'TestHandler',
        'testMethod'
      );

      expect(structuredError.message).toBe('[object Object]');
    });

    it('should handle errors with circular references', () => {
      const circularError: any = { message: 'circular' };
      circularError.self = circularError;

      expect(() => {
        IPCErrorHandler.createStructuredError(
          circularError,
          'TestHandler',
          'testMethod'
        );
      }).not.toThrow();
    });
  });
});