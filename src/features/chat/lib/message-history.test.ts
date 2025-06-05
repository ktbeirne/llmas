/**
 * Message History Manager Tests - FSD Phase 2
 * メッセージ履歴管理のテスト（TDD: RED Phase）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { ChatMessage, ChatConversation } from '../types';

import { MessageHistoryManager } from './message-history';

describe('Message History Manager', () => {
  let historyManager: MessageHistoryManager;

  beforeEach(() => {
    historyManager = new MessageHistoryManager();
  });

  describe('初期化', () => {
    it('初期状態では履歴が空', () => {
      expect(historyManager.getConversations()).toEqual([]);
      expect(historyManager.getCurrentConversation()).toBeNull();
    });
  });

  describe('会話管理', () => {
    it('新しい会話を作成できる', () => {
      const conversation = historyManager.createConversation('テスト会話');
      
      expect(conversation.title).toBe('テスト会話');
      expect(conversation.messages).toEqual([]);
      expect(conversation.id).toBeDefined();
    });

    it('会話を保存できる', () => {
      const conversation = historyManager.createConversation('保存テスト');
      
      historyManager.saveConversation(conversation);
      
      expect(historyManager.getConversations()).toHaveLength(1);
      expect(historyManager.getConversations()[0]).toEqual(conversation);
    });

    it('会話を読み込める', () => {
      const conversation = historyManager.createConversation('読み込みテスト');
      historyManager.saveConversation(conversation);
      
      const loaded = historyManager.loadConversation(conversation.id);
      
      expect(loaded).toEqual(conversation);
    });

    it('存在しない会話IDで読み込むとnullを返す', () => {
      const loaded = historyManager.loadConversation('non-existent-id');
      
      expect(loaded).toBeNull();
    });

    it('会話を削除できる', () => {
      const conversation = historyManager.createConversation('削除テスト');
      historyManager.saveConversation(conversation);
      
      historyManager.deleteConversation(conversation.id);
      
      expect(historyManager.getConversations()).toHaveLength(0);
    });

    it('会話タイトルを更新できる', () => {
      const conversation = historyManager.createConversation('元のタイトル');
      historyManager.saveConversation(conversation);
      
      historyManager.updateConversationTitle(conversation.id, '新しいタイトル');
      
      const updated = historyManager.loadConversation(conversation.id);
      expect(updated?.title).toBe('新しいタイトル');
    });
  });

  describe('メッセージ管理', () => {
    let testConversation: ChatConversation;

    beforeEach(() => {
      testConversation = historyManager.createConversation('メッセージテスト');
      historyManager.saveConversation(testConversation);
    });

    it('メッセージを追加できる', () => {
      const message: ChatMessage = {
        id: 'msg1',
        role: 'user',
        content: 'テストメッセージ',
        timestamp: new Date().toISOString()
      };

      historyManager.addMessage(testConversation.id, message);
      
      const updated = historyManager.loadConversation(testConversation.id);
      expect(updated?.messages).toHaveLength(1);
      expect(updated?.messages[0]).toEqual(message);
    });

    it('複数のメッセージを順序通りに追加できる', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'メッセージ1',
          timestamp: '2024-01-01T10:00:00Z'
        },
        {
          id: 'msg2',
          role: 'assistant',
          content: 'メッセージ2',
          timestamp: '2024-01-01T10:01:00Z'
        },
        {
          id: 'msg3',
          role: 'user',
          content: 'メッセージ3',
          timestamp: '2024-01-01T10:02:00Z'
        }
      ];

      messages.forEach(msg => {
        historyManager.addMessage(testConversation.id, msg);
      });
      
      const updated = historyManager.loadConversation(testConversation.id);
      expect(updated?.messages).toHaveLength(3);
      expect(updated?.messages.map(m => m.content)).toEqual([
        'メッセージ1', 'メッセージ2', 'メッセージ3'
      ]);
    });

    it('メッセージを更新できる', () => {
      const message: ChatMessage = {
        id: 'msg1',
        role: 'user',
        content: '元のメッセージ',
        timestamp: new Date().toISOString()
      };

      historyManager.addMessage(testConversation.id, message);
      historyManager.updateMessage(testConversation.id, 'msg1', '更新されたメッセージ');
      
      const updated = historyManager.loadConversation(testConversation.id);
      expect(updated?.messages[0].content).toBe('更新されたメッセージ');
    });

    it('メッセージを削除できる', () => {
      const message1: ChatMessage = {
        id: 'msg1',
        role: 'user',
        content: 'メッセージ1',
        timestamp: new Date().toISOString()
      };
      const message2: ChatMessage = {
        id: 'msg2',
        role: 'assistant',
        content: 'メッセージ2',
        timestamp: new Date().toISOString()
      };

      historyManager.addMessage(testConversation.id, message1);
      historyManager.addMessage(testConversation.id, message2);
      historyManager.deleteMessage(testConversation.id, 'msg1');
      
      const updated = historyManager.loadConversation(testConversation.id);
      expect(updated?.messages).toHaveLength(1);
      expect(updated?.messages[0].id).toBe('msg2');
    });
  });

  describe('履歴の検索とフィルタリング', () => {
    beforeEach(() => {
      // テスト用の会話を複数作成
      const conv1 = historyManager.createConversation('プログラミングについて');
      const conv2 = historyManager.createConversation('料理のレシピ');
      const conv3 = historyManager.createConversation('旅行計画');

      historyManager.saveConversation(conv1);
      historyManager.saveConversation(conv2);
      historyManager.saveConversation(conv3);

      // メッセージを追加
      historyManager.addMessage(conv1.id, {
        id: 'msg1',
        role: 'user',
        content: 'TypeScriptについて教えて',
        timestamp: new Date().toISOString()
      });

      historyManager.addMessage(conv2.id, {
        id: 'msg2',
        role: 'user',
        content: 'パスタの作り方',
        timestamp: new Date().toISOString()
      });

      historyManager.addMessage(conv3.id, {
        id: 'msg3',
        role: 'user',
        content: '東京観光のおすすめ',
        timestamp: new Date().toISOString()
      });
    });

    it('タイトルで会話を検索できる', () => {
      const results = historyManager.searchConversations('プログラミング');
      
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('プログラミングについて');
    });

    it('メッセージ内容で会話を検索できる', () => {
      const results = historyManager.searchConversations('TypeScript');
      
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('プログラミングについて');
    });

    it('複数の結果が見つかる検索', () => {
      const results = historyManager.searchConversations('の');
      
      expect(results.length).toBeGreaterThan(1);
    });

    it('見つからない検索クエリで空の結果を返す', () => {
      const results = historyManager.searchConversations('存在しないキーワード');
      
      expect(results).toHaveLength(0);
    });
  });

  describe('エクスポート・インポート', () => {
    it('履歴をJSONでエクスポートできる', () => {
      const conversation = historyManager.createConversation('エクスポートテスト');
      historyManager.saveConversation(conversation);
      
      const exported = historyManager.exportToJSON();
      const parsed = JSON.parse(exported);
      
      expect(parsed.conversations).toHaveLength(1);
      expect(parsed.conversations[0].title).toBe('エクスポートテスト');
    });

    it('JSONから履歴をインポートできる', () => {
      const testData = {
        conversations: [{
          id: 'import-test',
          title: 'インポートテスト',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          model: 'gemini-pro'
        }]
      };

      historyManager.importFromJSON(JSON.stringify(testData));
      
      const conversations = historyManager.getConversations();
      expect(conversations).toHaveLength(1);
      expect(conversations[0].title).toBe('インポートテスト');
    });

    it('無効なJSONでインポートエラーが発生', () => {
      expect(() => {
        historyManager.importFromJSON('invalid json');
      }).toThrow('無効なJSONデータです');
    });
  });

  describe('統計情報', () => {
    beforeEach(() => {
      const conv1 = historyManager.createConversation('統計テスト1');
      const conv2 = historyManager.createConversation('統計テスト2');
      
      historyManager.saveConversation(conv1);
      historyManager.saveConversation(conv2);

      // メッセージを追加
      for (let i = 0; i < 3; i++) {
        historyManager.addMessage(conv1.id, {
          id: `msg1-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `メッセージ ${i}`,
          timestamp: new Date().toISOString()
        });
      }

      for (let i = 0; i < 2; i++) {
        historyManager.addMessage(conv2.id, {
          id: `msg2-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `メッセージ ${i}`,
          timestamp: new Date().toISOString()
        });
      }
    });

    it('統計情報を取得できる', () => {
      const stats = historyManager.getStatistics();
      
      expect(stats.totalConversations).toBe(2);
      expect(stats.totalMessages).toBe(5);
      expect(stats.averageMessagesPerConversation).toBe(2.5);
    });
  });

  describe('履歴のクリア', () => {
    it('すべての履歴をクリアできる', () => {
      const conversation = historyManager.createConversation('クリアテスト');
      historyManager.saveConversation(conversation);
      
      historyManager.clearAllHistory();
      
      expect(historyManager.getConversations()).toHaveLength(0);
    });
  });
});