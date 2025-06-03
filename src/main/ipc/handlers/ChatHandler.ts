/**
 * チャット関連のIPCハンドラーを管理するクラス
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';

import { 
  createSuccessResponse, 
  createErrorResponse,
  IPCResponse,
  ChatMessage
} from '../types';
import { MessageValidator } from '../validators/MessageValidator';
import { SettingsStore } from '../../../utils/settingsStore';
import { WindowManagerController } from '../../windows/WindowManagerController';
import { IPC_CHANNELS } from '../../../config/ipcChannels';
import { 
  generateTextFromGemini, 
  generateChatResponse, 
  getChatHistory, 
  clearChatHistory, 
  updateSystemPrompt 
} from '../../../geminiService';
import { ErrorHandler } from '../../../utils/errorHandler';

export class ChatHandler {
  constructor(
    private settingsStore: SettingsStore,
    private windowManagerController: WindowManagerController
  ) {}

  /**
   * すべてのチャット関連IPCハンドラーを登録
   */
  public setupHandlers(): void {
    console.log('[ChatHandler] チャット関連IPCハンドラーを登録中...');
    
    // 基本チャット機能
    ipcMain.handle('send-prompt-to-gemini', this.handleSendPromptToGemini.bind(this));
    ipcMain.handle(IPC_CHANNELS.CHAT.SEND_MESSAGE, this.handleSendChatMessage.bind(this));
    ipcMain.handle(IPC_CHANNELS.CHAT.GET_HISTORY, this.handleGetChatHistory.bind(this));
    ipcMain.handle(IPC_CHANNELS.CHAT.CLEAR_HISTORY, this.handleClearChatHistory.bind(this));

    // システムプロンプト関連
    ipcMain.handle(IPC_CHANNELS.CHAT.GET_SYSTEM_PROMPT, this.handleGetSystemPrompt.bind(this));
    ipcMain.handle(IPC_CHANNELS.CHAT.SET_SYSTEM_PROMPT, this.handleSetSystemPrompt.bind(this));
    ipcMain.handle(IPC_CHANNELS.CHAT.RESET_SYSTEM_PROMPT, this.handleResetSystemPrompt.bind(this));

    // ユーザー・マスコット名関連
    ipcMain.handle(IPC_CHANNELS.CHAT.GET_USER_NAME, this.handleGetUserName.bind(this));
    ipcMain.handle(IPC_CHANNELS.CHAT.SET_USER_NAME, this.handleSetUserName.bind(this));
    ipcMain.handle(IPC_CHANNELS.CHAT.GET_MASCOT_NAME, this.handleGetMascotName.bind(this));
    ipcMain.handle(IPC_CHANNELS.CHAT.SET_MASCOT_NAME, this.handleSetMascotName.bind(this));

    // システムプロンプトコア関連
    ipcMain.handle(IPC_CHANNELS.CHAT.GET_SYSTEM_PROMPT_CORE, this.handleGetSystemPromptCore.bind(this));
    ipcMain.handle(IPC_CHANNELS.CHAT.SET_SYSTEM_PROMPT_CORE, this.handleSetSystemPromptCore.bind(this));
    ipcMain.handle(IPC_CHANNELS.CHAT.RESET_SYSTEM_PROMPT_CORE, this.handleResetSystemPromptCore.bind(this));

    console.log('[ChatHandler] すべてのチャット関連IPCハンドラーが登録されました');
  }

  /**
   * ログ出力ヘルパー
   */
  private log(level: 'info' | 'warn' | 'error', method: string, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[ChatHandler:${method}] ${message}`;
    
    switch (level) {
      case 'info':
        console.log(`${timestamp} ${logMessage}`, data ? data : '');
        break;
      case 'warn':
        console.warn(`${timestamp} ${logMessage}`, data ? data : '');
        break;
      case 'error':
        console.error(`${timestamp} ${logMessage}`, data ? data : '');
        break;
    }
  }

  /**
   * エラーレスポンスとスピーチバブル表示のヘルパー
   */
  private handleErrorWithBubble(method: string, error: unknown, _originalMessage?: string): string {
    ErrorHandler.handle(error);
    const errorMessage = `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`;
    
    this.log('error', method, errorMessage, error);
    
    // スピーチバブルにエラーを表示（従来の機能を維持）
    this.showMessageInSpeechBubble(errorMessage);
    
    return errorMessage;
  }

  /**
   * スピーチバブルにメッセージを表示するヘルパー
   */
  private showMessageInSpeechBubble(message: string): void {
    try {
      this.log('info', 'showMessageInSpeechBubble', 'SpeechBubble表示を開始', { 
        messageLength: message.length,
        messagePreview: message.substring(0, 50) + '...'
      });
      
      // 新しいアーキテクチャでのSpeechBubble表示
      this.windowManagerController.toggleSpeechBubble(message);
      
      this.log('info', 'showMessageInSpeechBubble', 'SpeechBubble表示処理が完了');
    } catch (error) {
      this.log('error', 'showMessageInSpeechBubble', 'スピーチバブル表示でエラー', error);
    }
  }

  /**
   * Geminiへのプロンプト送信（従来機能）
   */
  private async handleSendPromptToGemini(
    _event: IpcMainInvokeEvent, 
    prompt: string
  ): Promise<string> {
    this.log('info', 'handleSendPromptToGemini', 'プロンプト送信リクエストを受信', { 
      promptLength: prompt?.length || 0,
      promptPreview: prompt?.substring(0, 50) + '...' || ''
    });
    
    // バリデーション
    const validation = MessageValidator.validateSendChatMessageRequest({ message: prompt });
    if (!validation.isValid) {
      const errorMessage = `プロンプトのバリデーションに失敗: ${validation.errors.map(e => e.message).join(', ')}`;
      this.log('warn', 'handleSendPromptToGemini', errorMessage, validation.errors);
      this.showMessageInSpeechBubble(errorMessage);
      return errorMessage;
    }

    try {
      const response = await generateTextFromGemini(prompt);
      this.log('info', 'handleSendPromptToGemini', 'プロンプト応答を生成', { 
        responseLength: response.length,
        responsePreview: response.substring(0, 50) + '...'
      });
      
      // スピーチバブルに応答を表示
      this.showMessageInSpeechBubble(response);
      
      return response;
    } catch (error) {
      return this.handleErrorWithBubble('handleSendPromptToGemini', error, prompt);
    }
  }

  /**
   * チャットメッセージ送信（履歴管理付き）
   */
  private async handleSendChatMessage(
    _event: IpcMainInvokeEvent, 
    message: string
  ): Promise<string> {
    this.log('info', 'handleSendChatMessage', 'チャットメッセージを受信', { 
      messageLength: message?.length || 0,
      messagePreview: message?.substring(0, 50) + '...' || ''
    });
    
    // バリデーション
    const validation = MessageValidator.validateSendChatMessageRequest({ message });
    if (!validation.isValid) {
      const errorMessage = `メッセージのバリデーションに失敗: ${validation.errors.map(e => e.message).join(', ')}`;
      this.log('warn', 'handleSendChatMessage', errorMessage, validation.errors);
      this.showMessageInSpeechBubble(errorMessage);
      return errorMessage;
    }

    try {
      const response = await generateChatResponse(message);
      this.log('info', 'handleSendChatMessage', 'チャット応答を生成', { 
        responseLength: response.length,
        responsePreview: response.substring(0, 50) + '...'
      });
      
      // スピーチバブルに応答を表示
      this.showMessageInSpeechBubble(response);
      
      return response;
    } catch (error) {
      return this.handleErrorWithBubble('handleSendChatMessage', error, message);
    }
  }

  /**
   * チャット履歴の取得
   */
  private async handleGetChatHistory(_event: IpcMainInvokeEvent): Promise<ChatMessage[]> {
    this.log('info', 'handleGetChatHistory', 'チャット履歴取得リクエストを受信');
    
    try {
      const history = getChatHistory();
      this.log('info', 'handleGetChatHistory', 'チャット履歴を正常に取得', { historyCount: history.length });
      
      // 型安全な形式に変換
      return history.map((msg, index) => ({
        id: `msg_${index}_${Date.now()}`,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: new Date().toISOString() // 既存の履歴にはタイムスタンプがないため現在時刻を使用
      }));
    } catch (error) {
      this.log('error', 'handleGetChatHistory', 'チャット履歴取得でエラー', error);
      ErrorHandler.handle(error);
      return [];
    }
  }

  /**
   * チャット履歴のクリア
   */
  private async handleClearChatHistory(_event: IpcMainInvokeEvent): Promise<IPCResponse> {
    this.log('info', 'handleClearChatHistory', 'チャット履歴クリアリクエストを受信');
    
    try {
      clearChatHistory();
      this.log('info', 'handleClearChatHistory', 'チャット履歴を正常にクリア');
      
      return createSuccessResponse();
    } catch (error) {
      const errorMessage = `チャット履歴のクリア中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleClearChatHistory', errorMessage, error);
      ErrorHandler.handle(error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * システムプロンプトの取得
   */
  private async handleGetSystemPrompt(_event: IpcMainInvokeEvent): Promise<string> {
    this.log('info', 'handleGetSystemPrompt', 'システムプロンプト取得リクエストを受信');
    
    try {
      const prompt = this.settingsStore.getSystemPrompt();
      this.log('info', 'handleGetSystemPrompt', 'システムプロンプトを正常に取得', { 
        promptLength: prompt.length 
      });
      
      return prompt;
    } catch (error) {
      const errorMessage = `システムプロンプトの取得中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleGetSystemPrompt', errorMessage, error);
      throw error;
    }
  }

  /**
   * システムプロンプトの設定
   */
  private async handleSetSystemPrompt(
    _event: IpcMainInvokeEvent, 
    prompt: string
  ): Promise<IPCResponse> {
    this.log('info', 'handleSetSystemPrompt', 'システムプロンプト設定リクエストを受信', { 
      promptLength: prompt?.length || 0 
    });
    
    // バリデーション
    const validation = MessageValidator.validateSetSystemPromptRequest({ prompt });
    if (!validation.isValid) {
      const errorMessage = `システムプロンプトのバリデーションに失敗: ${validation.errors.map(e => e.message).join(', ')}`;
      this.log('warn', 'handleSetSystemPrompt', errorMessage, validation.errors);
      return createErrorResponse(errorMessage);
    }

    try {
      this.settingsStore.setSystemPrompt(prompt);
      this.log('info', 'handleSetSystemPrompt', 'システムプロンプトを正常に設定');
      
      return createSuccessResponse();
    } catch (error) {
      const errorMessage = `システムプロンプトの設定中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleSetSystemPrompt', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * システムプロンプトのリセット
   */
  private async handleResetSystemPrompt(_event: IpcMainInvokeEvent): Promise<IPCResponse> {
    this.log('info', 'handleResetSystemPrompt', 'システムプロンプトリセットリクエストを受信');
    
    try {
      this.settingsStore.resetSystemPromptToDefault();
      this.log('info', 'handleResetSystemPrompt', 'システムプロンプトを正常にリセット');
      
      return createSuccessResponse();
    } catch (error) {
      const errorMessage = `システムプロンプトのリセット中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleResetSystemPrompt', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * ユーザー名の取得
   */
  private async handleGetUserName(_event: IpcMainInvokeEvent): Promise<string> {
    this.log('info', 'handleGetUserName', 'ユーザー名取得リクエストを受信');
    
    try {
      const userName = this.settingsStore.getUserName();
      this.log('info', 'handleGetUserName', 'ユーザー名を正常に取得', { userName });
      
      return userName;
    } catch (error) {
      const errorMessage = `ユーザー名の取得中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleGetUserName', errorMessage, error);
      throw error;
    }
  }

  /**
   * ユーザー名の設定
   */
  private async handleSetUserName(
    _event: IpcMainInvokeEvent, 
    userName: string
  ): Promise<IPCResponse> {
    this.log('info', 'handleSetUserName', 'ユーザー名設定リクエストを受信', { userName });
    
    // バリデーション
    const validation = MessageValidator.validateString(userName, 'userName', {
      required: true,
      minLength: 1,
      maxLength: 50,
      noXSS: true
    });
    if (validation.length > 0) {
      const errorMessage = `ユーザー名のバリデーションに失敗: ${validation.map(e => e.message).join(', ')}`;
      this.log('warn', 'handleSetUserName', errorMessage, validation);
      return createErrorResponse(errorMessage);
    }

    try {
      this.settingsStore.setUserName(userName);
      updateSystemPrompt(); // Geminiのシステムプロンプトを更新
      this.log('info', 'handleSetUserName', 'ユーザー名を正常に設定とシステムプロンプト更新');
      
      return createSuccessResponse();
    } catch (error) {
      const errorMessage = `ユーザー名の設定中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleSetUserName', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * マスコット名の取得
   */
  private async handleGetMascotName(_event: IpcMainInvokeEvent): Promise<string> {
    this.log('info', 'handleGetMascotName', 'マスコット名取得リクエストを受信');
    
    try {
      const mascotName = this.settingsStore.getMascotName();
      this.log('info', 'handleGetMascotName', 'マスコット名を正常に取得', { mascotName });
      
      return mascotName;
    } catch (error) {
      const errorMessage = `マスコット名の取得中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleGetMascotName', errorMessage, error);
      throw error;
    }
  }

  /**
   * マスコット名の設定
   */
  private async handleSetMascotName(
    _event: IpcMainInvokeEvent, 
    mascotName: string
  ): Promise<IPCResponse> {
    this.log('info', 'handleSetMascotName', 'マスコット名設定リクエストを受信', { mascotName });
    
    // バリデーション
    const validation = MessageValidator.validateString(mascotName, 'mascotName', {
      required: true,
      minLength: 1,
      maxLength: 50,
      noXSS: true
    });
    if (validation.length > 0) {
      const errorMessage = `マスコット名のバリデーションに失敗: ${validation.map(e => e.message).join(', ')}`;
      this.log('warn', 'handleSetMascotName', errorMessage, validation);
      return createErrorResponse(errorMessage);
    }

    try {
      this.settingsStore.setMascotName(mascotName);
      updateSystemPrompt(); // Geminiのシステムプロンプトを更新
      this.log('info', 'handleSetMascotName', 'マスコット名を正常に設定とシステムプロンプト更新');
      
      return createSuccessResponse();
    } catch (error) {
      const errorMessage = `マスコット名の設定中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleSetMascotName', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * システムプロンプトコアの取得
   */
  private async handleGetSystemPromptCore(_event: IpcMainInvokeEvent): Promise<string> {
    this.log('info', 'handleGetSystemPromptCore', 'システムプロンプトコア取得リクエストを受信');
    
    try {
      const core = this.settingsStore.getSystemPromptCore();
      this.log('info', 'handleGetSystemPromptCore', 'システムプロンプトコアを正常に取得', { 
        coreLength: core.length 
      });
      
      return core;
    } catch (error) {
      const errorMessage = `システムプロンプトコアの取得中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleGetSystemPromptCore', errorMessage, error);
      throw error;
    }
  }

  /**
   * システムプロンプトコアの設定
   */
  private async handleSetSystemPromptCore(
    _event: IpcMainInvokeEvent, 
    prompt: string
  ): Promise<IPCResponse> {
    this.log('info', 'handleSetSystemPromptCore', 'システムプロンプトコア設定リクエストを受信', { 
      promptLength: prompt?.length || 0 
    });
    
    // バリデーション
    const validation = MessageValidator.validateSetSystemPromptRequest({ prompt });
    if (!validation.isValid) {
      const errorMessage = `システムプロンプトコアのバリデーションに失敗: ${validation.errors.map(e => e.message).join(', ')}`;
      this.log('warn', 'handleSetSystemPromptCore', errorMessage, validation.errors);
      return createErrorResponse(errorMessage);
    }

    try {
      this.settingsStore.setSystemPromptCore(prompt);
      updateSystemPrompt(); // Geminiのシステムプロンプトを更新
      this.log('info', 'handleSetSystemPromptCore', 'システムプロンプトコアを正常に設定とシステムプロンプト更新');
      
      return createSuccessResponse();
    } catch (error) {
      const errorMessage = `システムプロンプトコアの設定中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleSetSystemPromptCore', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * システムプロンプトコアのリセット
   */
  private async handleResetSystemPromptCore(_event: IpcMainInvokeEvent): Promise<IPCResponse> {
    this.log('info', 'handleResetSystemPromptCore', 'システムプロンプトコアリセットリクエストを受信');
    
    try {
      const defaultCore = 'あなたは親しみやすいデスクトップマスコットです。ユーザーとの会話を楽しみ、役立つ情報を提供してください。';
      this.settingsStore.setSystemPromptCore(defaultCore);
      updateSystemPrompt(); // Geminiのシステムプロンプトを更新
      this.log('info', 'handleResetSystemPromptCore', 'システムプロンプトコアを正常にリセットとシステムプロンプト更新');
      
      return createSuccessResponse();
    } catch (error) {
      const errorMessage = `システムプロンプトコアのリセット中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleResetSystemPromptCore', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * ハンドラーのクリーンアップ
   */
  public cleanup(): void {
    this.log('info', 'cleanup', 'チャット関連IPCハンドラーをクリーンアップ中...');
    
    // 必要に応じて個別のクリーンアップ処理を実装
    // 現在はElectronが自動的にハンドラーを管理するため、特別な処理は不要
    
    this.log('info', 'cleanup', 'チャット関連IPCハンドラーのクリーンアップが完了');
  }
}