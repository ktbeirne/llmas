/**
 * ChatHistoryStoreをIChatHistoryRepositoryインターフェースにアダプトするアダプター
 */

import { IChatHistoryRepository } from '../../domain/repositories/ISettingsRepository';
import { ChatHistoryStore } from '../../utils/chatHistoryStore';

export class ChatHistoryStoreAdapter implements IChatHistoryRepository {
  constructor(private chatHistoryStore: ChatHistoryStore) {}

  async getSystemPrompt(): Promise<string> {
    return this.chatHistoryStore.getSystemPrompt();
  }

  async saveSystemPrompt(prompt: string): Promise<void> {
    this.chatHistoryStore.setSystemPrompt(prompt);
  }

  async getChatHistory(): Promise<Array<{ role: string; content: string; timestamp: string }>> {
    const history = this.chatHistoryStore.getHistory();
    return history.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString()
    }));
  }

  async saveChatHistory(history: Array<{ role: string; content: string; timestamp: string }>): Promise<void> {
    // ChatHistoryStoreは全体を一括置換するメソッドがないため、クリアしてから再追加
    this.chatHistoryStore.clearHistory();
    for (const msg of history) {
      this.chatHistoryStore.addMessage(msg.role as 'user' | 'assistant' | 'system', msg.content);
    }
  }

  async addChatMessage(message: { role: string; content: string; timestamp: string }): Promise<void> {
    this.chatHistoryStore.addMessage(message.role as 'user' | 'assistant' | 'system', message.content);
  }

  async clearChatHistory(): Promise<void> {
    this.chatHistoryStore.clearHistory();
  }

  async getChatHistoryCount(): Promise<number> {
    return this.chatHistoryStore.getHistory().length;
  }

  async getChatHistorySize(): Promise<number> {
    const history = this.chatHistoryStore.getHistory();
    // 簡単なサイズ推定（JSON文字列のバイト数）
    return JSON.stringify(history).length;
  }
}