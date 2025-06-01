import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import dotenv from 'dotenv';
dotenv.config();
import { generateTextFromGemini, generateChatResponse, getChatHistory, clearChatHistory, initializeGemini, reinitializeGemini, updateSystemPrompt } from './geminiService';
import { WindowManager } from './utils/WindowManager';
import { ErrorHandler } from './utils/errorHandler';
import { IPC_CHANNELS } from './config/ipcChannels';
import { WINDOW_CONFIG, PATHS, APP_CONFIG } from './config/constants';
import { SettingsStore } from './utils/settingsStore';
import { SpeechBubbleManager } from './utils/speechBubbleManager';
import { ToolsService } from './services/toolsService';
import { FunctionCallHandler } from './services/functionCallHandler';

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

// FunctionCallHandlerにWindowManagerを注入
const functionCallHandler = FunctionCallHandler.getInstance();
functionCallHandler.setWindowManager(windowManager);

/**
 * メインウィンドウを作成
 */
function createMainWindow(): void {
  try {
    // 設定からウィンドウサイズを取得
    const windowSize = settingsStore.getWindowSize();
    
    // 保存されたウィンドウ位置を取得
    const savedBounds = settingsStore.getMainWindowBounds();
    console.log('[Main] メインウィンドウ作成 - 保存された位置:', savedBounds);
    
    const config = WindowManager.getMainWindowConfig({
      width: windowSize.width,
      height: windowSize.height,
      x: savedBounds?.x,
      y: savedBounds?.y
    });
    console.log('[Main] メインウィンドウ設定:', config);
    const window = windowManager.createWindow(config, 'index.html');
    
    // ウィンドウの準備完了後に表示（タイトルバー問題回避）
    window.once('ready-to-show', () => {
      console.log('[Main] メインウィンドウの準備が完了しました');
      window.show();
      
      // Windows環境での追加処理 + 継続的タイトルバー監視
      if (process.platform === 'win32') {
        // 表示後にもう一度タイトルをクリア
        setTimeout(() => {
          if (!window.isDestroyed()) {
            window.setTitle('');
            console.log('[Main] Windows用タイトルクリア処理完了');
            
            // 継続的なタイトルバー監視を開始（環境変数で無効化可能）
            if (process.env.DISABLE_TITLEBAR_MONITORING !== 'true') {
              startTitleBarMonitoring(window);
            } else {
              console.log('[Main] タイトルバー監視が無効化されています');
            }
          }
        }, 100);
      } else {
        // macOS/Linuxでも監視開始（環境変数で無効化可能）
        setTimeout(() => {
          if (!window.isDestroyed() && process.env.DISABLE_TITLEBAR_MONITORING !== 'true') {
            startTitleBarMonitoring(window);
          }
        }, 100);
      }
    });
    
    // ウィンドウ位置変更時の自動保存
    let moveTimeout: NodeJS.Timeout | null = null;
    window.on('moved', () => {
      if (moveTimeout) clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        try {
          const bounds = window.getBounds();
          settingsStore.setMainWindowBounds(bounds);
          console.log('メインウィンドウ位置を保存しました:', bounds);
        } catch (error) {
          console.error('メインウィンドウ位置の保存に失敗:', error);
        }
      }, 500);
    });

    // ウィンドウサイズ変更時の自動保存
    let resizeTimeout: NodeJS.Timeout | null = null;
    window.on('resized', () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        try {
          const bounds = window.getBounds();
          settingsStore.setMainWindowBounds(bounds);
          console.log('メインウィンドウサイズを保存しました:', bounds);
        } catch (error) {
          console.error('メインウィンドウサイズの保存に失敗:', error);
        }
      }, 500);
    });
    
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
    // 保存されたチャットウィンドウ位置を取得
    const savedBounds = settingsStore.getChatWindowBounds();
    const savedVisible = settingsStore.getChatWindowVisible();
    console.log('[Main] チャットウィンドウ作成 - 保存された位置:', savedBounds);
    console.log('[Main] チャットウィンドウ作成 - 保存された表示状態:', savedVisible);
    
    const config = WindowManager.getChatWindowConfig();
    
    // 保存された位置・サイズがあれば適用
    if (savedBounds) {
      config.x = savedBounds.x;
      config.y = savedBounds.y;
      config.width = savedBounds.width;
      config.height = savedBounds.height;
      console.log('[Main] チャットウィンドウ設定を適用:', config);
    }
    
    const window = windowManager.createWindow(config, PATHS.CHAT_HTML);
    
    // 保存された表示状態を復元
    if (!savedVisible) {
      window.hide();
    }
    
    // ウィンドウ位置・サイズ変更時の自動保存
    let chatMoveTimeout: NodeJS.Timeout | null = null;
    window.on('moved', () => {
      if (chatMoveTimeout) clearTimeout(chatMoveTimeout);
      chatMoveTimeout = setTimeout(() => {
        try {
          const bounds = window.getBounds();
          settingsStore.setChatWindowBounds(bounds);
          console.log('チャットウィンドウ位置を保存しました:', bounds);
        } catch (error) {
          console.error('チャットウィンドウ位置の保存に失敗:', error);
        }
      }, 500);
    });

    let chatResizeTimeout: NodeJS.Timeout | null = null;
    window.on('resized', () => {
      if (chatResizeTimeout) clearTimeout(chatResizeTimeout);
      chatResizeTimeout = setTimeout(() => {
        try {
          const bounds = window.getBounds();
          settingsStore.setChatWindowBounds(bounds);
          console.log('チャットウィンドウサイズを保存しました:', bounds);
        } catch (error) {
          console.error('チャットウィンドウサイズの保存に失敗:', error);
        }
      }, 500);
    });

    // 表示状態変更時の自動保存
    window.on('show', () => {
      try {
        settingsStore.setChatWindowVisible(true);
        console.log('チャットウィンドウ表示状態を保存しました: true');
      } catch (error) {
        console.error('チャットウィンドウ表示状態の保存に失敗:', error);
      }
    });

    window.on('hide', () => {
      try {
        settingsStore.setChatWindowVisible(false);
        console.log('チャットウィンドウ表示状態を保存しました: false');
      } catch (error) {
        console.error('チャットウィンドウ表示状態の保存に失敗:', error);
      }
    });
    
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
    
    // ウィンドウが閉じられた時の状態変更通知
    window.on('closed', () => {
      const mainWindow = windowManager.getWindow('main');
      if (mainWindow) {
        mainWindow.webContents.send('settings-window-state-changed', false);
      }
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
        await generateDynamicToolsJson();
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
 * MainWindow用タイトルバー継続監視（軽量版）
 */
function startTitleBarMonitoring(window: BrowserWindow): void {
  console.log('[Main] Starting lightweight titlebar monitoring for main window...');
  
  let isDragging = false;
  let dragStartTime = 0;
  
  // 軽量な監視（1秒間隔）- ドラッグ中は停止
  const monitorInterval = setInterval(() => {
    if (window.isDestroyed()) {
      clearInterval(monitorInterval);
      return;
    }
    
    // ドラッグ中は監視を一時停止
    if (isDragging && Date.now() - dragStartTime < 500) {
      return;
    }
    
    // タイトルが設定されていれば強制的に空にする
    if (window.getTitle() !== '') {
      window.setTitle('');
    }
  }, 1000); // 1秒間隔に変更
  
  // フォーカス・ブラーイベントでリセット（ドラッグに影響しない）
  window.on('focus', () => {
    if (!window.isDestroyed()) {
      setTimeout(() => window.setTitle(''), 100); // 少し遅延
    }
  });
  
  window.on('blur', () => {
    if (!window.isDestroyed()) {
      setTimeout(() => window.setTitle(''), 100); // 少し遅延
    }
  });
  
  // ドラッグ開始検出
  window.on('will-move', () => {
    isDragging = true;
    dragStartTime = Date.now();
  });
  
  // ドラッグ終了検出（moved イベント後にドラッグ完了と判定）
  window.on('moved', () => {
    // ドラッグ終了後にタイトルをリセット（遅延付き）
    setTimeout(() => {
      if (!window.isDestroyed()) {
        window.setTitle('');
        isDragging = false;
      }
    }, 200);
  });
  
  // リサイズ後にタイトルリセット（遅延付き）
  window.on('resized', () => {
    setTimeout(() => {
      if (!window.isDestroyed()) {
        window.setTitle('');
      }
    }, 100);
  });
  
  // ウィンドウが閉じられる時に監視停止
  window.on('closed', () => {
    clearInterval(monitorInterval);
    console.log('[Main] Titlebar monitoring stopped for closed window');
  });
}

/**
 * IPCハンドラーの設定
 */
function setupIPCHandlers(): void {
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

  // 設定ウィンドウのトグル
  ipcMain.on('toggle-settings-window', () => {
    const settingsWindow = windowManager.getWindow('settings');
    const mainWindow = windowManager.getWindow('main');
    
    if (settingsWindow && settingsWindow.isVisible()) {
      // 設定ウィンドウが開いている場合は閉じる
      settingsWindow.close();
      if (mainWindow) {
        mainWindow.webContents.send('settings-window-state-changed', false);
      }
    } else if (settingsWindow && !settingsWindow.isDestroyed()) {
      // 設定ウィンドウが存在するが非表示の場合は表示
      settingsWindow.show();
      settingsWindow.focus();
      if (mainWindow) {
        mainWindow.webContents.send('settings-window-state-changed', true);
      }
    } else {
      // 設定ウィンドウが存在しない場合は新規作成
      const newWindow = createSettingsWindow();
      if (newWindow && mainWindow) {
        mainWindow.webContents.send('settings-window-state-changed', true);
      }
    }
  });

  // 設定ウィンドウを開く
  ipcMain.on('open-settings', () => {
    const settingsWindow = windowManager.getWindow('settings');
    const mainWindow = windowManager.getWindow('main');
    
    if (settingsWindow) {
      settingsWindow.show();
      settingsWindow.focus();
    } else {
      const newWindow = createSettingsWindow();
      if (newWindow) {
        // 設定ウィンドウの状態変更通知
        if (mainWindow) {
          mainWindow.webContents.send('settings-window-state-changed', true);
        }
      }
    }
  });

  // 設定ウィンドウを閉じる
  ipcMain.on('close-settings', () => {
    const settingsWindow = windowManager.getWindow('settings');
    const mainWindow = windowManager.getWindow('main');
    
    if (settingsWindow) {
      settingsWindow.close();
      // 設定ウィンドウの状態変更通知（将来の実装用）
      if (mainWindow) {
        mainWindow.webContents.send('settings-window-state-changed', false);
      }
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

  // カメラ設定関連のIPCハンドラー
  ipcMain.handle(IPC_CHANNELS.CAMERA.GET_SETTINGS, async () => {
    try {
      return settingsStore.getCameraSettings();
    } catch (error) {
      console.error('カメラ設定の取得エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CAMERA.SET_SETTINGS, async (_event: IpcMainInvokeEvent, settings: any) => {
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

  ipcMain.handle(IPC_CHANNELS.WINDOW.SET_MAIN_BOUNDS, async (_event: IpcMainInvokeEvent, bounds: any) => {
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

  ipcMain.handle(IPC_CHANNELS.WINDOW.SET_CHAT_BOUNDS, async (_event: IpcMainInvokeEvent, bounds: any) => {
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
  ipcMain.handle(IPC_CHANNELS.DISPLAY.SAVE_ALL_SETTINGS, async (_event: IpcMainInvokeEvent, settings: any) => {
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

  // テーマ関連のIPCハンドラー
  ipcMain.handle(IPC_CHANNELS.THEME.GET_THEME, async () => {
    try {
      return settingsStore.getTheme();
    } catch (error) {
      console.error('テーマの取得エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.THEME.SET_THEME, async (_event: IpcMainInvokeEvent, theme: string) => {
    try {
      settingsStore.setTheme(theme);
      
      // すべてのウィンドウにテーマ変更を通知
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(window => {
        window.webContents.send('theme-changed', theme);
      });
      
      console.log(`テーマを ${theme} に変更し、${windows.length} 個のウィンドウに通知しました`);
      return { success: true };
    } catch (error) {
      console.error('テーマの設定エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.THEME.GET_AVAILABLE_THEMES, async () => {
    try {
      // 利用可能なテーマ一覧を返す
      return [
        {
          id: 'default',
          name: 'ソフト＆ドリーミー',
          description: '明るく親しみやすい、やわらかな印象のテーマ',
          preview: {
            primary: '#5082C4',
            secondary: '#8E7CC3',
            accent: '#E91E63',
            background: '#FDFBF7'
          }
        },
        {
          id: 'dark',
          name: 'ダークモード',
          description: '目に優しく洗練された、落ち着いた印象のテーマ',
          preview: {
            primary: '#60A5FA',
            secondary: '#A78BFA',
            accent: '#FCD34D',
            background: '#0F172A'
          }
        },
        {
          id: 'sakura',
          name: 'サクラ',
          description: '桜の季節を思わせる、華やかで可愛らしいテーマ',
          preview: {
            primary: '#D1477A',
            secondary: '#C485C7',
            accent: '#FF5722',
            background: '#FDF2F8'
          }
        },
        {
          id: 'ocean',
          name: 'オーシャン',
          description: '海の爽やかさを表現した、清々しいテーマ',
          preview: {
            primary: '#0D7377',
            secondary: '#1E40AF',
            accent: '#DC7633',
            background: '#F0FDFA'
          }
        },
        {
          id: 'forest',
          name: 'フォレスト',
          description: '森の静寂をイメージした、落ち着いた自然派テーマ',
          preview: {
            primary: '#6B7280',
            secondary: '#8B7355',
            accent: '#2D8659',
            background: '#F9FAFB'
          }
        },
        {
          id: 'wonderland',
          name: 'ワンダーランド',
          description: '不思議の国のアリスの幻想世界をイメージした魔法的なテーマ',
          preview: {
            primary: '#7C3AED',
            secondary: '#EC4899',
            accent: '#10B981',
            background: '#FAF5FF'
          }
        }
      ];
    } catch (error) {
      console.error('利用可能テーマの取得エラー:', error);
      throw error;
    }
  });

  // 表情設定関連のIPCハンドラー
  ipcMain.handle('get-available-expressions', async () => {
    try {
      console.log('[Main] 利用可能表情の取得を開始');
      
      // メインウィンドウ（レンダラープロセス）から直接VRM情報を取得
      const mainWindow = windowManager.getWindow('main');
      if (!mainWindow) {
        console.warn('[Main] メインウィンドウが見つかりません');
        return [];
      }
      
      // レンダラープロセスでVRM情報を取得するJavaScriptを実行
      const expressions = await mainWindow.webContents.executeJavaScript(`
        (() => {
          try {
            console.log('[Renderer] グローバルVRM表情関数の確認');
            
            if (window.vrmExpression && typeof window.vrmExpression.getAvailableExpressions === 'function') {
              console.log('[Renderer] グローバルvrmExpression関数が見つかりました');
              const result = window.vrmExpression.getAvailableExpressions();
              console.log('[Renderer] グローバルVRM表情取得結果:', Array.isArray(result) ? result.length : 'not array', result);
              return result;
            } else {
              console.error('[Renderer] グローバルvrmExpression関数が見つかりません');
              console.log('[Renderer] window.vrmExpression状態:', typeof window.vrmExpression);
              return [];
            }
          } catch (error) {
            console.error('[Renderer] VRM表情取得エラー:', error);
            console.error('[Renderer] エラースタック:', error.stack);
            return [];
          }
        })()
      `);
      
      console.log('[Main] レンダラーから取得された表情数:', expressions.length);
      return expressions;
    } catch (error) {
      console.error('利用可能表情の取得エラー:', error);
      return [];
    }
  });

  ipcMain.handle('get-expression-settings', async () => {
    try {
      return settingsStore.getExpressionSettings();
    } catch (error) {
      console.error('表情設定の取得エラー:', error);
      throw error;
    }
  });

  ipcMain.handle('set-expression-settings', async (_event: IpcMainInvokeEvent, settings: any) => {
    try {
      settingsStore.setExpressionSettings(settings);
      return { success: true };
    } catch (error) {
      console.error('表情設定の保存エラー:', error);
      return { success: false, error: error instanceof Error ? error.message : '不明なエラー' };
    }
  });

  ipcMain.handle('update-expression-setting', async (_event: IpcMainInvokeEvent, expressionName: string, enabled: boolean, defaultWeight: number) => {
    try {
      settingsStore.updateExpressionSetting(expressionName, enabled, defaultWeight);
      return { success: true };
    } catch (error) {
      console.error('表情設定の更新エラー:', error);
      return { success: false, error: error instanceof Error ? error.message : '不明なエラー' };
    }
  });

  ipcMain.handle('reset-expression-settings', async () => {
    try {
      settingsStore.resetExpressionSettings();
      return { success: true };
    } catch (error) {
      console.error('表情設定のリセットエラー:', error);
      return { success: false, error: error instanceof Error ? error.message : '不明なエラー' };
    }
  });

  ipcMain.handle('preview-expression', async (_event: IpcMainInvokeEvent, expressionName: string, intensity?: number) => {
    try {
      console.log('[Main] 表情プレビュー:', expressionName, intensity);
      
      // メインウィンドウ（レンダラープロセス）で直接表情を適用
      const mainWindow = windowManager.getWindow('main');
      if (!mainWindow) {
        console.warn('[Main] メインウィンドウが見つかりません');
        return { success: false, error: 'メインウィンドウが見つかりません' };
      }
      
      // レンダラープロセスで表情を適用するJavaScriptを実行
      const success = await mainWindow.webContents.executeJavaScript(`
        (() => {
          try {
            if (window.vrmExpression && typeof window.vrmExpression.applyExpression === 'function') {
              const result = window.vrmExpression.applyExpression('${expressionName}', ${intensity || 1.0});
              console.log('[Renderer] グローバル表情適用結果:', result);
              return result;
            } else {
              console.error('[Renderer] グローバルvrmExpression.applyExpression関数が見つかりません');
              return false;
            }
          } catch (error) {
            console.error('[Renderer] 表情適用エラー:', error);
            return false;
          }
        })()
      `);
      
      console.log('[Main] レンダラーでの表情適用結果:', success);
      return { success };
    } catch (error) {
      console.error('表情プレビューエラー:', error);
      return { success: false, error: error instanceof Error ? error.message : '不明なエラー' };
    }
  });

  ipcMain.handle('update-tools-and-reinitialize-gemini', async () => {
    try {
      console.log('[Main] tools.json更新とGeminiService再初期化を開始');
      
      // 動的tools.json生成
      await generateDynamicToolsJson();
      
      // GeminiServiceを再初期化（APIキーを取得して渡す）
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API キーが環境変数に設定されていません (.env ファイルの GEMINI_API_KEY を確認してください)');
      }
      await reinitializeGemini(apiKey);
      
      console.log('[Main] tools.json更新とGeminiService再初期化が完了');
      return { success: true };
    } catch (error) {
      console.error('[Main] tools.json更新エラー:', error);
      return { success: false, error: error instanceof Error ? error.message : '不明なエラー' };
    }
  });

  // デフォルト表情関連のIPCハンドラー
  ipcMain.handle(IPC_CHANNELS.EXPRESSION.GET_DEFAULT_EXPRESSION, async () => {
    try {
      return settingsStore.getDefaultExpression();
    } catch (error) {
      console.error('デフォルト表情の取得エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.EXPRESSION.SET_DEFAULT_EXPRESSION, async (_event: IpcMainInvokeEvent, expressionName: string) => {
    try {
      settingsStore.setDefaultExpression(expressionName);
      return { success: true };
    } catch (error) {
      console.error('デフォルト表情の設定エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.EXPRESSION.RESET_TO_DEFAULT, async () => {
    try {
      const mainWindow = windowManager.getWindow('main');
      SpeechBubbleManager.resetToDefaultExpression(mainWindow);
      return { success: true };
    } catch (error) {
      console.error('デフォルト表情リセットエラー:', error);
      return { success: false, error: error instanceof Error ? error.message : '不明なエラー' };
    }
  });
}

/**
 * 有効な表情に基づいてtools.jsonを動的生成
 */
async function generateDynamicToolsJson(): Promise<void> {
  try {
    console.log('[Main] 動的tools.json生成を開始');
    
    // メインウィンドウから利用可能な表情を取得
    const mainWindow = windowManager.getWindow('main');
    if (!mainWindow) {
      throw new Error('メインウィンドウが見つかりません');
    }
    
    const availableExpressions = await mainWindow.webContents.executeJavaScript(`
      (() => {
        if (window.vrmExpression && typeof window.vrmExpression.getAvailableExpressions === 'function') {
          return window.vrmExpression.getAvailableExpressions();
        }
        return [];
      })()
    `);
    
    // 現在の表情設定を取得
    const expressionSettings = settingsStore.getExpressionSettings();
    
    // 表情名の重複と大文字小文字の問題を解決
    const uniqueExpressions = availableExpressions.reduce((acc: any[], expr: any) => {
      const existingIndex = acc.findIndex((e: any) => e.name.toLowerCase() === expr.name.toLowerCase());
      if (existingIndex === -1) {
        acc.push(expr);
      } else {
        // 既存のものと比較して、より適切な名前を選択（小文字を優先）
        const existing = acc[existingIndex];
        if (expr.name.toLowerCase() === expr.name && existing.name !== existing.name.toLowerCase()) {
          acc[existingIndex] = expr; // 小文字版を優先
        }
      }
      return acc;
    }, []);
    
    // 有効な表情のみをフィルタ（詳細デバッグ）
    console.log('[Main] 表情フィルタリング詳細:');
    console.log('  - 利用可能表情（重複除去後):', uniqueExpressions.map((e: any) => e.name));
    console.log('  - 表情設定:', expressionSettings);
    
    const enabledExpressions = uniqueExpressions.filter((expr: any) => {
      const setting = expressionSettings[expr.name];
      const isEnabled = setting && setting.enabled;
      console.log(`  - ${expr.name}: 設定=${JSON.stringify(setting)}, 有効=${isEnabled}`);
      return isEnabled;
    });
    
    // 有効な表情がない場合、利用可能な全表情を自動的に有効化
    if (enabledExpressions.length === 0 && uniqueExpressions.length > 0) {
      console.log('[Main] 有効な表情がないため、利用可能な全表情を自動有効化します');
      for (const expr of uniqueExpressions) {
        settingsStore.updateExpressionSetting(expr.name, true, 1.0);
        enabledExpressions.push(expr);
        console.log(`[Main] 自動有効化: ${expr.name}`);
      }
    }
    
    console.log('[Main] 有効な表情数:', enabledExpressions.length);
    console.log('[Main] 有効な表情名:', enabledExpressions.map((e: any) => e.name));
    
    // ToolsServiceを使用してtools.jsonを読み込み
    const toolsService = ToolsService.getInstance();
    if (!toolsService.isToolsLoaded()) {
      await toolsService.loadTools();
    }
    const originalTools = toolsService.getTools();
    
    // set_expression関数の説明を動的更新
    const setExpressionTool = originalTools.find((tool: any) => tool.name === 'set_expression');
    if (setExpressionTool && enabledExpressions.length > 0) {
      const expressionNames = enabledExpressions.map((expr: any) => expr.name).join(', ');
      setExpressionTool.description = `VRMマスコットの表情を設定します。利用可能な表情: ${expressionNames}`;
      
      // enumに有効な表情名を追加
      setExpressionTool.parameters.properties.expression_name.enum = enabledExpressions.map((expr: any) => expr.name);
    }
    
    // 動的tools.jsonを保存（複数の場所に保存して確実にアクセス可能にする）
    const appPath = app.getAppPath();
    
    const dynamicToolsPaths = [
      path.join(__dirname, 'tools.json'),
      path.join(appPath, 'tools.json'),
      path.join(process.cwd(), 'tools.json')
    ];
    
    for (const dynamicPath of dynamicToolsPaths) {
      try {
        fs.writeFileSync(dynamicPath, JSON.stringify(originalTools, null, 2));
        console.log('[Main] 動的tools.json保存完了:', dynamicPath);
      } catch (error) {
        console.warn('[Main] 動的tools.json保存失敗:', dynamicPath, error.message);
      }
    }
    
    // ToolsServiceに動的更新されたツールを再読み込みさせる
    await toolsService.reloadTools();
    console.log('[Main] ToolsService再読み込み完了');
  } catch (error) {
    console.error('[Main] 動的tools.json生成エラー:', error);
    throw error;
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
// アプリ終了前の設定保存
async function saveAllDisplaySettingsBeforeQuit() {
  try {
    const mainWindow = windowManager.getWindow('main');
    const chatWindow = windowManager.getWindow('chat');
    
    // メインウィンドウの位置・サイズを保存
    if (mainWindow && !mainWindow.isDestroyed()) {
      const mainBounds = mainWindow.getBounds();
      settingsStore.setMainWindowBounds(mainBounds);
      console.log('終了前にメインウィンドウ設定を保存しました:', mainBounds);
    }
    
    // チャットウィンドウの位置・サイズ・表示状態を保存
    if (chatWindow && !chatWindow.isDestroyed()) {
      const chatBounds = chatWindow.getBounds();
      const chatVisible = chatWindow.isVisible();
      settingsStore.setChatWindowBounds(chatBounds);
      settingsStore.setChatWindowVisible(chatVisible);
      console.log('終了前にチャットウィンドウ設定を保存しました:', { bounds: chatBounds, visible: chatVisible });
    }
  } catch (error) {
    console.error('終了前の設定保存でエラー:', error);
  }
}

app.on('before-quit', async (event) => {
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