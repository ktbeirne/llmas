import { BrowserWindow } from 'electron';
import { SettingsStore } from './settingsStore';

/**
 * SpeechBubbleの表示と管理を担当するユーティリティクラス
 */
export class SpeechBubbleManager {
  private static settingsStore = new SettingsStore();
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
      }
    };

    if (!window.isVisible()) {
      console.log('[SpeechBubbleManager] ウィンドウを表示します');
      window.show();
      
      // webContentsの準備が完了してからテキストを送信
      window.webContents.once('did-finish-load', sendText);
      
      // ただし、既にロード済みの場合もあるので、一定時間後にも送信を試行
      setTimeout(sendText, 100);
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
      const defaultExpression = this.settingsStore.getDefaultExpression();
      console.log(`[SpeechBubbleManager] デフォルト表情 '${defaultExpression}' に戻します`);

      // レンダラープロセス経由で表情を適用
      mainWindow.webContents.executeJavaScript(`
        (() => {
          try {
            if (window.vrmExpression && typeof window.vrmExpression.applyExpression === 'function') {
              const result = window.vrmExpression.applyExpression('${defaultExpression}', 1.0);
              console.log('[Renderer] デフォルト表情適用結果:', result);
              return result;
            } else {
              console.error('[Renderer] vrmExpression.applyExpression関数が見つかりません');
              return false;
            }
          } catch (error) {
            console.error('[Renderer] デフォルト表情適用エラー:', error);
            return false;
          }
        })()
      `).then((success) => {
        if (success) {
          console.log(`[SpeechBubbleManager] デフォルト表情 '${defaultExpression}' の適用が成功しました`);
        } else {
          console.warn(`[SpeechBubbleManager] デフォルト表情 '${defaultExpression}' の適用が失敗しました`);
        }
      }).catch((error) => {
        console.error('[SpeechBubbleManager] デフォルト表情適用でエラー:', error);
      });
    } catch (error) {
      console.error('[SpeechBubbleManager] デフォルト表情取得エラー:', error);
    }
  }

  /**
   * SpeechBubbleウィンドウが使用可能かチェック
   */
  static isAvailable(window: BrowserWindow | undefined): boolean {
    return !!(window && !window.isDestroyed());
  }
}