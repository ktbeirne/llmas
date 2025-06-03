/**
 * VRM/ウィンドウ制御関連のIPCハンドラーを管理するクラス
 */

import { ipcMain, BrowserWindow } from 'electron';

import { WindowManagerController } from '../../windows/WindowManagerController';
import { WINDOW_CONFIG } from '../../../config/constants';
import { SpeechBubbleManager } from '../../../utils/speechBubbleManager';

export class VRMHandler {
  constructor(
    private windowManagerController: WindowManagerController
  ) {}

  /**
   * すべてのVRM/ウィンドウ制御関連IPCハンドラーを登録
   */
  public setupHandlers(): void {
    console.log('[VRMHandler] VRM/ウィンドウ制御関連IPCハンドラーを登録中...');
    
    // ウィンドウ制御
    ipcMain.on('toggle-chat-visibility', this.handleToggleChatVisibility.bind(this));
    ipcMain.on('quit-app', this.handleQuitApp.bind(this));
    ipcMain.on('toggle-settings-window', this.handleToggleSettingsWindow.bind(this));
    ipcMain.on('open-settings', this.handleOpenSettings.bind(this));
    ipcMain.on('close-settings', this.handleCloseSettings.bind(this));

    // スピーチバブル制御
    ipcMain.on('hide-speech-bubble-window', this.handleHideSpeechBubble.bind(this));
    ipcMain.on('notify-bubble-size', this.handleNotifyBubbleSize.bind(this));
    ipcMain.on('log-from-speech-bubble', this.handleLogFromSpeechBubble.bind(this));

    console.log('[VRMHandler] すべてのVRM/ウィンドウ制御関連IPCハンドラーが登録されました');
  }

  /**
   * ログ出力ヘルパー
   */
  private log(level: 'info' | 'warn' | 'error', method: string, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[VRMHandler:${method}] ${message}`;
    
    switch (level) {
      case 'info':
        console.log(`${timestamp} ${logMessage}`, data ? data : '');
        break;
      case 'warn':
        console.warn(`${timestamp} ${logMessage}`, data ? data : '');
        break;
      case 'error':
        console.error(`${timestamp} ${logMessage}`, data ? data : '');
        break;
    }
  }

  /**
   * 安全なウィンドウ操作ヘルパー
   */
  private safeWindowOperation(method: string, windowName: string, operation: () => void): boolean {
    try {
      const windowManager = this.windowManagerController.getWindowManager();
      const window = windowManager.getWindow(windowName);
      
      if (!window || window.isDestroyed()) {
        this.log('warn', method, `ウィンドウが存在しないか破棄されています`, { windowName });
        return false;
      }
      
      operation();
      return true;
    } catch (error) {
      this.log('error', method, `ウィンドウ操作でエラーが発生`, { windowName, error });
      return false;
    }
  }

  /**
   * チャットウィンドウの表示切り替え
   */
  private handleToggleChatVisibility(): void {
    this.log('info', 'handleToggleChatVisibility', 'チャットウィンドウ表示切り替えリクエストを受信');
    
    try {
      this.windowManagerController.toggleChatWindow();
      this.log('info', 'handleToggleChatVisibility', 'チャットウィンドウの表示切り替えが完了');
    } catch (error) {
      this.log('error', 'handleToggleChatVisibility', 'チャットウィンドウ表示切り替えでエラー', error);
    }
  }

  /**
   * アプリケーション終了
   */
  private handleQuitApp(): void {
    this.log('info', 'handleQuitApp', 'アプリケーション終了リクエストを受信');
    
    try {
      // メインウィンドウにカメラ設定保存を指示してから終了処理を開始
      const mainWindow = BrowserWindow.getAllWindows().find(window => 
        !window.isDestroyed() && (window.getTitle() === '' || window.getTitle().includes('LLM Desktop Mascot'))
      );
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        this.log('info', 'handleQuitApp', 'メインウィンドウにカメラ設定保存を指示');
        
        // カメラ設定保存のためのコマンドを送信
        mainWindow.webContents.send('app-before-quit');
        
        // 設定保存の時間を確保してから終了処理
        setTimeout(() => {
          this.performAppQuit();
        }, 200);
      } else {
        // メインウィンドウが見つからない場合は即座に終了
        this.performAppQuit();
      }
    } catch (error) {
      this.log('error', 'handleQuitApp', 'アプリケーション終了でエラー', error);
      // エラーでも終了処理は実行
      this.performAppQuit();
    }
  }

  /**
   * 実際のアプリケーション終了処理
   */
  private performAppQuit(): void {
    this.log('info', 'performAppQuit', '実際のアプリケーション終了処理を開始');
    
    try {
      // すべてのウィンドウを閉じる
      BrowserWindow.getAllWindows().forEach(window => {
        if (!window.isDestroyed()) {
          this.log('info', 'performAppQuit', 'ウィンドウを閉じています', { 
            title: window.getTitle(),
            id: window.id 
          });
          window.close();
        }
      });
      
      // アプリケーションを終了
      const { app } = require('electron');
      app.quit();
      
      this.log('info', 'performAppQuit', 'アプリケーション終了処理が完了');
    } catch (error) {
      this.log('error', 'performAppQuit', 'アプリケーション終了でエラー', error);
    }
  }

  /**
   * 設定ウィンドウのトグル
   */
  private handleToggleSettingsWindow(): void {
    this.log('info', 'handleToggleSettingsWindow', '設定ウィンドウトグルリクエストを受信');
    
    try {
      this.windowManagerController.toggleSettingsWindow();
      this.log('info', 'handleToggleSettingsWindow', '設定ウィンドウのトグルが完了');
    } catch (error) {
      this.log('error', 'handleToggleSettingsWindow', '設定ウィンドウトグルでエラー', error);
    }
  }

  /**
   * 設定ウィンドウを開く
   */
  private handleOpenSettings(): void {
    this.log('info', 'handleOpenSettings', '設定ウィンドウ開くリクエストを受信');
    
    try {
      const settingsController = this.windowManagerController.getSettingsWindowController();
      settingsController.show();
      this.log('info', 'handleOpenSettings', '設定ウィンドウを正常に開きました');
    } catch (error) {
      this.log('error', 'handleOpenSettings', '設定ウィンドウを開く際にエラー', error);
    }
  }

  /**
   * 設定ウィンドウを閉じる
   */
  private handleCloseSettings(): void {
    this.log('info', 'handleCloseSettings', '設定ウィンドウ閉じるリクエストを受信');
    
    try {
      const settingsController = this.windowManagerController.getSettingsWindowController();
      settingsController.close();
      this.log('info', 'handleCloseSettings', '設定ウィンドウを正常に閉じました');
    } catch (error) {
      this.log('error', 'handleCloseSettings', '設定ウィンドウを閉じる際にエラー', error);
    }
  }

  /**
   * スピーチバブルの非表示
   */
  private handleHideSpeechBubble(): void {
    this.log('info', 'handleHideSpeechBubble', 'スピーチバブル非表示リクエストを受信');
    
    const success = this.safeWindowOperation('handleHideSpeechBubble', 'speechBubble', () => {
      const windowManager = this.windowManagerController.getWindowManager();
      const speechBubbleWindow = windowManager.getWindow('speechBubble');
      const mainWindow = windowManager.getWindow('main');
      
      SpeechBubbleManager.hideAndResetExpression(speechBubbleWindow, mainWindow);
      this.log('info', 'handleHideSpeechBubble', 'スピーチバブルを正常に非表示にしました');
    });
    
    if (!success) {
      this.log('warn', 'handleHideSpeechBubble', 'スピーチバブル非表示操作が失敗しました');
    }
  }

  /**
   * スピーチバブルのサイズ通知とポジション更新
   */
  private handleNotifyBubbleSize(_event: unknown, size: { width: number; height: number }): void {
    this.log('info', 'handleNotifyBubbleSize', 'スピーチバブルサイズ通知を受信', size);
    
    // サイズのバリデーション
    if (!size || typeof size.width !== 'number' || typeof size.height !== 'number') {
      this.log('warn', 'handleNotifyBubbleSize', 'サイズパラメータが無効です', size);
      return;
    }
    
    if (size.width <= 0 || size.height <= 0) {
      this.log('warn', 'handleNotifyBubbleSize', 'サイズが無効な値です', size);
      return;
    }

    try {
      // 新しいアーキテクチャでのSpeechBubbleサイズ更新
      this.windowManagerController.updateSpeechBubbleSize(size);
      this.log('info', 'handleNotifyBubbleSize', 'スピーチバブルサイズを正常に更新しました', size);
    } catch (error) {
      this.log('error', 'handleNotifyBubbleSize', 'スピーチバブルサイズ更新でエラー', error);
    }
  }


  /**
   * スピーチバブルからのログ
   */
  private handleLogFromSpeechBubble(_event: unknown, message: string): void {
    // スピーチバブルからのログは独自のフォーマットで出力
    console.log(`[SpeechBubble]: ${message}`);
  }

  /**
   * VRMモデル関連の将来機能（プレースホルダー）
   */
  public setupVRMHandlers(): void {
    this.log('info', 'setupVRMHandlers', 'VRMモデル関連ハンドラーの設定開始');
    
    // TODO: 将来のVRMモデル関連IPCハンドラーをここに実装
    // 例：
    // - VRMモデルの読み込み
    // - VRMアニメーションの制御
    // - VRM表情の詳細制御
    // - VRMポーズの制御
    
    this.log('info', 'setupVRMHandlers', 'VRMモデル関連ハンドラーの設定完了（将来実装予定）');
  }

  /**
   * ウィンドウ状態の監視開始（将来機能）
   */
  public startWindowMonitoring(): void {
    this.log('info', 'startWindowMonitoring', 'ウィンドウ状態監視を開始');
    
    // TODO: ウィンドウ状態の定期監視
    // 例：
    // - メインウィンドウの位置変更監視
    // - ウィンドウサイズ変更監視
    // - フォーカス状態監視
    
    this.log('info', 'startWindowMonitoring', 'ウィンドウ状態監視が開始されました（将来実装予定）');
  }

  /**
   * 3D表示関連の設定（将来機能）
   */
  public setup3DDisplayHandlers(): void {
    this.log('info', 'setup3DDisplayHandlers', '3D表示関連ハンドラーの設定開始');
    
    // TODO: 3D表示関連のIPCハンドラー
    // 例：
    // - カメラアングルの制御
    // - ライティングの調整
    // - レンダリング品質の設定
    // - フレームレートの制御
    
    this.log('info', 'setup3DDisplayHandlers', '3D表示関連ハンドラーの設定完了（将来実装予定）');
  }

  /**
   * ハンドラーのクリーンアップ
   */
  public cleanup(): void {
    this.log('info', 'cleanup', 'VRM/ウィンドウ制御関連IPCハンドラーをクリーンアップ中...');
    
    // スピーチバブルの状態をリセット
    try {
      const windowManager = this.windowManagerController.getWindowManager();
      const speechBubbleWindow = windowManager.getWindow('speechBubble');
      const mainWindow = windowManager.getWindow('main');
      
      if (speechBubbleWindow && !speechBubbleWindow.isDestroyed()) {
        SpeechBubbleManager.hideAndResetExpression(speechBubbleWindow, mainWindow);
      }
    } catch (error) {
      this.log('warn', 'cleanup', 'スピーチバブルクリーンアップでエラー', error);
    }
    
    this.log('info', 'cleanup', 'VRM/ウィンドウ制御関連IPCハンドラーのクリーンアップが完了');
  }
}