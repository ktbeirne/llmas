/**
 * ページオブジェクトパターンクラス群
 * 
 * 各ウィンドウの操作を抽象化し、テストコードの保守性を向上
 */

import { Page, Locator } from 'playwright';

/**
 * チャットメッセージの型定義
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * カメラ設定の型定義
 */
export interface CameraSettings {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  zoom: number;
}

/**
 * メインウィンドウのページオブジェクト
 */
export class MainWindowPage {
  constructor(private page: Page) {}

  // セレクタ定義
  private selectors = {
    mascotContainer: '[data-testid="mascot-container"]',
    mascotCanvas: 'canvas',
    menuButton: '[data-testid="menu-button"]',
    chatButton: '[data-testid="chat-button"]',
    settingsButton: '[data-testid="settings-button"]',
    loadingIndicator: '[data-testid="loading"]',
    errorMessage: '[data-testid="error-message"]',
    vrmModel: '[data-testid="vrm-model"]',
    animationControls: '[data-testid="animation-controls"]'
  };

  /**
   * チャットウィンドウを開く
   */
  async openChatWindow(): Promise<void> {
    await this.page.click(this.selectors.chatButton);
    await this.page.waitForTimeout(1000); // ウィンドウ開くまで待機
  }

  /**
   * 設定ウィンドウを開く
   */
  async openSettings(): Promise<void> {
    await this.page.click(this.selectors.settingsButton);
    await this.page.waitForTimeout(1000); // ウィンドウ開くまで待機
  }

  /**
   * マスコット要素を取得
   */
  async getMascotElement(): Promise<Locator> {
    return this.page.locator(this.selectors.mascotContainer);
  }

  /**
   * マスコット読み込み完了まで待機
   */
  async waitForMascotLoad(): Promise<void> {
    try {
      // ローディングインジケータが消えるまで待機（存在する場合のみ）
      try {
        await this.page.waitForSelector(this.selectors.loadingIndicator, { 
          state: 'hidden',
          timeout: 5000 
        });
      } catch {
        // ローディングインジケータが存在しない場合は無視
      }

      // VRMモデルまたはCanvasが表示されるまで待機
      try {
        await this.page.waitForSelector(this.selectors.vrmModel, {
          state: 'visible',
          timeout: 10000
        });
      } catch {
        // VRMモデルセレクタが見つからない場合、Canvasで待機
        await this.page.waitForSelector('canvas', {
          state: 'visible',
          timeout: 10000
        });
      }
    } catch {
      // 最後の手段として、基本的なページロードを待機
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForLoadState('networkidle');
    }

    // アプリケーションが安定するまで少し待機
    await this.page.waitForTimeout(3000);
  }

  /**
   * スクリーンショットを撮影
   */
  async captureScreenshot(path?: string): Promise<Buffer> {
    return await this.page.screenshot({
      path,
      fullPage: true
    });
  }

  /**
   * エラーメッセージを取得
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      const errorElement = await this.page.waitForSelector(this.selectors.errorMessage, {
        timeout: 5000
      });
      return await errorElement.textContent();
    } catch {
      return null;
    }
  }

  /**
   * マスコットアニメーションを開始
   */
  async startMascotAnimation(animationType: string): Promise<void> {
    const animationControls = this.page.locator(this.selectors.animationControls);
    await animationControls.selectOption(animationType);
  }

  /**
   * マスコット表示状態を確認
   */
  async isMascotVisible(): Promise<boolean> {
    try {
      const mascot = this.page.locator(this.selectors.vrmModel);
      return await mascot.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Canvas要素のFPSを測定
   */
  async measureFPS(duration: number = 5000): Promise<number> {
    return await this.page.evaluate((measureDuration) => {
      return new Promise<number>((resolve) => {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        if (!canvas) {
          resolve(0);
          return;
        }

        let frameCount = 0;
        const startTime = performance.now();
        
        function countFrame() {
          frameCount++;
          if (performance.now() - startTime < measureDuration) {
            requestAnimationFrame(countFrame);
          } else {
            const elapsed = (performance.now() - startTime) / 1000;
            const fps = frameCount / elapsed;
            resolve(Math.round(fps));
          }
        }
        
        requestAnimationFrame(countFrame);
      });
    }, duration);
  }
}

/**
 * チャットウィンドウのページオブジェクト
 */
export class ChatWindowPage {
  constructor(private page: Page) {}

  // セレクタ定義
  private selectors = {
    messageInput: '[data-testid="message-input"]',
    sendButton: '[data-testid="send-button"]',
    messagesContainer: '[data-testid="messages-container"]',
    messageItem: '[data-testid="message-item"]',
    userMessage: '[data-testid="user-message"]',
    assistantMessage: '[data-testid="assistant-message"]',
    clearButton: '[data-testid="clear-history"]',
    loadingIndicator: '[data-testid="message-loading"]',
    errorMessage: '[data-testid="chat-error"]'
  };

  /**
   * メッセージを送信
   */
  async sendMessage(text: string): Promise<void> {
    await this.page.fill(this.selectors.messageInput, text);
    await this.page.click(this.selectors.sendButton);
  }

  /**
   * 応答を待機
   */
  async waitForResponse(timeout: number = 30000): Promise<string> {
    // ローディングインジケータが表示されるまで待機
    await this.page.waitForSelector(this.selectors.loadingIndicator, {
      state: 'visible',
      timeout: 5000
    });

    // ローディングインジケータが消えるまで待機
    await this.page.waitForSelector(this.selectors.loadingIndicator, {
      state: 'hidden',
      timeout
    });

    // 最新のアシスタントメッセージを取得
    const assistantMessages = this.page.locator(this.selectors.assistantMessage);
    const lastMessage = assistantMessages.last();
    return await lastMessage.textContent() || '';
  }

  /**
   * チャット履歴をクリア
   */
  async clearHistory(): Promise<void> {
    await this.page.click(this.selectors.clearButton);
    
    // 確認ダイアログがある場合は承認
    this.page.on('dialog', dialog => dialog.accept());
    
    // メッセージが消えるまで待機
    await this.page.waitForSelector(this.selectors.messageItem, {
      state: 'hidden',
      timeout: 5000
    });
  }

  /**
   * メッセージ履歴を取得
   */
  async getMessageHistory(): Promise<Message[]> {
    const messages: Message[] = [];
    const messageElements = await this.page.locator(this.selectors.messageItem).all();

    for (const element of messageElements) {
      const role = await element.getAttribute('data-role') as 'user' | 'assistant';
      const content = await element.textContent() || '';
      const timestamp = await element.getAttribute('data-timestamp') || '';
      const id = await element.getAttribute('data-id') || '';

      messages.push({ id, role, content, timestamp });
    }

    return messages;
  }

  /**
   * エラーメッセージを確認
   */
  async hasError(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.selectors.errorMessage, {
        timeout: 5000
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * メッセージ数を取得
   */
  async getMessageCount(): Promise<number> {
    return await this.page.locator(this.selectors.messageItem).count();
  }
}

/**
 * 設定ウィンドウのページオブジェクト
 */
export class SettingsWindowPage {
  constructor(private page: Page) {}

  // セレクタ定義
  private selectors = {
    userNameInput: '[data-testid="user-name-input"]',
    mascotNameInput: '[data-testid="mascot-name-input"]',
    themeSelect: '[data-testid="theme-select"]',
    vrmFileInput: '[data-testid="vrm-file-input"]',
    vrmFileButton: '[data-testid="vrm-file-button"]',
    cameraPositionX: '[data-testid="camera-position-x"]',
    cameraPositionY: '[data-testid="camera-position-y"]',
    cameraPositionZ: '[data-testid="camera-position-z"]',
    cameraZoom: '[data-testid="camera-zoom"]',
    saveButton: '[data-testid="save-settings"]',
    resetButton: '[data-testid="reset-settings"]',
    cancelButton: '[data-testid="cancel-settings"]',
    successMessage: '[data-testid="success-message"]',
    errorMessage: '[data-testid="error-message"]'
  };

  /**
   * ユーザー名を設定
   */
  async setUserName(name: string): Promise<void> {
    await this.page.fill(this.selectors.userNameInput, name);
  }

  /**
   * マスコット名を設定
   */
  async setMascotName(name: string): Promise<void> {
    await this.page.fill(this.selectors.mascotNameInput, name);
  }

  /**
   * テーマを変更
   */
  async changeTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
    await this.page.selectOption(this.selectors.themeSelect, theme);
  }

  /**
   * VRMファイルを選択
   */
  async selectVrmFile(filePath: string): Promise<void> {
    // ファイル選択ダイアログをモック
    const fileInput = this.page.locator(this.selectors.vrmFileInput);
    await fileInput.setInputFiles(filePath);
  }

  /**
   * カメラ設定を変更
   */
  async setCameraSettings(settings: CameraSettings): Promise<void> {
    await this.page.fill(this.selectors.cameraPositionX, settings.position.x.toString());
    await this.page.fill(this.selectors.cameraPositionY, settings.position.y.toString());
    await this.page.fill(this.selectors.cameraPositionZ, settings.position.z.toString());
    await this.page.fill(this.selectors.cameraZoom, settings.zoom.toString());
  }

  /**
   * 設定を保存
   */
  async saveSettings(): Promise<void> {
    await this.page.click(this.selectors.saveButton);
    
    // 保存完了メッセージを待機
    await this.page.waitForSelector(this.selectors.successMessage, {
      timeout: 10000
    });
  }

  /**
   * 設定をリセット
   */
  async resetSettings(): Promise<void> {
    await this.page.click(this.selectors.resetButton);
    
    // 確認ダイアログがある場合は承認
    this.page.on('dialog', dialog => dialog.accept());
  }

  /**
   * 設定ウィンドウを閉じる
   */
  async close(): Promise<void> {
    await this.page.click(this.selectors.cancelButton);
  }

  /**
   * 成功メッセージを取得
   */
  async getSuccessMessage(): Promise<string | null> {
    try {
      const element = await this.page.waitForSelector(this.selectors.successMessage, {
        timeout: 5000
      });
      return await element.textContent();
    } catch {
      return null;
    }
  }

  /**
   * エラーメッセージを取得
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      const element = await this.page.waitForSelector(this.selectors.errorMessage, {
        timeout: 5000
      });
      return await element.textContent();
    } catch {
      return null;
    }
  }

  /**
   * 現在の設定値を取得
   */
  async getCurrentSettings(): Promise<{
    userName: string;
    mascotName: string;
    theme: string;
    cameraSettings: CameraSettings;
  }> {
    const userName = await this.page.inputValue(this.selectors.userNameInput);
    const mascotName = await this.page.inputValue(this.selectors.mascotNameInput);
    const theme = await this.page.inputValue(this.selectors.themeSelect);
    
    const cameraSettings: CameraSettings = {
      position: {
        x: parseFloat(await this.page.inputValue(this.selectors.cameraPositionX)),
        y: parseFloat(await this.page.inputValue(this.selectors.cameraPositionY)),
        z: parseFloat(await this.page.inputValue(this.selectors.cameraPositionZ))
      },
      target: { x: 0, y: 0, z: 0 }, // 通常は固定値
      zoom: parseFloat(await this.page.inputValue(this.selectors.cameraZoom))
    };

    return {
      userName,
      mascotName,
      theme,
      cameraSettings
    };
  }
}

/**
 * スピーチバブルウィンドウのページオブジェクト
 */
export class SpeechBubbleWindowPage {
  constructor(private page: Page) {}

  // セレクタ定義
  private selectors = {
    bubbleContainer: '[data-testid="speech-bubble"]',
    bubbleText: '[data-testid="bubble-text"]',
    bubbleArrow: '[data-testid="bubble-arrow"]',
    closeButton: '[data-testid="close-bubble"]'
  };

  /**
   * バブルが表示されているか確認
   */
  async isVisible(): Promise<boolean> {
    try {
      return await this.page.locator(this.selectors.bubbleContainer).isVisible();
    } catch {
      return false;
    }
  }

  /**
   * バブルのテキストを取得
   */
  async getText(): Promise<string> {
    const textElement = this.page.locator(this.selectors.bubbleText);
    return await textElement.textContent() || '';
  }

  /**
   * バブルが消えるまで待機
   */
  async waitForHidden(timeout: number = 10000): Promise<void> {
    await this.page.waitForSelector(this.selectors.bubbleContainer, {
      state: 'hidden',
      timeout
    });
  }

  /**
   * バブルを手動で閉じる
   */
  async close(): Promise<void> {
    await this.page.click(this.selectors.closeButton);
  }

  /**
   * バブルのサイズを取得
   */
  async getSize(): Promise<{ width: number; height: number }> {
    const bubble = this.page.locator(this.selectors.bubbleContainer);
    const boundingBox = await bubble.boundingBox();
    
    return {
      width: boundingBox?.width || 0,
      height: boundingBox?.height || 0
    };
  }

  /**
   * アニメーション完了まで待機
   */
  async waitForAnimation(): Promise<void> {
    // CSSアニメーション完了まで待機
    await this.page.waitForFunction(() => {
      const bubble = document.querySelector('[data-testid="speech-bubble"]') as HTMLElement;
      if (!bubble) return true;
      
      const computedStyle = window.getComputedStyle(bubble);
      return computedStyle.animationPlayState === 'paused' || 
             computedStyle.animationName === 'none';
    }, { timeout: 5000 });
  }
}