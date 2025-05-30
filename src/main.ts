import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import dotenv from 'dotenv';
dotenv.config();
import { generateTextFromGemini, initializeGemini } from './geminiService';
import { WindowManager } from './utils/WindowManager';
import { ErrorHandler } from './utils/errorHandler';
import { IPC_CHANNELS } from './config/ipcChannels';
import { WINDOW_CONFIG, PATHS, APP_CONFIG } from './config/constants';
import { SettingsStore } from './utils/settingsStore';
import { SpeechBubbleManager } from './utils/speechBubbleManager';

// Electron Forge Viteプラグインによって自動的に定義される環境変数
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// ウィンドウマネージャーのインスタンス
const windowManager = new WindowManager();

// 設定ストアのインスタンス
const settingsStore = new SettingsStore();

/**
 * メインウィンドウを作成
 */
function createMainWindow(): void {
  try {
    // 設定からウィンドウサイズを取得
    const windowSize = settingsStore.getWindowSize();
    const config = WindowManager.getMainWindowConfig({
      width: windowSize.width,
      height: windowSize.height
    });
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
function createChatWindow(): BrowserWindow | null {
  try {
    const config = WindowManager.getChatWindowConfig();
    const window = windowManager.createWindow(config, PATHS.CHAT_HTML);
    
    // ウィンドウの読み込み完了を待つ
    window.webContents.on('did-finish-load', () => {
      console.log('[ChatWindow] HTMLの読み込みが完了しました');
    });
    
    window.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('[ChatWindow] 読み込みエラー:', errorCode, errorDescription);
    });
    
    // 開発環境では開発者ツールを開く（必要に応じて）
    // if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    //   window.webContents.openDevTools();
    // }
    
    return window;
  } catch (error) {
    ErrorHandler.handle(error, true);
    return null;
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
    
    // webContentsのロード完了をログ出力
    window.webContents.on('did-finish-load', () => {
      console.log('[SpeechBubble] HTMLのロードが完了しました');
    });
    
    window.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('[SpeechBubble] ロードエラー:', errorCode, errorDescription);
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
 * 設定ウィンドウを作成
 */
function createSettingsWindow(): BrowserWindow | null {
  try {
    const config = WindowManager.getSettingsWindowConfig();
    const window = windowManager.createWindow(config, 'settings.html');
    
    // ウィンドウの読み込み完了を待つ
    window.webContents.on('did-finish-load', () => {
      console.log('[SettingsWindow] HTMLの読み込みが完了しました');
    });
    
    return window;
  } catch (error) {
    ErrorHandler.handle(error, true);
    return null;
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

  // スピーチバブルの非表示
  ipcMain.on('hide-speech-bubble-window', () => {
    const speechBubbleWindow = windowManager.getWindow('speechBubble');
    SpeechBubbleManager.hide(speechBubbleWindow);
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
    const mainWindow = windowManager.getWindow('main');
    
    if (chatWindow) {
      if (chatWindow.isVisible()) {
        chatWindow.hide();
        // メインウィンドウにチャットウィンドウの状態を通知
        if (mainWindow) {
          mainWindow.webContents.send('chat-window-state-changed', false);
        }
      } else {
        chatWindow.show();
        chatWindow.focus();
        // メインウィンドウにチャットウィンドウの状態を通知
        if (mainWindow) {
          mainWindow.webContents.send('chat-window-state-changed', true);
        }
      }
    } else {
      const newChatWindow = createChatWindow();
      // 新しく作成した場合は、ウィンドウを表示する
      if (newChatWindow) {
        newChatWindow.show();
        newChatWindow.focus();
        // メインウィンドウにチャットウィンドウの状態を通知
        if (mainWindow) {
          mainWindow.webContents.send('chat-window-state-changed', true);
        }
      }
    }
  });

  // アプリケーション終了
  ipcMain.on('quit-app', () => {
    console.log('アプリケーション終了リクエストを受信しました');
    // すべてのウィンドウを閉じる
    BrowserWindow.getAllWindows().forEach(window => window.close());
    // アプリケーションを終了
    app.quit();
  });

  // 設定ウィンドウを開く
  ipcMain.on('open-settings', () => {
    const settingsWindow = windowManager.getWindow('settings');
    
    if (settingsWindow) {
      settingsWindow.show();
      settingsWindow.focus();
    } else {
      createSettingsWindow();
    }
  });

  // 設定ウィンドウを閉じる
  ipcMain.on('close-settings', () => {
    const settingsWindow = windowManager.getWindow('settings');
    if (settingsWindow) {
      settingsWindow.close();
    }
  });

  // 設定の取得
  ipcMain.handle('get-settings', async () => {
    return settingsStore.getAllSettings();
  });

  // 設定の保存
  ipcMain.handle('save-settings', async (_event: IpcMainInvokeEvent, settings: any) => {
    try {
      settingsStore.saveAllSettings(settings);
      
      // メインウィンドウのサイズを更新
      const mainWindow = windowManager.getWindow('main');
      if (mainWindow && settings.windowSize) {
        mainWindow.setSize(settings.windowSize.width, settings.windowSize.height);
      }
      
      // VRMモデルの更新（実装が必要）
      if (settings.vrmModelPath) {
        // TODO: VRMモデルの読み込み処理を実装
        console.log('VRMモデルパスが更新されました:', settings.vrmModelPath);
      }
      
      return { success: true };
    } catch (error) {
      console.error('設定の保存エラー:', error);
      throw error;
    }
  });

  // 設定のリセット
  ipcMain.handle('reset-settings', async () => {
    settingsStore.resetToDefaults();
    return settingsStore.getAllSettings();
  });

  // VRMファイル選択ダイアログ
  ipcMain.handle('select-vrm-file', async () => {
    const result = await dialog.showOpenDialog({
      title: 'VRMファイルを選択',
      filters: [
        { name: 'VRM Files', extensions: ['vrm'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    
    return null;
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
  createSpeechBubbleWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
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