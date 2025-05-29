import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import dotenv from 'dotenv';
dotenv.config();
import { generateTextFromGemini, initializeGemini } from './geminiService';

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
  speechBubbleWindow = new BrowserWindow({
    width: 520, // HTMLのmax-widthに合わせて調整
    height: 150, // HTMLのmax-heightに合わせて調整
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true, // タスクバーに表示しない
    resizable: false,  // サイズ変更不可
    show: false,       // 最初は隠しておく
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // 既存のpreload.jsを使う
      // nodeIntegration: false, // セキュリティのためデフォルトfalse
      // contextIsolation: true, // セキュリティのためデフォルトtrue
    },
  });

  // ★ ご主人様が作成した speechBubble.html を読み込みます
  //    このファイルはプロジェクトのルート直下に置く想定です。
  //    もし場所が違う場合は、パスを調整してくださいね。
  speechBubbleWindow.loadFile('speechBubble.html');

  // 準備ができたら表示 (チラつき防止)
  speechBubbleWindow.once('ready-to-show', () => {
    console.log('SpeechBubbleWindow is ready (but not being shown yet).');
    // ここでの setPosition や show の呼び出しは不要です
  });

  speechBubbleWindow.on('closed', () => {
    speechBubbleWindow = null;
  });

  // speechBubbleWindow.webContents.openDevTools(); // デバッグ用に開いてもOK
}
// ★★★ 新しい吹き出しウィンドウ用の関数ここまで ★★★


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
  if (!prompt) {
    return "エラー: プロンプトが空です。";
  }
  try {
    const geminiResponse = await generateTextFromGemini(prompt);


    // ★★★ 新しい吹き出しウィンドウにGeminiの応答を送信 ★★★
    if (speechBubbleWindow && !speechBubbleWindow.isDestroyed()) {
      if (geminiResponse && geminiResponse.trim() !== "") {
        speechBubbleWindow.webContents.send('set-speech-bubble-text', geminiResponse);
        if (!speechBubbleWindow.isVisible()) { // ★ もし非表示なら表示する
          // ★ 表示する前に必ず位置を調整！
          if (characterWindow) {
            const charBounds = characterWindow.getBounds();
            const bubbleWidth = speechBubbleWindow.getBounds().width; // speechBubbleWindowの現在の幅
            const bubbleHeight = speechBubbleWindow.getBounds().height; // speechBubbleWindowの現在の高さ

            // X座標の計算 (次の項目で調整)
            const x = charBounds.x + Math.round((charBounds.width - bubbleWidth) / 2);
            // Y座標の計算 (次の項目で調整)
            // const y = charBounds.y - bubbleHeight; // ← 前回の案
            const SPEECH_BUBBLE_Y_OFFSET = -20; // 仮のオフセット値 (次の項目で調整)
            const y = charBounds.y + SPEECH_BUBBLE_Y_OFFSET;


            speechBubbleWindow.setPosition(x, y);
          }
          speechBubbleWindow.show();
          console.log('SpeechBubbleWindow shown with text:', geminiResponse);
        }
      } else {
        // speechBubbleWindow.webContents.send('set-speech-bubble-text', '');
        // if (speechBubbleWindow.isVisible()) {
        //   speechBubbleWindow.hide();
        //   console.log('SpeechBubbleWindow hidden due to empty text.');
        // }
      }
  }
    // ★★★ ここまで ★★★

    return geminiResponse; // チャットウィンドウへの返信
  } catch (error) {
    console.error("Gemini処理中にメインプロセスでエラー:", error);
    const errorMessage = `エラー: ${(error as Error).message || "Geminiからの応答取得に失敗しました。"}`;

    if (speechBubbleWindow && !speechBubbleWindow.isDestroyed()) {
      const errorText = `エラー: ${(error as Error).message || "Geminiからの応答取得に失敗しました。"}`;
      speechBubbleWindow.webContents.send('set-speech-bubble-text', errorText);
      if (!speechBubbleWindow.isVisible() && characterWindow) { // エラーでも表示するなら
        const charBounds = characterWindow.getBounds();
        const bubbleWidth = speechBubbleWindow.getBounds().width;
        const x = charBounds.x + Math.round((charBounds.width - bubbleWidth) / 2);
        const y = charBounds.y + 20;
        speechBubbleWindow.setPosition(x, y);
        speechBubbleWindow.show();
      }
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