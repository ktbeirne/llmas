import { BrowserWindow } from 'electron';

import { WindowManager } from '../../utils/WindowManager';
import { SettingsStore } from '../../utils/settingsStore';
import { SpeechBubbleManager } from '../../utils/speechBubbleManager';

import { MainWindowController } from './MainWindow';
import { ChatWindowController } from './ChatWindow';
import { SettingsWindowController } from './SettingsWindow';
import { SpeechBubbleWindowController } from './SpeechBubbleWindow';

/**
 * 全ウィンドウを統合管理するコントローラークラス
 * main.tsから抽出されたウィンドウ管理ロジックを集約
 */
export class WindowManagerController {
  private windowManager: WindowManager;
  private settingsStore: SettingsStore;
  private speechBubbleManager: SpeechBubbleManager;
  
  private mainWindowController: MainWindowController;
  private chatWindowController: ChatWindowController;
  private settingsWindowController: SettingsWindowController;
  private speechBubbleWindowController: SpeechBubbleWindowController;

  constructor(
    windowManager: WindowManager,
    settingsStore: SettingsStore,
    speechBubbleManager: SpeechBubbleManager
  ) {
    this.windowManager = windowManager;
    this.settingsStore = settingsStore;
    this.speechBubbleManager = speechBubbleManager;

    // 各ウィンドウコントローラーを初期化
    this.mainWindowController = new MainWindowController(
      this.windowManager,
      this.settingsStore
    );
    this.chatWindowController = new ChatWindowController(
      this.windowManager,
      this.settingsStore
    );
    this.settingsWindowController = new SettingsWindowController(
      this.windowManager,
      this.settingsStore
    );
    this.speechBubbleWindowController = new SpeechBubbleWindowController(
      this.windowManager,
      this.speechBubbleManager
    );

    this.setupWindowDependencies();
  }

  /**
   * ウィンドウ間の依存関係を設定
   */
  private setupWindowDependencies(): void {
    // メインウィンドウからスピーチバブル位置を更新
    this.mainWindowController.onBoundsChanged((bounds) => {
      this.speechBubbleWindowController.updatePositionBasedOnMainWindow(bounds);
    });

    // チャットウィンドウの状態変更をメインウィンドウに通知
    this.chatWindowController.onVisibilityChanged((isVisible) => {
      this.mainWindowController.notifyChatWindowStateChanged(isVisible);
    });

    // 設定ウィンドウの状態変更をメインウィンドウに通知  
    this.settingsWindowController.onVisibilityChanged((isOpen) => {
      this.mainWindowController.notifySettingsWindowStateChanged(isOpen);
    });
  }

  /**
   * すべてのウィンドウを初期化
   */
  public async initializeWindows(): Promise<void> {
    try {
      // メインウィンドウを最初に作成
      await this.mainWindowController.createWindow();
      
      // SpeechBubbleManagerにメインウィンドウの参照を設定
      const mainWindow = this.windowManager.getWindow('main');
      if (mainWindow) {
        SpeechBubbleManager.setMainWindow(mainWindow);
        console.log('[WindowManagerController] Main window reference set in SpeechBubbleManager');
      }
      
      // スピーチバブルウィンドウを作成（非表示状態）
      await this.speechBubbleWindowController.createWindow();
      
      console.log('[WindowManagerController] All windows initialized successfully');
    } catch (error) {
      console.error('[WindowManagerController] Failed to initialize windows:', error);
      throw error;
    }
  }

  /**
   * チャットウィンドウの表示/非表示を切り替え
   */
  public async toggleChatWindow(): Promise<void> {
    await this.chatWindowController.toggle();
  }

  /**
   * 設定ウィンドウの表示/非表示を切り替え
   */
  public toggleSettingsWindow(): void {
    this.settingsWindowController.toggle();
  }

  /**
   * スピーチバブルの表示/非表示を切り替え
   */
  public toggleSpeechBubble(text?: string): void {
    if (text) {
      this.speechBubbleWindowController.showWithText(text);
    } else {
      this.speechBubbleWindowController.hide();
    }
  }

  /**
   * スピーチバブルのサイズを更新
   */
  public updateSpeechBubbleSize(size: { width: number; height: number }): void {
    console.log('[WindowManagerController] updateSpeechBubbleSize called with:', size);
    this.speechBubbleWindowController.updateSize(size);
  }

  /**
   * メインウィンドウを取得
   */
  public getMainWindow(): BrowserWindow | undefined {
    return this.mainWindowController.getWindow();
  }

  /**
   * チャットウィンドウを取得
   */
  public getChatWindow(): BrowserWindow | undefined {
    return this.chatWindowController.getWindow();
  }

  /**
   * 設定ウィンドウを取得
   */
  public getSettingsWindow(): BrowserWindow | undefined {
    return this.settingsWindowController.getWindow();
  }

  /**
   * スピーチバブルウィンドウを取得
   */
  public getSpeechBubbleWindow(): BrowserWindow | undefined {
    return this.speechBubbleWindowController.getWindow();
  }

  /**
   * チャットウィンドウの可視性を取得
   */
  public isChatWindowVisible(): boolean {
    return this.chatWindowController.isVisible();
  }

  /**
   * 設定ウィンドウの可視性を取得
   */
  public isSettingsWindowVisible(): boolean {
    return this.settingsWindowController.isVisible();
  }

  /**
   * すべてのウィンドウを閉じる
   */
  public closeAllWindows(): void {
    this.mainWindowController.close();
    this.chatWindowController.close();
    this.settingsWindowController.close();
    this.speechBubbleWindowController.close();
  }

  /**
   * ウィンドウの設定を保存
   */
  public saveWindowSettings(): void {
    this.mainWindowController.saveSettings();
    this.chatWindowController.saveSettings();
    // SettingsWindowとSpeechBubbleは一般的に位置を保存しない
  }

  /**
   * ウィンドウが存在するかチェック
   */
  public hasAnyWindow(): boolean {
    return !!(
      this.mainWindowController.getWindow() ||
      this.chatWindowController.getWindow() ||
      this.settingsWindowController.getWindow()
    );
  }

  /**
   * メインウィンドウコントローラーを取得
   */
  public getMainWindowController(): MainWindowController {
    return this.mainWindowController;
  }

  /**
   * チャットウィンドウコントローラーを取得
   */
  public getChatWindowController(): ChatWindowController {
    return this.chatWindowController;
  }

  /**
   * 設定ウィンドウコントローラーを取得
   */
  public getSettingsWindowController(): SettingsWindowController {
    return this.settingsWindowController;
  }

  /**
   * スピーチバブルウィンドウコントローラーを取得
   */
  public getSpeechBubbleWindowController(): SpeechBubbleWindowController {
    return this.speechBubbleWindowController;
  }

  /**
   * WindowManagerを取得
   */
  public getWindowManager(): WindowManager {
    return this.windowManager;
  }

  /**
   * チャットウィンドウのサイズを折り畳み状態に応じて変更
   */
  public setChatWindowCollapsedSize(collapsed: boolean): void {
    this.chatWindowController.setChatCollapsedSize(collapsed);
  }

  /**
   * チャットウィンドウのサイズを指定された高さで変更
   */
  public setChatWindowSizeWithHeight(collapsed: boolean, inputAreaHeight: number): void {
    this.chatWindowController.setChatSizeWithHeight(collapsed, inputAreaHeight);
  }
}