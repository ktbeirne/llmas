/**
 * Gemini Client Tests - FSD Phase 2
 * Gemini APIクライアントのテスト（TDD: RED Phase）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import type {
  ChatMessage,
  ChatSettings,
  SendMessageOptions
} from '../types';

import { GeminiClient } from './gemini-client';

// Google AI SDK をモック
vi.mock('@google/generative-ai', () => {
  const mockModel = {
    generateContent: vi.fn(),
    generateContentStream: vi.fn(),
    startChat: vi.fn()
  };

  const mockGenAI = {
    getGenerativeModel: vi.fn().mockReturnValue(mockModel)
  };

  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => mockGenAI),
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: 'HARASSMENT',
      HARM_CATEGORY_HATE_SPEECH: 'HATE_SPEECH',
      HARM_CATEGORY_SEXUALLY_EXPLICIT: 'SEXUALLY_EXPLICIT',
      HARM_CATEGORY_DANGEROUS_CONTENT: 'DANGEROUS_CONTENT'
    },
    HarmBlockThreshold: {
      BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE'
    }
  };
});

describe('Gemini Client', () => {
  let geminiClient: GeminiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    geminiClient = new GeminiClient('test-api-key');
  });

  describe('初期化', () => {
    it('APIキーなしで初期化すると例外が発生', () => {
      expect(() => new GeminiClient('')).toThrow('APIキーが必要です');
    });

    it('正常に初期化される', () => {
      expect(geminiClient).toBeInstanceOf(GeminiClient);
    });
  });

  describe('バリデーション', () => {
    it('空のメッセージでバリデーションエラーが発生', async () => {
      await expect(
        geminiClient.sendMessage('')
      ).rejects.toThrow('メッセージが空です');
    });

    it('長すぎるメッセージでバリデーションエラーが発生', async () => {
      const longMessage = 'a'.repeat(10001);
      
      await expect(
        geminiClient.sendMessage(longMessage)
      ).rejects.toThrow('メッセージが長すぎます');
    });
  });

  describe('設定管理', () => {
    it('無効な設定値でバリデーションエラーが発生', () => {
      expect(() => {
        geminiClient.updateSettings({ temperature: 2.0 });
      }).toThrow('temperature は 0.0 から 1.0 の間で設定してください');

      expect(() => {
        geminiClient.updateSettings({ maxTokens: -1 });
      }).toThrow('maxTokens は正の数で設定してください');
    });

    it('有効な設定値で更新できる', () => {
      expect(() => {
        geminiClient.updateSettings({
          temperature: 0.8,
          maxTokens: 2048
        });
      }).not.toThrow();
    });
  });
});