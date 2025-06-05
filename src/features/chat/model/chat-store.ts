/**
 * Chat Store - FSD Phase 2
 * チャットストアの実装（TDD: GREEN Phase）
 */

import type {
  ChatState,
  ChatMessage,
  ChatConversation,
  ChatSettings,
  ChatError,
  ChatRole,
  ChatStats,
  ChatHistoryFilter
} from '../types';

interface InternalChatState extends ChatState {
  messageCounter: number;
  conversationCounter: number;
}

type ChatListener = (state: ChatState) => void;

class ChatStore {
  private state: InternalChatState;
  private listeners = new Set<ChatListener>();

  constructor() {
    this.state = this.getInitialState();
  }

  /**
   * 初期状態を取得
   */
  private getInitialState(): InternalChatState {
    return {
      currentConversation: null,
      isLoading: false,
      isTyping: false,
      error: null,
      history: [],
      settings: this.getDefaultSettings(),
      messageCounter: 0,
      conversationCounter: 0
    };
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultSettings(): ChatSettings {
    return {
      model: 'gemini-pro',
      temperature: 0.7,
      maxTokens: 1024,
      systemPrompt: 'あなたは親しみやすく愛らしいAIアシスタントです。ユーザーと楽しく会話してください。',
      userName: 'User',
      mascotName: 'Assistant',
      enableAutoSave: true,
      maxHistoryLength: 100,
      responseTimeout: 30000
    };
  }

  /**
   * 現在の状態を取得
   */
  getState(): ChatState {
    return {
      currentConversation: this.state.currentConversation,
      isLoading: this.state.isLoading,
      isTyping: this.state.isTyping,
      error: this.state.error,
      history: [...this.state.history],
      settings: { ...this.state.settings }
    };
  }

  /**
   * 新しい会話を開始
   */
  startNewConversation(title?: string): ChatConversation {
    const conversation: ChatConversation = {
      id: `conv_${++this.state.conversationCounter}_${Date.now()}`,
      title: title || `会話 ${this.state.conversationCounter}`,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model: this.state.settings.model,
      systemPrompt: this.state.settings.systemPrompt
    };

    this.setState({
      currentConversation: conversation
    });

    return conversation;
  }

  /**
   * 会話を履歴に保存
   */
  saveConversation(): void {
    if (!this.state.currentConversation) return;

    const existingIndex = this.state.history.findIndex(
      conv => conv.id === this.state.currentConversation!.id
    );

    let newHistory = [...this.state.history];

    if (existingIndex >= 0) {
      // 既存の会話を更新
      newHistory[existingIndex] = {
        ...this.state.currentConversation,
        updatedAt: new Date().toISOString()
      };
    } else {
      // 新しい会話を追加
      newHistory.push({
        ...this.state.currentConversation,
        updatedAt: new Date().toISOString()
      });
    }

    // 履歴の最大長を制限
    if (newHistory.length > this.state.settings.maxHistoryLength) {
      newHistory = newHistory.slice(-this.state.settings.maxHistoryLength);
    }

    this.setState({
      history: newHistory
    });
  }

  /**
   * 会話を切り替え
   */
  switchConversation(conversationId: string): void {
    const conversation = this.state.history.find(conv => conv.id === conversationId);
    if (conversation) {
      this.setState({
        currentConversation: { ...conversation }
      });
    }
  }

  /**
   * 会話を削除
   */
  deleteConversation(conversationId: string): void {
    const newHistory = this.state.history.filter(conv => conv.id !== conversationId);
    
    this.setState({
      history: newHistory,
      currentConversation: this.state.currentConversation?.id === conversationId 
        ? null 
        : this.state.currentConversation
    });
  }

  /**
   * ユーザーメッセージを追加
   */
  addUserMessage(content: string, metadata?: ChatMessage['metadata']): ChatMessage {
    return this.addMessage('user', content, metadata);
  }

  /**
   * アシスタントメッセージを追加
   */
  addAssistantMessage(content: string, metadata?: ChatMessage['metadata']): ChatMessage {
    return this.addMessage('assistant', content, metadata);
  }

  /**
   * システムメッセージを追加
   */
  addSystemMessage(content: string, metadata?: ChatMessage['metadata']): ChatMessage {
    return this.addMessage('system', content, metadata);
  }

  /**
   * メッセージを追加
   */
  private addMessage(role: ChatRole, content: string, metadata?: ChatMessage['metadata']): ChatMessage {
    if (!this.state.currentConversation) {
      throw new Error('アクティブな会話がありません');
    }

    const message: ChatMessage = {
      id: `msg_${++this.state.messageCounter}_${Date.now()}`,
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata
    };

    const updatedConversation = {
      ...this.state.currentConversation,
      messages: [...this.state.currentConversation.messages, message],
      updatedAt: new Date().toISOString()
    };

    this.setState({
      currentConversation: updatedConversation
    });

    return message;
  }

  /**
   * メッセージを削除
   */
  deleteMessage(messageId: string): void {
    if (!this.state.currentConversation) return;

    const updatedMessages = this.state.currentConversation.messages.filter(
      msg => msg.id !== messageId
    );

    this.setState({
      currentConversation: {
        ...this.state.currentConversation,
        messages: updatedMessages,
        updatedAt: new Date().toISOString()
      }
    });
  }

  /**
   * メッセージを編集
   */
  editMessage(messageId: string, newContent: string): void {
    if (!this.state.currentConversation) return;

    const updatedMessages = this.state.currentConversation.messages.map(msg =>
      msg.id === messageId
        ? { ...msg, content: newContent }
        : msg
    );

    this.setState({
      currentConversation: {
        ...this.state.currentConversation,
        messages: updatedMessages,
        updatedAt: new Date().toISOString()
      }
    });
  }

  /**
   * ローディング状態を設定
   */
  setLoading(isLoading: boolean): void {
    this.setState({ isLoading });
  }

  /**
   * タイピング状態を設定
   */
  setTyping(isTyping: boolean): void {
    this.setState({ isTyping });
  }

  /**
   * エラーを設定
   */
  setError(error: ChatError): void {
    this.setState({ error });
  }

  /**
   * エラーをクリア
   */
  clearError(): void {
    this.setState({ error: null });
  }

  /**
   * 設定を更新
   */
  updateSettings(updates: Partial<ChatSettings>): void {
    this.setState({
      settings: {
        ...this.state.settings,
        ...updates
      }
    });
  }

  /**
   * システムプロンプトを更新
   */
  updateSystemPrompt(systemPrompt: string): void {
    this.setState({
      settings: {
        ...this.state.settings,
        systemPrompt
      }
    });
  }

  /**
   * 設定をリセット
   */
  resetSettings(): void {
    this.setState({
      settings: this.getDefaultSettings()
    });
  }

  /**
   * 履歴をフィルタリング
   */
  filterHistory(filter: ChatHistoryFilter): ChatConversation[] {
    let filtered = [...this.state.history];

    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.title.toLowerCase().includes(query) ||
        conv.messages.some(msg => msg.content.toLowerCase().includes(query))
      );
    }

    if (filter.dateFrom) {
      filtered = filtered.filter(conv => conv.createdAt >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      filtered = filtered.filter(conv => conv.createdAt <= filter.dateTo!);
    }

    if (filter.model) {
      filtered = filtered.filter(conv => conv.model === filter.model);
    }

    if (filter.limit) {
      filtered = filtered.slice(filter.offset || 0, (filter.offset || 0) + filter.limit);
    }

    return filtered;
  }

  /**
   * 履歴をクリア
   */
  clearHistory(): void {
    this.setState({
      history: []
    });
  }

  /**
   * 統計情報を取得
   */
  getStats(): ChatStats {
    // 履歴に保存されている会話のメッセージ数のみカウント
    const totalMessages = this.state.history.reduce(
      (count, conv) => count + conv.messages.length, 
      0
    );

    const allMessages = this.state.history.flatMap(conv => conv.messages);

    const responseTimes = allMessages
      .filter(msg => msg.metadata?.duration)
      .map(msg => msg.metadata!.duration!);

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const modelUsage: Record<string, number> = {};
    this.state.history.forEach(conv => {
      modelUsage[conv.model] = (modelUsage[conv.model] || 0) + 1;
    });

    const mostUsedModel = Object.entries(modelUsage).reduce(
      (most, [model, count]) => count > most.count ? { model, count } : most,
      { model: this.state.settings.model, count: 0 }
    ).model;

    const lastActivity = this.state.history.length > 0
      ? Math.max(...this.state.history.map(conv => new Date(conv.updatedAt).getTime()))
      : Date.now();

    return {
      totalMessages,
      totalConversations: this.state.history.length,
      totalTokensUsed: 0, // TODO: 実装時に追加
      averageResponseTime,
      mostUsedModel,
      errorRate: 0, // TODO: 実装時に追加
      lastActivityTime: new Date(lastActivity).toISOString()
    };
  }

  /**
   * 状態変更を購読
   */
  subscribe(listener: ChatListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * ストアをリセット
   */
  reset(): void {
    this.state = this.getInitialState();
    this.notifyListeners();
  }

  // プライベートメソッド

  /**
   * 状態を更新
   */
  private setState(updates: Partial<InternalChatState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * リスナーに通知
   */
  private notifyListeners(): void {
    const publicState = this.getState();
    this.listeners.forEach(listener => listener(publicState));
  }
}

// シングルトンインスタンス
export const chatStore = new ChatStore();