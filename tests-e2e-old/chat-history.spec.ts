import { test, expect } from '@playwright/test';
import { join } from 'path';

const ELECTRON_PATH = join(process.cwd(), 'node_modules', '.bin', 'electron');
const MAIN_PATH = join(process.cwd(), '.vite', 'build', 'main.js');

test.describe('チャット履歴機能', () => {
  test('チャットウィンドウの基本的な履歴機能', async ({ electronApp, page }) => {
    // チャットウィンドウを開く
    await page.locator('[data-test="chat-toggle"]').click();
    
    // チャットウィンドウの確認
    const chatWindow = electronApp.windows().find(window => 
      window.locator('#prompt-input').isVisible()
    );
    
    if (chatWindow) {
      // 履歴リセットボタンが存在することを確認
      await expect(chatWindow.locator('#clear-history-button')).toBeVisible();
      
      // 確認ダイアログが非表示であることを確認
      await expect(chatWindow.locator('#confirmation-modal')).toHaveCSS('display', 'none');
      
      // 履歴リセットボタンをクリック
      await chatWindow.locator('#clear-history-button').click();
      
      // 確認ダイアログが表示されることを確認
      await expect(chatWindow.locator('#confirmation-modal')).toHaveCSS('display', 'block');
      
      // キャンセルボタンをクリック
      await chatWindow.locator('#cancel-clear').click();
      
      // 確認ダイアログが非表示になることを確認
      await expect(chatWindow.locator('#confirmation-modal')).toHaveCSS('display', 'none');
    }
  });

  test('チャット履歴の色彩ガイドライン準拠', async ({ electronApp, page }) => {
    // チャットウィンドウを開く
    await page.locator('[data-test="chat-toggle"]').click();
    
    const chatWindow = electronApp.windows().find(window => 
      window.locator('#prompt-input').isVisible()
    );
    
    if (chatWindow) {
      // 背景色の確認（#FFF6E3）
      await expect(chatWindow.locator('body')).toHaveCSS('background-color', 'rgb(255, 246, 227)');
      
      // 送信ボタンの色の確認（#BFECFF）
      await expect(chatWindow.locator('#send-button')).toHaveCSS('background-color', 'rgb(191, 236, 255)');
      
      // 履歴削除ボタンの色の確認（#FFCCEA）
      await expect(chatWindow.locator('#clear-history-button')).toHaveCSS('background-color', 'rgb(255, 204, 234)');
    }
  });

  test('確認ダイアログのアクセシビリティ', async ({ electronApp, page }) => {
    // チャットウィンドウを開く
    await page.locator('[data-test="chat-toggle"]').click();
    
    const chatWindow = electronApp.windows().find(window => 
      window.locator('#prompt-input').isVisible()
    );
    
    if (chatWindow) {
      // 履歴リセットボタンをクリック
      await chatWindow.locator('#clear-history-button').click();
      
      // 確認ダイアログの内容を確認
      await expect(chatWindow.locator('#confirmation-modal p')).toContainText('本当に会話履歴をすべて削除しますか？');
      await expect(chatWindow.locator('#confirmation-modal p')).toContainText('この操作は元に戻せません。');
      
      // ボタンのテキストを確認
      await expect(chatWindow.locator('#confirm-clear')).toHaveText('はい');
      await expect(chatWindow.locator('#cancel-clear')).toHaveText('いいえ');
      
      // モーダルの外側をクリックして閉じる
      await chatWindow.locator('#confirmation-modal').click();
      await expect(chatWindow.locator('#confirmation-modal')).toHaveCSS('display', 'none');
    }
  });
});