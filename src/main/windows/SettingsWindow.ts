import { BrowserWindow } from 'electron';

import { WindowManager } from '../../utils/WindowManager';
import { SettingsStore } from '../../utils/settingsStore';
import { ErrorHandler } from '../../utils/errorHandler';

export type VisibilityChangedCallback = (isOpen: boolean) => void;

/**
 * 設定ウィンドウの作成と管理を担当するクラス
 * main.tsのcreateSettingsWindow関数を抽象化
 */
export class SettingsWindowController {
  private windowManager: WindowManager;
  private window: BrowserWindow | null = null;
  
  // イベントコールバック
  private visibilityChangedCallbacks: VisibilityChangedCallback[] = [];

  constructor(windowManager: WindowManager, _settingsStore: SettingsStore) {
    this.windowManager = windowManager;
  }

  /**
   * 設定ウィンドウを作成
   */
  public async createWindow(): Promise<BrowserWindow | null> {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
      return this.window;
    }

    try {
      const config = WindowManager.getSettingsWindowConfig();
      this.window = this.windowManager.createWindow(config, 'settings.html');
      
      this.setupEventHandlers();
      this.setupWebContentsHandlers();
      
      return this.window;
    } catch (error) {
      ErrorHandler.handle(error, true);
      return null;
    }
  }

  /**
   * イベントハンドラーのセットアップ
   */
  private setupEventHandlers(): void {
    if (!this.window) return;

    // ウィンドウが表示された時
    this.window.on('show', () => {
      console.log('[SettingsWindow] 設定ウィンドウが表示されました');
      this.notifyVisibilityChanged(true);
    });

    // ウィンドウが非表示になった時
    this.window.on('hide', () => {
      console.log('[SettingsWindow] 設定ウィンドウが非表示になりました');
      this.notifyVisibilityChanged(false);
    });

    // ウィンドウが閉じられた時の状態変更通知
    this.window.on('closed', () => {
      console.log('[SettingsWindow] 設定ウィンドウが閉じられました');
      this.notifyVisibilityChanged(false);
      
      // メインウィンドウに状態変更を通知
      const mainWindow = this.windowManager.getWindow('main');
      if (mainWindow) {
        mainWindow.webContents.send('settings-window-state-changed', false);
      }
      
      this.cleanup();
    });

    // フォーカスイベント
    this.window.on('focus', () => {
      console.log('[SettingsWindow] 設定ウィンドウがフォーカスされました');
    });
  }

  /**
   * WebContentsイベントハンドラーのセットアップ
   */
  private setupWebContentsHandlers(): void {
    if (!this.window) return;

    // ウィンドウの読み込み完了を待つ
    this.window.webContents.on('did-finish-load', () => {
      console.log('[SettingsWindow] HTMLの読み込みが完了しました');
    });
    
    this.window.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      console.error('[SettingsWindow] 読み込みエラー:', errorCode, errorDescription);
    });
  }

  /**
   * リソースのクリーンアップ
   */
  private cleanup(): void {
    this.window = null;
    console.log('[SettingsWindow] リソースのクリーンアップが完了しました');
  }

  /**
   * 可視性変更を通知
   */
  private notifyVisibilityChanged(isOpen: boolean): void {
    this.visibilityChangedCallbacks.forEach(callback => callback(isOpen));
  }

  /**
   * 設定ウィンドウの表示/非表示を切り替え
   */
  public toggle(): void {
    if (!this.window) {
      // ウィンドウが存在しない場合は作成
      this.createWindow();
      return;
    }

    if (this.window.isDestroyed()) {
      // ウィンドウが破棄されている場合は再作成
      this.window = null;
      this.createWindow();
      return;
    }

    if (this.window.isVisible()) {
      this.window.hide();
    } else {
      this.window.show();
      this.window.focus();
    }
  }

  /**
   * 設定ウィンドウを表示
   */
  public show(): void {
    if (!this.window) {
      this.createWindow();
      return;
    }

    if (this.window.isDestroyed()) {
      this.window = null;
      this.createWindow();
      return;
    }

    this.window.show();
    this.window.focus();
  }

  /**
   * 設定ウィンドウを非表示
   */
  public hide(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide();
    }
  }

  /**
   * 設定ウィンドウを閉じる
   */
  public close(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
  }

  /**
   * ウィンドウを取得
   */
  public getWindow(): BrowserWindow | undefined {
    return this.window && !this.window.isDestroyed() ? this.window : undefined;
  }

  /**
   * ウィンドウが表示されているかチェック
   */
  public isVisible(): boolean {
    return this.window ? this.window.isVisible() : false;
  }

  /**
   * ウィンドウが存在するかチェック
   */
  public exists(): boolean {
    return this.window !== null && !this.window.isDestroyed();
  }

  /**
   * 可視性変更コールバックを追加
   */
  public onVisibilityChanged(callback: VisibilityChangedCallback): void {
    this.visibilityChangedCallbacks.push(callback);
  }
}