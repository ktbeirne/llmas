import { ipcMain, IpcMainInvokeEvent } from 'electron';

import { generateTextFromGemini, generateChatResponse, getChatHistory, clearChatHistory, updateSystemPrompt } from '../../geminiService';
import { WindowManagerController } from '../windows/WindowManagerController';
import { SettingsStore } from '../../utils/settingsStore';
import { ErrorHandler } from '../../utils/errorHandler';
import { IPC_CHANNELS } from '../../config/ipcChannels';
import { WINDOW_CONFIG } from '../../config/constants';
import { SpeechBubbleManager } from '../../utils/speechBubbleManager';

/**
 * コミュニケーション関連のIPCハンドラーを設定
 */
export function setupCommunicationHandlers(
  windowManagerController: WindowManagerController,
  settingsStore: SettingsStore
): void {
  const windowManager = windowManagerController.getWindowManager();

  // Geminiへのプロンプト送信（従来機能）
  ipcMain.handle('send-prompt-to-gemini', async (_event: IpcMainInvokeEvent, prompt: string) => {
    console.log(`メインプロセスがプロンプト "${prompt}" を受け取りました`);
    
    if (!prompt) {
      return "エラー: プロンプトが空です。";
    }
    
    try {
      const response = await generateTextFromGemini(prompt);
      const speechBubbleWindow = windowManager.getWindow('speechBubble');
      
      console.log('[Gemini Handler] Response received:', response.substring(0, 50) + '...');
      console.log('[Gemini Handler] SpeechBubble window found:', !!speechBubbleWindow);
      if (speechBubbleWindow) {
        console.log('[Gemini Handler] SpeechBubble window details:', {
          isDestroyed: speechBubbleWindow.isDestroyed(),
          isVisible: speechBubbleWindow.isVisible(),
          title: speechBubbleWindow.getTitle()
        });
      }
      
      // SpeechBubbleManagerを使用して確実に表示
      SpeechBubbleManager.showWithText(speechBubbleWindow, response);
      
      return response;
    } catch (error) {
      ErrorHandler.handle(error);
      const errorMessage = `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`;
      
      const speechBubbleWindow = windowManager.getWindow('speechBubble');
      console.log('[Gemini Handler] Error occurred, SpeechBubble window found:', !!speechBubbleWindow);
      
      // SpeechBubbleManagerを使用して確実に表示
      SpeechBubbleManager.showWithText(speechBubbleWindow, errorMessage);
      
      return errorMessage;
    }
  });

  // チャット機能（履歴管理付き）
  ipcMain.handle(IPC_CHANNELS.CHAT.SEND_MESSAGE, async (_event: IpcMainInvokeEvent, message: string) => {
    console.log(`チャットメッセージを受信: "${message}"`);
    
    if (!message) {
      return "エラー: メッセージが空です。";
    }
    
    try {
      const response = await generateChatResponse(message);
      console.log('[Chat Handler] 応答を生成しました:', response.substring(0, 50) + '...');
      
      // SpeechBubbleに応答を表示
      const speechBubbleWindow = windowManager.getWindow('speechBubble');
      SpeechBubbleManager.showWithText(speechBubbleWindow, response);
      
      return response;
    } catch (error) {
      ErrorHandler.handle(error);
      const errorMessage = `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`;
      
      // エラーもSpeechBubbleに表示
      const speechBubbleWindow = windowManager.getWindow('speechBubble');
      SpeechBubbleManager.showWithText(speechBubbleWindow, errorMessage);
      
      return errorMessage;
    }
  });

  // 会話履歴取得
  ipcMain.handle(IPC_CHANNELS.CHAT.GET_HISTORY, async () => {
    try {
      return getChatHistory();
    } catch (error) {
      ErrorHandler.handle(error);
      return [];
    }
  });

  // 会話履歴クリア
  ipcMain.handle(IPC_CHANNELS.CHAT.CLEAR_HISTORY, async () => {
    try {
      clearChatHistory();
      return { success: true };
    } catch (error) {
      ErrorHandler.handle(error);
      return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
    }
  });

  // スピーチバブルの非表示
  ipcMain.on('hide-speech-bubble-window', () => {
    const speechBubbleWindow = windowManager.getWindow('speechBubble');
    const mainWindow = windowManager.getWindow('main');
    SpeechBubbleManager.hideAndResetExpression(speechBubbleWindow, mainWindow);
  });

  // スピーチバブルのサイズ通知とポジション更新
  ipcMain.on('notify-bubble-size', (_event, size: { width: number; height: number }) => {
    const speechBubbleWindow = windowManager.getWindow('speechBubble');
    const mainWindow = windowManager.getWindow('main');
    
    console.log('[Main] notify-bubble-size received:', size);
    
    if (!speechBubbleWindow || !mainWindow) {
      console.log('[Main] Missing windows:', { speechBubble: !!speechBubbleWindow, main: !!mainWindow });
      return;
    }
    
    const windowWidth = Math.max(size.width, 80);
    const windowHeight = Math.max(size.height, 50);
    
    const mainBounds = mainWindow.getBounds();
    const x = mainBounds.x + Math.round((mainBounds.width - windowWidth) / 2);
    const y = (mainBounds.y + WINDOW_CONFIG.SPEECH_BUBBLE.MIN_DISPLAY_TIME / 20) - windowHeight;
    
    const newBounds = {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(windowWidth),
      height: Math.round(windowHeight)
    };
    
    console.log('[Main] Setting speechBubble bounds:', newBounds);
    
    speechBubbleWindow.setBounds(newBounds);
    
    // 設定後の実際のBoundsを確認
    setTimeout(() => {
      const actualBounds = speechBubbleWindow.getBounds();
      console.log('[Main] Actual speechBubble bounds after setting:', actualBounds);
      console.log('[Main] Expected vs Actual - Width:', {expected: newBounds.width, actual: actualBounds.width, diff: actualBounds.width - newBounds.width});
      console.log('[Main] Expected vs Actual - Height:', {expected: newBounds.height, actual: actualBounds.height, diff: actualBounds.height - newBounds.height});
      console.log('[Main] Window visible:', speechBubbleWindow.isVisible());
      console.log('[Main] Window destroyed:', speechBubbleWindow.isDestroyed());
      
      // 内部コンテンツサイズも確認（可能なら）
      speechBubbleWindow.webContents.executeJavaScript(`
        const bubble = document.getElementById('bubble-content');
        if (bubble) {
          const rect = bubble.getBoundingClientRect();
          console.log('Content actual size:', {width: rect.width, height: rect.height, offsetW: bubble.offsetWidth, offsetH: bubble.offsetHeight});
        }
      `).catch((error: Error) => {
        console.error('ウィンドウサイズ計算エラー:', error);
      });
    }, 100);
    
    if (!speechBubbleWindow.isVisible()) {
      console.log('[Main] Showing speechBubble window');
      speechBubbleWindow.show();
    } else {
      console.log('[Main] speechBubble window already visible');
    }
  });

  // スピーチバブルからのログ
  ipcMain.on('log-from-speech-bubble', (_event, message: string) => {
    console.log(`[SpeechBubble]: ${message}`);
  });

  // システムプロンプト取得
  ipcMain.handle(IPC_CHANNELS.CHAT.GET_SYSTEM_PROMPT, async () => {
    try {
      return settingsStore.getSystemPrompt();
    } catch (error) {
      console.error('システムプロンプトの取得エラー:', error);
      throw error;
    }
  });

  // システムプロンプト設定
  ipcMain.handle(IPC_CHANNELS.CHAT.SET_SYSTEM_PROMPT, async (_event: IpcMainInvokeEvent, prompt: string) => {
    try {
      settingsStore.setSystemPrompt(prompt);
      return { success: true };
    } catch (error) {
      console.error('システムプロンプトの設定エラー:', error);
      throw error;
    }
  });

  // システムプロンプトリセット
  ipcMain.handle(IPC_CHANNELS.CHAT.RESET_SYSTEM_PROMPT, async () => {
    try {
      settingsStore.resetSystemPromptToDefault();
      return { success: true };
    } catch (error) {
      console.error('システムプロンプトのリセットエラー:', error);
      throw error;
    }
  });

  // ユーザー名・マスコット名関連のIPCハンドラー
  ipcMain.handle(IPC_CHANNELS.CHAT.GET_USER_NAME, async () => {
    try {
      return settingsStore.getUserName();
    } catch (error) {
      console.error('ユーザー名の取得エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CHAT.SET_USER_NAME, async (_event: IpcMainInvokeEvent, userName: string) => {
    try {
      settingsStore.setUserName(userName);
      updateSystemPrompt(); // Geminiのシステムプロンプトを更新
      return { success: true };
    } catch (error) {
      console.error('ユーザー名の設定エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CHAT.GET_MASCOT_NAME, async () => {
    try {
      return settingsStore.getMascotName();
    } catch (error) {
      console.error('マスコット名の取得エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CHAT.SET_MASCOT_NAME, async (_event: IpcMainInvokeEvent, mascotName: string) => {
    try {
      settingsStore.setMascotName(mascotName);
      updateSystemPrompt(); // Geminiのシステムプロンプトを更新
      return { success: true };
    } catch (error) {
      console.error('マスコット名の設定エラー:', error);
      throw error;
    }
  });

  // システムプロンプトコア関連のIPCハンドラー
  ipcMain.handle(IPC_CHANNELS.CHAT.GET_SYSTEM_PROMPT_CORE, async () => {
    try {
      return settingsStore.getSystemPromptCore();
    } catch (error) {
      console.error('システムプロンプトコアの取得エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CHAT.SET_SYSTEM_PROMPT_CORE, async (_event: IpcMainInvokeEvent, prompt: string) => {
    try {
      settingsStore.setSystemPromptCore(prompt);
      updateSystemPrompt(); // Geminiのシステムプロンプトを更新
      return { success: true };
    } catch (error) {
      console.error('システムプロンプトコアの設定エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CHAT.RESET_SYSTEM_PROMPT_CORE, async () => {
    try {
      settingsStore.setSystemPromptCore('あなたは親しみやすいデスクトップマスコットです。ユーザーとの会話を楽しみ、役立つ情報を提供してください。');
      updateSystemPrompt(); // Geminiのシステムプロンプトを更新
      return { success: true };
    } catch (error) {
      console.error('システムプロンプトコアのリセットエラー:', error);
      throw error;
    }
  });
}