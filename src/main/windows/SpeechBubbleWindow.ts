import { BrowserWindow, screen } from 'electron';

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
      console.log('[SpeechBubbleWindow] Window already exists, returning existing window');
      return this.window;
    }

    try {
      console.log('[SpeechBubbleWindow] Creating new speech bubble window...');
      const config = WindowManager.getSpeechBubbleConfig();
      console.log('[SpeechBubbleWindow] Window config:', {
        show: config.show,
        alwaysOnTop: config.alwaysOnTop,
        skipTaskbar: config.skipTaskbar
      });
      
      this.window = this.windowManager.createWindow(config, PATHS.SPEECH_BUBBLE_HTML);
      
      this.setupEventHandlers();
      this.setupWebContentsHandlers();
      
      console.log('[SpeechBubbleWindow] Window created successfully, visibility:', this.window.isVisible());
      return this.window;
    } catch (error) {
      console.error('[SpeechBubbleWindow] Failed to create window:', error);
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
      // 初期状態では非表示を維持
      // show: false が設定されているため、明示的なshowコールまで非表示
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
    console.log('[SpeechBubbleWindow] updateSize called with:', size);
    
    if (!this.window || this.window.isDestroyed()) {
      console.log('[SpeechBubbleWindow] ウィンドウが存在しないか破棄されています');
      return;
    }

    // メインウィンドウの位置を取得
    const mainWindow = this.windowManager.getWindow('main');
    if (!mainWindow) {
      console.log('[SpeechBubbleWindow] メインウィンドウが見つかりません');
      return;
    }

    const mainBounds = mainWindow.getBounds();
    console.log('[SpeechBubbleWindow] メインウィンドウ bounds:', mainBounds);
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
    console.log('[SpeechBubbleWindow] メインウィンドウ位置:', mainBounds);
    
    const windowWidth = Math.max(size.width, 80);
    const windowHeight = Math.max(size.height, 50);
    
    // SpeechBubbleの配置戦略：
    // 目標: SpeechBubbleのtailの先端がMainWindowの上端から1px上に配置
    // つまり、SpeechBubbleの下端（ウィンドウの一番下）= MainWindowの上端 - 1px
    
    const TAIL_HEIGHT = 12; // CSSのborder-topと同じ値
    const SHADOW_VERTICAL = 16; // CSSのbox-shadowの垂直オフセット概算
    const TARGET_GAP = 1; // tailの先端からMainWindow上端までの目標距離（px）
    
    const x = mainBounds.x + Math.round((mainBounds.width - windowWidth) / 2);
    
    // 計算式: SpeechBubbleのy座標 = MainWindow上端 - SpeechBubbleの高さ - TARGET_GAP
    // これにより、SpeechBubbleの下端（y + height）がMainWindow上端の1px上に配置される
    let y = mainBounds.y - windowHeight - TARGET_GAP;
    
    console.log(`[SpeechBubbleWindow] 目標配置: SpeechBubbleの下端をMainWindow上端から${TARGET_GAP}px上に配置`);
    
    // 画面の上端を超えないように調整
    try {
      const displays = screen.getAllDisplays();
      const primaryDisplay = screen.getPrimaryDisplay();
      const workArea = primaryDisplay.workArea; // タスクバーなどを除いた作業領域
      
      console.log('[SpeechBubbleWindow] 画面情報:', {
        primaryDisplay: primaryDisplay.bounds,
        workArea: workArea,
        allDisplays: displays.length
      });
      
      const minY = workArea.y + 10; // 作業領域上端から最低10px余白
      if (y < minY) {
        console.log(`[SpeechBubbleWindow] y座標が画面上端を超えるため調整: ${y} -> ${minY}`);
        y = minY;
      }
    } catch (error) {
      console.warn('[SpeechBubbleWindow] 画面情報取得に失敗、デフォルト値使用:', error);
      const minY = 10;
      if (y < minY) {
        console.log(`[SpeechBubbleWindow] y座標が画面上端を超えるため調整: ${y} -> ${minY}`);
        y = minY;
      }
    }
    
    const newBounds = {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(windowWidth),
      height: Math.round(windowHeight)
    };
    
    console.log('[SpeechBubbleWindow] 位置計算詳細:', {
      mainWindow: {
        top: mainBounds.y,
        bottom: mainBounds.y + mainBounds.height,
        left: mainBounds.x,
        right: mainBounds.x + mainBounds.width,
        center: mainBounds.x + mainBounds.width / 2
      },
      speechBubble: {
        top: newBounds.y,
        bottom: newBounds.y + newBounds.height,
        left: newBounds.x,
        right: newBounds.x + newBounds.width,
        center: newBounds.x + newBounds.width / 2
      },
      calculation: {
        windowWidth,
        windowHeight,
        TAIL_HEIGHT,
        SHADOW_VERTICAL,
        TARGET_GAP,
        formula: `${mainBounds.y} - ${windowHeight} - ${TARGET_GAP} = ${y}`,
        speechBubbleBottom: y + windowHeight,
        mainWindowTop: mainBounds.y,
        actualGap: mainBounds.y - (y + windowHeight),
        targetGap: TARGET_GAP
      }
    });
    
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
    
    // 位置更新では表示状態を変更しない
    // show() は明示的なテキスト表示時のみ実行
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