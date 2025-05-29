import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import dotenv from 'dotenv';
dotenv.config();
import { generateTextFromGemini, initializeGemini } from './geminiService';

let characterWindow: BrowserWindow | null = null; // 型を明確に
let chatWindow: BrowserWindow | null = null;    // チャットウィンドウ用の変数を追加

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

function createCharacterWindow() { // 元のcreateWindowをリネーム
  characterWindow = new BrowserWindow({ // mainWindow を characterWindow に
    width: 600, // キャラクターウィンドウのサイズはお好みで
    height: 900,
    transparent: true, // ★ウィンドウの背景を透過できるようにする
    frame: false,      // ★ウィンドウの枠（タイトルバーや境界線）を非表示にする
    alwaysOnTop: true,
    //titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // キャラクターウィンドウも同じpreloadを使う想定
    },
  });
  // characterWindow.loadFile('index.html'); // Viteを使っているので、これは開発時はViteのURL
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    characterWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    characterWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
  // characterWindow.webContents.openDevTools(); // デバッグ用にDevToolsを開く
}

function createChatWindow() {
  chatWindow = new BrowserWindow({
    width: 600,  // チャットウィンドウは小さめに
    height: 600,
    x: 50,       // 表示位置を調整 (キャラクターウィンドウと重ならないように)
    y: 50,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // ★チャットウィンドウも同じpreload.jsを使う
      // nodeIntegration: false, // セキュリティのためデフォルトfalse
      // contextIsolation: true, // セキュリティのためデフォルトtrue
    },
  });

  chatWindow.loadFile('chat.html'); // ★プロジェクトルートの chat.html を読み込む
  // chatWindow.webContents.openDevTools(); // デバッグ用にDevToolsを開く

  chatWindow.on('closed', () => {
    chatWindow = null; // ウィンドウが閉じられたら参照をクリア
  });
}

const apiKeyFromEnv = process.env.GEMINI_API_KEY;
if (!apiKeyFromEnv) {
  console.error('致命的エラー: GEMINI_API_KEY が .env から読み込めませんでした。アプリケーションを終了します。');
  // ここでアプリを終了させるか、エラーをユーザーに通知する処理が必要です
  if (app) { // appが初期化されていれば
    app.quit();
  } else { // appがまだなら、強制終了 (推奨されませんが、キーがないと動かないので)
    process.exit(1);
  }
} else {
  initializeGemini(apiKeyFromEnv); // ← 読み込んだAPIキーを渡して初期化！
}


ipcMain.handle('send-prompt-to-gemini', async (_event: IpcMainInvokeEvent, prompt: string) => {
  console.log(`メインプロセスがプロンプト "${prompt}" を受け取りました。Geminiに問い合わせます...`);
  if (!prompt) {
    return "エラー: プロンプトが空です。";
  }
  try {
    const geminiResponse = await generateTextFromGemini(prompt);

    // ★キャラクターウィンドウにも応答を送信する処理を追加！
    if (characterWindow && !characterWindow.isDestroyed()) { // characterWindow は以前定義した BrowserWindow インスタンス
      characterWindow.webContents.send('display-speech-bubble', geminiResponse);
    }

    return geminiResponse; // これはチャットウィンドウへの返信
  } catch (error) {
    console.error("Gemini処理中にメインプロセスでエラー:", error);
    const errorMessage = `エラー: ${(error as Error).message || "Geminiからの応答取得に失敗しました。"}`;
    // ★エラー時もキャラクターウィンドウに通知するならここにも追加
    if (characterWindow && !characterWindow.isDestroyed()) {
      characterWindow.webContents.send('display-speech-bubble', errorMessage);
    }
    return errorMessage;
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
//app.on('ready', createWindow);
app.whenReady().then(async () => { // app.whenReady()のコールバックをasyncに変更
  createCharacterWindow(); // キャラクターウィンドウを作成
  createChatWindow();    // チャットウィンドウを作成



  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createCharacterWindow();
      createChatWindow();
    }
  });
});


// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});



// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
