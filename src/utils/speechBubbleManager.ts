import { BrowserWindow } from 'electron';

import { SettingsStore } from './settingsStore';
import { MascotStateManager } from '../services/MascotStateManager';

/**
 * SpeechBubbleの表示と管理を担当するユーティリティクラス
 */
export class SpeechBubbleManager {
  private static settingsStore = new SettingsStore();
  private static hideTimeout: NodeJS.Timeout | null = null;
  private static mascotStateManager = MascotStateManager.getInstance();
  private static mainWindow: BrowserWindow | undefined;
  
  /**
   * メインウィンドウの参照を設定
   */
  static setMainWindow(window: BrowserWindow | undefined): void {
    this.mainWindow = window;
  }
  
  /**
   * SpeechBubbleウィンドウにテキストを表示する
   * ウィンドウが非表示の場合は表示してからテキストを送信する
   */
  static showWithText(window: BrowserWindow | undefined, text: string): void {
    console.log('[SpeechBubbleManager] showWithText called');
    console.log('[SpeechBubbleManager] Window exists:', !!window);
    
    if (!window || window.isDestroyed()) {
      console.warn('[SpeechBubbleManager] ウィンドウが存在しないか破棄されています');
      if (window) {
        console.warn('[SpeechBubbleManager] Window is destroyed:', window.isDestroyed());
      }
      return;
    }
    
    console.log('[SpeechBubbleManager] Window title:', window.getTitle());
    console.log('[SpeechBubbleManager] Window visible:', window.isVisible());

    const sendText = () => {
      if (!window.isDestroyed()) {
        console.log('[SpeechBubbleManager] テキストを送信:', text.substring(0, 30) + '...');
        window.webContents.send('set-speech-bubble-text', text);
        
        // MainRendererに表示状態を通知
        window.webContents.executeJavaScript('window.speechBubbleActive = true');
        
        // MascotStateManagerに通知
        this.mascotStateManager.setSpeechBubbleActive(true);
        
        // 自動非表示タイマーをセット（10秒後）
        if (this.hideTimeout) {
          clearTimeout(this.hideTimeout);
        }
        this.hideTimeout = setTimeout(() => {
          // メインウィンドウを使用して表情をリセット
          this.hideAndResetExpression(window, this.mainWindow);
        }, 10000);
      }
    };

    if (!window.isVisible()) {
      console.log('[SpeechBubbleManager] ウィンドウを表示します');
      window.show();
      
      // webContentsの準備状態を確認
      if (window.webContents.isLoading()) {
        console.log('[SpeechBubbleManager] webContentsがロード中です。完了を待ちます');
        window.webContents.once('did-finish-load', sendText);
      } else {
        console.log('[SpeechBubbleManager] webContentsは既にロード済みです');
        // 次のイベントループで実行して、show()の処理が完了するのを待つ
        process.nextTick(sendText);
      }
    } else {
      console.log('[SpeechBubbleManager] ウィンドウは既に表示されています');
      sendText();
    }
  }

  /**
   * SpeechBubbleウィンドウを非表示にする
   */
  static hide(window: BrowserWindow | undefined): void {
    if (!window || window.isDestroyed()) {
      return;
    }

    if (window.isVisible()) {
      console.log('[SpeechBubbleManager] ウィンドウを非表示にします');
      window.hide();
      
      // MascotStateManagerに通知
      this.mascotStateManager.setSpeechBubbleActive(false);
    }
  }

  /**
   * SpeechBubbleウィンドウを非表示にしてデフォルト表情に戻す
   */
  static hideAndResetExpression(speechBubbleWindow: BrowserWindow | undefined, mainWindow: BrowserWindow | undefined): void {
    if (!speechBubbleWindow || speechBubbleWindow.isDestroyed()) {
      return;
    }

    if (speechBubbleWindow.isVisible()) {
      console.log('[SpeechBubbleManager] ウィンドウを非表示にして表情をリセットします');
      speechBubbleWindow.hide();
      
      // MascotStateManagerに通知
      this.mascotStateManager.setSpeechBubbleActive(false);
      
      // デフォルト表情に戻す
      this.resetToDefaultExpression(mainWindow);
    }
  }

  /**
   * VRMの表情をデフォルトに戻す
   */
  static resetToDefaultExpression(mainWindow: BrowserWindow | undefined): void {
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.warn('[SpeechBubbleManager] メインウィンドウが利用できません');
      return;
    }

    try {
      console.log('[SpeechBubbleManager] 表情をneutralにリセットします');

      // レンダラープロセス経由でneutral表情を適用
      mainWindow.webContents.executeJavaScript(`
        (() => {
          try {
            if (window.vrmExpression && typeof window.vrmExpression.applyExpression === 'function') {
              // まず全ての表情をリセット
              if (typeof window.vrmExpression.resetAllExpressions === 'function') {
                window.vrmExpression.resetAllExpressions();
              }
              // neutral表情を適用
              const result = window.vrmExpression.applyExpression('neutral', 1.0);
              console.log('[Renderer] neutral表情適用結果:', result);
              return result;
            } else {
              console.error('[Renderer] vrmExpression.applyExpression関数が見つかりません');
              return false;
            }
          } catch (error) {
            console.error('[Renderer] neutral表情適用エラー:', error);
            return false;
          }
        })()
      `).then((success) => {
        if (success) {
          console.log('[SpeechBubbleManager] neutral表情の適用が成功しました');
        } else {
          console.warn('[SpeechBubbleManager] neutral表情の適用が失敗しました');
        }
      }).catch((error) => {
        console.error('[SpeechBubbleManager] neutral表情適用でエラー:', error);
      });
    } catch (error) {
      console.error('[SpeechBubbleManager] neutral表情適用エラー:', error);
    }
  }

  /**
   * SpeechBubbleウィンドウが使用可能かチェック
   */
  static isAvailable(window: BrowserWindow | undefined): boolean {
    return !!(window && !window.isDestroyed());
  }
}