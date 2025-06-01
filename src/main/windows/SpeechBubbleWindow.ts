import { BrowserWindow } from 'electron';

import { WindowManager } from '../../utils/WindowManager';
import { SpeechBubbleManager } from '../../utils/speechBubbleManager';
import { ErrorHandler } from '../../utils/errorHandler';
import { PATHS, WINDOW_CONFIG } from '../../config/constants';
import { WindowBounds } from '../../utils/settingsStore';

/**
 * スピーチバブルウィンドウの作成と管理を担当するクラス
 * main.tsのcreateSpeechBubbleWindow関数とスピーチバブル位置計算ロジックを抽象化
 */
export class SpeechBubbleWindowController {
  private windowManager: WindowManager;
  private window: BrowserWindow | null = null;

  constructor(windowManager: WindowManager, _speechBubbleManager: SpeechBubbleManager) {
    this.windowManager = windowManager;
  }

  /**
   * スピーチバブルウィンドウを作成
   */
  public async createWindow(): Promise<BrowserWindow | null> {
    if (this.window && !this.window.isDestroyed()) {
      return this.window;
    }

    try {
      const config = WindowManager.getSpeechBubbleConfig();
      this.window = this.windowManager.createWindow(config, PATHS.SPEECH_BUBBLE_HTML);
      
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

    // ウィンドウの準備完了を待つ
    this.window.once('ready-to-show', () => {
      console.log('[SpeechBubbleWindow] ウィンドウの準備が完了しました');
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

    // webContentsのロード完了をログ出力
    this.window.webContents.on('did-finish-load', () => {
      console.log('[SpeechBubbleWindow] HTMLのロードが完了しました');
    });
    
    this.window.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      console.error('[SpeechBubbleWindow] ロードエラー:', errorCode, errorDescription);
    });
  }

  /**
   * リソースのクリーンアップ
   */
  private cleanup(): void {
    this.window = null;
    console.log('[SpeechBubbleWindow] リソースのクリーンアップが完了しました');
  }

  /**
   * メインウィンドウの位置に基づいてスピーチバブル位置を更新
   */
  public updatePositionBasedOnMainWindow(mainWindowBounds: WindowBounds): void {
    if (!this.window || this.window.isDestroyed()) return;

    // 現在のスピーチバブルサイズを取得
    const currentBounds = this.window.getBounds();
    this.updatePosition(
      { width: currentBounds.width, height: currentBounds.height },
      mainWindowBounds
    );
  }

  /**
   * スピーチバブルのサイズを更新し位置を再計算
   */
  public updateSize(size: { width: number; height: number }): void {
    if (!this.window || this.window.isDestroyed()) return;

    // メインウィンドウの位置を取得
    const mainWindow = this.windowManager.getWindow('main');
    if (!mainWindow) {
      console.log('[SpeechBubbleWindow] メインウィンドウが見つかりません');
      return;
    }

    const mainBounds = mainWindow.getBounds();
    this.updatePosition(size, mainBounds);
  }

  /**
   * スピーチバブルの位置を計算して更新
   */
  private updatePosition(
    size: { width: number; height: number }, 
    mainBounds: WindowBounds
  ): void {
    if (!this.window || this.window.isDestroyed()) return;

    console.log('[SpeechBubbleWindow] サイズ通知受信:', size);
    
    const windowWidth = Math.max(size.width, 80);
    const windowHeight = Math.max(size.height, 50);
    
    const x = mainBounds.x + Math.round((mainBounds.width - windowWidth) / 2);
    const y = (mainBounds.y + WINDOW_CONFIG.SPEECH_BUBBLE.MIN_DISPLAY_TIME / 20) - windowHeight;
    
    const newBounds = {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(windowWidth),
      height: Math.round(windowHeight)
    };
    
    console.log('[SpeechBubbleWindow] スピーチバブル位置設定:', newBounds);
    
    this.window.setBounds(newBounds);
    
    // 設定後の実際のBoundsを確認
    setTimeout(() => {
      if (!this.window || this.window.isDestroyed()) return;
      
      const actualBounds = this.window.getBounds();
      console.log('[SpeechBubbleWindow] 実際の設定後位置:', actualBounds);
      console.log('[SpeechBubbleWindow] 期待値vs実際値 - Width:', {
        expected: newBounds.width, 
        actual: actualBounds.width, 
        diff: actualBounds.width - newBounds.width
      });
      console.log('[SpeechBubbleWindow] 期待値vs実際値 - Height:', {
        expected: newBounds.height, 
        actual: actualBounds.height, 
        diff: actualBounds.height - newBounds.height
      });
      console.log('[SpeechBubbleWindow] ウィンドウ状態:', {
        visible: this.window.isVisible(),
        destroyed: this.window.isDestroyed()
      });
      
      // 内部コンテンツサイズも確認（可能なら）
      this.window.webContents.executeJavaScript(`
        const bubble = document.getElementById('bubble-content');
        if (bubble) {
          const rect = bubble.getBoundingClientRect();
          console.log('[SpeechBubbleWindow] Content actual size:', {
            width: rect.width, 
            height: rect.height, 
            offsetW: bubble.offsetWidth, 
            offsetH: bubble.offsetHeight
          });
        }
      `).catch((error: Error) => {
        console.error('[SpeechBubbleWindow] ウィンドウサイズ計算エラー:', error);
      });
    }, 100);
    
    if (!this.window.isVisible()) {
      console.log('[SpeechBubbleWindow] スピーチバブルウィンドウを表示');
      this.window.show();
    } else {
      console.log('[SpeechBubbleWindow] スピーチバブルウィンドウは既に表示中');
    }
  }

  /**
   * テキストと共にスピーチバブルを表示
   */
  public showWithText(text: string): void {
    if (!this.window) {
      this.createWindow();
      if (!this.window) return;
    }

    if (this.window.isDestroyed()) {
      this.window = null;
      this.createWindow();
      if (!this.window) return;
    }

    // SpeechBubbleManagerを使用してテキストを設定
    SpeechBubbleManager.showWithText(this.window, text);
  }

  /**
   * スピーチバブルを非表示
   */
  public hide(): void {
    if (!this.window || this.window.isDestroyed()) return;

    const mainWindow = this.windowManager.getWindow('main');
    SpeechBubbleManager.hideAndResetExpression(this.window, mainWindow);
  }

  /**
   * スピーチバブルを表示
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
   * ウィンドウが存在するかチェック
   */
  public exists(): boolean {
    return this.window !== null && !this.window.isDestroyed();
  }
}