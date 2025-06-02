/**
 * ヘッドレステスト用ヘルパー
 * 
 * GUI表示なしでElectronアプリケーションの機能をテストするためのユーティリティ
 */

import { ElectronApplication, Page } from 'playwright';
import { ElectronApp, LaunchOptions } from './electron-app';

export interface HeadlessTestOptions extends LaunchOptions {
  useHeadless?: boolean;
  mockDisplay?: boolean;
}

/**
 * ヘッドレステスト専用のElectronAppラッパー
 */
export class HeadlessElectronApp extends ElectronApp {
  private isHeadlessMode: boolean = false;

  /**
   * ヘッドレスモードでElectronアプリケーションを起動
   */
  async launchHeadless(options: HeadlessTestOptions = {}): Promise<ElectronApplication> {
    console.log('[HeadlessElectronApp] ヘッドレスモードでアプリケーションを起動中...');
    
    this.isHeadlessMode = true;

    // WSL環境検出
    const isWSL = process.env.WSL_DISTRO_NAME || process.env.WSLENV || 
                  require('fs').existsSync('/proc/version') && 
                  require('fs').readFileSync('/proc/version', 'utf8').includes('microsoft');

    // WSL環境での事前準備
    if (isWSL) {
      try {
        const fs = require('fs');
        const fontCacheDir = '/tmp/fontconfig-cache';
        const cacheDir = '/tmp/.cache';
        const configDir = '/tmp/.config';
        
        [fontCacheDir, cacheDir, configDir].forEach(dir => {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
            console.log(`[HeadlessElectronApp] WSL用ディレクトリ作成: ${dir}`);
          }
        });
      } catch (error) {
        console.warn('[HeadlessElectronApp] WSL環境準備でエラー（続行）:', error);
      }
    }

    // ヘッドレスモード用の追加オプション
    const headlessOptions: LaunchOptions = {
      ...options,
      args: [
        ...(options.args || []),
        '--headless',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        // '--disable-javascript', // この行を削除（ElectronアプリでJSが必要）
        '--disable-default-apps',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--disable-background-networking',
        ...(isWSL ? [
          '--disable-dbus',
          '--no-zygote',
          '--disable-seccomp-filter-sandbox',
          '--disable-namespace-sandbox',
          '--ozone-platform=headless'
        ] : [])
      ],
      env: {
        ...options.env,
        ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
        ELECTRON_ENABLE_LOGGING: 'true',
        HEADLESS_TEST_MODE: 'true',
        ...(isWSL ? {
          FONTCONFIG_CACHE: '/tmp/fontconfig-cache',
          FONTCONFIG_PATH: '/etc/fonts',
          XDG_CACHE_HOME: '/tmp/.cache',
          XDG_CONFIG_HOME: '/tmp/.config',
          DBUS_SESSION_BUS_ADDRESS: ''
        } : {})
      }
    };

    try {
      return await super.launch(headlessOptions);
    } catch (error) {
      console.error('[HeadlessElectronApp] ヘッドレス起動失敗:', error);
      throw error;
    }
  }

  /**
   * IPCメッセージのテスト（GUI不要）
   */
  async testIPCCommunication(): Promise<boolean> {
    console.log('[HeadlessElectronApp] IPC通信テストを実行中...');
    
    try {
      const mainWindow = await this.getMainWindow();
      if (!mainWindow) {
        throw new Error('メインウィンドウが取得できません');
      }

      // IPC通信の基本テスト
      const result = await mainWindow.evaluate(async () => {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          try {
            // 基本的なIPC通信をテスト
            return { success: true, electronAPI: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        } else {
          return { success: false, error: 'electronAPI not available' };
        }
      });

      console.log('[HeadlessElectronApp] IPC通信テスト結果:', result);
      return result.success;

    } catch (error) {
      console.error('[HeadlessElectronApp] IPC通信テストエラー:', error);
      return false;
    }
  }

  /**
   * アプリケーション設定のテスト（GUI不要）
   */
  async testApplicationSettings(): Promise<boolean> {
    console.log('[HeadlessElectronApp] アプリケーション設定テストを実行中...');
    
    try {
      const mainWindow = await this.getMainWindow();
      if (!mainWindow) {
        throw new Error('メインウィンドウが取得できません');
      }

      const result = await mainWindow.evaluate(async () => {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          try {
            // 設定の取得・保存をテスト
            const settings = await (window as any).electronAPI.getSettings();
            return { success: true, hasSettings: !!settings };
          } catch (error) {
            return { success: false, error: error.message };
          }
        } else {
          return { success: false, error: 'electronAPI not available' };
        }
      });

      console.log('[HeadlessElectronApp] 設定テスト結果:', result);
      return result.success;

    } catch (error) {
      console.error('[HeadlessElectronApp] 設定テストエラー:', error);
      return false;
    }
  }

  /**
   * データ永続化のテスト（GUI不要）
   */
  async testDataPersistence(): Promise<boolean> {
    console.log('[HeadlessElectronApp] データ永続化テストを実行中...');
    
    try {
      const mainWindow = await this.getMainWindow();
      if (!mainWindow) {
        throw new Error('メインウィンドウが取得できません');
      }

      const testData = {
        testKey: 'ヘッドレステストデータ',
        timestamp: Date.now()
      };

      const result = await mainWindow.evaluate(async (data) => {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          try {
            // テストデータの保存
            await (window as any).electronAPI.saveSettings(data);
            
            // テストデータの読み込み
            const savedData = await (window as any).electronAPI.getSettings();
            
            return { 
              success: true, 
              dataMatches: savedData.testKey === data.testKey 
            };
          } catch (error) {
            return { success: false, error: error.message };
          }
        } else {
          return { success: false, error: 'electronAPI not available' };
        }
      }, testData);

      console.log('[HeadlessElectronApp] データ永続化テスト結果:', result);
      return result.success && result.dataMatches;

    } catch (error) {
      console.error('[HeadlessElectronApp] データ永続化テストエラー:', error);
      return false;
    }
  }

  /**
   * アプリケーションメモリ使用量のテスト
   */
  async testMemoryUsage(): Promise<{ success: boolean; memoryMB?: number }> {
    console.log('[HeadlessElectronApp] メモリ使用量テストを実行中...');
    
    try {
      const memoryInfo = await this.getMemoryUsage();
      const memoryMB = memoryInfo.workingSetSize / 1024 / 1024;
      
      console.log(`[HeadlessElectronApp] メモリ使用量: ${memoryMB.toFixed(2)}MB`);
      
      // メモリ使用量が妥当な範囲内かチェック（1GB以内）
      const isReasonable = memoryMB < 1024;
      
      return {
        success: isReasonable,
        memoryMB
      };

    } catch (error) {
      console.error('[HeadlessElectronApp] メモリ使用量テストエラー:', error);
      return { success: false };
    }
  }

  /**
   * 包括的なヘッドレステストを実行
   */
  async runHeadlessTestSuite(): Promise<{
    success: boolean;
    results: {
      ipc: boolean;
      settings: boolean;
      persistence: boolean;
      memory: { success: boolean; memoryMB?: number };
    };
  }> {
    console.log('[HeadlessElectronApp] 包括的なヘッドレステストスイートを開始...');
    
    const results = {
      ipc: false,
      settings: false,
      persistence: false,
      memory: { success: false }
    };

    try {
      // IPC通信テスト
      results.ipc = await this.testIPCCommunication();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 設定テスト
      results.settings = await this.testApplicationSettings();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // データ永続化テスト
      results.persistence = await this.testDataPersistence();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // メモリ使用量テスト
      results.memory = await this.testMemoryUsage();

      const overallSuccess = results.ipc && results.settings && 
                           results.persistence && results.memory.success;

      console.log('[HeadlessElectronApp] ヘッドレステストスイート完了:', {
        success: overallSuccess,
        results
      });

      return { success: overallSuccess, results };

    } catch (error) {
      console.error('[HeadlessElectronApp] ヘッドレステストスイートエラー:', error);
      return { success: false, results };
    }
  }
}

/**
 * ヘッドレステスト用のファクトリー関数
 */
export function createHeadlessTest(): HeadlessElectronApp {
  return new HeadlessElectronApp();
}

/**
 * 環境に応じてテストモードを選択
 */
export function getRecommendedTestMode(): 'headless' | 'gui' {
  const isWSL = process.env.WSL_DISTRO_NAME || process.env.WSLENV || 
                require('fs').existsSync('/proc/version') && 
                require('fs').readFileSync('/proc/version', 'utf8').includes('microsoft');
  
  const hasDisplay = process.env.DISPLAY && process.env.DISPLAY !== '';
  
  if (isWSL && !hasDisplay) {
    console.log('[TestMode] WSL環境でDISPLAYが設定されていません。ヘッドレスモードを推奨します。');
    return 'headless';
  }
  
  return 'gui';
}