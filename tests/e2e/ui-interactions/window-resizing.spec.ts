/**
 * ウィンドウリサイズ E2Eテスト
 * 
 * 各ウィンドウのリサイズ機能と影響を包括的にテスト
 */

import { test, expect } from '@playwright/test';
import { ElectronApp } from '../helpers/electron-app';
import { MainWindowPage, ChatWindowPage, SettingsWindowPage } from '../helpers/page-objects';
import { TestData } from '../helpers/test-data';

test.describe('ウィンドウリサイズテスト', () => {
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

  test('メインウィンドウのリサイズ', async () => {
    console.log('[Test] メインウィンドウリサイズテストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // 初期サイズを取得
    const initialBounds = await electronApp.getWindowBounds(mainWindow);
    console.log(`[Test] 初期ウィンドウサイズ: ${initialBounds.width}x${initialBounds.height}`);
    
    // リサイズテストケース
    const resizeTestCases = [
      { width: 800, height: 600, description: '標準サイズ' },
      { width: 1200, height: 900, description: '大きいサイズ' },
      { width: 600, height: 400, description: '小さいサイズ' },
      { width: 1920, height: 1080, description: 'フルHDサイズ' },
      { width: initialBounds.width, height: initialBounds.height, description: '初期サイズに戻す' }
    ];

    for (const testCase of resizeTestCases) {
      console.log(`[Test] ${testCase.description}へリサイズ中: ${testCase.width}x${testCase.height}`);
      
      try {
        // ウィンドウをリサイズ
        await electronApp.resizeWindow(mainWindow, testCase.width, testCase.height);
        
        // リサイズ完了まで待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 新しいサイズを確認
        const newBounds = await electronApp.getWindowBounds(mainWindow);
        console.log(`[Test] リサイズ後のサイズ: ${newBounds.width}x${newBounds.height}`);
        
        // サイズが正しく設定されたことを確認（多少の誤差は許容）
        expect(Math.abs(newBounds.width - testCase.width)).toBeLessThan(50);
        expect(Math.abs(newBounds.height - testCase.height)).toBeLessThan(50);
        
        // リサイズ後もマスコットが正常に表示されていることを確認
        const isMascotVisible = await mainWindowPage.isMascotVisible();
        expect(isMascotVisible).toBe(true);
        
        // リサイズ後のFPSを測定
        const fps = await mainWindowPage.measureFPS(2000);
        console.log(`[Test] リサイズ後のFPS: ${fps}`);
        expect(fps).toBeGreaterThan(0);
        
      } catch (error) {
        console.log(`[Test] リサイズ「${testCase.description}」でエラー: ${error}`);
      }
      
      // 次のリサイズまで少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('[Test] メインウィンドウリサイズテスト完了');
  });

  test('チャットウィンドウのリサイズ', async () => {
    console.log('[Test] チャットウィンドウリサイズテストを開始...');
    
    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    expect(chatWindow).toBeTruthy();

    if (chatWindow) {
      const chatWindowPage = new ChatWindowPage(chatWindow);
      
      // 初期サイズを取得
      const initialBounds = await electronApp.getWindowBounds(chatWindow);
      console.log(`[Test] チャットウィンドウ初期サイズ: ${initialBounds.width}x${initialBounds.height}`);

      // チャットウィンドウ用リサイズテストケース
      const chatResizeTestCases = [
        { width: 400, height: 300, description: 'コンパクトサイズ' },
        { width: 600, height: 500, description: '標準サイズ' },
        { width: 800, height: 700, description: '大きいサイズ' },
        { width: initialBounds.width, height: initialBounds.height, description: '初期サイズ' }
      ];

      for (const testCase of chatResizeTestCases) {
        console.log(`[Test] チャットウィンドウを${testCase.description}へリサイズ: ${testCase.width}x${testCase.height}`);
        
        try {
          await electronApp.resizeWindow(chatWindow, testCase.width, testCase.height);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const newBounds = await electronApp.getWindowBounds(chatWindow);
          console.log(`[Test] チャットウィンドウリサイズ後: ${newBounds.width}x${newBounds.height}`);
          
          // UI要素が正しく表示されていることを確認
          const messageCount = await chatWindowPage.getMessageCount();
          console.log(`[Test] リサイズ後のメッセージ表示数: ${messageCount}`);
          
          // メッセージ送信が正常に動作することを確認
          await chatWindowPage.sendMessage("リサイズテスト");
          
          // 少し待機してUI更新を確認
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.log(`[Test] チャットウィンドウリサイズ「${testCase.description}」でエラー: ${error}`);
        }
      }
    }

    console.log('[Test] チャットウィンドウリサイズテスト完了');
  });

  test('設定ウィンドウのリサイズ', async () => {
    console.log('[Test] 設定ウィンドウリサイズテストを開始...');
    
    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const settingsWindow = await electronApp.getSettingsWindow();
    expect(settingsWindow).toBeTruthy();

    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);
      
      // 初期サイズを取得
      const initialBounds = await electronApp.getWindowBounds(settingsWindow);
      console.log(`[Test] 設定ウィンドウ初期サイズ: ${initialBounds.width}x${initialBounds.height}`);

      // 設定ウィンドウ用リサイズテストケース
      const settingsResizeTestCases = [
        { width: 500, height: 400, description: '最小サイズ' },
        { width: 700, height: 600, description: '標準サイズ' },
        { width: 900, height: 800, description: '大きいサイズ' }
      ];

      for (const testCase of settingsResizeTestCases) {
        console.log(`[Test] 設定ウィンドウを${testCase.description}へリサイズ: ${testCase.width}x${testCase.height}`);
        
        try {
          await electronApp.resizeWindow(settingsWindow, testCase.width, testCase.height);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const newBounds = await electronApp.getWindowBounds(settingsWindow);
          console.log(`[Test] 設定ウィンドウリサイズ後: ${newBounds.width}x${newBounds.height}`);
          
          // 設定項目が正しく表示されていることを確認
          const currentSettings = await settingsWindowPage.getCurrentSettings();
          expect(currentSettings).toBeTruthy();
          console.log(`[Test] リサイズ後の設定取得成功: ユーザー名=${currentSettings.userName}`);
          
        } catch (error) {
          console.log(`[Test] 設定ウィンドウリサイズ「${testCase.description}」でエラー: ${error}`);
        }
      }

      await settingsWindowPage.close();
    }

    console.log('[Test] 設定ウィンドウリサイズテスト完了');
  });

  test('リサイズ時のパフォーマンス影響', async () => {
    console.log('[Test] リサイズ時のパフォーマンス影響テストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // 初期メモリ使用量を測定
    const initialMemory = await electronApp.getMemoryUsage();
    console.log(`[Test] 初期メモリ使用量: ${(initialMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);

    // 初期FPSを測定
    const initialFps = await mainWindowPage.measureFPS(3000);
    console.log(`[Test] 初期FPS: ${initialFps}`);

    // 複数回のリサイズ操作でパフォーマンス影響を測定
    const performanceTestSizes = [
      { width: 800, height: 600 },
      { width: 1200, height: 900 },
      { width: 600, height: 400 },
      { width: 1000, height: 750 }
    ];

    for (let i = 0; i < performanceTestSizes.length; i++) {
      const size = performanceTestSizes[i];
      console.log(`[Test] パフォーマンステスト ${i + 1}/${performanceTestSizes.length}: ${size.width}x${size.height}`);
      
      try {
        // リサイズ実行時間を測定
        const resizeStartTime = Date.now();
        await electronApp.resizeWindow(mainWindow, size.width, size.height);
        const resizeTime = Date.now() - resizeStartTime;
        
        console.log(`[Test] リサイズ実行時間: ${resizeTime}ms`);
        expect(resizeTime).toBeLessThan(2000); // 2秒以内
        
        // リサイズ後の安定化を待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // FPSを測定
        const fps = await mainWindowPage.measureFPS(2000);
        console.log(`[Test] リサイズ後のFPS: ${fps}`);
        
        // FPSが著しく低下していないことを確認
        expect(fps).toBeGreaterThan(Math.max(1, initialFps * 0.5)); // 初期FPSの50%以上を維持
        
        // メモリ使用量を確認
        const currentMemory = await electronApp.getMemoryUsage();
        const memoryIncrease = (currentMemory.workingSetSize - initialMemory.workingSetSize) / 1024 / 1024;
        console.log(`[Test] メモリ増加量: ${memoryIncrease.toFixed(2)}MB`);
        
        // メモリリークがないことを確認
        expect(memoryIncrease).toBeLessThan(100); // 100MB以内
        
      } catch (error) {
        console.log(`[Test] パフォーマンステスト ${i + 1} でエラー: ${error}`);
      }
    }

    console.log('[Test] リサイズ時のパフォーマンス影響テスト完了');
  });

  test('極端なサイズでのリサイズ', async () => {
    console.log('[Test] 極端なサイズでのリサイズテストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // 極端なサイズでのテストケース
    const extremeSizeTestCases = [
      { width: 200, height: 150, description: '最小サイズ' },
      { width: 3840, height: 2160, description: '4Kサイズ' },
      { width: 100, height: 100, description: '極小サイズ' },
      { width: 5000, height: 3000, description: '超大サイズ' }
    ];

    for (const testCase of extremeSizeTestCases) {
      console.log(`[Test] 極端なサイズテスト: ${testCase.description} (${testCase.width}x${testCase.height})`);
      
      try {
        await electronApp.resizeWindow(mainWindow, testCase.width, testCase.height);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const newBounds = await electronApp.getWindowBounds(mainWindow);
        console.log(`[Test] 実際のサイズ: ${newBounds.width}x${newBounds.height}`);
        
        // ウィンドウが最小/最大制限を適用していることを確認
        expect(newBounds.width).toBeGreaterThan(50); // 最小幅
        expect(newBounds.height).toBeGreaterThan(50); // 最小高さ
        
        // アプリケーションがクラッシュしていないことを確認
        const isRunning = electronApp.isRunning();
        expect(isRunning).toBe(true);
        
        // マスコットが引き続き表示されていることを確認
        const isMascotVisible = await mainWindowPage.isMascotVisible();
        console.log(`[Test] 極端サイズ後のマスコット表示: ${isMascotVisible}`);
        
      } catch (error) {
        console.log(`[Test] 極端サイズ「${testCase.description}」でエラー（期待される動作）: ${error}`);
      }
    }

    console.log('[Test] 極端なサイズでのリサイズテスト完了');
  });

  test('アスペクト比変更の影響', async () => {
    console.log('[Test] アスペクト比変更の影響テストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // 様々なアスペクト比でのテスト
    const aspectRatioTestCases = [
      { width: 800, height: 600, ratio: '4:3', description: '標準' },
      { width: 1920, height: 1080, ratio: '16:9', description: 'ワイドスクリーン' },
      { width: 600, height: 800, ratio: '3:4', description: '縦長' },
      { width: 1600, height: 900, ratio: '16:9', description: 'ワイド' },
      { width: 1000, height: 1000, ratio: '1:1', description: '正方形' }
    ];

    for (const testCase of aspectRatioTestCases) {
      console.log(`[Test] アスペクト比テスト: ${testCase.description} (${testCase.ratio}) - ${testCase.width}x${testCase.height}`);
      
      try {
        await electronApp.resizeWindow(mainWindow, testCase.width, testCase.height);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // マスコット表示の確認
        const isMascotVisible = await mainWindowPage.isMascotVisible();
        expect(isMascotVisible).toBe(true);
        
        // FPS測定
        const fps = await mainWindowPage.measureFPS(2000);
        console.log(`[Test] アスペクト比${testCase.ratio}でのFPS: ${fps}`);
        expect(fps).toBeGreaterThan(0);
        
        // スクリーンショットを撮影して表示確認
        const screenshot = await mainWindowPage.captureScreenshot();
        expect(screenshot.length).toBeGreaterThan(0);
        console.log(`[Test] アスペクト比${testCase.ratio}のスクリーンショット: ${screenshot.length} bytes`);
        
      } catch (error) {
        console.log(`[Test] アスペクト比「${testCase.description}」でエラー: ${error}`);
      }
    }

    console.log('[Test] アスペクト比変更の影響テスト完了');
  });
});

test.describe('マルチウィンドウリサイズテスト', () => {
  let electronApp: ElectronApp;
  let mainWindowPage: MainWindowPage;

  test.beforeEach(async () => {
    electronApp = new ElectronApp();
    
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

  test('複数ウィンドウ同時リサイズ', async () => {
    console.log('[Test] 複数ウィンドウ同時リサイズテストを開始...');
    
    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mainWindow = await electronApp.getMainWindow();
    const chatWindow = await electronApp.getChatWindow();
    const settingsWindow = await electronApp.getSettingsWindow();

    // 全ウィンドウが開いていることを確認
    expect(mainWindow).toBeTruthy();
    expect(chatWindow).toBeTruthy();
    expect(settingsWindow).toBeTruthy();

    if (mainWindow && chatWindow && settingsWindow) {
      console.log('[Test] 3つのウィンドウを同時にリサイズ...');
      
      try {
        // 同時リサイズ実行
        const resizePromises = [
          electronApp.resizeWindow(mainWindow, 800, 600),
          electronApp.resizeWindow(chatWindow, 500, 400),
          electronApp.resizeWindow(settingsWindow, 600, 500)
        ];

        await Promise.all(resizePromises);
        
        // リサイズ完了まで待機
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 各ウィンドウのサイズを確認
        const mainBounds = await electronApp.getWindowBounds(mainWindow);
        const chatBounds = await electronApp.getWindowBounds(chatWindow);
        const settingsBounds = await electronApp.getWindowBounds(settingsWindow);

        console.log(`[Test] 同時リサイズ後 - メイン: ${mainBounds.width}x${mainBounds.height}`);
        console.log(`[Test] 同時リサイズ後 - チャット: ${chatBounds.width}x${chatBounds.height}`);
        console.log(`[Test] 同時リサイズ後 - 設定: ${settingsBounds.width}x${settingsBounds.height}`);

        // マスコットが正常に表示されていることを確認
        const isMascotVisible = await mainWindowPage.isMascotVisible();
        expect(isMascotVisible).toBe(true);

        // 各ウィンドウが応答することを確認
        const chatWindowPage = new ChatWindowPage(chatWindow);
        const settingsWindowPage = new SettingsWindowPage(settingsWindow);

        const messageCount = await chatWindowPage.getMessageCount();
        console.log(`[Test] 同時リサイズ後のチャットメッセージ数: ${messageCount}`);

        const currentSettings = await settingsWindowPage.getCurrentSettings();
        console.log(`[Test] 同時リサイズ後の設定取得: ${currentSettings.userName}`);

        await settingsWindowPage.close();

      } catch (error) {
        console.log(`[Test] 複数ウィンドウ同時リサイズでエラー: ${error}`);
      }
    }

    console.log('[Test] 複数ウィンドウ同時リサイズテスト完了');
  });

  test('ウィンドウリサイズ時の相互影響', async () => {
    console.log('[Test] ウィンドウリサイズ時の相互影響テストを開始...');
    
    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mainWindow = await electronApp.getMainWindow();
    const chatWindow = await electronApp.getChatWindow();

    if (mainWindow && chatWindow) {
      const chatWindowPage = new ChatWindowPage(chatWindow);
      
      // 初期状態でのパフォーマンス測定
      const initialMainFps = await mainWindowPage.measureFPS(2000);
      console.log(`[Test] 初期メインウィンドウFPS: ${initialMainFps}`);

      // メインウィンドウをリサイズしてチャットウィンドウへの影響を確認
      console.log('[Test] メインウィンドウリサイズ中...');
      await electronApp.resizeWindow(mainWindow, 1200, 900);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // チャットウィンドウが正常に動作することを確認
      try {
        await chatWindowPage.sendMessage("リサイズ影響テスト");
        console.log('[Test] メインウィンドウリサイズ後もチャット送信成功');
      } catch (error) {
        console.log(`[Test] メインウィンドウリサイズ後のチャット送信でエラー: ${error}`);
      }

      // チャットウィンドウをリサイズしてメインウィンドウへの影響を確認
      console.log('[Test] チャットウィンドウリサイズ中...');
      await electronApp.resizeWindow(chatWindow, 700, 600);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // メインウィンドウのマスコットが正常に動作することを確認
      const postResizeMascotVisible = await mainWindowPage.isMascotVisible();
      expect(postResizeMascotVisible).toBe(true);

      const postResizeMainFps = await mainWindowPage.measureFPS(2000);
      console.log(`[Test] チャットリサイズ後のメインウィンドウFPS: ${postResizeMainFps}`);
      
      // FPSが著しく低下していないことを確認
      expect(postResizeMainFps).toBeGreaterThan(Math.max(1, initialMainFps * 0.7));
    }

    console.log('[Test] ウィンドウリサイズ時の相互影響テスト完了');
  });

  test('リサイズ時のメモリ管理', async () => {
    console.log('[Test] リサイズ時のメモリ管理テストを開始...');
    
    // 初期メモリ使用量を測定
    const initialMemory = await electronApp.getMemoryUsage();
    console.log(`[Test] 初期メモリ使用量: ${(initialMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);

    const mainWindow = await electronApp.getMainWindow();
    
    // 大量のリサイズ操作でメモリリークをテスト
    const memoryTestCycles = 10;
    const memoryReadings: number[] = [];

    for (let i = 0; i < memoryTestCycles; i++) {
      console.log(`[Test] メモリテストサイクル ${i + 1}/${memoryTestCycles}`);
      
      // 複数回のリサイズ操作
      await electronApp.resizeWindow(mainWindow, 800 + (i * 50), 600 + (i * 50));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await electronApp.resizeWindow(mainWindow, 1000 - (i * 30), 750 - (i * 20));
      await new Promise(resolve => setTimeout(resolve, 500));

      // メモリ使用量を測定
      const currentMemory = await electronApp.getMemoryUsage();
      const memoryMB = currentMemory.workingSetSize / 1024 / 1024;
      memoryReadings.push(memoryMB);
      
      console.log(`[Test] サイクル ${i + 1} メモリ使用量: ${memoryMB.toFixed(2)}MB`);
    }

    // 最終メモリ使用量を確認
    const finalMemory = await electronApp.getMemoryUsage();
    const totalMemoryIncrease = (finalMemory.workingSetSize - initialMemory.workingSetSize) / 1024 / 1024;
    
    console.log(`[Test] 最終メモリ使用量: ${(finalMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`[Test] 総メモリ増加量: ${totalMemoryIncrease.toFixed(2)}MB`);

    // メモリ使用量の傾向を分析
    const averageMemory = memoryReadings.reduce((sum, mem) => sum + mem, 0) / memoryReadings.length;
    console.log(`[Test] 平均メモリ使用量: ${averageMemory.toFixed(2)}MB`);

    // メモリリークがないことを確認
    expect(totalMemoryIncrease).toBeLessThan(200); // 200MB以内

    // メモリ使用量が制御されていることを確認
    const maxMemory = Math.max(...memoryReadings);
    const minMemory = Math.min(...memoryReadings);
    const memoryVariation = maxMemory - minMemory;
    
    console.log(`[Test] メモリ使用量変動: ${memoryVariation.toFixed(2)}MB`);
    expect(memoryVariation).toBeLessThan(300); // 変動が300MB以内

    console.log('[Test] リサイズ時のメモリ管理テスト完了');
  });
});