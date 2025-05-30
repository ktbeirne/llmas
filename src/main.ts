import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import dotenv from 'dotenv';
dotenv.config();
import { generateTextFromGemini, initializeGemini } from './geminiService';
import { WindowManager } from './utils/WindowManager';
import { ErrorHandler } from './utils/errorHandler';
import { IPC_CHANNELS } from './config/ipcChannels';
import { WINDOW_CONFIG, PATHS, APP_CONFIG } from './config/constants';

// Electron Forge Viteプラグインによって自動的に定義される環境変数
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// ウィンドウマネージャーのインスタンス
const windowManager = new WindowManager();

/**
 * メインウィンドウを作成
 */
function createMainWindow(): void {
  try {
    const config = WindowManager.getMainWindowConfig();
    const window = windowManager.createWindow(config, 'index.html');
    
    // 開発環境では開発者ツールを開く（必要に応じて）
    // if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    //   window.webContents.openDevTools();
    // }
  } catch (error) {
    ErrorHandler.handle(error, true);
  }
}

/**
 * チャットウィンドウを作成
 */
function createChatWindow(): void {
  try {
    const config = WindowManager.getChatWindowConfig();
    const window = windowManager.createWindow(config, PATHS.CHAT_HTML);
    
    // 開発環境では開発者ツールを開く（必要に応じて）
    // if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    //   window.webContents.openDevTools();
    // }
  } catch (error) {
    ErrorHandler.handle(error, true);
  }
}

/**
 * スピーチバブルウィンドウを作成
 */
function createSpeechBubbleWindow(): void {
  try {
    const config = WindowManager.getSpeechBubbleConfig();
    const window = windowManager.createWindow(config, PATHS.SPEECH_BUBBLE_HTML);
    
    // ウィンドウの準備完了を待つ
    window.once('ready-to-show', () => {
      console.log('[SpeechBubble] ウィンドウの準備が完了しました');
    });
    
    // 開発環境では開発者ツールを開く（必要に応じて）
    // if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    //   window.webContents.openDevTools({ mode: 'detach' });
    // }
  } catch (error) {
    ErrorHandler.handle(error, true);
  }
}

/**
 * Gemini APIキーの初期化
 */
function initializeAPI(): void {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    ErrorHandler.handle(
      new Error('GEMINI_API_KEY が .env から読み込めませんでした'),
      true
    );
    app.quit();
    return;
  }
  initializeGemini(apiKey);
}

/**
 * IPCハンドラーの設定
 */
function setupIPCHandlers(): void {
  // Geminiへのプロンプト送信
  ipcMain.handle('send-prompt-to-gemini', async (_event: IpcMainInvokeEvent, prompt: string) => {
    console.log(`メインプロセスがプロンプト "${prompt}" を受け取りました`);
    
    if (!prompt) {
      return "エラー: プロンプトが空です。";
    }
    
    try {
      const response = await generateTextFromGemini(prompt);
      const speechBubbleWindow = windowManager.getWindow('speechBubble');
      
      if (speechBubbleWindow) {
        speechBubbleWindow.webContents.send('set-speech-bubble-text', response);
      }
      
      return response;
    } catch (error) {
      ErrorHandler.handle(error);
      const errorMessage = `エラー: ${error instanceof Error ? error.message : "不明なエラー"}`;
      
      const speechBubbleWindow = windowManager.getWindow('speechBubble');
      if (speechBubbleWindow) {
        speechBubbleWindow.webContents.send('set-speech-bubble-text', errorMessage);
      }
      
      return errorMessage;
    }
  });

  // スピーチバブルの非表示
  ipcMain.on('hide-speech-bubble-window', () => {
    const speechBubbleWindow = windowManager.getWindow('speechBubble');
    if (speechBubbleWindow?.isVisible()) {
      speechBubbleWindow.hide();
    }
  });

  // スピーチバブルのサイズ通知とポジション更新
  ipcMain.on('notify-bubble-size', (_event, size: { width: number; height: number }) => {
    const speechBubbleWindow = windowManager.getWindow('speechBubble');
    const mainWindow = windowManager.getWindow('main');
    
    if (!speechBubbleWindow || !mainWindow) return;
    
    const windowWidth = Math.max(size.width, 80);
    const windowHeight = Math.max(size.height, 50);
    
    const mainBounds = mainWindow.getBounds();
    const x = mainBounds.x + Math.round((mainBounds.width - windowWidth) / 2);
    const y = (mainBounds.y + WINDOW_CONFIG.SPEECH_BUBBLE.MIN_DISPLAY_TIME / 20) - windowHeight;
    
    speechBubbleWindow.setBounds({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(windowWidth),
      height: Math.round(windowHeight)
    });
    
    if (!speechBubbleWindow.isVisible()) {
      speechBubbleWindow.show();
    }
  });

  // スピーチバブルからのログ
  ipcMain.on('log-from-speech-bubble', (_event, message: string) => {
    console.log(`[SpeechBubble]: ${message}`);
  });

  // チャットウィンドウの表示切り替え
  ipcMain.on('toggle-chat-visibility', () => {
    const chatWindow = windowManager.getWindow('chat');
    
    if (chatWindow) {
      if (chatWindow.isVisible()) {
        chatWindow.hide();
      } else {
        chatWindow.show();
      }
    } else {
      createChatWindow();
    }
  });
}

/**
 * エラーハンドラーの設定
 */
function setupErrorHandlers(): void {
  process.on('uncaughtException', (error) => {
    ErrorHandler.handleUncaughtException(error);
  });
  
  process.on('unhandledRejection', (reason) => {
    ErrorHandler.handleRejection(reason);
  });
}

// アプリケーションの初期化
app.whenReady().then(async () => {
  setupErrorHandlers();
  initializeAPI();
  setupIPCHandlers();
  
  createMainWindow();
  createChatWindow();
  createSpeechBubbleWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createChatWindow();
      createSpeechBubbleWindow();
    }
  });
});

// すべてのウィンドウが閉じられた時の処理
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // macOS以外ではアプリを終了
    setTimeout(() => {
      app.quit();
    }, APP_CONFIG.QUIT_DELAY);
  }
});