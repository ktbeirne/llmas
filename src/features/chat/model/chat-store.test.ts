/**
 * Chat Store Tests - FSD Phase 2
 * チャットストアのテスト（TDD: RED Phase）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { chatStore } from './chat-store';
import type {
  ChatMessage,
  ChatConversation,
  ChatSettings,
  ChatError,
  SendMessageOptions
} from '../types';

describe('Chat Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatStore.reset();
  });

  describe('初期化', () => {
    it('初期状態が正しく設定される', () => {
      const state = chatStore.getState();
      
      expect(state.currentConversation).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isTyping).toBe(false);
      expect(state.error).toBeNull();
      expect(state.history).toEqual([]);
      expect(state.settings).toBeDefined();
      expect(state.settings.userName).toBe('User');
      expect(state.settings.mascotName).toBe('Assistant');
      expect(state.settings.model).toBe('gemini-pro');
    });
  });

  describe('会話管理', () => {
    it('新しい会話を開始できる', () => {
      const conversation = chatStore.startNewConversation('テスト会話');
      
      expect(conversation).toBeDefined();
      expect(conversation.title).toBe('テスト会話');
      expect(conversation.messages).toEqual([]);
      expect(conversation.id).toBeDefined();
      
      const state = chatStore.getState();
      expect(state.currentConversation).toEqual(conversation);
    });

    it('会話を履歴に保存する', () => {
      const conversation = chatStore.startNewConversation('テスト会話');
      chatStore.saveConversation();
      
      const state = chatStore.getState();
      expect(state.history).toHaveLength(1);
      expect(state.history[0]).toEqual(conversation);
    });

    it('会話を切り替えできる', () => {
      const conv1 = chatStore.startNewConversation('会話1');
      chatStore.saveConversation();
      const conv2 = chatStore.startNewConversation('会話2');
      
      chatStore.switchConversation(conv1.id);
      
      const state = chatStore.getState();
      expect(state.currentConversation?.id).toBe(conv1.id);
    });

    it('存在しない会話IDでの切り替えを無視する', () => {
      const originalConv = chatStore.startNewConversation('元の会話');
      
      chatStore.switchConversation('non-existent-id');
      
      const state = chatStore.getState();
      expect(state.currentConversation?.id).toBe(originalConv.id);
    });

    it('会話を削除できる', () => {
      const conversation = chatStore.startNewConversation('削除テスト');
      chatStore.saveConversation();
      
      chatStore.deleteConversation(conversation.id);
      
      const state = chatStore.getState();
      expect(state.history).toHaveLength(0);
      expect(state.currentConversation).toBeNull();
    });
  });

  describe('メッセージ管理', () => {
    beforeEach(() => {
      chatStore.startNewConversation('テスト会話');
    });

    it('ユーザーメッセージを追加できる', () => {
      const message = chatStore.addUserMessage('こんにちは');
      
      expect(message.role).toBe('user');
      expect(message.content).toBe('こんにちは');
      expect(message.id).toBeDefined();
      expect(message.timestamp).toBeDefined();
      
      const state = chatStore.getState();
      expect(state.currentConversation?.messages).toHaveLength(1);
      expect(state.currentConversation?.messages[0]).toEqual(message);
    });

    it('アシスタントメッセージを追加できる', () => {
      const message = chatStore.addAssistantMessage('はい、こんにちは！');
      
      expect(message.role).toBe('assistant');
      expect(message.content).toBe('はい、こんにちは！');
      
      const state = chatStore.getState();
      expect(state.currentConversation?.messages).toHaveLength(1);
      expect(state.currentConversation?.messages[0]).toEqual(message);
    });

    it('システムメッセージを追加できる', () => {
      const message = chatStore.addSystemMessage('あなたは親しみやすいAIです。');
      
      expect(message.role).toBe('system');
      expect(message.content).toBe('あなたは親しみやすいAIです。');
    });

    it('メッセージにメタデータを付加できる', () => {
      const metadata = { duration: 1500, functionCall: 'test' };
      const message = chatStore.addAssistantMessage('レスポンス', metadata);
      
      expect(message.metadata).toEqual(metadata);
    });

    it('メッセージを削除できる', () => {
      const message1 = chatStore.addUserMessage('メッセージ1');
      const message2 = chatStore.addUserMessage('メッセージ2');
      
      chatStore.deleteMessage(message1.id);
      
      const state = chatStore.getState();
      expect(state.currentConversation?.messages).toHaveLength(1);
      expect(state.currentConversation?.messages[0].id).toBe(message2.id);
    });

    it('メッセージを編集できる', () => {
      const message = chatStore.addUserMessage('元のメッセージ');
      
      chatStore.editMessage(message.id, '編集されたメッセージ');
      
      const state = chatStore.getState();
      expect(state.currentConversation?.messages[0].content).toBe('編集されたメッセージ');
    });
  });

  describe('ローディング状態管理', () => {
    it('ローディング状態を設定できる', () => {
      chatStore.setLoading(true);
      
      expect(chatStore.getState().isLoading).toBe(true);
      
      chatStore.setLoading(false);
      
      expect(chatStore.getState().isLoading).toBe(false);
    });

    it('タイピング状態を設定できる', () => {
      chatStore.setTyping(true);
      
      expect(chatStore.getState().isTyping).toBe(true);
      
      chatStore.setTyping(false);
      
      expect(chatStore.getState().isTyping).toBe(false);
    });
  });

  describe('エラー管理', () => {
    it('エラーを設定できる', () => {
      const error: ChatError = {
        type: 'network',
        message: 'ネットワークエラー',
        timestamp: new Date().toISOString()
      };
      
      chatStore.setError(error);
      
      expect(chatStore.getState().error).toEqual(error);
    });

    it('エラーをクリアできる', () => {
      const error: ChatError = {
        type: 'api',
        message: 'APIエラー',
        timestamp: new Date().toISOString()
      };
      
      chatStore.setError(error);
      chatStore.clearError();
      
      expect(chatStore.getState().error).toBeNull();
    });
  });

  describe('設定管理', () => {
    it('チャット設定を更新できる', () => {
      const newSettings: Partial<ChatSettings> = {
        temperature: 0.8,
        maxTokens: 2000,
        userName: '新しいユーザー'
      };
      
      chatStore.updateSettings(newSettings);
      
      const state = chatStore.getState();
      expect(state.settings.temperature).toBe(0.8);
      expect(state.settings.maxTokens).toBe(2000);
      expect(state.settings.userName).toBe('新しいユーザー');
    });

    it('システムプロンプトを更新できる', () => {
      const newPrompt = '新しいシステムプロンプト';
      
      chatStore.updateSystemPrompt(newPrompt);
      
      expect(chatStore.getState().settings.systemPrompt).toBe(newPrompt);
    });

    it('設定をデフォルトにリセットできる', () => {
      chatStore.updateSettings({ temperature: 0.9, maxTokens: 3000 });
      
      chatStore.resetSettings();
      
      const state = chatStore.getState();
      expect(state.settings.temperature).toBe(0.7); // デフォルト値
      expect(state.settings.maxTokens).toBe(1024); // デフォルト値
    });
  });

  describe('履歴管理', () => {
    it('履歴をフィルタリングできる', () => {
      const conv1 = chatStore.startNewConversation('会話1');
      chatStore.saveConversation();
      const conv2 = chatStore.startNewConversation('テスト会話');
      chatStore.saveConversation();
      
      const filtered = chatStore.filterHistory({ searchQuery: 'テスト' });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('テスト会話');
    });

    it('履歴を日付でフィルタリングできる', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const conv = chatStore.startNewConversation('昨日の会話');
      // 手動でcreatedAtを設定（テスト用）
      conv.createdAt = yesterday.toISOString();
      chatStore.saveConversation();
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filtered = chatStore.filterHistory({ dateFrom: today });
      
      expect(filtered).toHaveLength(0);
    });

    it('履歴をクリアできる', () => {
      chatStore.startNewConversation('会話1');
      chatStore.saveConversation();
      chatStore.startNewConversation('会話2');
      chatStore.saveConversation();
      
      chatStore.clearHistory();
      
      expect(chatStore.getState().history).toHaveLength(0);
    });

    it('履歴の最大長を制限する', () => {
      const maxLength = chatStore.getState().settings.maxHistoryLength;
      
      // 最大長を超えて会話を作成
      for (let i = 0; i < maxLength + 2; i++) {
        chatStore.startNewConversation(`会話${i}`);
        chatStore.saveConversation();
      }
      
      expect(chatStore.getState().history.length).toBeLessThanOrEqual(maxLength);
    });
  });

  describe('状態の購読', () => {
    it('状態変更を購読できる', () => {
      const callback = vi.fn();
      const unsubscribe = chatStore.subscribe(callback);
      
      chatStore.startNewConversation('テスト');
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          currentConversation: expect.objectContaining({
            title: 'テスト'
          })
        })
      );
      
      unsubscribe();
    });

    it('購読を解除できる', () => {
      const callback = vi.fn();
      const unsubscribe = chatStore.subscribe(callback);
      
      unsubscribe();
      
      chatStore.startNewConversation('テスト');
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('統計情報', () => {
    it('チャット統計を取得できる', () => {
      chatStore.startNewConversation('統計テスト');
      chatStore.addUserMessage('メッセージ1');
      chatStore.addAssistantMessage('レスポンス1');
      chatStore.saveConversation();
      
      const stats = chatStore.getStats();
      
      expect(stats.totalMessages).toBe(2);
      expect(stats.totalConversations).toBe(1);
      expect(stats.mostUsedModel).toBe('gemini-pro');
    });
  });

  describe('リセット機能', () => {
    it('ストア全体をリセットできる', () => {
      chatStore.startNewConversation('テスト会話');
      chatStore.addUserMessage('テストメッセージ');
      chatStore.updateSettings({ temperature: 0.9 });
      
      chatStore.reset();
      
      const state = chatStore.getState();
      expect(state.currentConversation).toBeNull();
      expect(state.history).toHaveLength(0);
      expect(state.settings.temperature).toBe(0.7); // デフォルト値
    });
  });
});