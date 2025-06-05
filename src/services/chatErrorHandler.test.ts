/**
 * chatErrorHandler.test.ts - チャット用エラーハンドラーのテスト
 * 
 * TDD: RED Phase - 失敗するテストを先に書く
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ChatErrorHandler, ChatError, ChatErrorType } from './chatErrorHandler';

// モックコンソール
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn()
};

describe('ChatErrorHandler', () => {
  let errorHandler: ChatErrorHandler;

  beforeEach(() => {
    errorHandler = new ChatErrorHandler();
    // コンソールメソッドをモック化
    vi.spyOn(console, 'error').mockImplementation(mockConsole.error);
    vi.spyOn(console, 'warn').mockImplementation(mockConsole.warn);
    vi.spyOn(console, 'log').mockImplementation(mockConsole.log);
    // モックをクリア
    vi.clearAllMocks();
  });

  describe('エラー分類', () => {
    it('ネットワークエラーを正しく分類する', () => {
      const error = new Error('Network error');
      const chatError = errorHandler.classify(error);
      
      expect(chatError.type).toBe(ChatErrorType.NETWORK);
      expect(chatError.message).toBe('ネットワークエラーが発生しました');
      expect(chatError.originalError).toBe(error);
    });

    it('バリデーションエラーを正しく分類する', () => {
      const error = new Error('Validation failed: message too long');
      const chatError = errorHandler.classify(error);
      
      expect(chatError.type).toBe(ChatErrorType.VALIDATION);
      expect(chatError.message).toBe('入力内容に問題があります');
      expect(chatError.details).toBe('message too long');
    });

    it('AI APIエラーを正しく分類する', () => {
      const error = new Error('Gemini API error: rate limit exceeded');
      const chatError = errorHandler.classify(error);
      
      expect(chatError.type).toBe(ChatErrorType.API);
      expect(chatError.message).toBe('AI APIでエラーが発生しました');
      expect(chatError.canRetry).toBe(true);
    });

    it('不明なエラーを正しく分類する', () => {
      const error = new Error('Something went wrong');
      const chatError = errorHandler.classify(error);
      
      expect(chatError.type).toBe(ChatErrorType.UNKNOWN);
      expect(chatError.message).toBe('予期しないエラーが発生しました');
    });
  });

  describe('エラーハンドリング', () => {
    it('エラーを処理してユーザーフレンドリーなメッセージを返す', async () => {
      const error = new Error('Network timeout');
      const result = await errorHandler.handle(error);
      
      expect(result.userMessage).toBe('ネットワークエラーが発生しました。接続を確認してください。');
      expect(result.shouldRetry).toBe(true);
      expect(result.retryDelay).toBe(1000);
    });

    it('リトライ不可能なエラーを正しく処理する', async () => {
      const error = new Error('Invalid API key');
      const result = await errorHandler.handle(error);
      
      expect(result.userMessage).toBe('設定に問題があります。APIキーを確認してください。');
      expect(result.shouldRetry).toBe(false);
    });

    it('エラーログを正しく記録する', async () => {
      const error = new Error('Test error');
      await errorHandler.handle(error);
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[ChatError]',
        expect.objectContaining({
          type: expect.any(String),
          message: expect.any(String),
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('リトライ機能', () => {
    it('リトライ可能なエラーに対してリトライロジックを実行する', async () => {
      const mockFunction = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('Success');

      const result = await errorHandler.withRetry(mockFunction, {
        maxRetries: 3,
        retryDelay: 100
      });
      
      expect(result).toBe('Success');
      expect(mockFunction).toHaveBeenCalledTimes(3);
    });

    it('最大リトライ回数を超えた場合にエラーを投げる', async () => {
      const mockFunction = vi.fn()
        .mockRejectedValue(new Error('Network error'));

      await expect(
        errorHandler.withRetry(mockFunction, {
          maxRetries: 2,
          retryDelay: 100
        })
      ).rejects.toThrow('最大リトライ回数を超えました');
      
      expect(mockFunction).toHaveBeenCalledTimes(3); // 初回 + 2回のリトライ
    });

    it('リトライ不可能なエラーは即座に失敗する', async () => {
      const mockFunction = vi.fn()
        .mockRejectedValue(new Error('Invalid API key'));

      await expect(
        errorHandler.withRetry(mockFunction, {
          maxRetries: 3,
          retryDelay: 100
        })
      ).rejects.toThrow('Invalid API key');
      
      expect(mockFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラー変換', () => {
    it('ChatErrorをユーザー表示用メッセージに変換する', () => {
      const chatError = new ChatError(
        ChatErrorType.NETWORK,
        'ネットワークエラー',
        new Error('Connection refused')
      );

      const displayMessage = errorHandler.toDisplayMessage(chatError);
      
      expect(displayMessage).toContain('ネットワークエラー');
      expect(displayMessage).not.toContain('Connection refused'); // 技術的詳細は隠す
    });

    it('開発モードでは詳細情報を含める', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const chatError = new ChatError(
        ChatErrorType.API,
        'APIエラー',
        new Error('Rate limit: 429')
      );
      chatError.details = '429 Too Many Requests';

      const displayMessage = errorHandler.toDisplayMessage(chatError);
      
      expect(displayMessage).toContain('APIエラー');
      expect(displayMessage).toContain('429 Too Many Requests');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('エラー通知', () => {
    it('エラー通知コールバックを実行する', async () => {
      const notifyCallback = vi.fn();
      errorHandler.onError(notifyCallback);

      const error = new Error('Test error');
      await errorHandler.handle(error);
      
      expect(notifyCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.any(String),
          message: expect.any(String)
        })
      );
    });

    it('複数の通知コールバックを実行する', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      errorHandler.onError(callback1);
      errorHandler.onError(callback2);

      const error = new Error('Test error');
      await errorHandler.handle(error);
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('エラー統計', () => {
    it('エラー発生回数を記録する', async () => {
      await errorHandler.handle(new Error('Network error'));
      await errorHandler.handle(new Error('API error'));
      await errorHandler.handle(new Error('Network error'));

      const stats = errorHandler.getStatistics();
      
      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType[ChatErrorType.NETWORK]).toBe(2);
      expect(stats.errorsByType[ChatErrorType.API]).toBe(1);
    });

    it('エラー統計をリセットできる', async () => {
      await errorHandler.handle(new Error('Test error'));
      errorHandler.resetStatistics();

      const stats = errorHandler.getStatistics();
      
      expect(stats.totalErrors).toBe(0);
      expect(stats.errorsByType).toEqual({});
    });
  });
});