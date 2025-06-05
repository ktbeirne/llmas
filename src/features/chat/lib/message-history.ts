/**
 * Message History Manager - FSD Phase 2
 * メッセージ履歴管理の実装（TDD: GREEN Phase）
 */

import type { ChatMessage, ChatConversation } from '../types';

interface HistoryStatistics {
  totalConversations: number;
  totalMessages: number;
  averageMessagesPerConversation: number;
  oldestConversation?: string;
  newestConversation?: string;
}

interface ExportData {
  conversations: ChatConversation[];
  exportedAt: string;
  version: string;
}

export class MessageHistoryManager {
  private conversations: Map<string, ChatConversation> = new Map();

  /**
   * 新しい会話を作成
   */
  createConversation(title?: string): ChatConversation {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    const conversation: ChatConversation = {
      id,
      title: title || `会話 ${this.conversations.size + 1}`,
      messages: [],
      createdAt: now,
      updatedAt: now,
      model: 'gemini-pro'
    };

    return conversation;
  }

  /**
   * 会話を保存
   */
  saveConversation(conversation: ChatConversation): void {
    const updatedConversation = {
      ...conversation,
      updatedAt: new Date().toISOString()
    };
    
    this.conversations.set(conversation.id, updatedConversation);
  }

  /**
   * 会話を読み込み
   */
  loadConversation(conversationId: string): ChatConversation | null {
    return this.conversations.get(conversationId) || null;
  }

  /**
   * 現在の会話を取得（実装上は最後に更新された会話）
   */
  getCurrentConversation(): ChatConversation | null {
    if (this.conversations.size === 0) return null;
    
    const conversations = Array.from(this.conversations.values());
    conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    return conversations[0];
  }

  /**
   * すべての会話を取得
   */
  getConversations(): ChatConversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * 会話を削除
   */
  deleteConversation(conversationId: string): void {
    this.conversations.delete(conversationId);
  }

  /**
   * 会話タイトルを更新
   */
  updateConversationTitle(conversationId: string, newTitle: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      const updated = {
        ...conversation,
        title: newTitle,
        updatedAt: new Date().toISOString()
      };
      this.conversations.set(conversationId, updated);
    }
  }

  /**
   * メッセージを追加
   */
  addMessage(conversationId: string, message: ChatMessage): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      const updated = {
        ...conversation,
        messages: [...conversation.messages, message],
        updatedAt: new Date().toISOString()
      };
      this.conversations.set(conversationId, updated);
    }
  }

  /**
   * メッセージを更新
   */
  updateMessage(conversationId: string, messageId: string, newContent: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      const updatedMessages = conversation.messages.map(msg =>
        msg.id === messageId 
          ? { ...msg, content: newContent }
          : msg
      );
      
      const updated = {
        ...conversation,
        messages: updatedMessages,
        updatedAt: new Date().toISOString()
      };
      
      this.conversations.set(conversationId, updated);
    }
  }

  /**
   * メッセージを削除
   */
  deleteMessage(conversationId: string, messageId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      const updatedMessages = conversation.messages.filter(msg => msg.id !== messageId);
      
      const updated = {
        ...conversation,
        messages: updatedMessages,
        updatedAt: new Date().toISOString()
      };
      
      this.conversations.set(conversationId, updated);
    }
  }

  /**
   * 会話を検索
   */
  searchConversations(query: string): ChatConversation[] {
    const lowerQuery = query.toLowerCase();
    
    return this.getConversations().filter(conversation => {
      // タイトルで検索
      if (conversation.title.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // メッセージ内容で検索
      return conversation.messages.some(message =>
        message.content.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * 履歴をJSONでエクスポート
   */
  exportToJSON(): string {
    const exportData: ExportData = {
      conversations: this.getConversations(),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * JSONから履歴をインポート
   */
  importFromJSON(jsonData: string): void {
    try {
      const data: ExportData = JSON.parse(jsonData);
      
      if (!data.conversations || !Array.isArray(data.conversations)) {
        throw new Error('無効なデータ形式です');
      }
      
      // 既存の履歴をクリア
      this.conversations.clear();
      
      // インポートしたデータを設定
      data.conversations.forEach(conversation => {
        this.conversations.set(conversation.id, conversation);
      });
      
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('無効なJSONデータです');
      }
      throw error;
    }
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): HistoryStatistics {
    const conversations = this.getConversations();
    const totalConversations = conversations.length;
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
    
    const stats: HistoryStatistics = {
      totalConversations,
      totalMessages,
      averageMessagesPerConversation: totalConversations > 0 
        ? totalMessages / totalConversations 
        : 0
    };
    
    if (conversations.length > 0) {
      const sortedByDate = [...conversations].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      stats.oldestConversation = sortedByDate[0].title;
      stats.newestConversation = sortedByDate[sortedByDate.length - 1].title;
    }
    
    return stats;
  }

  /**
   * すべての履歴をクリア
   */
  clearAllHistory(): void {
    this.conversations.clear();
  }

  // プライベートメソッド

  /**
   * 一意のIDを生成
   */
  private generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}