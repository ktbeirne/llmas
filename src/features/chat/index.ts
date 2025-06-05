/**
 * Chat Feature - Public API
 * FSD Phase 2: チャット機能の公開インターフェース
 */

// Types (公開する型定義)
export type {
  ChatRole,
  ChatMessage,
  ChatConversation,
  ChatState,
  ChatSettings,
  ChatError,
  SendMessageOptions,
  ChatApiResponse,
  ChatStats,
  ChatEvents,
  ChatHistoryFilter,
  ChatValidationError,
  ChatValidationResult
} from './types';

// Imports (インポート)
import { chatStore } from './model/chat-store';
import { GeminiClient } from './api/gemini-client';
import { MessageHistoryManager } from './lib/message-history';
import type { 
  ChatMessage, 
  ChatConversation, 
  ChatRole, 
  ChatError 
} from './types';

// Core Services (コアサービス)
export { chatStore } from './model/chat-store';
export { GeminiClient } from './api/gemini-client';
export { MessageHistoryManager } from './lib/message-history';

// Feature Initialization Hook
export const useChat = () => {
  return {
    store: chatStore,
    createClient: (apiKey: string) => new GeminiClient(apiKey),
    createHistoryManager: () => new MessageHistoryManager()
  };
};

// Utility functions
export const chatUtils = {
  /**
   * メッセージの文字数を取得
   */
  getMessageLength: (message: ChatMessage): number => {
    return message.content.length;
  },

  /**
   * 会話の総文字数を取得
   */
  getConversationLength: (conversation: ChatConversation): number => {
    return conversation.messages.reduce((total, msg) => total + msg.content.length, 0);
  },

  /**
   * 会話の所要時間を計算（最初と最後のメッセージのタイムスタンプから）
   */
  getConversationDuration: (conversation: ChatConversation): number => {
    if (conversation.messages.length < 2) return 0;
    
    const first = new Date(conversation.messages[0].timestamp);
    const last = new Date(conversation.messages[conversation.messages.length - 1].timestamp);
    
    return last.getTime() - first.getTime();
  },

  /**
   * メッセージの役割別カウントを取得
   */
  getMessageRoleCounts: (conversation: ChatConversation) => {
    return conversation.messages.reduce((counts, msg) => {
      counts[msg.role] = (counts[msg.role] || 0) + 1;
      return counts;
    }, {} as Record<ChatRole, number>);
  },

  /**
   * 直近のN個のメッセージを取得
   */
  getRecentMessages: (conversation: ChatConversation, count: number): ChatMessage[] => {
    return conversation.messages.slice(-count);
  },

  /**
   * システムメッセージを除いた会話メッセージを取得
   */
  getConversationMessages: (conversation: ChatConversation): ChatMessage[] => {
    return conversation.messages.filter(msg => msg.role !== 'system');
  },

  /**
   * エラーメッセージを人間に読みやすい形式に変換
   */
  formatErrorMessage: (error: ChatError): string => {
    switch (error.type) {
      case 'network':
        return 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
      case 'api':
        return 'AIサービスに一時的な問題が発生しています。しばらく待ってから再試行してください。';
      case 'quota':
        return 'APIの利用制限に達しました。しばらく待ってから再試行してください。';
      case 'timeout':
        return '応答時間が長すぎます。再試行してください。';
      case 'validation':
        return `入力内容に問題があります: ${error.message}`;
      default:
        return `エラーが発生しました: ${error.message}`;
    }
  }
};