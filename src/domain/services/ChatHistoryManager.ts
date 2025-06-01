/**
 * チャット履歴管理のドメインサービス
 * 会話履歴の管理、コンテキスト最適化、メモリ管理を担当
 */

import { ChatMessage } from '../entities/ChatMessage';
import { IChatHistoryRepository } from '../repositories/ISettingsRepository';

/**
 * チャット履歴の設定
 */
export interface ChatHistoryConfig {
  maxMessages: number;
  maxTokens: number;
  contextWindow: number;
  preserveSystemMessages: boolean;
  autoSummarize: boolean;
  summarizeThreshold: number;
}

/**
 * チャット履歴の統計情報
 */
export interface ChatHistoryStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  systemMessages: number;
  estimatedTokens: number;
  oldestMessage?: Date;
  newestMessage?: Date;
  conversationDuration?: number; // ミリ秒
}

/**
 * チャット履歴管理サービス
 */
export class ChatHistoryManager {
  private static readonly DEFAULT_CONFIG: ChatHistoryConfig = {
    maxMessages: 100,
    maxTokens: 8000,
    contextWindow: 20,
    preserveSystemMessages: true,
    autoSummarize: true,
    summarizeThreshold: 50
  };

  private messages: ChatMessage[] = [];
  private systemPrompt: string = '';
  private config: ChatHistoryConfig;
  private repository: IChatHistoryRepository;

  constructor(
    repository: IChatHistoryRepository,
    config: Partial<ChatHistoryConfig> = {}
  ) {
    this.repository = repository;
    this.config = { ...ChatHistoryManager.DEFAULT_CONFIG, ...config };
  }

  /**
   * 履歴の初期化とロード
   */
  async initialize(): Promise<void> {
    try {
      this.systemPrompt = await this.repository.getSystemPrompt();
      const historyData = await this.repository.getChatHistory();
      
      this.messages = historyData.map(data => 
        ChatMessage.fromPlainObject({
          role: data.role as 'user' | 'assistant' | 'system',
          content: data.content,
          timestamp: new Date(data.timestamp)
        })
      );
      
      console.log(`チャット履歴をロードしました: ${this.messages.length}件`);
    } catch (error) {
      console.error('チャット履歴の初期化に失敗しました:', error);
      // エラーが発生しても空の履歴で続行
      this.messages = [];
      this.systemPrompt = '';
    }
  }

  /**
   * メッセージを追加
   */
  async addMessage(message: ChatMessage): Promise<void> {
    this.messages.push(message);
    
    // リポジトリに保存
    await this.repository.addChatMessage({
      role: message.role,
      content: message.content,
      timestamp: message.timestamp.toISOString()
    });
    
    // 自動最適化
    await this.optimizeIfNeeded();
  }

  /**
   * ユーザーメッセージを追加
   */
  async addUserMessage(content: string): Promise<ChatMessage> {
    const message = ChatMessage.createUserMessage(content);
    await this.addMessage(message);
    return message;
  }

  /**
   * アシスタントメッセージを追加
   */
  async addAssistantMessage(content: string): Promise<ChatMessage> {
    const message = ChatMessage.createAssistantMessage(content);
    await this.addMessage(message);
    return message;
  }

  /**
   * システムプロンプトを設定
   */
  async setSystemPrompt(prompt: string): Promise<void> {
    this.systemPrompt = prompt;
    await this.repository.saveSystemPrompt(prompt);
  }

  /**
   * システムプロンプトを取得
   */
  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  /**
   * 全メッセージ履歴を取得
   */
  getAllMessages(): ChatMessage[] {
    return [...this.messages]; // コピーを返して不変性を保証
  }

  /**
   * 最新のN件のメッセージを取得
   */
  getRecentMessages(count: number): ChatMessage[] {
    return this.messages.slice(-count);
  }

  /**
   * AIサービス用のコンテキストを取得
   */
  getContextForAI(): ChatMessage[] {
    const contextMessages = this.getRecentMessages(this.config.contextWindow);
    
    // システムメッセージを保持する必要がある場合
    if (this.config.preserveSystemMessages && this.systemPrompt) {
      const systemMessage = ChatMessage.createSystemMessage(this.systemPrompt);
      return [systemMessage, ...contextMessages];
    }
    
    return contextMessages;
  }

  /**
   * メッセージ数を取得
   */
  getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * 最新メッセージを取得
   */
  getLastMessage(): ChatMessage | undefined {
    return this.messages[this.messages.length - 1];
  }

  /**
   * 特定のロールのメッセージをフィルタ
   */
  getMessagesByRole(role: 'user' | 'assistant' | 'system'): ChatMessage[] {
    return this.messages.filter(msg => msg.role === role);
  }

  /**
   * 指定期間のメッセージを取得
   */
  getMessagesByDateRange(startDate: Date, endDate: Date): ChatMessage[] {
    return this.messages.filter(msg => 
      msg.timestamp >= startDate && msg.timestamp <= endDate
    );
  }

  /**
   * メッセージを検索
   */
  searchMessages(query: string, options?: {
    caseSensitive?: boolean;
    roleFilter?: 'user' | 'assistant' | 'system';
    maxResults?: number;
  }): ChatMessage[] {
    const { caseSensitive = false, roleFilter, maxResults = 50 } = options || {};
    
    let filtered = this.messages;
    
    if (roleFilter) {
      filtered = filtered.filter(msg => msg.role === roleFilter);
    }
    
    const searchRegex = new RegExp(
      query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      caseSensitive ? 'g' : 'gi'
    );
    
    const results = filtered.filter(msg => searchRegex.test(msg.content));
    
    return results.slice(0, maxResults);
  }

  /**
   * 履歴をクリア
   */
  async clearHistory(): Promise<void> {
    this.messages = [];
    await this.repository.clearChatHistory();
    console.log('チャット履歴をクリアしました');
  }

  /**
   * 履歴の統計情報を取得
   */
  getStatistics(): ChatHistoryStats {
    if (this.messages.length === 0) {
      return {
        totalMessages: 0,
        userMessages: 0,
        assistantMessages: 0,
        systemMessages: 0,
        estimatedTokens: 0
      };
    }

    const userMessages = this.messages.filter(msg => msg.role === 'user').length;
    const assistantMessages = this.messages.filter(msg => msg.role === 'assistant').length;
    const systemMessages = this.messages.filter(msg => msg.role === 'system').length;
    
    const oldestMessage = this.messages[0]?.timestamp;
    const newestMessage = this.messages[this.messages.length - 1]?.timestamp;
    const conversationDuration = oldestMessage && newestMessage 
      ? newestMessage.getTime() - oldestMessage.getTime()
      : undefined;

    return {
      totalMessages: this.messages.length,
      userMessages,
      assistantMessages,
      systemMessages,
      estimatedTokens: this.estimateTokenCount(),
      oldestMessage,
      newestMessage,
      conversationDuration
    };
  }

  /**
   * メモリ使用量を取得
   */
  getMemoryUsage(): {
    messageCount: number;
    estimatedBytes: number;
    configuredLimit: number;
    utilizationPercentage: number;
  } {
    const messageCount = this.messages.length;
    const estimatedBytes = this.estimateMemoryUsage();
    const configuredLimit = this.config.maxMessages;
    const utilizationPercentage = (messageCount / configuredLimit) * 100;

    return {
      messageCount,
      estimatedBytes,
      configuredLimit,
      utilizationPercentage
    };
  }

  /**
   * 設定を更新
   */
  updateConfig(newConfig: Partial<ChatHistoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('チャット履歴設定を更新しました:', this.config);
  }

  /**
   * 履歴をエクスポート
   */
  exportHistory(): {
    systemPrompt: string;
    messages: Array<{
      role: string;
      content: string;
      timestamp: string;
    }>;
    config: ChatHistoryConfig;
    exportedAt: string;
  } {
    return {
      systemPrompt: this.systemPrompt,
      messages: this.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      })),
      config: this.config,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * 履歴をインポート
   */
  async importHistory(data: {
    systemPrompt?: string;
    messages: Array<{
      role: string;
      content: string;
      timestamp: string;
    }>;
  }): Promise<void> {
    try {
      // 現在の履歴をクリア
      await this.clearHistory();
      
      // システムプロンプトを設定
      if (data.systemPrompt) {
        await this.setSystemPrompt(data.systemPrompt);
      }
      
      // メッセージをインポート
      for (const msgData of data.messages) {
        const message = ChatMessage.fromPlainObject({
          role: msgData.role as 'user' | 'assistant' | 'system',
          content: msgData.content,
          timestamp: new Date(msgData.timestamp)
        });
        await this.addMessage(message);
      }
      
      console.log(`チャット履歴をインポートしました: ${data.messages.length}件`);
    } catch (error) {
      console.error('チャット履歴のインポートに失敗しました:', error);
      throw error;
    }
  }

  // プライベートメソッド

  /**
   * 必要に応じて最適化を実行
   */
  private async optimizeIfNeeded(): Promise<void> {
    if (this.messages.length > this.config.maxMessages) {
      await this.optimizeHistory();
    }
  }

  /**
   * 履歴の最適化を実行
   */
  private async optimizeHistory(): Promise<void> {
    const messagesToRemove = this.messages.length - this.config.maxMessages;
    
    if (messagesToRemove > 0) {
      // 古いメッセージを削除（システムメッセージは保持）
      if (this.config.preserveSystemMessages) {
        const systemMessages = this.messages.filter(msg => msg.role === 'system');
        const nonSystemMessages = this.messages.filter(msg => msg.role !== 'system');
        
        const messagesToKeep = nonSystemMessages.slice(messagesToRemove);
        this.messages = [...systemMessages, ...messagesToKeep];
      } else {
        this.messages = this.messages.slice(messagesToRemove);
      }
      
      // リポジトリを更新
      await this.repository.saveChatHistory(
        this.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString()
        }))
      );
      
      console.log(`チャット履歴を最適化しました: ${messagesToRemove}件削除`);
    }
  }

  /**
   * トークン数を推定
   */
  private estimateTokenCount(): number {
    // 簡単な推定（実際はより精密なカウントが必要）
    const totalChars = this.messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4); // 簡単なトークン推定
  }

  /**
   * メモリ使用量を推定
   */
  private estimateMemoryUsage(): number {
    // 簡単なメモリ使用量推定
    return this.messages.reduce((sum, msg) => {
      return sum + (msg.content.length * 2) + 100; // 文字列 + オブジェクトオーバーヘッド
    }, 0);
  }
}