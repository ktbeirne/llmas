/**
 * チャットウィンドウ折り畳み機能 E2Eテスト
 * 
 * Issue #57: チャットウィンドウへの開閉ボタンの追加
 * 会話履歴の表示/非表示を切り替える折り畳みボタンのテスト
 */

import { test, expect } from '@playwright/test';
import { ElectronApp } from '../helpers/electron-app';
import { MainWindowPage, ChatWindowPage } from '../helpers/page-objects';

test.describe('チャットウィンドウ折り畳み機能', () => {
  let electronApp: ElectronApp;
  let mainWindowPage: MainWindowPage;
  let chatWindowPage: ChatWindowPage;

  test.beforeEach(async () => {
    electronApp = new ElectronApp();
    
    // アプリケーション起動
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const mainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    expect(chatWindow).toBeTruthy();
    
    if (chatWindow) {
      chatWindowPage = new ChatWindowPage(chatWindow);
    }
  });

  test.afterEach(async () => {
    if (electronApp && electronApp.isRunning()) {
      await electronApp.close();
    }
  });

  test('折り畳みボタンが送信ボタンの右隣に表示される', async () => {
    console.log('[Test] 折り畳みボタンの表示位置テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    const page = chatWindowPage.getPage();

    // 送信ボタンが存在することを確認
    const sendButton = page.locator('#send-button');
    await expect(sendButton).toBeVisible();

    // 折り畳みボタンが存在することを確認
    const collapseButton = page.locator('#collapse-button');
    await expect(collapseButton).toBeVisible();

    // 折り畳みボタンが送信ボタンの右隣にあることを確認
    const sendButtonBox = await sendButton.boundingBox();
    const collapseButtonBox = await collapseButton.boundingBox();
    
    expect(sendButtonBox).toBeTruthy();
    expect(collapseButtonBox).toBeTruthy();
    
    if (sendButtonBox && collapseButtonBox) {
      // 折り畳みボタンが送信ボタンの右側にある
      expect(collapseButtonBox.x).toBeGreaterThan(sendButtonBox.x + sendButtonBox.width);
      // Y座標がほぼ同じ（同じ行にある）
      expect(Math.abs(collapseButtonBox.y - sendButtonBox.y)).toBeLessThan(10);
    }

    console.log('[Test] 折り畳みボタンの表示位置テスト完了');
  });

  test('初期状態で会話履歴が表示され、折り畳みボタンのアイコンが適切', async () => {
    console.log('[Test] 初期状態テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    const page = chatWindowPage.getPage();

    // 会話履歴エリアが表示されている
    const responseArea = page.locator('#response-area');
    await expect(responseArea).toBeVisible();

    // 折り畳みボタンのアイコンが「▲」または「－」
    const collapseButton = page.locator('#collapse-button');
    const buttonText = await collapseButton.textContent();
    expect(['▲', '－'].includes(buttonText?.trim() || '')).toBeTruthy();

    console.log('[Test] 初期状態テスト完了');
  });

  test('折り畳みボタンをクリックすると会話履歴が非表示になる', async () => {
    console.log('[Test] 折り畳み動作テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    const page = chatWindowPage.getPage();

    // 初期状態で会話履歴が表示されている
    const responseArea = page.locator('#response-area');
    await expect(responseArea).toBeVisible();

    // 折り畳みボタンをクリック
    const collapseButton = page.locator('#collapse-button');
    await collapseButton.click();

    // 会話履歴が非表示になる
    await expect(responseArea).toBeHidden();

    // ボタンのアイコンが「▼」または「＋」に変わる
    const buttonText = await collapseButton.textContent();
    expect(['▼', '＋'].includes(buttonText?.trim() || '')).toBeTruthy();

    console.log('[Test] 折り畳み動作テスト完了');
  });

  test('非表示状態で折り畳みボタンをクリックすると会話履歴が再表示される', async () => {
    console.log('[Test] 展開動作テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    const page = chatWindowPage.getPage();

    // まず会話履歴を非表示にする
    const collapseButton = page.locator('#collapse-button');
    const responseArea = page.locator('#response-area');
    
    // 現在の状態を確認
    const isVisible = await responseArea.isVisible();
    if (isVisible) {
      await collapseButton.click();
      await expect(responseArea).toBeHidden();
    }

    // 折り畳みボタンを再度クリック
    await collapseButton.click();

    // 会話履歴が表示される
    await expect(responseArea).toBeVisible();

    // ボタンのアイコンが「▲」または「－」に戻る
    const buttonText = await collapseButton.textContent();
    expect(['▲', '－'].includes(buttonText?.trim() || '')).toBeTruthy();

    console.log('[Test] 展開動作テスト完了');
  });

  test('会話履歴が非表示の時、入力エリアが適切に再配置される', async () => {
    console.log('[Test] レイアウト調整テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    const page = chatWindowPage.getPage();
    const responseArea = page.locator('#response-area');
    const inputArea = page.locator('#input-area');
    const collapseButton = page.locator('#collapse-button');

    // 初期状態の入力エリアの位置を記録
    const initialInputBox = await inputArea.boundingBox();
    expect(initialInputBox).toBeTruthy();

    // 会話履歴を非表示にする
    const isVisible = await responseArea.isVisible();
    if (isVisible) {
      await collapseButton.click();
      await expect(responseArea).toBeHidden();
    }

    // 入力エリアの新しい位置を取得
    const collapsedInputBox = await inputArea.boundingBox();
    expect(collapsedInputBox).toBeTruthy();

    // 入力エリアが上に移動していることを確認
    if (initialInputBox && collapsedInputBox) {
      expect(collapsedInputBox.y).toBeLessThan(initialInputBox.y);
    }

    console.log('[Test] レイアウト調整テスト完了');
  });

  test('折り畳み状態でもメッセージ送信が正常に動作する', async () => {
    console.log('[Test] 折り畳み状態でのメッセージ送信テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    const page = chatWindowPage.getPage();
    const responseArea = page.locator('#response-area');
    const collapseButton = page.locator('#collapse-button');

    // 会話履歴を非表示にする
    const isVisible = await responseArea.isVisible();
    if (isVisible) {
      await collapseButton.click();
      await expect(responseArea).toBeHidden();
    }

    // メッセージを送信
    await chatWindowPage.sendMessage('テストメッセージ');
    
    // 送信ボタンが再度有効になることを確認
    const sendButton = page.locator('#send-button');
    await expect(sendButton).toBeEnabled();
    
    // 入力欄がクリアされることを確認
    const promptInput = page.locator('#prompt-input');
    await expect(promptInput).toHaveValue('');

    console.log('[Test] 折り畳み状態でのメッセージ送信テスト完了');
  });

  test('折り畳み状態が再読み込み後も保持される', async () => {
    console.log('[Test] 状態永続化テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    const page = chatWindowPage.getPage();
    const collapseButton = page.locator('#collapse-button');
    const responseArea = page.locator('#response-area');

    // 会話履歴を非表示にする
    await collapseButton.click();
    await expect(responseArea).toBeHidden();

    // ページをリロード
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // 折り畳み状態が保持されている
    await expect(responseArea).toBeHidden();
    
    // ボタンのアイコンも保持されている
    const buttonText = await collapseButton.textContent();
    expect(['▼', '＋'].includes(buttonText?.trim() || '')).toBeTruthy();

    console.log('[Test] 状態永続化テスト完了');
  });

  test('複数回のトグル操作が正しく動作する', async () => {
    console.log('[Test] 複数回トグルテストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    const page = chatWindowPage.getPage();
    const collapseButton = page.locator('#collapse-button');
    const responseArea = page.locator('#response-area');

    // 5回トグル操作を行う
    for (let i = 0; i < 5; i++) {
      await collapseButton.click();
      await new Promise(resolve => setTimeout(resolve, 200));

      const isVisible = await responseArea.isVisible();
      const buttonText = await collapseButton.textContent();

      if (isVisible) {
        expect(['▲', '－'].includes(buttonText?.trim() || '')).toBeTruthy();
      } else {
        expect(['▼', '＋'].includes(buttonText?.trim() || '')).toBeTruthy();
      }
    }

    console.log('[Test] 複数回トグルテスト完了');
  });

  test('折り畳み状態でも新しいメッセージが履歴に追加される', async () => {
    console.log('[Test] 非表示時のメッセージ追加テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    const page = chatWindowPage.getPage();
    const collapseButton = page.locator('#collapse-button');
    const responseArea = page.locator('#response-area');

    // 初期のメッセージ数を記録
    const initialMessageCount = await chatWindowPage.getMessageCount();

    // 会話履歴を非表示にする
    await collapseButton.click();
    await expect(responseArea).toBeHidden();

    // メッセージを送信
    await chatWindowPage.sendMessage('非表示中のメッセージ');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 会話履歴を再表示
    await collapseButton.click();
    await expect(responseArea).toBeVisible();

    // メッセージが追加されていることを確認
    const finalMessageCount = await chatWindowPage.getMessageCount();
    expect(finalMessageCount).toBeGreaterThan(initialMessageCount);

    console.log('[Test] 非表示時のメッセージ追加テスト完了');
  });
});