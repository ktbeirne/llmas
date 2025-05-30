import { BrowserWindow } from 'electron';

/**
 * SpeechBubbleの表示と管理を担当するユーティリティクラス
 */
export class SpeechBubbleManager {
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
   * SpeechBubbleウィンドウが使用可能かチェック
   */
  static isAvailable(window: BrowserWindow | undefined): boolean {
    return !!(window && !window.isDestroyed());
  }
}