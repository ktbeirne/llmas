import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import path from 'path';
import { WINDOW_CONFIG } from '../config/constants';

// Electron Forge Viteプラグインによって自動的に定義される環境変数
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

export interface WindowConfig {
  name: string;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  transparent?: boolean;
  frame?: boolean;
  alwaysOnTop?: boolean;
  skipTaskbar?: boolean;
  resizable?: boolean;
  hasShadow?: boolean;
  show?: boolean;
  webPreferences?: Electron.WebPreferences;
  position?: { x: number; y: number };
}

/**
 * ウィンドウの作成と管理を担当するクラス
 */
export class WindowManager {
  private windows: Map<string, BrowserWindow> = new Map();

  /**
   * ウィンドウを作成
   */
  createWindow(config: WindowConfig, htmlPath: string): BrowserWindow {
    const existingWindow = this.windows.get(config.name);
    if (existingWindow && !existingWindow.isDestroyed()) {
      existingWindow.focus();
      return existingWindow;
    }

    const windowOptions: BrowserWindowConstructorOptions = {
      width: config.width,
      height: config.height,
      minWidth: config.minWidth,
      minHeight: config.minHeight,
      transparent: config.transparent ?? false,
      frame: config.frame ?? true,
      alwaysOnTop: config.alwaysOnTop ?? false,
      skipTaskbar: config.skipTaskbar ?? false,
      resizable: config.resizable ?? true,
      hasShadow: config.hasShadow ?? true,
      show: config.show ?? true,
      webPreferences: config.webPreferences || {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    };

    // 位置が指定されている場合は設定
    if (config.position) {
      windowOptions.x = config.position.x;
      windowOptions.y = config.position.y;
    }

    const window = new BrowserWindow(windowOptions);

    // ウィンドウが閉じられた時にMapから削除
    window.on('closed', () => {
      this.windows.delete(config.name);
    });

    // ウィンドウをMapに保存
    this.windows.set(config.name, window);

    // HTMLファイルをロード
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      // 開発環境では適切なパスを構築
      let url: string;
      if (config.name === 'main') {
        url = MAIN_WINDOW_VITE_DEV_SERVER_URL;
      } else if (htmlPath === 'chat.html') {
        // chat.htmlはルートレベルにある
        url = MAIN_WINDOW_VITE_DEV_SERVER_URL.replace(/\/$/, '') + '/chat.html';
      } else {
        // その他のHTMLファイル
        url = MAIN_WINDOW_VITE_DEV_SERVER_URL.replace(/\/$/, '') + '/' + htmlPath;
      }
      window.loadURL(url);
    } else {
      // chat.htmlはルートレベルにあるため、特別な処理を行う
      let filePath: string;
      if (htmlPath === 'chat.html') {
        filePath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/../chat.html`);
      } else {
        filePath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/${htmlPath}`);
      }
      window.loadFile(filePath);
    }

    return window;
  }

  /**
   * 指定した名前のウィンドウを取得
   */
  getWindow(name: string): BrowserWindow | undefined {
    const window = this.windows.get(name);
    return window && !window.isDestroyed() ? window : undefined;
  }

  /**
   * 指定した名前のウィンドウを閉じる
   */
  closeWindow(name: string): void {
    const window = this.windows.get(name);
    if (window && !window.isDestroyed()) {
      window.close();
    }
  }

  /**
   * すべてのウィンドウを閉じる
   */
  closeAllWindows(): void {
    this.windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
  }

  /**
   * メインウィンドウの設定を生成
   */
  static getMainWindowConfig(): WindowConfig {
    return {
      name: 'main',
      width: WINDOW_CONFIG.MAIN.WIDTH,
      height: WINDOW_CONFIG.MAIN.HEIGHT,
      minWidth: WINDOW_CONFIG.MAIN.MIN_WIDTH,
      minHeight: WINDOW_CONFIG.MAIN.MIN_HEIGHT,
      transparent: true,
      frame: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    };
  }

  /**
   * チャットウィンドウの設定を生成
   */
  static getChatWindowConfig(): WindowConfig {
    return {
      name: 'chat',
      width: WINDOW_CONFIG.CHAT.WIDTH,
      height: WINDOW_CONFIG.CHAT.HEIGHT,
      minWidth: WINDOW_CONFIG.CHAT.MIN_WIDTH,
      minHeight: WINDOW_CONFIG.CHAT.MIN_HEIGHT,
      frame: false,
      transparent: true,
      show: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        devTools: true, // 開発ツールを有効化
      },
    };
  }

  /**
   * スピーチバブルウィンドウの設定を生成
   */
  static getSpeechBubbleConfig(position?: { x: number; y: number }): WindowConfig {
    return {
      name: 'speechBubble',
      width: WINDOW_CONFIG.SPEECH_BUBBLE.WIDTH,
      height: WINDOW_CONFIG.SPEECH_BUBBLE.HEIGHT,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false,
      show: false,
      position,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    };
  }
}