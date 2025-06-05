import { BrowserWindow } from 'electron';

import { WindowManager } from '../../utils/WindowManager';
import { SettingsStore } from '../../utils/settingsStore';
import { ErrorHandler } from '../../utils/errorHandler';
import { PATHS } from '../../config/constants';

export type VisibilityChangedCallback = (isVisible: boolean) => void;

/**
 * チャットウィンドウの作成と管理を担当するクラス
 * main.tsのcreateChatWindow関数を抽象化
 */
export class ChatWindowController {
  private windowManager: WindowManager;
  private settingsStore: SettingsStore;
  private window: BrowserWindow | null = null;
  private moveTimeout: NodeJS.Timeout | null = null;
  private resizeTimeout: NodeJS.Timeout | null = null;
  
  // イベントコールバック
  private visibilityChangedCallbacks: VisibilityChangedCallback[] = [];

  constructor(windowManager: WindowManager, settingsStore: SettingsStore) {
    this.windowManager = windowManager;
    this.settingsStore = settingsStore;
  }

  /**
   * チャットウィンドウを作成
   */
  public async createWindow(): Promise<BrowserWindow | null> {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
      return this.window;
    }

    try {
      // 保存されたチャットウィンドウ位置を取得
      const savedBounds = this.settingsStore.getChatWindowBounds();
      const savedVisible = this.settingsStore.getChatWindowVisible();
      console.log('[ChatWindow] チャットウィンドウ作成 - 保存された位置:', savedBounds);
      console.log('[ChatWindow] チャットウィンドウ作成 - 保存された表示状態:', savedVisible);
      
      const config = WindowManager.getChatWindowConfig();
      
      // 保存された位置・サイズがあれば適用
      if (savedBounds) {
        config.x = savedBounds.x;
        config.y = savedBounds.y;
        config.width = savedBounds.width;
        config.height = savedBounds.height;
        console.log('[ChatWindow] チャットウィンドウ設定を適用:', config);
      }
      
      this.window = this.windowManager.createWindow(config, PATHS.CHAT_HTML);
      
      // 保存された表示状態を復元
      if (!savedVisible) {
        this.window.hide();
      }
      
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

    // ウィンドウ位置・サイズ変更時の自動保存
    this.window.on('moved', () => {
      this.handleBoundsChange('moved');
    });

    this.window.on('resized', () => {
      this.handleBoundsChange('resized');
    });

    // 表示状態変更時の自動保存
    this.window.on('show', () => {
      try {
        this.settingsStore.setChatWindowVisible(true);
        console.log('[ChatWindow] チャットウィンドウ表示状態を保存しました: true');
        this.notifyVisibilityChanged(true);
      } catch (error) {
        console.error('[ChatWindow] チャットウィンドウ表示状態の保存に失敗:', error);
      }
    });

    this.window.on('hide', () => {
      try {
        this.settingsStore.setChatWindowVisible(false);
        console.log('[ChatWindow] チャットウィンドウ表示状態を保存しました: false');
        this.notifyVisibilityChanged(false);
      } catch (error) {
        console.error('[ChatWindow] チャットウィンドウ表示状態の保存に失敗:', error);
      }
    });

    // ウィンドウが閉じられた時のクリーンアップ
    this.window.on('closed', () => {
      this.cleanup();
    });
  }

  /**
   * WebContentsイベントハンドラーのセットアップ
   */
  private setupWebContentsHandlers(): void {
    if (!this.window) return;

    // ウィンドウの読み込み完了を待つ
    this.window.webContents.on('did-finish-load', () => {
      console.log('[ChatWindow] HTMLの読み込みが完了しました');
    });
    
    this.window.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      console.error('[ChatWindow] 読み込みエラー:', errorCode, errorDescription);
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
          this.settingsStore.setChatWindowBounds(bounds);
          console.log(`[ChatWindow] チャットウィンドウ${type === 'moved' ? '位置' : 'サイズ'}を保存しました:`, bounds);
        }
      } catch (error) {
        console.error(`[ChatWindow] チャットウィンドウ${type === 'moved' ? '位置' : 'サイズ'}の保存に失敗:`, error);
      }
    }, 500);

    if (type === 'moved') {
      this.moveTimeout = newTimeout;
    } else {
      this.resizeTimeout = newTimeout;
    }
  }

  /**
   * リソースのクリーンアップ
   */
  private cleanup(): void {
    if (this.moveTimeout) {
      clearTimeout(this.moveTimeout);
      this.moveTimeout = null;
    }
    
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }
    
    this.window = null;
    console.log('[ChatWindow] リソースのクリーンアップが完了しました');
  }

  /**
   * 可視性変更を通知
   */
  private notifyVisibilityChanged(isVisible: boolean): void {
    this.visibilityChangedCallbacks.forEach(callback => callback(isVisible));
  }

  /**
   * チャットウィンドウの表示/非表示を切り替え
   */
  public async toggle(): Promise<void> {
    if (!this.window) {
      // ウィンドウが存在しない場合は作成
      await this.createWindow();
      // ウィンドウが正常に作成されたら表示
      if (this.window && !this.window.isDestroyed()) {
        this.window.show();
        this.window.focus();
      }
      return;
    }

    if (this.window.isDestroyed()) {
      // ウィンドウが破棄されている場合は再作成
      this.window = null;
      await this.createWindow();
      // ウィンドウが正常に作成されたら表示
      if (this.window && !this.window.isDestroyed()) {
        this.window.show();
        this.window.focus();
      }
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
   * チャットウィンドウを表示
   */
  public async show(): Promise<void> {
    if (!this.window) {
      await this.createWindow();
      if (this.window && !this.window.isDestroyed()) {
        this.window.show();
        this.window.focus();
      }
      return;
    }

    if (this.window.isDestroyed()) {
      this.window = null;
      await this.createWindow();
      if (this.window && !this.window.isDestroyed()) {
        this.window.show();
        this.window.focus();
      }
      return;
    }

    this.window.show();
    this.window.focus();
  }

  /**
   * チャットウィンドウを非表示
   */
  public hide(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide();
    }
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
   * ウィンドウが表示されているかチェック
   */
  public isVisible(): boolean {
    return this.window ? this.window.isVisible() : false;
  }

  /**
   * 設定を保存
   */
  public saveSettings(): void {
    if (this.window && !this.window.isDestroyed()) {
      const bounds = this.window.getBounds();
      this.settingsStore.setChatWindowBounds(bounds);
      this.settingsStore.setChatWindowVisible(this.window.isVisible());
    }
  }

  /**
   * 可視性変更コールバックを追加
   */
  public onVisibilityChanged(callback: VisibilityChangedCallback): void {
    this.visibilityChangedCallbacks.push(callback);
  }

  /**
   * チャットウィンドウサイズを折り畳み状態に応じて変更（固定値版）
   */
  public setChatCollapsedSize(collapsed: boolean): void {
    if (!this.window || this.window.isDestroyed()) {
      console.warn('[ChatWindow] ウィンドウが利用できません');
      return;
    }

    try {
      const currentBounds = this.window.getBounds();
      
      if (collapsed) {
        // 折り畳み時：入力エリアのみの高さ（より正確に計算）
        // textarea(40px) + padding(16px*2) + border(2px) + gap(8px) + button(40px) = 約110px
        const collapsedHeight = 110;
        
        // 入力エリアを基準にした位置調整: 下端を固定して上に縮小
        const savedBounds = this.settingsStore.getChatWindowBounds();
        const expandedHeight = savedBounds?.height || 500;
        const heightDiff = expandedHeight - collapsedHeight;
        const newY = currentBounds.y + heightDiff;
        
        // 最小高さ制約を一時的に無効化
        this.window.setMinimumSize(currentBounds.width, collapsedHeight);
        this.window.setBounds({ 
          x: currentBounds.x, 
          y: newY, 
          width: currentBounds.width, 
          height: collapsedHeight 
        });
        console.log('[ChatWindow] ウィンドウを折り畳みサイズに変更:', { 
          x: currentBounds.x, 
          y: newY, 
          width: currentBounds.width, 
          height: collapsedHeight 
        });
      } else {
        // 展開時：保存されたサイズと位置に復元
        const savedBounds = this.settingsStore.getChatWindowBounds();
        const expandedHeight = savedBounds?.height || 500;
        const expandedY = savedBounds?.y || currentBounds.y;
        
        // 最小高さ制約を元に戻す
        this.window.setMinimumSize(300, 300);
        this.window.setBounds({ 
          x: currentBounds.x, 
          y: expandedY, 
          width: currentBounds.width, 
          height: expandedHeight 
        });
        console.log('[ChatWindow] ウィンドウを展開サイズに変更:', { 
          x: currentBounds.x, 
          y: expandedY, 
          width: currentBounds.width, 
          height: expandedHeight 
        });
      }
    } catch (error) {
      console.error('[ChatWindow] ウィンドウサイズ変更でエラー:', error);
    }
  }

  /**
   * チャットウィンドウサイズを動的に計算された高さで変更
   */
  public setChatSizeWithHeight(collapsed: boolean, inputAreaHeight: number): void {
    if (!this.window || this.window.isDestroyed()) {
      console.warn('[ChatWindow] ウィンドウが利用できません');
      return;
    }

    try {
      const currentBounds = this.window.getBounds();
      
      if (collapsed) {
        // 折り畳み時：入力エリアの実際の高さ（マージンなし）
        const collapsedHeight = Math.ceil(inputAreaHeight);
        
        // 入力エリアを基準にした位置調整: 下端を固定して上に縮小
        const heightDiff = currentBounds.height - collapsedHeight;
        const newY = currentBounds.y + heightDiff;
        
        // 折り畳み前の状態を保存
        this.settingsStore.setChatWindowBounds(currentBounds);
        
        // 最小高さ制約を一時的に無効化
        this.window.setMinimumSize(currentBounds.width, collapsedHeight);
        this.window.setBounds({ 
          x: currentBounds.x, 
          y: newY, 
          width: currentBounds.width, 
          height: collapsedHeight 
        });
        console.log('[ChatWindow] ウィンドウを動的折り畳みサイズに変更:', { 
          x: currentBounds.x, 
          y: newY, 
          width: currentBounds.width, 
          height: collapsedHeight,
          inputAreaHeight,
          originalHeight: currentBounds.height
        });
      } else {
        // 展開時：保存されたサイズと位置に復元
        const savedBounds = this.settingsStore.getChatWindowBounds();
        const expandedHeight = savedBounds?.height || currentBounds.height;
        const expandedY = savedBounds?.y || (currentBounds.y - (expandedHeight - currentBounds.height));
        
        // 最小高さ制約を元に戻す
        this.window.setMinimumSize(300, 300);
        this.window.setBounds({ 
          x: currentBounds.x, 
          y: expandedY, 
          width: currentBounds.width, 
          height: expandedHeight 
        });
        console.log('[ChatWindow] ウィンドウを展開サイズに変更:', { 
          x: currentBounds.x, 
          y: expandedY, 
          width: currentBounds.width, 
          height: expandedHeight 
        });
      }
    } catch (error) {
      console.error('[ChatWindow] ウィンドウサイズ変更でエラー:', error);
    }
  }
}