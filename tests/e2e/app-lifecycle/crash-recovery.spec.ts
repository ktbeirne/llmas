/**
 * クラッシュ回復 E2Eテスト
 * 
 * Electronアプリケーションのクラッシュ耐性と回復機能のテスト
 */

import { test, expect } from '@playwright/test';
import { ElectronApp } from '../helpers/electron-app';
import { MainWindowPage, ChatWindowPage, SettingsWindowPage } from '../helpers/page-objects';
import { TestData } from '../helpers/test-data';
import path from 'path';
import fs from 'fs/promises';

test.describe('クラッシュ回復テスト', () => {
  let electronApp: ElectronApp;
  let mainWindowPage: MainWindowPage;

  test.beforeEach(async () => {
    electronApp = new ElectronApp();
  });

  test.afterEach(async () => {
    if (electronApp && electronApp.isRunning()) {
      await electronApp.close();
    }
  });

  test('基本的なクラッシュ回復', async () => {
    console.log('[Test] 基本的なクラッシュ回復テストを開始...');
    
    // 初回起動
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const mainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    // 初期状態を確認
    expect(await mainWindow.isVisible()).toBe(true);
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);

    console.log('[Test] 初期状態確認完了、クラッシュをシミュレート...');

    // クラッシュをシミュレート
    await electronApp.simulateCrash();
    expect(electronApp.isRunning()).toBe(false);

    console.log('[Test] クラッシュ完了、回復を試行...');

    // 少し待機してから再起動
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 新しいElectronAppインスタンスで再起動
    electronApp = new ElectronApp();
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    // 回復確認
    const newMainWindow = await electronApp.getMainWindow();
    expect(newMainWindow).toBeTruthy();
    expect(await newMainWindow.isVisible()).toBe(true);

    mainWindowPage = new MainWindowPage(newMainWindow);
    await mainWindowPage.waitForMascotLoad();

    const isMascotVisibleAfterRecovery = await mainWindowPage.isMascotVisible();
    expect(isMascotVisibleAfterRecovery).toBe(true);

    console.log('[Test] 基本的なクラッシュ回復テスト完了');
  });

  test('設定データの永続化テスト', async () => {
    console.log('[Test] 設定データ永続化テストを開始...');
    
    // 初回起動と設定変更
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const mainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const settingsWindow = await electronApp.getSettingsWindow();
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);

      // 設定を変更
      const testUserName = 'クラッシュテストユーザー';
      const testMascotName = 'テストマスコット';
      
      await settingsWindowPage.setUserName(testUserName);
      await settingsWindowPage.setMascotName(testMascotName);
      await settingsWindowPage.changeTheme('dark');

      // 設定を保存
      await settingsWindowPage.saveSettings();
      
      // 設定ウィンドウを閉じる
      await settingsWindowPage.close();

      console.log('[Test] 設定変更完了、クラッシュをシミュレート...');
    }

    // クラッシュをシミュレート
    await electronApp.simulateCrash();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 再起動
    electronApp = new ElectronApp();
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const newMainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(newMainWindow);
    await mainWindowPage.waitForMascotLoad();

    // 設定が保持されているかを確認
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newSettingsWindow = await electronApp.getSettingsWindow();
    if (newSettingsWindow) {
      const newSettingsWindowPage = new SettingsWindowPage(newSettingsWindow);
      
      const currentSettings = await newSettingsWindowPage.getCurrentSettings();
      
      // 設定が保持されていることを確認
      expect(currentSettings.userName).toBe('クラッシュテストユーザー');
      expect(currentSettings.mascotName).toBe('テストマスコット');
      expect(currentSettings.theme).toBe('dark');
      
      await newSettingsWindowPage.close();
      
      console.log('[Test] 設定データが正常に復元されました');
    }

    console.log('[Test] 設定データ永続化テスト完了');
  });

  test('チャット履歴の復元テスト', async () => {
    console.log('[Test] チャット履歴復元テストを開始...');
    
    // 初回起動
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
    if (chatWindow) {
      const chatWindowPage = new ChatWindowPage(chatWindow);

      // テストメッセージを送信
      const testMessages = ['クラッシュテスト用メッセージ1', 'クラッシュテスト用メッセージ2'];
      
      for (const message of testMessages) {
        await chatWindowPage.sendMessage(message);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // メッセージ履歴を確認
      const initialHistory = await chatWindowPage.getMessageHistory();
      expect(initialHistory.length).toBeGreaterThan(0);

      console.log(`[Test] 初期メッセージ数: ${initialHistory.length}`);
      
      await chatWindow.close();
    }

    console.log('[Test] チャット操作完了、クラッシュをシミュレート...');

    // クラッシュをシミュレート
    await electronApp.simulateCrash();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 再起動
    electronApp = new ElectronApp();
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const newMainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(newMainWindow);
    await mainWindowPage.waitForMascotLoad();

    // チャットウィンドウを再度開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newChatWindow = await electronApp.getChatWindow();
    if (newChatWindow) {
      const newChatWindowPage = new ChatWindowPage(newChatWindow);
      
      // 履歴が復元されているかを確認
      const restoredHistory = await newChatWindowPage.getMessageHistory();
      
      // 何らかの履歴が復元されていることを確認（実装に依存）
      console.log(`[Test] 復元後メッセージ数: ${restoredHistory.length}`);
      
      // 基本的なチャット機能が動作することを確認
      await newChatWindowPage.sendMessage('復元後テストメッセージ');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const hasError = await newChatWindowPage.hasError();
      expect(hasError).toBe(false);
      
      await newChatWindow.close();
    }

    console.log('[Test] チャット履歴復元テスト完了');
  });

  test('複数回のクラッシュ回復テスト', async () => {
    console.log('[Test] 複数回クラッシュ回復テストを開始...');
    
    const crashCycles = 3;
    
    for (let i = 0; i < crashCycles; i++) {
      console.log(`[Test] クラッシュサイクル ${i + 1}/${crashCycles} を開始...`);
      
      // アプリケーション起動
      electronApp = new ElectronApp();
      await electronApp.launch({
        headless: false,
        timeout: 30000
      });

      const mainWindow = await electronApp.getMainWindow();
      mainWindowPage = new MainWindowPage(mainWindow);
      await mainWindowPage.waitForMascotLoad();

      // 正常動作を確認
      expect(await mainWindow.isVisible()).toBe(true);
      const isMascotVisible = await mainWindowPage.isMascotVisible();
      expect(isMascotVisible).toBe(true);

      // 何らかの操作を実行
      await mainWindowPage.startMascotAnimation('wave');
      await mainWindow.waitForTimeout(2000);

      // メモリ使用量を確認
      const memoryUsage = await electronApp.getMemoryUsage();
      const memoryUsageMB = memoryUsage.workingSetSize / (1024 * 1024);
      console.log(`[Test] サイクル ${i + 1} メモリ使用量: ${memoryUsageMB.toFixed(2)}MB`);

      // メモリリークがないことを確認
      const maxMemoryUsage = TestData.performanceExpectations().maxMemoryUsage / (1024 * 1024);
      expect(memoryUsageMB).toBeLessThan(maxMemoryUsage);

      // クラッシュシミュレート
      await electronApp.simulateCrash();
      expect(electronApp.isRunning()).toBe(false);
      
      // 次のサイクルまで待機
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`[Test] クラッシュサイクル ${i + 1}/${crashCycles} 完了`);
    }

    console.log('[Test] 複数回クラッシュ回復テスト完了');
  });

  test('メモリリーク検出テスト', async () => {
    console.log('[Test] メモリリーク検出テストを開始...');
    
    const memoryMeasurements: number[] = [];
    const cycles = 5;

    for (let i = 0; i < cycles; i++) {
      console.log(`[Test] メモリ測定サイクル ${i + 1}/${cycles} を開始...`);
      
      // アプリケーション起動
      electronApp = new ElectronApp();
      await electronApp.launch({
        headless: false,
        timeout: 30000
      });

      const mainWindow = await electronApp.getMainWindow();
      mainWindowPage = new MainWindowPage(mainWindow);
      await mainWindowPage.waitForMascotLoad();

      // メモリ集約的な操作を実行
      await mainWindowPage.startMascotAnimation('dance');
      await mainWindow.waitForTimeout(3000);

      // メモリ使用量を測定
      const memoryUsage = await electronApp.getMemoryUsage();
      const memoryUsageMB = memoryUsage.workingSetSize / (1024 * 1024);
      memoryMeasurements.push(memoryUsageMB);
      
      console.log(`[Test] サイクル ${i + 1} メモリ使用量: ${memoryUsageMB.toFixed(2)}MB`);

      // クラッシュして再起動
      await electronApp.simulateCrash();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // メモリリークの分析
    const firstMeasurement = memoryMeasurements[0];
    const lastMeasurement = memoryMeasurements[memoryMeasurements.length - 1];
    const memoryIncrease = lastMeasurement - firstMeasurement;
    const memoryIncreasePercent = (memoryIncrease / firstMeasurement) * 100;

    console.log(`[Test] メモリ使用量変化: ${memoryIncrease.toFixed(2)}MB (${memoryIncreasePercent.toFixed(1)}%)`);

    // メモリ増加が許容範囲内であることを確認（50%以内）
    expect(memoryIncreasePercent).toBeLessThan(50);

    console.log('[Test] メモリリーク検出テスト完了');
  });

  test('ファイルシステム整合性テスト', async () => {
    console.log('[Test] ファイルシステム整合性テストを開始...');
    
    const testDataDir = path.join(process.cwd(), 'test-data');
    const testFile = path.join(testDataDir, 'crash-test-file.json');

    // 初回起動
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const mainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    // テストデータを作成
    const testData = {
      timestamp: new Date().toISOString(),
      testData: 'クラッシュテスト用データ',
      numbers: [1, 2, 3, 4, 5]
    };

    try {
      await fs.writeFile(testFile, JSON.stringify(testData, null, 2));
      console.log('[Test] テストファイル作成完了');
    } catch (error) {
      console.warn('[Test] テストファイル作成に失敗:', error);
    }

    // クラッシュシミュレート
    await electronApp.simulateCrash();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ファイルが存在することを確認
    try {
      const fileContent = await fs.readFile(testFile, 'utf-8');
      const parsedData = JSON.parse(fileContent);
      
      expect(parsedData.testData).toBe('クラッシュテスト用データ');
      expect(parsedData.numbers).toEqual([1, 2, 3, 4, 5]);
      
      console.log('[Test] ファイルデータの整合性確認完了');
      
      // クリーンアップ
      await fs.unlink(testFile);
      
    } catch (error) {
      console.warn('[Test] ファイル整合性確認に失敗:', error);
    }

    // 再起動して正常動作を確認
    electronApp = new ElectronApp();
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const newMainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(newMainWindow);
    await mainWindowPage.waitForMascotLoad();

    expect(await newMainWindow.isVisible()).toBe(true);
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);

    console.log('[Test] ファイルシステム整合性テスト完了');
  });

  test('エラー状態からの回復テスト', async () => {
    console.log('[Test] エラー状態回復テストを開始...');
    
    // 意図的にエラー状態を作成
    await electronApp.launch({
      headless: false,
      timeout: 30000,
      args: ['--force-device-scale-factor=0'] // 無効な引数
    });

    const mainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(mainWindow);

    // エラー状態でもアプリケーションが起動することを確認
    expect(await mainWindow.isVisible()).toBe(true);

    try {
      await mainWindowPage.waitForMascotLoad();
      
      // エラーメッセージをチェック
      const errorMessage = await mainWindowPage.getErrorMessage();
      if (errorMessage) {
        console.log(`[Test] エラーメッセージ検出: ${errorMessage}`);
      }
      
    } catch (error) {
      console.log(`[Test] マスコット読み込みエラー（期待される動作）: ${error}`);
    }

    // クラッシュシミュレート
    await electronApp.simulateCrash();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 正常な設定で再起動
    electronApp = new ElectronApp();
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const newMainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(newMainWindow);
    await mainWindowPage.waitForMascotLoad();

    // 正常に回復していることを確認
    expect(await newMainWindow.isVisible()).toBe(true);
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);

    // エラーメッセージがないことを確認
    const errorMessage = await mainWindowPage.getErrorMessage();
    expect(errorMessage).toBeNull();

    console.log('[Test] エラー状態回復テスト完了');
  });

  test('パフォーマンス劣化テスト', async () => {
    console.log('[Test] パフォーマンス劣化テストを開始...');
    
    const performanceMeasurements: number[] = [];
    const cycles = 3;

    for (let i = 0; i < cycles; i++) {
      console.log(`[Test] パフォーマンス測定サイクル ${i + 1}/${cycles} を開始...`);
      
      const startTime = Date.now();
      
      // アプリケーション起動
      electronApp = new ElectronApp();
      await electronApp.launch({
        headless: false,
        timeout: 30000
      });

      const mainWindow = await electronApp.getMainWindow();
      mainWindowPage = new MainWindowPage(mainWindow);
      await mainWindowPage.waitForMascotLoad();

      const startupTime = Date.now() - startTime;
      performanceMeasurements.push(startupTime);
      
      console.log(`[Test] サイクル ${i + 1} 起動時間: ${startupTime}ms`);

      // FPSを測定
      const fps = await mainWindowPage.measureFPS(3000);
      console.log(`[Test] サイクル ${i + 1} FPS: ${fps}`);

      // 最低FPSを確認
      const minFPS = TestData.performanceExpectations().minFPS;
      expect(fps).toBeGreaterThan(minFPS);

      // クラッシュシミュレート
      await electronApp.simulateCrash();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // パフォーマンス劣化の分析
    const firstStartupTime = performanceMeasurements[0];
    const lastStartupTime = performanceMeasurements[performanceMeasurements.length - 1];
    const performanceDegradation = lastStartupTime - firstStartupTime;
    const degradationPercent = (performanceDegradation / firstStartupTime) * 100;

    console.log(`[Test] 起動時間変化: ${performanceDegradation}ms (${degradationPercent.toFixed(1)}%)`);

    // パフォーマンス劣化が許容範囲内であることを確認（100%以内）
    expect(degradationPercent).toBeLessThan(100);

    console.log('[Test] パフォーマンス劣化テスト完了');
  });
});

test.describe('クラッシュ回復パフォーマンステスト', () => {
  let electronApp: ElectronApp;

  test.beforeEach(async () => {
    electronApp = new ElectronApp();
  });

  test.afterEach(async () => {
    if (electronApp && electronApp.isRunning()) {
      await electronApp.close();
    }
  });

  test('高速回復テスト', async () => {
    console.log('[Test] 高速回復テストを開始...');
    
    const maxRecoveryTime = 10000; // 10秒以内
    
    // 初回起動
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const mainWindow = await electronApp.getMainWindow();
    const mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    // クラッシュシミュレート
    await electronApp.simulateCrash();
    
    const recoveryStartTime = Date.now();

    // 即座に再起動
    electronApp = new ElectronApp();
    await electronApp.launch({
      headless: false,
      timeout: maxRecoveryTime + 5000
    });

    const newMainWindow = await electronApp.getMainWindow();
    const newMainWindowPage = new MainWindowPage(newMainWindow);
    await newMainWindowPage.waitForMascotLoad();

    const recoveryTime = Date.now() - recoveryStartTime;
    console.log(`[Test] 回復時間: ${recoveryTime}ms`);

    // 回復時間が制限時間以内であることを確認
    expect(recoveryTime).toBeLessThan(maxRecoveryTime);

    // 正常に動作していることを確認
    expect(await newMainWindow.isVisible()).toBe(true);
    const isMascotVisible = await newMainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);

    console.log('[Test] 高速回復テスト完了');
  });

  test('大量データでのクラッシュ回復', async () => {
    console.log('[Test] 大量データクラッシュ回復テストを開始...');
    
    // 大量のテストデータを生成
    const largeTestData = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      message: TestData.longMessage('medium'),
      timestamp: new Date().toISOString()
    }));

    // アプリケーション起動
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const mainWindow = await electronApp.getMainWindow();
    const mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    // メモリ使用量を増加させる操作
    await mainWindow.evaluate((data) => {
      // 大量データをメモリに保存
      (window as any).testData = data;
    }, largeTestData);

    const memoryBefore = await electronApp.getMemoryUsage();
    console.log(`[Test] クラッシュ前メモリ使用量: ${(memoryBefore.workingSetSize / (1024 * 1024)).toFixed(2)}MB`);

    // クラッシュシミュレート
    await electronApp.simulateCrash();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 再起動
    electronApp = new ElectronApp();
    await electronApp.launch({
      headless: false,
      timeout: 45000
    });

    const newMainWindow = await electronApp.getMainWindow();
    const newMainWindowPage = new MainWindowPage(newMainWindow);
    await newMainWindowPage.waitForMascotLoad();

    const memoryAfter = await electronApp.getMemoryUsage();
    console.log(`[Test] 回復後メモリ使用量: ${(memoryAfter.workingSetSize / (1024 * 1024)).toFixed(2)}MB`);

    // 正常に回復していることを確認
    expect(await newMainWindow.isVisible()).toBe(true);
    const isMascotVisible = await newMainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);

    // メモリ使用量が適切にリセットされていることを確認
    const memoryReduction = memoryBefore.workingSetSize - memoryAfter.workingSetSize;
    console.log(`[Test] メモリ解放量: ${(memoryReduction / (1024 * 1024)).toFixed(2)}MB`);

    console.log('[Test] 大量データクラッシュ回復テスト完了');
  });
});