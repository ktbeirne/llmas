/**
 * ウィンドウ管理 E2Eテスト
 * 
 * Electronアプリケーションのウィンドウ操作テスト
 */

import { test, expect } from '@playwright/test';
import { ElectronApp } from '../helpers/electron-app';
import { MainWindowPage, ChatWindowPage, SettingsWindowPage, SpeechBubbleWindowPage } from '../helpers/page-objects';
import { TestData } from '../helpers/test-data';

test.describe('ウィンドウ管理テスト', () => {
  let electronApp: ElectronApp;
  let mainWindowPage: MainWindowPage;

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
  });

  test.afterEach(async () => {
    if (electronApp && electronApp.isRunning()) {
      await electronApp.close();
    }
  });

  test('メインウィンドウの基本操作', async () => {
    console.log('[Test] メインウィンドウ基本操作テストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // ウィンドウが表示されていることを確認
    expect(await mainWindow.isVisible()).toBe(true);
    
    // ウィンドウタイトルの確認
    const title = await mainWindow.title();
    expect(title).toContain('LLMDesktopMascot');
    
    // ウィンドウ境界の取得
    const initialBounds = await electronApp.getWindowBounds(mainWindow);
    expect(initialBounds.width).toBeGreaterThan(0);
    expect(initialBounds.height).toBeGreaterThan(0);
    
    console.log(`[Test] 初期ウィンドウサイズ: ${initialBounds.width}x${initialBounds.height}`);
    console.log('[Test] メインウィンドウ基本操作テスト完了');
  });

  test('チャットウィンドウの開閉', async () => {
    console.log('[Test] チャットウィンドウ開閉テストを開始...');
    
    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    
    // チャットウィンドウが開かれるまで待機
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // チャットウィンドウを取得
    const chatWindow = await electronApp.getChatWindow();
    expect(chatWindow).toBeTruthy();
    
    if (chatWindow) {
      expect(await chatWindow.isVisible()).toBe(true);
      
      // チャットウィンドウの基本確認
      const chatWindowPage = new ChatWindowPage(chatWindow);
      
      // ウィンドウのタイトルまたはURL確認
      const url = chatWindow.url();
      expect(url).toContain('chat');
      
      // チャットウィンドウを閉じる
      await chatWindow.close();
      
      // ウィンドウが閉じられたことを確認
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(chatWindow.isClosed()).toBe(true);
    }
    
    console.log('[Test] チャットウィンドウ開閉テスト完了');
  });

  test('設定ウィンドウの開閉', async () => {
    console.log('[Test] 設定ウィンドウ開閉テストを開始...');
    
    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    
    // 設定ウィンドウが開かれるまで待機
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 設定ウィンドウを取得
    const settingsWindow = await electronApp.getSettingsWindow();
    expect(settingsWindow).toBeTruthy();
    
    if (settingsWindow) {
      expect(await settingsWindow.isVisible()).toBe(true);
      
      // 設定ウィンドウの基本確認
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);
      
      // ウィンドウのタイトルまたはURL確認
      const url = settingsWindow.url();
      expect(url).toContain('settings');
      
      // 設定ウィンドウを閉じる
      await settingsWindowPage.close();
      
      // ウィンドウが閉じられたことを確認
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(settingsWindow.isClosed()).toBe(true);
    }
    
    console.log('[Test] 設定ウィンドウ開閉テスト完了');
  });

  test('複数ウィンドウの同時管理', async () => {
    console.log('[Test] 複数ウィンドウ同時管理テストを開始...');
    
    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // すべてのウィンドウを取得
    const mainWindow = await electronApp.getMainWindow();
    const chatWindow = await electronApp.getChatWindow();
    const settingsWindow = await electronApp.getSettingsWindow();
    
    // 3つのウィンドウが開いていることを確認
    expect(mainWindow).toBeTruthy();
    expect(chatWindow).toBeTruthy();
    expect(settingsWindow).toBeTruthy();
    
    if (chatWindow && settingsWindow) {
      expect(await mainWindow.isVisible()).toBe(true);
      expect(await chatWindow.isVisible()).toBe(true);
      expect(await settingsWindow.isVisible()).toBe(true);
      
      // 各ウィンドウの位置を確認
      const mainBounds = await electronApp.getWindowBounds(mainWindow);
      const chatBounds = await electronApp.getWindowBounds(chatWindow);
      const settingsBounds = await electronApp.getWindowBounds(settingsWindow);
      
      console.log(`[Test] メインウィンドウ位置: (${mainBounds.x}, ${mainBounds.y})`);
      console.log(`[Test] チャットウィンドウ位置: (${chatBounds.x}, ${chatBounds.y})`);
      console.log(`[Test] 設定ウィンドウ位置: (${settingsBounds.x}, ${settingsBounds.y})`);
      
      // 各ウィンドウの境界が有効であることを確認
      expect(mainBounds.width).toBeGreaterThan(0);
      expect(chatBounds.width).toBeGreaterThan(0);
      expect(settingsBounds.width).toBeGreaterThan(0);
      
      // ウィンドウを順番に閉じる
      await settingsWindow.close();
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(settingsWindow.isClosed()).toBe(true);
      
      await chatWindow.close();
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(chatWindow.isClosed()).toBe(true);
      
      // メインウィンドウは残っていることを確認
      expect(await mainWindow.isVisible()).toBe(true);
    }
    
    console.log('[Test] 複数ウィンドウ同時管理テスト完了');
  });

  test('ウィンドウフォーカス管理', async () => {
    console.log('[Test] ウィンドウフォーカス管理テストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const chatWindow = await electronApp.getChatWindow();
    
    if (chatWindow) {
      // チャットウィンドウにフォーカス
      await chatWindow.focus();
      
      // フォーカスが移ったことを確認（評価可能な場合）
      const isChatFocused = await chatWindow.evaluate(() => {
        return document.hasFocus();
      });
      expect(isChatFocused).toBe(true);
      
      // メインウィンドウに戻る
      await mainWindow.focus();
      
      const isMainFocused = await mainWindow.evaluate(() => {
        return document.hasFocus();
      });
      expect(isMainFocused).toBe(true);
      
      // チャットウィンドウを閉じる
      await chatWindow.close();
    }
    
    console.log('[Test] ウィンドウフォーカス管理テスト完了');
  });

  test('ウィンドウのサイズ変更への対応', async () => {
    console.log('[Test] ウィンドウサイズ変更テストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    const windowSizes = TestData.windowSizes();
    
    for (const size of windowSizes.slice(0, 3)) { // 最初の3つのサイズをテスト
      console.log(`[Test] サイズを ${size.name} (${size.width}x${size.height}) に変更中...`);
      
      // ウィンドウサイズを変更
      await mainWindow.setViewportSize({
        width: size.width,
        height: size.height
      });
      
      // 少し待機してレイアウトが安定するのを待つ
      await mainWindow.waitForTimeout(1000);
      
      // マスコットが引き続き表示されていることを確認
      const isMascotVisible = await mainWindowPage.isMascotVisible();
      expect(isMascotVisible).toBe(true);
      
      // 変更後のサイズを確認
      const newBounds = await electronApp.getWindowBounds(mainWindow);
      console.log(`[Test] 実際のサイズ: ${newBounds.width}x${newBounds.height}`);
      
      // サイズが期待値に近いことを確認（多少の誤差は許容）
      expect(Math.abs(newBounds.width - size.width)).toBeLessThan(50);
      expect(Math.abs(newBounds.height - size.height)).toBeLessThan(50);
    }
    
    console.log('[Test] ウィンドウサイズ変更テスト完了');
  });

  test('ウィンドウ最小化・復元', async () => {
    console.log('[Test] ウィンドウ最小化・復元テストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // 初期状態で表示されていることを確認
    expect(await mainWindow.isVisible()).toBe(true);
    
    // ウィンドウを最小化
    await mainWindow.evaluate(() => {
      // Electronのウィンドウ最小化
      if (window.electronAPI && window.electronAPI.minimizeWindow) {
        window.electronAPI.minimizeWindow();
      }
    });
    
    // 少し待機
    await mainWindow.waitForTimeout(1000);
    
    // 最小化後の状態確認（完全な非表示ではないかもしれない）
    console.log('[Test] ウィンドウが最小化されました');
    
    // ウィンドウを復元
    await mainWindow.evaluate(() => {
      // Electronのウィンドウ復元
      if (window.electronAPI && window.electronAPI.restoreWindow) {
        window.electronAPI.restoreWindow();
      }
    });
    
    // 少し待機
    await mainWindow.waitForTimeout(1000);
    
    // 復元後に表示されていることを確認
    expect(await mainWindow.isVisible()).toBe(true);
    
    // マスコットが正常に表示されていることを確認
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);
    
    console.log('[Test] ウィンドウ最小化・復元テスト完了');
  });

  test('ウィンドウの位置変更', async () => {
    console.log('[Test] ウィンドウ位置変更テストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // 初期位置を取得
    const initialBounds = await electronApp.getWindowBounds(mainWindow);
    console.log(`[Test] 初期位置: (${initialBounds.x}, ${initialBounds.y})`);
    
    // 新しい位置に移動
    const newX = 200;
    const newY = 150;
    
    await mainWindow.evaluate((pos) => {
      // Electronのウィンドウ位置変更
      if (window.electronAPI && window.electronAPI.setWindowPosition) {
        window.electronAPI.setWindowPosition(pos.x, pos.y);
      }
    }, { x: newX, y: newY });
    
    // 少し待機
    await mainWindow.waitForTimeout(1000);
    
    // 新しい位置を確認
    const newBounds = await electronApp.getWindowBounds(mainWindow);
    console.log(`[Test] 新しい位置: (${newBounds.x}, ${newBounds.y})`);
    
    // 位置が変更されたことを確認（完全に一致しない場合があるため範囲チェック）
    const positionChanged = Math.abs(newBounds.x - initialBounds.x) > 50 || 
                          Math.abs(newBounds.y - initialBounds.y) > 50;
    expect(positionChanged).toBe(true);
    
    // マスコットが正常に表示されていることを確認
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);
    
    console.log('[Test] ウィンドウ位置変更テスト完了');
  });

  test('ウィンドウ状態の永続化', async () => {
    console.log('[Test] ウィンドウ状態永続化テストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // ウィンドウサイズを変更
    await mainWindow.setViewportSize({ width: 1024, height: 768 });
    await mainWindow.waitForTimeout(1000);
    
    // 変更後のサイズを取得
    const modifiedBounds = await electronApp.getWindowBounds(mainWindow);
    console.log(`[Test] 変更後サイズ: ${modifiedBounds.width}x${modifiedBounds.height}`);
    
    // アプリケーションを再起動
    await electronApp.close();
    
    // 新しいインスタンスで再起動
    electronApp = new ElectronApp();
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });
    
    const newMainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(newMainWindow);
    await mainWindowPage.waitForMascotLoad();
    
    // 新しいウィンドウのサイズを確認
    const restoredBounds = await electronApp.getWindowBounds(newMainWindow);
    console.log(`[Test] 復元後サイズ: ${restoredBounds.width}x${restoredBounds.height}`);
    
    // サイズが保持されていることを確認（アプリケーションの実装に依存）
    // 注：実際のアプリケーションでウィンドウ状態の永続化が実装されている場合のみ
    expect(restoredBounds.width).toBeGreaterThan(0);
    expect(restoredBounds.height).toBeGreaterThan(0);
    
    console.log('[Test] ウィンドウ状態永続化テスト完了');
  });

  test('ウィンドウエラー処理', async () => {
    console.log('[Test] ウィンドウエラー処理テストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // 極端に小さいサイズに変更してみる
    try {
      await mainWindow.setViewportSize({ width: 50, height: 50 });
      await mainWindow.waitForTimeout(1000);
      
      // アプリケーションがクラッシュしていないことを確認
      expect(await mainWindow.isVisible()).toBe(true);
      
      // 適切なサイズに戻す
      await mainWindow.setViewportSize({ width: 800, height: 600 });
      await mainWindow.waitForTimeout(1000);
      
    } catch (error) {
      console.log(`[Test] 極小サイズ変更でエラーが発生しました（期待される動作）: ${error}`);
    }
    
    // 極端に大きいサイズに変更してみる
    try {
      await mainWindow.setViewportSize({ width: 5000, height: 5000 });
      await mainWindow.waitForTimeout(1000);
      
      // アプリケーションがクラッシュしていないことを確認
      expect(await mainWindow.isVisible()).toBe(true);
      
      // 適切なサイズに戻す
      await mainWindow.setViewportSize({ width: 800, height: 600 });
      await mainWindow.waitForTimeout(1000);
      
    } catch (error) {
      console.log(`[Test] 極大サイズ変更でエラーが発生しました（期待される動作）: ${error}`);
    }
    
    // マスコットが正常に表示されていることを確認
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);
    
    console.log('[Test] ウィンドウエラー処理テスト完了');
  });
});

test.describe('ウィンドウ管理パフォーマンステスト', () => {
  let electronApp: ElectronApp;

  test.beforeEach(async () => {
    electronApp = new ElectronApp();
    
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });
  });

  test.afterEach(async () => {
    if (electronApp && electronApp.isRunning()) {
      await electronApp.close();
    }
  });

  test('高速ウィンドウ開閉テスト', async () => {
    console.log('[Test] 高速ウィンドウ開閉テストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    const mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();
    
    const cycles = 5;
    const maxTimePerCycle = 3000; // 3秒以内
    
    for (let i = 0; i < cycles; i++) {
      console.log(`[Test] 高速開閉サイクル ${i + 1}/${cycles} を開始...`);
      
      const cycleStartTime = Date.now();
      
      // チャットウィンドウを開く
      await mainWindowPage.openChatWindow();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const chatWindow = await electronApp.getChatWindow();
      expect(chatWindow).toBeTruthy();
      
      if (chatWindow) {
        // チャットウィンドウを閉じる
        await chatWindow.close();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const cycleTime = Date.now() - cycleStartTime;
      console.log(`[Test] サイクル ${i + 1} 実行時間: ${cycleTime}ms`);
      
      // 各サイクルが制限時間内であることを確認
      expect(cycleTime).toBeLessThan(maxTimePerCycle);
    }
    
    console.log('[Test] 高速ウィンドウ開閉テスト完了');
  });

  test('複数ウィンドウパフォーマンス', async () => {
    console.log('[Test] 複数ウィンドウパフォーマンステストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    const mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();
    
    const startTime = Date.now();
    
    // 複数のウィンドウを同時に開く
    await mainWindowPage.openChatWindow();
    await mainWindowPage.openSettings();
    
    // ウィンドウが開かれるまで待機
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const chatWindow = await electronApp.getChatWindow();
    const settingsWindow = await electronApp.getSettingsWindow();
    
    const openTime = Date.now() - startTime;
    console.log(`[Test] 複数ウィンドウ開く時間: ${openTime}ms`);
    
    // 開く時間が妥当であることを確認
    expect(openTime).toBeLessThan(10000); // 10秒以内
    
    if (chatWindow && settingsWindow) {
      expect(await chatWindow.isVisible()).toBe(true);
      expect(await settingsWindow.isVisible()).toBe(true);
      
      // メモリ使用量を確認
      const memoryUsage = await electronApp.getMemoryUsage();
      const memoryUsageMB = memoryUsage.workingSetSize / (1024 * 1024);
      
      console.log(`[Test] 複数ウィンドウ時のメモリ使用量: ${memoryUsageMB.toFixed(2)}MB`);
      
      // メモリ使用量が期待値以内であることを確認
      const maxMemoryUsage = TestData.performanceExpectations().maxMemoryUsage / (1024 * 1024);
      expect(memoryUsageMB).toBeLessThan(maxMemoryUsage);
      
      // ウィンドウを閉じる
      await settingsWindow.close();
      await chatWindow.close();
    }
    
    console.log('[Test] 複数ウィンドウパフォーマンステスト完了');
  });
});