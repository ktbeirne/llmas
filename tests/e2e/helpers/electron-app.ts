/**
 * ElectronApp制御ヘルパークラス
 * 
 * Electronアプリケーションのライフサイクル管理とウィンドウ操作を提供
 */

import { ElectronApplication, Page, _electron as electron } from 'playwright';
import path from 'path';

export interface LaunchOptions {
  headless?: boolean;
  slowMo?: number;
  timeout?: number;
  args?: string[];
  env?: Record<string, string>;
}

export interface MemoryInfo {
  workingSetSize: number;
  peakWorkingSetSize: number;
  privateBytes: number;
  sharedBytes: number;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Electronアプリケーション制御のメインクラス
 */
export class ElectronApp {
  private app: ElectronApplication | null = null;
  private mainWindow: Page | null = null;
  private chatWindow: Page | null = null;
  private settingsWindow: Page | null = null;
  private speechBubbleWindow: Page | null = null;
  private startTime: number = 0;
  private timeout: number = 120000; // デフォルト2分

  /**
   * Electronアプリケーションを起動
   */
  async launch(options: LaunchOptions = {}): Promise<ElectronApplication> {
    console.log('[ElectronApp] アプリケーションを起動中...');
    this.startTime = Date.now();

    try {
      // WSL環境検出
      const isWSL = process.env.WSL_DISTRO_NAME || process.env.WSLENV || 
                    require('fs').existsSync('/proc/version') && 
                    require('fs').readFileSync('/proc/version', 'utf8').includes('microsoft');

      // デフォルトオプションとマージ（WSL環境に最適化）
      const defaultOptions = {
        headless: false,
        timeout: isWSL ? 300000 : 120000, // WSLでは5分、通常は2分
        args: [
          '--no-sandbox', 
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-gpu-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
          '--virtual-time-budget=5000',
          '--force-fieldtrials=*BackgroundTracing/default/',
          '--enable-logging',
          '--log-level=0',
          ...(isWSL ? [
            '--disable-software-rasterizer',
            '--disable-gpu-compositing',
            '--use-gl=swiftshader-webgl',
            '--disable-extensions',
            '--disable-dbus',               // D-Bus無効化（WSL用）
            '--no-zygote',                  // Zygoteプロセス無効化
            // '--single-process',          // シングルプロセスモード（問題あり、コメントアウト）
            '--disable-sync',               // 同期機能無効化
            '--disable-plugins',            // プラグイン無効化
            '--disable-bundled-ppapi-flash', // Flash無効化
            '--disable-speech-synthesis-api', // 音声合成API無効化
            '--disable-print-preview',      // 印刷プレビュー無効化
            '--disable-component-extensions-with-background-pages', // バックグラウンド拡張無効化
            '--disable-background-networking', // バックグラウンドネットワーク無効化
            '--disable-seccomp-filter-sandbox', // Seccompフィルタ無効化
            '--disable-namespace-sandbox',  // ネームスペースサンドボックス無効化
            '--disable-features=TranslateUI,VizDisplayCompositor,AudioServiceOutOfProcess', // 問題となる機能を無効化
            '--enable-features=UseOzonePlatform', // Ozoneプラットフォーム有効化
            '--ozone-platform=headless'     // ヘッドレスプラットフォーム使用
          ] : [])
        ],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          E2E_TEST_MODE: 'true',
          DISPLAY: process.env.DISPLAY || ':0',
          ...(isWSL ? {
            LIBGL_ALWAYS_INDIRECT: '1',
            MESA_GL_VERSION_OVERRIDE: '3.3',
            WEBKIT_DISABLE_COMPOSITING_MODE: '1',
            // フォントキャッシュ問題を解決
            FONTCONFIG_CACHE: '/tmp/fontconfig-cache',
            FONTCONFIG_PATH: '/etc/fonts',
            XDG_CACHE_HOME: '/tmp/.cache',
            XDG_CONFIG_HOME: '/tmp/.config',
            // D-Bus無効化
            DBUS_SESSION_BUS_ADDRESS: '',
            // 追加のWSL最適化
            ELECTRON_DISABLE_SANDBOX: '1',
            ELECTRON_RUN_AS_NODE: '0'
          } : {})
        }
      };
      
      const mergedOptions = { ...defaultOptions, ...options };
      
      // タイムアウト値を保存（後続の操作で使用）
      this.timeout = mergedOptions.timeout;

      // デバッグ情報を出力
      console.log(`[ElectronApp] WSL環境: ${isWSL}`);
      console.log(`[ElectronApp] タイムアウト設定: ${this.timeout}ms`);
      console.log(`[ElectronApp] 起動引数数: ${mergedOptions.args.length}`);

      // Electronアプリケーションパスの決定
      const electronPath = this.getElectronPath();
      const appPath = this.getAppPath();

      console.log(`[ElectronApp] Electronパス: ${electronPath}`);
      console.log(`[ElectronApp] アプリパス: ${appPath}`);

      // Electronアプリケーション起動
      const launchOptions: any = {
        executablePath: electronPath,
        env: mergedOptions.env,
        // 注意: electron.launch()にはtimeoutオプションがないため除外
      };

      // パッケージ化されたアプリの場合はargsを調整
      if (appPath) {
        launchOptions.args = [appPath, ...mergedOptions.args];
      } else {
        launchOptions.args = mergedOptions.args;
      }

      // WSL環境での事前準備
      if (isWSL) {
        try {
          const fs = require('fs');
          const path = require('path');
          // フォントキャッシュディレクトリを作成
          const fontCacheDir = '/tmp/fontconfig-cache';
          const cacheDir = '/tmp/.cache';
          const configDir = '/tmp/.config';
          
          [fontCacheDir, cacheDir, configDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
              console.log(`[ElectronApp] WSL用ディレクトリ作成: ${dir}`);
            }
          });
        } catch (error) {
          console.warn('[ElectronApp] WSL環境準備でエラー（続行）:', error);
        }
      }

      console.log(`[ElectronApp] Electron起動中... (タイムアウト: ${this.timeout}ms)`);
      this.app = await electron.launch(launchOptions);
      
      console.log('[ElectronApp] Electron起動完了、アプリケーション準備を開始...');
      
      // アプリケーション準備完了まで待機
      await this.waitForReady();

      const startupTime = Date.now() - this.startTime;
      console.log(`[ElectronApp] アプリケーション起動完了 (${startupTime}ms)`);

      return this.app;

    } catch (error) {
      console.error('[ElectronApp] アプリケーション起動エラー:', error);
      throw new Error(`Electronアプリケーションの起動に失敗しました: ${error}`);
    }
  }

  /**
   * アプリケーション準備完了まで待機
   */
  async waitForReady(): Promise<void> {
    if (!this.app) {
      throw new Error('アプリケーションが起動されていません');
    }

    try {
      // メインプロセス準備完了まで待機
      await this.app.evaluate(async ({ app }) => {
        await app.whenReady();
      });

      // メインウィンドウの取得と準備完了待機
      await this.getMainWindow();

      console.log('[ElectronApp] アプリケーション準備完了');

    } catch (error) {
      console.error('[ElectronApp] アプリケーション準備エラー:', error);
      throw error;
    }
  }

  /**
   * メインウィンドウを取得
   */
  async getMainWindow(): Promise<Page> {
    if (!this.app) {
      throw new Error('アプリケーションが起動されていません');
    }

    if (this.mainWindow) {
      return this.mainWindow;
    }

    try {
      // 最初のウィンドウ（メインウィンドウ）を取得（WSL環境対応タイムアウト）
      console.log(`[ElectronApp] メインウィンドウ取得中... (タイムアウト: ${this.timeout}ms)`);
      this.mainWindow = await this.app.firstWindow({
        timeout: this.timeout
      });

      // ページのデフォルトタイムアウトを設定
      this.mainWindow.setDefaultTimeout(this.timeout);
      this.mainWindow.setDefaultNavigationTimeout(this.timeout);
      
      console.log('[ElectronApp] ページタイムアウト設定完了、ページロード待機中...');
      
      // ページロード完了まで待機
      await this.mainWindow.waitForLoadState('domcontentloaded');
      
      console.log('[ElectronApp] メインウィンドウを取得しました');
      return this.mainWindow;

    } catch (error) {
      console.error('[ElectronApp] メインウィンドウ取得エラー:', error);
      throw error;
    }
  }

  /**
   * チャットウィンドウを取得
   */
  async getChatWindow(): Promise<Page | null> {
    if (!this.app) {
      throw new Error('アプリケーションが起動されていません');
    }

    try {
      const windows = this.app.windows();
      for (const window of windows) {
        const title = await window.title();
        const url = window.url();
        
        if (title.includes('Chat') || url.includes('chat')) {
          this.chatWindow = window;
          console.log('[ElectronApp] チャットウィンドウを取得しました');
          return this.chatWindow;
        }
      }

      console.log('[ElectronApp] チャットウィンドウが見つかりません');
      return null;

    } catch (error) {
      console.error('[ElectronApp] チャットウィンドウ取得エラー:', error);
      throw error;
    }
  }

  /**
   * 設定ウィンドウを取得
   */
  async getSettingsWindow(): Promise<Page | null> {
    if (!this.app) {
      throw new Error('アプリケーションが起動されていません');
    }

    try {
      const windows = this.app.windows();
      for (const window of windows) {
        const title = await window.title();
        const url = window.url();
        
        if (title.includes('Settings') || url.includes('settings')) {
          this.settingsWindow = window;
          console.log('[ElectronApp] 設定ウィンドウを取得しました');
          return this.settingsWindow;
        }
      }

      console.log('[ElectronApp] 設定ウィンドウが見つかりません');
      return null;

    } catch (error) {
      console.error('[ElectronApp] 設定ウィンドウ取得エラー:', error);
      throw error;
    }
  }

  /**
   * スピーチバブルウィンドウを取得
   */
  async getSpeechBubbleWindow(): Promise<Page | null> {
    if (!this.app) {
      throw new Error('アプリケーションが起動されていません');
    }

    try {
      const windows = this.app.windows();
      for (const window of windows) {
        const title = await window.title();
        const url = window.url();
        
        if (title.includes('Speech') || url.includes('speech_bubble')) {
          this.speechBubbleWindow = window;
          console.log('[ElectronApp] スピーチバブルウィンドウを取得しました');
          return this.speechBubbleWindow;
        }
      }

      console.log('[ElectronApp] スピーチバブルウィンドウが見つかりません');
      return null;

    } catch (error) {
      console.error('[ElectronApp] スピーチバブルウィンドウ取得エラー:', error);
      throw error;
    }
  }

  /**
   * アプリケーションを正常終了
   */
  async close(): Promise<void> {
    if (!this.app) {
      console.log('[ElectronApp] アプリケーションは既に終了しています');
      return;
    }

    try {
      console.log('[ElectronApp] アプリケーションを終了中...');

      // 全ウィンドウを閉じる
      const windows = this.app.windows();
      for (const window of windows) {
        try {
          if (!window.isClosed()) {
            await window.close();
          }
        } catch (error) {
          console.warn('[ElectronApp] ウィンドウクローズエラー:', error);
        }
      }

      // アプリケーション終了
      await this.app.close();
      this.app = null;
      this.mainWindow = null;
      this.chatWindow = null;
      this.settingsWindow = null;
      this.speechBubbleWindow = null;

      console.log('[ElectronApp] アプリケーション終了完了');

    } catch (error) {
      console.error('[ElectronApp] アプリケーション終了エラー:', error);
      throw error;
    }
  }

  /**
   * 強制終了（クラッシュシミュレーション）
   */
  async simulateCrash(): Promise<void> {
    if (!this.app) {
      throw new Error('アプリケーションが起動されていません');
    }

    try {
      console.log('[ElectronApp] アプリケーションクラッシュをシミュレート中...');

      // メインプロセスで例外を発生させる
      await this.app.evaluate(() => {
        process.exit(1);
      });

    } catch (error) {
      console.log('[ElectronApp] クラッシュシミュレーション完了');
      this.app = null;
      this.mainWindow = null;
      this.chatWindow = null;
      this.settingsWindow = null;
      this.speechBubbleWindow = null;
    }
  }

  /**
   * 起動時間を測定
   */
  measureStartupTime(): number {
    if (this.startTime === 0) {
      throw new Error('起動時間の測定が開始されていません');
    }
    return Date.now() - this.startTime;
  }

  /**
   * メモリ使用量を取得
   */
  async getMemoryUsage(): Promise<MemoryInfo> {
    if (!this.app) {
      throw new Error('アプリケーションが起動されていません');
    }

    try {
      const memoryInfo = await this.app.evaluate(async () => {
        const processMemoryInfo = await process.getProcessMemoryInfo();
        return processMemoryInfo;
      });

      return memoryInfo as MemoryInfo;

    } catch (error) {
      console.error('[ElectronApp] メモリ使用量取得エラー:', error);
      throw error;
    }
  }

  /**
   * ウィンドウ境界を取得
   */
  async getWindowBounds(window: Page): Promise<WindowBounds> {
    try {
      const bounds = await window.evaluate(() => {
        return {
          x: window.screenX,
          y: window.screenY,
          width: window.innerWidth,
          height: window.innerHeight
        };
      });

      return bounds;

    } catch (error) {
      console.error('[ElectronApp] ウィンドウ境界取得エラー:', error);
      throw error;
    }
  }

  /**
   * スクリーンショットを撮影
   */
  async captureScreenshot(window: Page, path?: string): Promise<Buffer> {
    try {
      const screenshot = await window.screenshot({
        path,
        fullPage: true
      });

      return screenshot;

    } catch (error) {
      console.error('[ElectronApp] スクリーンショット撮影エラー:', error);
      throw error;
    }
  }

  /**
   * Electronバイナリパスを取得
   */
  private getElectronPath(): string {
    // テスト環境では開発版Electronを優先使用
    const electronPath = require('electron');
    console.log('[ElectronApp] 開発版Electronを使用');
    return electronPath;
    
    // パッケージ化されたアプリケーション（現在無効化）
    // const packagedAppPath = path.join(__dirname, '../../../out/llmdesktopmascot-linux-x64/llmdesktopmascot');
    // 
    // try {
    //   const fs = require('fs');
    //   if (fs.existsSync(packagedAppPath)) {
    //     console.log('[ElectronApp] パッケージ化されたアプリケーションを使用');
    //     return packagedAppPath;
    //   }
    // } catch (error) {
    //   console.log('[ElectronApp] パッケージ化アプリの確認中にエラー:', error);
    // }
  }

  /**
   * アプリケーションパスを取得
   */
  private getAppPath(): string {
    // テスト環境では常に開発環境のパスを使用
    const appPath = path.join(process.cwd(), '.');
    console.log('[ElectronApp] 開発環境のアプリケーションパスを使用');
    return appPath;
    
    // パッケージ化されたアプリケーション（現在無効化）
    // const packagedAppPath = path.join(__dirname, '../../../out/llmdesktopmascot-linux-x64/llmdesktopmascot');
    // 
    // try {
    //   const fs = require('fs');
    //   if (fs.existsSync(packagedAppPath)) {
    //     return ''; // パッケージ化されたアプリの場合は引数不要
    //   }
    // } catch (error) {
    //   console.log('[ElectronApp] パッケージ化アプリの確認中にエラー:', error);
    // }
  }

  /**
   * アプリケーションが起動中かチェック
   */
  isRunning(): boolean {
    return this.app !== null;
  }

  /**
   * ElectronApplicationインスタンスを取得
   */
  getApp(): ElectronApplication | null {
    return this.app;
  }
}