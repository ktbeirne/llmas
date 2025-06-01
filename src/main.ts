import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent, dialog } from 'electron';
import started from 'electron-squirrel-startup';
import dotenv from 'dotenv';

dotenv.config();

import { initializeGemini, reinitializeGemini } from './geminiService';
import { WindowManager } from './utils/WindowManager';
import { ErrorHandler } from './utils/errorHandler';
import { IPC_CHANNELS } from './config/ipcChannels';
import { APP_CONFIG } from './config/constants';
import { SettingsStore, SettingsData, CameraSettings, WindowBounds } from './utils/settingsStore';
import { SpeechBubbleManager } from './utils/speechBubbleManager';
import { FunctionCallHandler } from './services/functionCallHandler';
import { WindowManagerController } from './main/windows/WindowManagerController';
import { setupExpressionHandlers } from './main/handlers/ExpressionHandlers';
import { setupThemeHandlers } from './main/handlers/ThemeHandlers';
import { setupCommunicationHandlers } from './main/handlers/CommunicationHandlers';
import { generateDynamicToolsJson } from './main/services/DynamicToolsGenerator';
import { SettingsHandler } from './main/ipc/handlers/SettingsHandler';
import { ChatHandler } from './main/ipc/handlers/ChatHandler';
import { VRMHandler } from './main/ipc/handlers/VRMHandler';
import { IPCErrorHandler } from './main/ipc/IPCErrorHandler';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// ウィンドウマネージャーのインスタンス
const windowManager = new WindowManager();

// 設定ストアのインスタンス
const settingsStore = new SettingsStore();

// スピーチバブルマネージャーのインスタンス
const speechBubbleManager = new SpeechBubbleManager();

// 新しいウィンドウ管理システム
const windowManagerController = new WindowManagerController(
  windowManager,
  settingsStore,
  speechBubbleManager
);

// 新しいIPCハンドラーシステム
const settingsHandler = new SettingsHandler(settingsStore, windowManagerController);
const chatHandler = new ChatHandler(settingsStore, windowManagerController);
const vrmHandler = new VRMHandler(windowManagerController);

// FunctionCallHandlerにWindowManagerを注入
const functionCallHandler = FunctionCallHandler.getInstance();
functionCallHandler.setWindowManager(windowManager);





/**
 * Gemini APIキーの初期化
 */
async function initializeAPI(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    ErrorHandler.handle(
      new Error('GEMINI_API_KEY が .env から読み込めませんでした'),
      true
    );
    app.quit();
    return;
  }
  try {
    await initializeGemini(apiKey);
    console.log('Gemini Service とFunction Calling が初期化されました');
    
    // 初期化後に動的tools.json生成を実行
    setTimeout(async () => {
      try {
        console.log('[Main] 起動時動的tools.json生成を開始');
        await generateDynamicToolsJson(windowManagerController, settingsStore);
        await reinitializeGemini(apiKey);
        console.log('[Main] 起動時動的tools.json生成完了');
      } catch (dynamicError) {
        console.error('[Main] 起動時動的tools.json生成エラー:', dynamicError);
      }
    }, 2000); // VRMロード待ち
  } catch (error) {
    ErrorHandler.handle(
      new Error(`Gemini Service の初期化に失敗: ${error instanceof Error ? error.message : '不明なエラー'}`),
      true
    );
  }
}


/**
 * IPCハンドラーの設定
 */
function setupIPCHandlers(): void {
  console.log('[Main] 新しいIPC構造でハンドラーを設定中...');
  
  try {
    // 新しいIPCハンドラーシステムを登録
    settingsHandler.setupHandlers();
    chatHandler.setupHandlers();
    vrmHandler.setupHandlers();
    
    // 既存のハンドラーを設定（段階的移行）
    setupExpressionHandlers(windowManagerController, settingsStore);
    setupThemeHandlers(settingsStore);
    
    // 注意: CommunicationHandlersは段階的にChatHandlerに移行済み
    // 重複を避けるため、CommunicationHandlersの呼び出しをコメントアウト
    // setupCommunicationHandlers(windowManagerController, settingsStore);
    
    console.log('[Main] 新しいIPC構造でのハンドラー設定が完了しました');
  } catch (error) {
    const errorResponse = IPCErrorHandler.handleError(error, 'Main', 'setupIPCHandlers');
    console.error('[Main] IPCハンドラー設定中にエラーが発生:', errorResponse);
  }
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
  await initializeAPI();
  setupIPCHandlers();
  
  await windowManagerController.initializeWindows();

  app.on('activate', async () => {
    if (!windowManagerController.hasAnyWindow()) {
      await windowManagerController.initializeWindows();
    }
  });
});

// すべてのウィンドウが閉じられた時の処理
// アプリ終了前の設定保存
async function saveAllDisplaySettingsBeforeQuit() {
  try {
    // ウィンドウの位置・サイズを保存
    windowManagerController.saveWindowSettings();
  } catch (error) {
    console.error('終了前の設定保存でエラー:', error);
  }
}

app.on('before-quit', async (_event) => {
  console.log('アプリケーション終了前の処理を開始...');
  
  // 設定保存を実行
  await saveAllDisplaySettingsBeforeQuit();
  
  console.log('アプリケーション終了前の処理が完了しました');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // macOS以外ではアプリを終了
    setTimeout(() => {
      app.quit();
    }, APP_CONFIG.QUIT_DELAY);
  }
});