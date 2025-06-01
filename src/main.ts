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
  // コミュニケーション関連のIPCハンドラーを設定
  setupCommunicationHandlers(windowManagerController, settingsStore);

  // チャットウィンドウの表示切り替え
  ipcMain.on('toggle-chat-visibility', () => {
    windowManagerController.toggleChatWindow();
  });

  // アプリケーション終了
  ipcMain.on('quit-app', () => {
    console.log('アプリケーション終了リクエストを受信しました');
    // すべてのウィンドウを閉じる
    BrowserWindow.getAllWindows().forEach(window => window.close());
    // アプリケーションを終了
    app.quit();
  });

  // 設定ウィンドウのトグル
  ipcMain.on('toggle-settings-window', () => {
    windowManagerController.toggleSettingsWindow();
  });

  // 設定ウィンドウを開く
  ipcMain.on('open-settings', () => {
    const settingsController = windowManagerController.getSettingsWindowController();
    settingsController.show();
  });

  // 設定ウィンドウを閉じる
  ipcMain.on('close-settings', () => {
    const settingsController = windowManagerController.getSettingsWindowController();
    settingsController.close();
  });

  // 設定の取得
  ipcMain.handle('get-settings', async () => {
    return settingsStore.getAllSettings();
  });

  // 設定の保存
  ipcMain.handle('save-settings', async (_event: IpcMainInvokeEvent, settings: SettingsData) => {
    try {
      settingsStore.saveAllSettings(settings);
      
      // メインウィンドウのサイズを更新
      const mainWindow = windowManagerController.getMainWindow();
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


  // カメラ設定関連のIPCハンドラー
  ipcMain.handle(IPC_CHANNELS.CAMERA.GET_SETTINGS, async () => {
    try {
      return settingsStore.getCameraSettings();
    } catch (error) {
      console.error('カメラ設定の取得エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CAMERA.SET_SETTINGS, async (_event: IpcMainInvokeEvent, settings: CameraSettings) => {
    try {
      settingsStore.setCameraSettings(settings);
      return { success: true };
    } catch (error) {
      console.error('カメラ設定の保存エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CAMERA.RESET_SETTINGS, async () => {
    try {
      settingsStore.resetDisplaySettings();
      return { success: true };
    } catch (error) {
      console.error('カメラ設定のリセットエラー:', error);
      throw error;
    }
  });

  // ウィンドウ位置関連のIPCハンドラー
  ipcMain.handle(IPC_CHANNELS.WINDOW.GET_MAIN_BOUNDS, async () => {
    try {
      return settingsStore.getMainWindowBounds();
    } catch (error) {
      console.error('メインウィンドウ位置の取得エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.SET_MAIN_BOUNDS, async (_event: IpcMainInvokeEvent, bounds: WindowBounds) => {
    try {
      settingsStore.setMainWindowBounds(bounds);
      return { success: true };
    } catch (error) {
      console.error('メインウィンドウ位置の保存エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.GET_CHAT_BOUNDS, async () => {
    try {
      return settingsStore.getChatWindowBounds();
    } catch (error) {
      console.error('チャットウィンドウ位置の取得エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.SET_CHAT_BOUNDS, async (_event: IpcMainInvokeEvent, bounds: WindowBounds) => {
    try {
      settingsStore.setChatWindowBounds(bounds);
      return { success: true };
    } catch (error) {
      console.error('チャットウィンドウ位置の保存エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.GET_CHAT_VISIBLE, async () => {
    try {
      return settingsStore.getChatWindowVisible();
    } catch (error) {
      console.error('チャットウィンドウ表示状態の取得エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.SET_CHAT_VISIBLE, async (_event: IpcMainInvokeEvent, visible: boolean) => {
    try {
      settingsStore.setChatWindowVisible(visible);
      return { success: true };
    } catch (error) {
      console.error('チャットウィンドウ表示状態の保存エラー:', error);
      throw error;
    }
  });

  // 画面表示設定の一括操作
  ipcMain.handle(IPC_CHANNELS.DISPLAY.SAVE_ALL_SETTINGS, async (_event: IpcMainInvokeEvent, settings: SettingsData) => {
    try {
      if (settings.cameraSettings) {
        settingsStore.setCameraSettings(settings.cameraSettings);
      }
      if (settings.mainWindowBounds) {
        settingsStore.setMainWindowBounds(settings.mainWindowBounds);
      }
      if (settings.chatWindowBounds) {
        settingsStore.setChatWindowBounds(settings.chatWindowBounds);
      }
      if (typeof settings.chatWindowVisible === 'boolean') {
        settingsStore.setChatWindowVisible(settings.chatWindowVisible);
      }
      return { success: true };
    } catch (error) {
      console.error('画面表示設定の一括保存エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.DISPLAY.RESET_ALL_SETTINGS, async () => {
    try {
      settingsStore.resetDisplaySettings();
      return { success: true };
    } catch (error) {
      console.error('画面表示設定のリセットエラー:', error);
      throw error;
    }
  });



  // 表情関連のIPCハンドラーを設定
  setupExpressionHandlers(windowManagerController, settingsStore);
  
  // テーマ関連のIPCハンドラーを設定
  setupThemeHandlers(settingsStore);
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