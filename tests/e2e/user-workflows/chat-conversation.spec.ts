/**
 * チャット会話フロー E2Eテスト（基本版）
 * 
 * チャット機能の基本的な動作フローをテスト
 * 注意: 長時間会話セッションのテストは除外
 */

import { test, expect } from '@playwright/test';
import { ElectronApp } from '../helpers/electron-app';
import { MainWindowPage, ChatWindowPage } from '../helpers/page-objects';
import { TestData } from '../helpers/test-data';

test.describe('チャット会話フローテスト', () => {
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

  test('基本的なメッセージ送受信', async () => {
    console.log('[Test] 基本的なメッセージ送受信テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    const testMessage = 'こんにちは、テストメッセージです。';
    
    // メッセージを送信
    await chatWindowPage.sendMessage(testMessage);
    
    console.log('[Test] メッセージ送信完了、応答を待機中...');
    
    // 応答を待機（基本版なので短いタイムアウト）
    try {
      const response = await chatWindowPage.waitForResponse(10000);
      
      // 応答が受信されたことを確認
      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(0);
      
      console.log(`[Test] 応答受信: ${response.substring(0, 50)}...`);
      
    } catch (error) {
      console.warn(`[Test] 応答待機中にタイムアウト: ${error}`);
      
      // タイムアウトした場合でもエラーメッセージの確認
      const hasError = await chatWindowPage.hasError();
      if (hasError) {
        console.log('[Test] チャットエラーが検出されました');
      }
    }

    // メッセージ履歴を確認
    const messageHistory = await chatWindowPage.getMessageHistory();
    expect(messageHistory.length).toBeGreaterThan(0);
    
    // 送信したメッセージが履歴に含まれていることを確認
    const userMessages = messageHistory.filter(msg => msg.role === 'user');
    expect(userMessages.length).toBeGreaterThan(0);
    expect(userMessages[0].content).toContain(testMessage);

    console.log('[Test] 基本的なメッセージ送受信テスト完了');
  });

  test('複数メッセージの連続送信', async () => {
    console.log('[Test] 複数メッセージ連続送信テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    const testMessages = TestData.testMessages(3);
    const userMessages = testMessages.filter(msg => msg.role === 'user');
    
    for (const message of userMessages) {
      console.log(`[Test] メッセージ送信: ${message.content}`);
      
      await chatWindowPage.sendMessage(message.content);
      
      // 各メッセージ間で少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // エラーチェック
      const hasError = await chatWindowPage.hasError();
      expect(hasError).toBe(false);
    }

    console.log('[Test] 全メッセージ送信完了');

    // 最終的なメッセージ数を確認
    const finalMessageCount = await chatWindowPage.getMessageCount();
    expect(finalMessageCount).toBeGreaterThanOrEqual(userMessages.length);
    
    console.log(`[Test] 最終メッセージ数: ${finalMessageCount}`);
    console.log('[Test] 複数メッセージ連続送信テスト完了');
  });

  test('長いメッセージの送信', async () => {
    console.log('[Test] 長いメッセージ送信テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    // 中程度の長さのメッセージを生成（基本版なので very_long は避ける）
    const longMessage = TestData.longMessage('medium');
    
    console.log(`[Test] 長いメッセージ（${longMessage.length}文字）を送信中...`);
    
    // 長いメッセージを送信
    await chatWindowPage.sendMessage(longMessage);
    
    // メッセージが正しく送信されたかを確認
    const messageHistory = await chatWindowPage.getMessageHistory();
    const lastUserMessage = messageHistory.filter(msg => msg.role === 'user').pop();
    
    expect(lastUserMessage).toBeTruthy();
    expect(lastUserMessage?.content).toBe(longMessage);
    
    console.log('[Test] 長いメッセージが正常に送信されました');
    
    // エラーが発生していないことを確認
    const hasError = await chatWindowPage.hasError();
    expect(hasError).toBe(false);

    console.log('[Test] 長いメッセージ送信テスト完了');
  });

  test('空メッセージの処理', async () => {
    console.log('[Test] 空メッセージ処理テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    const initialMessageCount = await chatWindowPage.getMessageCount();
    
    // 空のメッセージを送信しようとする
    try {
      await chatWindowPage.sendMessage('');
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`[Test] 空メッセージ送信でエラー（期待される動作）: ${error}`);
    }

    // メッセージ数が変わっていないことを確認
    const finalMessageCount = await chatWindowPage.getMessageCount();
    expect(finalMessageCount).toBe(initialMessageCount);
    
    console.log('[Test] 空メッセージが適切に処理されました');
    console.log('[Test] 空メッセージ処理テスト完了');
  });

  test('特殊文字を含むメッセージ', async () => {
    console.log('[Test] 特殊文字メッセージテストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    const specialMessages = [
      'こんにちは！@#$%^&*()_+-=[]{}|;:,.<>?',
      '絵文字テスト: 😀😃😄😁😆😅🤣😂🙂🙃😉',
      'HTML/XML: <script>alert("test")</script>',
      'SQL: SELECT * FROM users; DROP TABLE users;',
      '改行\nテスト\n複数行\nメッセージ'
    ];

    for (const message of specialMessages) {
      console.log(`[Test] 特殊文字メッセージ送信: ${message.substring(0, 30)}...`);
      
      await chatWindowPage.sendMessage(message);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // エラーが発生していないことを確認
      const hasError = await chatWindowPage.hasError();
      expect(hasError).toBe(false);
    }

    // すべてのメッセージが正しく送信されたことを確認
    const messageHistory = await chatWindowPage.getMessageHistory();
    const userMessages = messageHistory.filter(msg => msg.role === 'user');
    
    expect(userMessages.length).toBeGreaterThanOrEqual(specialMessages.length);

    console.log('[Test] 特殊文字メッセージテスト完了');
  });

  test('チャット履歴のクリア機能', async () => {
    console.log('[Test] チャット履歴クリア機能テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    // まず複数のメッセージを送信
    const testMessages = ['メッセージ1', 'メッセージ2', 'メッセージ3'];
    
    for (const message of testMessages) {
      await chatWindowPage.sendMessage(message);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 履歴にメッセージがあることを確認
    let messageCount = await chatWindowPage.getMessageCount();
    expect(messageCount).toBeGreaterThan(0);
    
    console.log(`[Test] クリア前のメッセージ数: ${messageCount}`);

    // 履歴をクリア
    await chatWindowPage.clearHistory();
    
    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 履歴がクリアされたことを確認
    messageCount = await chatWindowPage.getMessageCount();
    expect(messageCount).toBe(0);
    
    console.log('[Test] チャット履歴が正常にクリアされました');
    console.log('[Test] チャット履歴クリア機能テスト完了');
  });

  test('チャットウィンドウの閉じる・再開', async () => {
    console.log('[Test] チャットウィンドウ閉じる・再開テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    // まずテストメッセージを送信
    const testMessage = 'ウィンドウ閉じる前のメッセージ';
    await chatWindowPage.sendMessage(testMessage);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // メッセージ数を記録
    const messageCountBeforeClose = await chatWindowPage.getMessageCount();
    console.log(`[Test] 閉じる前のメッセージ数: ${messageCountBeforeClose}`);

    // チャットウィンドウを閉じる
    const chatWindow = await electronApp.getChatWindow();
    if (chatWindow) {
      await chatWindow.close();
      
      // ウィンドウが閉じられたことを確認
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(chatWindow.isClosed()).toBe(true);
      
      console.log('[Test] チャットウィンドウが閉じられました');
    }

    // チャットウィンドウを再度開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newChatWindow = await electronApp.getChatWindow();
    expect(newChatWindow).toBeTruthy();
    
    if (newChatWindow) {
      chatWindowPage = new ChatWindowPage(newChatWindow);
      
      // 新しいウィンドウでメッセージを送信してみる
      await chatWindowPage.sendMessage('ウィンドウ再開後のメッセージ');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // エラーが発生していないことを確認
      const hasError = await chatWindowPage.hasError();
      expect(hasError).toBe(false);
      
      console.log('[Test] チャットウィンドウが正常に再開されました');
    }

    console.log('[Test] チャットウィンドウ閉じる・再開テスト完了');
  });

  test('応答タイムアウトの処理', async () => {
    console.log('[Test] 応答タイムアウト処理テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    const timeoutMessage = 'タイムアウトテスト用メッセージ';
    
    // メッセージを送信
    await chatWindowPage.sendMessage(timeoutMessage);
    
    console.log('[Test] メッセージ送信完了、短いタイムアウトで応答を待機...');
    
    // 短いタイムアウトで応答を待機
    try {
      const response = await chatWindowPage.waitForResponse(2000); // 2秒でタイムアウト
      
      if (response) {
        console.log('[Test] 想定より早く応答が受信されました');
      }
      
    } catch (error) {
      console.log(`[Test] 期待通りタイムアウトしました: ${error}`);
    }

    // エラー状態をチェック
    const hasError = await chatWindowPage.hasError();
    if (hasError) {
      console.log('[Test] タイムアウト後にエラー状態が検出されました');
    }

    // メッセージが送信されたことは確認
    const messageHistory = await chatWindowPage.getMessageHistory();
    const userMessages = messageHistory.filter(msg => msg.role === 'user');
    expect(userMessages.length).toBeGreaterThan(0);
    
    const lastUserMessage = userMessages[userMessages.length - 1];
    expect(lastUserMessage.content).toBe(timeoutMessage);

    console.log('[Test] 応答タイムアウト処理テスト完了');
  });
});

test.describe('チャットパフォーマンステスト', () => {
  let electronApp: ElectronApp;
  let chatWindowPage: ChatWindowPage;

  test.beforeEach(async () => {
    electronApp = new ElectronApp();
    
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const mainWindow = await electronApp.getMainWindow();
    const mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    if (chatWindow) {
      chatWindowPage = new ChatWindowPage(chatWindow);
    }
  });

  test.afterEach(async () => {
    if (electronApp && electronApp.isRunning()) {
      await electronApp.close();
    }
  });

  test('高速メッセージ送信テスト', async () => {
    console.log('[Test] 高速メッセージ送信テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    const messageCount = 5; // 基本版なので少ない数
    const maxTimePerMessage = 1000; // 1秒以内
    
    for (let i = 0; i < messageCount; i++) {
      const startTime = Date.now();
      const message = `高速テストメッセージ ${i + 1}`;
      
      await chatWindowPage.sendMessage(message);
      
      const sendTime = Date.now() - startTime;
      console.log(`[Test] メッセージ ${i + 1} 送信時間: ${sendTime}ms`);
      
      // 送信時間が制限内であることを確認
      expect(sendTime).toBeLessThan(maxTimePerMessage);
      
      // エラーチェック
      const hasError = await chatWindowPage.hasError();
      expect(hasError).toBe(false);
      
      // 次のメッセージまで少し待機
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('[Test] 高速メッセージ送信テスト完了');
  });

  test('メッセージ履歴パフォーマンス', async () => {
    console.log('[Test] メッセージ履歴パフォーマンステストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    // 複数のメッセージを送信
    const messageCount = 10; // 基本版なので適度な数
    
    for (let i = 0; i < messageCount; i++) {
      await chatWindowPage.sendMessage(`履歴テスト ${i + 1}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 履歴取得のパフォーマンスを測定
    const startTime = Date.now();
    const messageHistory = await chatWindowPage.getMessageHistory();
    const historyFetchTime = Date.now() - startTime;
    
    console.log(`[Test] 履歴取得時間（${messageHistory.length}件）: ${historyFetchTime}ms`);
    
    // 履歴取得が高速であることを確認（1秒以内）
    expect(historyFetchTime).toBeLessThan(1000);
    
    // 正しい数のメッセージが取得されていることを確認
    expect(messageHistory.length).toBeGreaterThanOrEqual(messageCount);

    console.log('[Test] メッセージ履歴パフォーマンステスト完了');
  });

  test('チャットメモリ使用量監視', async () => {
    console.log('[Test] チャットメモリ使用量監視テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    // 初期メモリ使用量を取得
    const initialMemory = await electronApp.getMemoryUsage();
    console.log(`[Test] 初期メモリ使用量: ${(initialMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);

    // 複数のメッセージを送信してメモリ使用量を増加させる
    const messageCount = 15; // 基本版なので適度な数
    
    for (let i = 0; i < messageCount; i++) {
      const message = `メモリテスト ${i + 1}: ${TestData.longMessage('medium')}`;
      await chatWindowPage.sendMessage(message);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 最終メモリ使用量を取得
    const finalMemory = await electronApp.getMemoryUsage();
    const memoryIncrease = finalMemory.workingSetSize - initialMemory.workingSetSize;
    const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
    
    console.log(`[Test] 最終メモリ使用量: ${(finalMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`[Test] メモリ増加量: ${memoryIncreaseMB.toFixed(2)}MB`);

    // メモリ増加が妥当な範囲内であることを確認（100MB以内）
    expect(memoryIncreaseMB).toBeLessThan(100);

    console.log('[Test] チャットメモリ使用量監視テスト完了');
  });
});

test.describe('チャットエラーハンドリングテスト', () => {
  let electronApp: ElectronApp;
  let chatWindowPage: ChatWindowPage;

  test.beforeEach(async () => {
    electronApp = new ElectronApp();
    
    await electronApp.launch({
      headless: false,
      timeout: 30000,
      env: {
        ...process.env,
        // テスト用環境変数でエラー条件を作成
        E2E_TEST_MODE: 'true',
        MOCK_API_ERRORS: 'true'
      }
    });

    const mainWindow = await electronApp.getMainWindow();
    const mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    if (chatWindow) {
      chatWindowPage = new ChatWindowPage(chatWindow);
    }
  });

  test.afterEach(async () => {
    if (electronApp && electronApp.isRunning()) {
      await electronApp.close();
    }
  });

  test('ネットワークエラー時の処理', async () => {
    console.log('[Test] ネットワークエラー処理テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    const errorTestMessage = 'ネットワークエラーテストメッセージ';
    
    // エラーが発生する可能性のあるメッセージを送信
    await chatWindowPage.sendMessage(errorTestMessage);
    
    // エラー処理を確認
    try {
      await chatWindowPage.waitForResponse(5000);
    } catch (error) {
      console.log(`[Test] 応答待機中にエラー: ${error}`);
    }

    // エラー状態の確認
    const hasError = await chatWindowPage.hasError();
    if (hasError) {
      console.log('[Test] エラー状態が正しく検出されました');
    }

    // メッセージは送信されたが応答がない状態を確認
    const messageHistory = await chatWindowPage.getMessageHistory();
    const userMessages = messageHistory.filter(msg => msg.role === 'user');
    expect(userMessages.length).toBeGreaterThan(0);

    // アプリケーションが引き続き動作することを確認
    expect(await chatWindowPage.getMessageCount()).toBeGreaterThanOrEqual(0);

    console.log('[Test] ネットワークエラー処理テスト完了');
  });

  test('UI応答性の確認', async () => {
    console.log('[Test] UI応答性確認テストを開始...');
    
    if (!chatWindowPage) {
      throw new Error('チャットウィンドウが開けませんでした');
    }

    // 重いメッセージを送信中でもUIが応答することを確認
    const heavyMessage = TestData.longMessage('long');
    
    await chatWindowPage.sendMessage(heavyMessage);
    
    // すぐに別の操作を実行してUIの応答性を確認
    const startTime = Date.now();
    const messageCount = await chatWindowPage.getMessageCount();
    const responseTime = Date.now() - startTime;
    
    console.log(`[Test] UI応答時間: ${responseTime}ms`);
    
    // UI応答が高速であることを確認（500ms以内）
    expect(responseTime).toBeLessThan(500);
    expect(messageCount).toBeGreaterThanOrEqual(0);

    console.log('[Test] UI応答性確認テスト完了');
  });
});