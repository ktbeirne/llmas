import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChatHistoryStore } from './chatHistoryStore';

// electron-store のモック
vi.mock('electron-store', () => {
  const Store = vi.fn(() => ({
    store: new Map(),
    get: vi.fn(function(key: string, defaultValue?: any) {
      return this.store.get(key) ?? defaultValue;
    }),
    set: vi.fn(function(key: string, value: any) {
      this.store.set(key, value);
    }),
    clear: vi.fn(function() {
      this.store.clear();
    })
  }));
  return { default: Store };
});

describe('ChatHistoryStore', () => {
  let chatHistoryStore: ChatHistoryStore;

  beforeEach(() => {
    chatHistoryStore = new ChatHistoryStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初期化', () => {
    it('新しいインスタンスが正常に作成される', () => {
      expect(chatHistoryStore).toBeInstanceOf(ChatHistoryStore);
    });

    it('初期状態では空の履歴を返す', () => {
      const history = chatHistoryStore.getHistory();
      expect(history).toEqual([]);
    });

    it('デフォルトのシステムプロンプトを返す', () => {
      const systemPrompt = chatHistoryStore.getSystemPrompt();
      expect(systemPrompt).toBe('あなたは親しみやすく愛らしいAIアシスタントです。ユーザーと楽しく会話してください。');
    });
  });

  describe('メッセージの追加', () => {
    it('ユーザーメッセージを正常に追加できる', () => {
      const userMessage = 'こんにちは';
      chatHistoryStore.addMessage('user', userMessage);

      const history = chatHistoryStore.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe(userMessage);
      expect(history[0].timestamp).toBeDefined();
    });

    it('アシスタントメッセージを正常に追加できる', () => {
      const assistantMessage = 'こんにちは！お元気ですか？';
      chatHistoryStore.addMessage('assistant', assistantMessage);

      const history = chatHistoryStore.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].role).toBe('assistant');
      expect(history[0].content).toBe(assistantMessage);
      expect(history[0].timestamp).toBeDefined();
    });

    it('複数のメッセージを順序通りに追加できる', () => {
      chatHistoryStore.addMessage('user', 'メッセージ1');
      chatHistoryStore.addMessage('assistant', 'メッセージ2');
      chatHistoryStore.addMessage('user', 'メッセージ3');

      const history = chatHistoryStore.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].content).toBe('メッセージ1');
      expect(history[1].content).toBe('メッセージ2');
      expect(history[2].content).toBe('メッセージ3');
    });

    it('タイムスタンプが正しいISO形式で設定される', () => {
      const beforeTime = new Date().toISOString();
      chatHistoryStore.addMessage('user', 'テストメッセージ');
      const afterTime = new Date().toISOString();

      const history = chatHistoryStore.getHistory();
      const timestamp = history[0].timestamp;
      
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(timestamp >= beforeTime).toBe(true);
      expect(timestamp <= afterTime).toBe(true);
    });
  });

  describe('フル履歴取得', () => {
    it('システムプロンプトを含むフル履歴を返す', () => {
      chatHistoryStore.addMessage('user', 'ユーザーメッセージ');
      chatHistoryStore.addMessage('assistant', 'アシスタントメッセージ');

      const fullHistory = chatHistoryStore.getFullHistory();
      expect(fullHistory).toHaveLength(3);
      expect(fullHistory[0].role).toBe('system');
      expect(fullHistory[1].role).toBe('user');
      expect(fullHistory[2].role).toBe('assistant');
    });

    it('システムプロンプトが最初に配置される', () => {
      chatHistoryStore.addMessage('user', 'テスト');
      
      const fullHistory = chatHistoryStore.getFullHistory();
      expect(fullHistory[0].role).toBe('system');
      expect(fullHistory[0].content).toBe('あなたは親しみやすく愛らしいAIアシスタントです。ユーザーと楽しく会話してください。');
    });
  });

  describe('履歴のクリア', () => {
    it('会話履歴のみクリアする', () => {
      chatHistoryStore.addMessage('user', 'テスト1');
      chatHistoryStore.addMessage('assistant', 'テスト2');
      
      chatHistoryStore.clearHistory();
      
      const history = chatHistoryStore.getHistory();
      expect(history).toHaveLength(0);
      
      // システムプロンプトは保持される
      const systemPrompt = chatHistoryStore.getSystemPrompt();
      expect(systemPrompt).toBe('あなたは親しみやすく愛らしいAIアシスタントです。ユーザーと楽しく会話してください。');
    });
  });

  describe('システムプロンプト管理', () => {
    it('カスタムシステムプロンプトを設定できる', () => {
      const customPrompt = 'カスタムプロンプトです';
      chatHistoryStore.setSystemPrompt(customPrompt);
      
      const retrievedPrompt = chatHistoryStore.getSystemPrompt();
      expect(retrievedPrompt).toBe(customPrompt);
    });

    it('設定されたシステムプロンプトがフル履歴に反映される', () => {
      const customPrompt = 'カスタムプロンプトです';
      chatHistoryStore.setSystemPrompt(customPrompt);
      chatHistoryStore.addMessage('user', 'テスト');
      
      const fullHistory = chatHistoryStore.getFullHistory();
      expect(fullHistory[0].content).toBe(customPrompt);
    });
  });

  describe('全データのクリア', () => {
    it('全ての設定をクリアしてデフォルトに戻す', () => {
      chatHistoryStore.addMessage('user', 'テスト');
      chatHistoryStore.setSystemPrompt('カスタムプロンプト');
      
      chatHistoryStore.clearAll();
      
      const history = chatHistoryStore.getHistory();
      const systemPrompt = chatHistoryStore.getSystemPrompt();
      
      expect(history).toHaveLength(0);
      expect(systemPrompt).toBe('あなたは親しみやすく愛らしいAIアシスタントです。ユーザーと楽しく会話してください。');
    });
  });

  describe('エラーハンドリング', () => {
    it('空のメッセージでも正常に処理される', () => {
      chatHistoryStore.addMessage('user', '');
      
      const history = chatHistoryStore.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe('');
    });

    it('長いメッセージでも正常に処理される', () => {
      const longMessage = 'a'.repeat(10000);
      chatHistoryStore.addMessage('user', longMessage);
      
      const history = chatHistoryStore.getHistory();
      expect(history[0].content).toBe(longMessage);
    });
  });
});