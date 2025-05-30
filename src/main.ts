import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import dotenv from 'dotenv';
dotenv.config();
import { generateTextFromGemini, initializeGemini } from './geminiService';

// Electron Forge Viteプラグインによって自動的に定義される環境変数
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;
declare const SPEECH_BUBBLE_VITE_DEV_SERVER_URL: string | undefined;
declare const SPEECH_BUBBLE_VITE_NAME: string;

const SPEECH_BUBBLE_Y_OFFSET = 150;

let characterWindow: BrowserWindow | null = null;
let chatWindow: BrowserWindow | null = null;
let speechBubbleWindow: BrowserWindow | null = null; // ★ 新しい吹き出しウィンドウ用の変数を追加

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

function createCharacterWindow() {
  characterWindow = new BrowserWindow({
    width: 400,
    height: 800,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    characterWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    characterWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
  // characterWindow.webContents.openDevTools();
}

function createChatWindow() {
  chatWindow = new BrowserWindow({
    width: 600,
    height: 600,
    x: 50,
    y: 50,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  chatWindow.loadFile('chat.html');
  // chatWindow.webContents.openDevTools();
  chatWindow.on('closed', () => {
    chatWindow = null;
  });
}

// ★★★ ここから新しい吹き出しウィンドウ用の関数 ★★★
function createSpeechBubbleWindow() {
  console.log('[Debug] Attempting to create SpeechBubbleWindow...'); // ★ログ1

  try {
    speechBubbleWindow = new BrowserWindow({
      width: 50,
      height: 50,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    console.log('[Debug] SpeechBubbleWindow object created:', speechBubbleWindow ? 'Exists' : 'null'); // ★ログ2

    // Vite関連のURLと名前が正しく定義されているか確認
    console.log('[Debug] SPEECH_BUBBLE_VITE_DEV_SERVER_URL:', SPEECH_BUBBLE_VITE_DEV_SERVER_URL); // ★ログ3
    console.log('[Debug] SPEECH_BUBBLE_VITE_NAME:', SPEECH_BUBBLE_VITE_NAME); // ★ログ4

    if (SPEECH_BUBBLE_VITE_DEV_SERVER_URL) {
      // ★ 開発環境では、speech_bubbleのパスを含める必要がある
      const speechBubbleURL = `${SPEECH_BUBBLE_VITE_DEV_SERVER_URL}/renderer/speech_bubble/index.html`;
      console.log(`[Debug] Attempting to load URL: ${speechBubbleURL}`); // ★ログ5
      speechBubbleWindow.loadURL(speechBubbleURL)
        .then(() => {
          console.log('[Debug] SpeechBubbleWindow URL loaded successfully.'); // ★ログ6
          // ★ 追加: webContentsの準備完了を確認
          speechBubbleWindow.webContents.once('did-finish-load', () => {
            console.log('[Debug] SpeechBubbleWindow webContents did-finish-load event fired.');
          });
        })
        .catch((err) => {
          console.error('[Debug] Failed to load SpeechBubbleWindow URL:', err); // ★ログ7
          // ★ エラー時にウィンドウを破棄
          if (speechBubbleWindow && !speechBubbleWindow.isDestroyed()) {
            speechBubbleWindow.destroy();
            speechBubbleWindow = null;
          }
        });
    } else if (SPEECH_BUBBLE_VITE_NAME) { // VITE_NAMEがある場合のみloadFileを試みる
      const filePath = path.join(__dirname, `../renderer/${SPEECH_BUBBLE_VITE_NAME}/index.html`);
      console.log(`[Debug] Attempting to load File: ${filePath}`); // ★ログ8
      speechBubbleWindow.loadFile(filePath)
        .then(() => {
          console.log('[Debug] SpeechBubbleWindow File loaded successfully.'); // ★ログ9
          // ★ 追加: webContentsの準備完了を確認
          speechBubbleWindow.webContents.once('did-finish-load', () => {
            console.log('[Debug] SpeechBubbleWindow webContents did-finish-load event fired.');
          });
        })
        .catch((err) => {
          console.error('[Debug] Failed to load SpeechBubbleWindow File:', err); // ★ログ10
          // ★ エラー時にウィンドウを破棄
          if (speechBubbleWindow && !speechBubbleWindow.isDestroyed()) {
            speechBubbleWindow.destroy();
            speechBubbleWindow = null;
          }
        });
    } else {
      console.error('[Debug] Vite URL and Name for SpeechBubbleWindow are both undefined. Cannot load content.'); // ★ログ11
      // ★ ウィンドウを破棄
      if (speechBubbleWindow && !speechBubbleWindow.isDestroyed()) {
        speechBubbleWindow.destroy();
        speechBubbleWindow = null;
      }
      return; // 早期リターン
    }

    if (speechBubbleWindow) { // nullチェック
      console.log('[Debug] Attempting to open DevTools for SpeechBubbleWindow...'); // ★ログ12
      //speechBubbleWindow.webContents.openDevTools({ mode: 'detach' });
      console.log('[Debug] openDevTools called for SpeechBubbleWindow.'); // ★ログ13
    }

    speechBubbleWindow.once('ready-to-show', () => {
      console.log('[Debug] SpeechBubbleWindow ready-to-show event fired (but not shown). Waiting for content and size.'); // ★ログ14 (元のログにDebugプレフィックス追加)
    });

    speechBubbleWindow.on('closed', () => {
      console.log('[Debug] SpeechBubbleWindow "closed" event fired.'); // ★ログ15
      speechBubbleWindow = null;
    });
  } catch (error) {
    console.error('[Debug] Error creating SpeechBubbleWindow:', error);
    speechBubbleWindow = null;
  }
}


const apiKeyFromEnv = process.env.GEMINI_API_KEY;
if (!apiKeyFromEnv) {
  console.error('致命的エラー: GEMINI_API_KEY が .env から読み込めませんでした。アプリケーションを終了します。');
  if (app) {
    app.quit();
  } else {
    process.exit(1);
  }
} else {
  initializeGemini(apiKeyFromEnv);
}

ipcMain.handle('send-prompt-to-gemini', async (_event: IpcMainInvokeEvent, prompt: string) => {
  console.log(`メインプロセスがプロンプト "${prompt}" を受け取りました。Geminiに問い合わせます...`);
  
  // ★ デバッグ: speechBubbleWindowの状態を確認
  console.log('[Debug] speechBubbleWindow status check:');
  console.log(`  - speechBubbleWindow exists: ${speechBubbleWindow !== null}`);
  if (speechBubbleWindow) {
    console.log(`  - isDestroyed: ${speechBubbleWindow.isDestroyed()}`);
    console.log(`  - isVisible: ${speechBubbleWindow.isVisible()}`);
    console.log(`  - webContents exists: ${speechBubbleWindow.webContents !== null}`);
  }
  
  if (!prompt) {
    return "エラー: プロンプトが空です。";
  }
  try {
    const geminiResponse = await generateTextFromGemini(prompt);

    if (speechBubbleWindow && !speechBubbleWindow.isDestroyed()) {
      // ★ テキストを送信するだけ。表示やサイズ調整は 'notify-bubble-size' イベントハンドラに任せる
      console.log('[Debug] Sending message to speechBubbleWindow...');
      speechBubbleWindow.webContents.send('set-speech-bubble-text', geminiResponse);
      console.log('Sent to SpeechBubbleWindow, waiting for size notification:', geminiResponse);
    } else {
      console.error('[Debug] Cannot send to speechBubbleWindow: window is null or destroyed');
    }
    return geminiResponse;
  } catch (error) {
    console.error("Gemini処理中にメインプロセスでエラー:", error);
    const errorMessage = `エラー: ${(error as Error).message || "Geminiからの応答取得に失敗しました。"}`;

    if (speechBubbleWindow && !speechBubbleWindow.isDestroyed()) {
      const errorText = `エラー: ${(error as Error).message || "Geminiからの応答取得に失敗しました。"}`;
      speechBubbleWindow.webContents.send('set-speech-bubble-text', errorText); // エラー時もテキストを送る
    }
    return errorMessage;
  }
});

ipcMain.on('hide-speech-bubble-window', () => {
  if (speechBubbleWindow && speechBubbleWindow.isVisible()) {
    speechBubbleWindow.hide();
    console.log('SpeechBubbleWindow hidden by IPC request.');
  }
});

ipcMain.on('notify-bubble-size', (_event, size: { width: number; height: number }) => {
  if (speechBubbleWindow && !speechBubbleWindow.isDestroyed() && characterWindow) {
    console.log('[Positioning] Received bubble size from renderer:', size);

    const windowWidth = Math.max(size.width, 80);
    const windowHeight = Math.max(size.height, 50);
    console.log(`[Positioning] Effective bubble window size: width=${windowWidth}, height=${windowHeight}`);

    const charBounds = characterWindow.getBounds();
    console.log(`[Positioning] CharacterWindow bounds: x=${charBounds.x}, y=${charBounds.y}, width=${charBounds.width}, height=${charBounds.height}`);

    const x = charBounds.x + Math.round((charBounds.width - windowWidth) / 2);
    // ご主人様の現在のY座標計算ロジック（オフセット120を想定）
    // 吹き出しの下端Y = charBounds.y + SPEECH_BUBBLE_Y_OFFSET
    // 吹き出しの上端Y = (charBounds.y + SPEECH_BUBBLE_Y_OFFSET) - windowHeight
    const y = (charBounds.y + SPEECH_BUBBLE_Y_OFFSET) - windowHeight;

    console.log(`[Positioning_Intent] Intending to set: x=${x}, y=${y}, width=${windowWidth}, height=${windowHeight}. (SPEECH_BUBBLE_Y_OFFSET is ${SPEECH_BUBBLE_Y_OFFSET})`);

    // ★★★ setSize と setPosition の代わりに setBounds を使用 ★★★
    const newBounds = {
      x: Math.round(x), // Electronは整数値を期待します
      y: Math.round(y),
      width: Math.round(windowWidth),
      height: Math.round(windowHeight)
    };
    speechBubbleWindow.setBounds(newBounds);
    console.log(`[Positioning] Called setBounds with x:${newBounds.x}, y:${newBounds.y}, width:${newBounds.width}, height:${newBounds.height}`);
    // ★★★ ここまで変更 ★★★

    const actualBoundsAfterSet = speechBubbleWindow.getBounds();
    console.log(`[Positioning_Actual] Actual bounds after setBounds: x=${actualBoundsAfterSet.x}, y=${actualBoundsAfterSet.y}, width=${actualBoundsAfterSet.width}, height=${actualBoundsAfterSet.height}`);

    if (!speechBubbleWindow.isVisible()) {
      speechBubbleWindow.show();
      const actualBoundsAfterShow = speechBubbleWindow.getBounds();
      console.log(`[Positioning_Show] SpeechBubbleWindow shown. Current bounds: x=${actualBoundsAfterShow.x}, y=${actualBoundsAfterShow.y}, width=${actualBoundsAfterShow.width}, height=${actualBoundsAfterShow.height}`);
    } else {
      const currentBounds = speechBubbleWindow.getBounds();
      console.log(`[Positioning_Update] SpeechBubbleWindow already visible. Current bounds: x=${currentBounds.x}, y=${currentBounds.y}, width=${currentBounds.width}, height=${currentBounds.height}`);
    }
  } else {
    if (!speechBubbleWindow || speechBubbleWindow.isDestroyed()) {
      console.log('[Positioning_Error] SpeechBubbleWindow does not exist or is destroyed. Cannot set size/position.');
    }
    if (!characterWindow) {
      console.log('[Positioning_Error] CharacterWindow does not exist. Cannot calculate position.');
    }
  }
});

ipcMain.on('log-from-speech-bubble', (_event, message: string) => {
  console.log(`[SpeechBubbleHTML]: ${message}`); // ターミナルに表示
});

ipcMain.on('toggle-chat-visibility', () => {
  if (chatWindow && !chatWindow.isDestroyed()) {
    if (chatWindow.isVisible()) {
      chatWindow.hide();
      console.log('Chat window hidden.');
    } else {
      chatWindow.show();
      // 必要であれば、表示する際に chatWindow.focus() を呼んでフォーカスを当てることもできます
      console.log('Chat window shown.');
    }
  } else {
    // チャットウィンドウが存在しない (一度も開かれていないか、閉じられた後) 場合の処理
    console.log('Chat window does not exist or is destroyed. Attempting to create it.');
    createChatWindow(); // 新しくチャットウィンドウを作成して表示する
    // createChatWindow() の中で show() されるか、別途 chatWindow.show() が必要か確認してください。
    // 現在の createChatWindow では loadFile の後に show する処理はなさそうなので、
    // 表示するには一手間必要かもしれません。
    // もし createChatWindow が show を含まないなら:
    // if (chatWindow && !chatWindow.isDestroyed()) chatWindow.show();
  }
});

app.whenReady().then(async () => {
  createCharacterWindow();
  createChatWindow();
  createSpeechBubbleWindow(); // ★ 新しい吹き出しウィンドウも作成

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createCharacterWindow();
      createChatWindow();
      createSpeechBubbleWindow(); // ★ こちらも忘れずに
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});