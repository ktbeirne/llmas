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

// 起動最適化
import { StartupManager } from './main/services/StartupManager';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// 起動マネージャーのインスタンス
const startupManager = new StartupManager();

// グローバルな参照用
let windowManager: WindowManager;
let settingsStore: SettingsStore;
let speechBubbleManager: SpeechBubbleManager;
let windowManagerController: WindowManagerController;
let settingsHandler: SettingsHandler;
let chatHandler: ChatHandler;
let vrmHandler: VRMHandler;





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

/**
 * 最適化された起動シーケンス設定
 */
async function setupOptimizedStartup(): Promise<void> {
  console.log('🚀 [Main] Starting optimized startup sequence...');
  
  // システム情報の検出
  const systemInfo = await StartupManager.detectSystemInfo();
  startupManager.setSystemInfo(systemInfo);
  
  // コンポーネントの登録（優先度付き）
  await registerStartupComponents();
  
  // 最適化された初期化実行
  const metrics = await startupManager.initialize();
  
  // 起動メトリクスをログ出力
  console.log('📊 [Main] Startup metrics:', {
    totalTime: `${metrics.totalStartupTime.toFixed(2)}ms`,
    components: Object.keys(metrics.componentInitTimes).length,
    errors: metrics.errors.length
  });
  
  // 最適化提案を生成
  const suggestions = startupManager.generateOptimizationSuggestions(metrics);
  if (suggestions.length > 0) {
    console.log('💡 [Main] Optimization suggestions:', suggestions);
  }
}

/**
 * 起動コンポーネントの登録
 */
async function registerStartupComponents(): Promise<void> {
  // Critical: エラーハンドラーと設定ストア
  startupManager.registerComponent({
    name: 'error-handlers',
    priority: 'critical',
    initFunction: async () => {
      setupErrorHandlers();
    },
    timeout: 5000
  });
  
  startupManager.registerComponent({
    name: 'settings-store',
    priority: 'critical',
    initFunction: async () => {
      settingsStore = new SettingsStore();
    },
    timeout: 5000
  });
  
  // High: コアマネージャー
  startupManager.registerComponent({
    name: 'window-manager',
    priority: 'high',
    dependencies: ['settings-store'],
    initFunction: async () => {
      windowManager = new WindowManager();
    },
    timeout: 10000
  });
  
  startupManager.registerComponent({
    name: 'speech-bubble-manager',
    priority: 'high',
    dependencies: ['settings-store'],
    initFunction: async () => {
      speechBubbleManager = new SpeechBubbleManager();
    },
    timeout: 10000
  });
  
  startupManager.registerComponent({
    name: 'window-controller',
    priority: 'high',
    dependencies: ['window-manager', 'settings-store', 'speech-bubble-manager'],
    initFunction: async () => {
      windowManagerController = new WindowManagerController(
        windowManager,
        settingsStore,
        speechBubbleManager
      );
    },
    timeout: 15000
  });
  
  // Normal: API初期化とIPCハンドラー
  startupManager.registerComponent({
    name: 'gemini-api',
    priority: 'normal',
    dependencies: ['error-handlers'],
    initFunction: async () => {
      await initializeAPI();
    },
    timeout: 30000,
    retryAttempts: 2
  });
  
  startupManager.registerComponent({
    name: 'ipc-handlers',
    priority: 'normal',
    dependencies: ['window-controller'],
    initFunction: async () => {
      // IPCハンドラーの初期化
      settingsHandler = new SettingsHandler(settingsStore, windowManagerController);
      chatHandler = new ChatHandler(settingsStore, windowManagerController);
      vrmHandler = new VRMHandler(windowManagerController);
      
      setupIPCHandlers();
    },
    timeout: 15000
  });
  
  startupManager.registerComponent({
    name: 'function-call-handler',
    priority: 'normal',
    dependencies: ['window-manager'],
    initFunction: async () => {
      const functionCallHandler = FunctionCallHandler.getInstance();
      functionCallHandler.setWindowManager(windowManager);
    },
    timeout: 10000
  });
  
  // Low: ウィンドウ初期化
  startupManager.registerComponent({
    name: 'main-windows',
    priority: 'low',
    dependencies: ['window-controller', 'ipc-handlers'],
    initFunction: async () => {
      await windowManagerController.initializeWindows();
    },
    timeout: 20000
  });
}

// アプリケーションの初期化
app.whenReady().then(async () => {
  try {
    // 一時的に従来の起動方式を使用
    setupErrorHandlers();
    settingsStore = new SettingsStore();
    windowManager = new WindowManager();
    speechBubbleManager = new SpeechBubbleManager();
    windowManagerController = new WindowManagerController(
      windowManager,
      settingsStore,
      speechBubbleManager
    );
    
    // IPCハンドラーの初期化
    settingsHandler = new SettingsHandler(settingsStore, windowManagerController);
    chatHandler = new ChatHandler(settingsStore, windowManagerController);
    vrmHandler = new VRMHandler(windowManagerController);
    
    const functionCallHandler = FunctionCallHandler.getInstance();
    functionCallHandler.setWindowManager(windowManager);
    
    await initializeAPI();
    setupIPCHandlers();
    await windowManagerController.initializeWindows();
    
    app.on('activate', async () => {
      if (!windowManagerController.hasAnyWindow()) {
        await windowManagerController.initializeWindows();
      }
    });
  } catch (error) {
    console.error('❌ [Main] Startup failed:', error);
    ErrorHandler.handle(error as Error, true);
  }
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