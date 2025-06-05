/**
 * Chat Feature Types - FSD Phase 2
 * チャット機能の型定義
 */

/**
 * チャットメッセージの役割
 */
export type ChatRole = 'system' | 'user' | 'assistant';

/**
 * チャットメッセージ
 */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  metadata?: {
    functionCall?: string;
    toolCallId?: string;
    duration?: number; // レスポンス時間（ミリ秒）
  };
}

/**
 * チャット会話
 */
export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  model: string;
  systemPrompt?: string;
}

/**
 * チャット状態
 */
export interface ChatState {
  currentConversation: ChatConversation | null;
  isLoading: boolean;
  isTyping: boolean;
  error: ChatError | null;
  history: ChatConversation[];
  settings: ChatSettings;
}

/**
 * チャット設定
 */
export interface ChatSettings {
  model: 'gemini-pro' | 'gemini-pro-vision';
  temperature: number; // 0.0 - 1.0
  maxTokens: number;
  systemPrompt: string;
  userName: string;
  mascotName: string;
  enableAutoSave: boolean;
  maxHistoryLength: number;
  responseTimeout: number; // ミリ秒
}

/**
 * チャットエラー
 */
export interface ChatError {
  type: 'network' | 'api' | 'validation' | 'timeout' | 'quota' | 'unknown';
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}

/**
 * メッセージ送信オプション
 */
export interface SendMessageOptions {
  includeHistory?: boolean;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

/**
 * API応答
 */
export interface ChatApiResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'function_call';
  metadata?: {
    duration: number;
    requestId?: string;
  };
}

/**
 * チャット統計
 */
export interface ChatStats {
  totalMessages: number;
  totalConversations: number;
  totalTokensUsed: number;
  averageResponseTime: number;
  mostUsedModel: string;
  errorRate: number;
  lastActivityTime: string;
}

/**
 * チャットイベント
 */
export interface ChatEvents {
  'chat:message-sent': { message: ChatMessage; conversationId: string };
  'chat:message-received': { message: ChatMessage; conversationId: string };
  'chat:conversation-started': { conversation: ChatConversation };
  'chat:conversation-ended': { conversationId: string };
  'chat:typing-start': { conversationId: string };
  'chat:typing-stop': { conversationId: string };
  'chat:error': { error: ChatError; conversationId?: string };
  'chat:settings-updated': { settings: ChatSettings };
}

/**
 * チャット履歴のフィルタリングオプション
 */
export interface ChatHistoryFilter {
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
  model?: string;
  hasErrors?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * バリデーションエラー
 */
export interface ChatValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * バリデーション結果
 */
export interface ChatValidationResult {
  isValid: boolean;
  errors: ChatValidationError[];
}