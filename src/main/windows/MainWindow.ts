import { BrowserWindow } from 'electron';

import { WindowManager } from '../../utils/WindowManager';
import { SettingsStore, WindowBounds } from '../../utils/settingsStore';
import { ErrorHandler } from '../../utils/errorHandler';

export type BoundsChangedCallback = (bounds: WindowBounds) => void;
export type ChatWindowStateCallback = (isVisible: boolean) => void;
export type SettingsWindowStateCallback = (isOpen: boolean) => void;

/**
 * メインウィンドウの作成と管理を担当するクラス
 * main.tsのcreateMainWindow関数とタイトルバー監視ロジックを抽象化
 */
export class MainWindowController {
  private windowManager: WindowManager;
  private settingsStore: SettingsStore;
  private window: BrowserWindow | null = null;
  private moveTimeout: NodeJS.Timeout | null = null;
  private resizeTimeout: NodeJS.Timeout | null = null;
  private monitorInterval: NodeJS.Timeout | null = null;
  
  // イベントコールバック
  private boundsChangedCallbacks: BoundsChangedCallback[] = [];
  private chatWindowStateCallbacks: ChatWindowStateCallback[] = [];
  private settingsWindowStateCallbacks: SettingsWindowStateCallback[] = [];

  constructor(windowManager: WindowManager, settingsStore: SettingsStore) {
    this.windowManager = windowManager;
    this.settingsStore = settingsStore;
  }

  /**
   * メインウィンドウを作成
   */
  public async createWindow(): Promise<BrowserWindow> {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
      return this.window;
    }

    try {
      // 設定からウィンドウサイズを取得
      const windowSize = this.settingsStore.getWindowSize();
      
      // 保存されたウィンドウ位置を取得
      const savedBounds = this.settingsStore.getMainWindowBounds();
      console.log('[MainWindow] メインウィンドウ作成 - 保存された位置:', savedBounds);
      
      const config = WindowManager.getMainWindowConfig({
        width: windowSize.width,
        height: windowSize.height,
        x: savedBounds?.x,
        y: savedBounds?.y
      });
      
      console.log('[MainWindow] メインウィンドウ設定:', config);
      this.window = this.windowManager.createWindow(config, 'index.html');
      
      this.setupEventHandlers();
      this.setupReadyToShowHandler();
      
      return this.window;
    } catch (error) {
      ErrorHandler.handle(error, true);
      throw error;
    }
  }

  /**
   * ready-to-showイベントのセットアップ
   */
  private setupReadyToShowHandler(): void {
    if (!this.window) return;

    this.window.once('ready-to-show', () => {
      if (!this.window) return;
      
      console.log('[MainWindow] メインウィンドウの準備が完了しました');
      this.window.show();
      
      // Windows環境での追加処理 + 継続的タイトルバー監視
      if (process.platform === 'win32') {
        // 表示後にもう一度タイトルをクリア
        setTimeout(() => {
          if (this.window && !this.window.isDestroyed()) {
            this.window.setTitle('');
            console.log('[MainWindow] Windows用タイトルクリア処理完了');
            
            // 継続的なタイトルバー監視を開始（環境変数で無効化可能）
            if (process.env.DISABLE_TITLEBAR_MONITORING !== 'true') {
              this.startTitleBarMonitoring();
            } else {
              console.log('[MainWindow] タイトルバー監視が無効化されています');
            }
          }
        }, 100);
      } else {
        // macOS/Linuxでも監視開始（環境変数で無効化可能）
        setTimeout(() => {
          if (this.window && !this.window.isDestroyed() && process.env.DISABLE_TITLEBAR_MONITORING !== 'true') {
            this.startTitleBarMonitoring();
          }
        }, 100);
      }
    });
  }

  /**
   * イベントハンドラーのセットアップ
   */
  private setupEventHandlers(): void {
    if (!this.window) return;

    // ウィンドウ位置変更時の自動保存
    this.window.on('moved', () => {
      this.handleBoundsChange('moved');
    });

    // ウィンドウサイズ変更時の自動保存
    this.window.on('resized', () => {
      this.handleBoundsChange('resized');
    });

    // ウィンドウが閉じられた時のクリーンアップ
    this.window.on('closed', () => {
      this.cleanup();
    });
  }

  /**
   * ウィンドウサイズ/位置変更の処理
   */
  private handleBoundsChange(type: 'moved' | 'resized'): void {
    if (!this.window) return;

    const timeout = type === 'moved' ? this.moveTimeout : this.resizeTimeout;
    if (timeout) clearTimeout(timeout);

    const newTimeout = setTimeout(() => {
      try {
        if (this.window && !this.window.isDestroyed()) {
          const bounds = this.window.getBounds();
          this.settingsStore.setMainWindowBounds(bounds);
          console.log(`[MainWindow] メインウィンドウ${type === 'moved' ? '位置' : 'サイズ'}を保存しました:`, bounds);
          
          // コールバックを呼び出し
          this.boundsChangedCallbacks.forEach(callback => callback(bounds));
        }
      } catch (error) {
        console.error(`[MainWindow] メインウィンドウ${type === 'moved' ? '位置' : 'サイズ'}の保存に失敗:`, error);
      }
    }, 500);

    if (type === 'moved') {
      this.moveTimeout = newTimeout;
    } else {
      this.resizeTimeout = newTimeout;
    }
  }

  /**
   * タイトルバー継続監視（軽量版）
   */
  private startTitleBarMonitoring(): void {
    if (!this.window) return;
    
    console.log('[MainWindow] Starting lightweight titlebar monitoring for main window...');
    
    let isDragging = false;
    let dragStartTime = 0;
    
    // 軽量な監視（1秒間隔）- ドラッグ中は停止
    this.monitorInterval = setInterval(() => {
      if (!this.window || this.window.isDestroyed()) {
        this.stopTitleBarMonitoring();
        return;
      }
      
      // ドラッグ中は監視を一時停止
      if (isDragging && Date.now() - dragStartTime < 500) {
        return;
      }
      
      // タイトルが設定されていれば強制的に空にする
      if (this.window.getTitle() !== '') {
        this.window.setTitle('');
      }
    }, 1000); // 1秒間隔
    
    // フォーカス・ブラーイベントでリセット（ドラッグに影響しない）
    this.window.on('focus', () => {
      if (this.window && !this.window.isDestroyed()) {
        setTimeout(() => this.window?.setTitle(''), 100); // 少し遅延
      }
    });
    
    this.window.on('blur', () => {
      if (this.window && !this.window.isDestroyed()) {
        setTimeout(() => this.window?.setTitle(''), 100); // 少し遅延
      }
    });
    
    // ドラッグ開始検出
    this.window.on('will-move', () => {
      isDragging = true;
      dragStartTime = Date.now();
    });
    
    // ドラッグ終了検出（moved イベント後にドラッグ完了と判定）
    this.window.on('moved', () => {
      // ドラッグ終了後にタイトルをリセット（遅延付き）
      setTimeout(() => {
        if (this.window && !this.window.isDestroyed()) {
          this.window.setTitle('');
          isDragging = false;
        }
      }, 200);
    });
    
    // リサイズ後にタイトルリセット（遅延付き）
    this.window.on('resized', () => {
      setTimeout(() => {
        if (this.window && !this.window.isDestroyed()) {
          this.window.setTitle('');
        }
      }, 100);
    });
  }

  /**
   * タイトルバー監視を停止
   */
  private stopTitleBarMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      console.log('[MainWindow] Titlebar monitoring stopped');
    }
  }

  /**
   * リソースのクリーンアップ
   */
  private cleanup(): void {
    this.stopTitleBarMonitoring();
    
    if (this.moveTimeout) {
      clearTimeout(this.moveTimeout);
      this.moveTimeout = null;
    }
    
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }
    
    this.window = null;
    console.log('[MainWindow] リソースのクリーンアップが完了しました');
  }

  /**
   * ウィンドウを取得
   */
  public getWindow(): BrowserWindow | undefined {
    return this.window && !this.window.isDestroyed() ? this.window : undefined;
  }

  /**
   * ウィンドウを閉じる
   */
  public close(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
  }

  /**
   * 設定を保存
   */
  public saveSettings(): void {
    if (this.window && !this.window.isDestroyed()) {
      const bounds = this.window.getBounds();
      this.settingsStore.setMainWindowBounds(bounds);
    }
  }

  /**
   * ウィンドウ境界変更コールバックを追加
   */
  public onBoundsChanged(callback: BoundsChangedCallback): void {
    this.boundsChangedCallbacks.push(callback);
  }

  /**
   * チャットウィンドウ状態変更を通知
   */
  public notifyChatWindowStateChanged(isVisible: boolean): void {
    this.chatWindowStateCallbacks.forEach(callback => callback(isVisible));
  }

  /**
   * チャットウィンドウ状態変更コールバックを追加
   */
  public onChatWindowStateChanged(callback: ChatWindowStateCallback): void {
    this.chatWindowStateCallbacks.push(callback);
  }

  /**
   * 設定ウィンドウ状態変更を通知
   */
  public notifySettingsWindowStateChanged(isOpen: boolean): void {
    this.settingsWindowStateCallbacks.forEach(callback => callback(isOpen));
  }

  /**
   * 設定ウィンドウ状態変更コールバックを追加
   */
  public onSettingsWindowStateChanged(callback: SettingsWindowStateCallback): void {
    this.settingsWindowStateCallbacks.push(callback);
  }
}