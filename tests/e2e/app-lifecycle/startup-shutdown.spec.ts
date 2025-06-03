/**
 * アプリケーション起動・終了 E2Eテスト
 * 
 * Electronアプリケーションのライフサイクルテスト
 */

import { test, expect } from '@playwright/test';
import { ElectronApp } from '../helpers/electron-app';
import { MainWindowPage } from '../helpers/page-objects';
import { TestData } from '../helpers/test-data';

test.describe('アプリケーション起動・終了テスト', () => {
  let electronApp: ElectronApp;
  let mainWindowPage: MainWindowPage;

  // WSL環境検出とタイムアウト設定
  const isWSL = process.env.WSL_DISTRO_NAME || process.env.WSLENV || 
                require('fs').existsSync('/proc/version') && 
                require('fs').readFileSync('/proc/version', 'utf8').includes('microsoft');

  // WSL環境ではテストタイムアウトを延長
  if (isWSL) {
    test.setTimeout(600000); // 10分
  }

  test.beforeEach(async () => {
    electronApp = new ElectronApp();
  });

  test.afterEach(async () => {
    if (electronApp && electronApp.isRunning()) {
      await electronApp.close();
    }
  });

  test('正常な起動と終了', async () => {
    // アプリケーション起動
    console.log('[Test] アプリケーションを起動中...');
    
    const app = await electronApp.launch({
      headless: false,
      timeout: isWSL ? 300000 : 30000 // WSLでは5分、通常は30秒
    });

    expect(app).toBeTruthy();
    expect(electronApp.isRunning()).toBe(true);

    // メインウィンドウの取得と確認
    const mainWindow = await electronApp.getMainWindow();
    expect(mainWindow).toBeTruthy();
    
    mainWindowPage = new MainWindowPage(mainWindow);

    // ウィンドウが表示されていることを確認
    expect(await mainWindow.isVisible()).toBe(true);
    
    // ページタイトルの確認
    const title = await mainWindow.title();
    expect(title).toContain('LLMDesktopMascot');

    // マスコット読み込み完了まで待機
    await mainWindowPage.waitForMascotLoad();
    
    // マスコットが表示されていることを確認
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);

    console.log('[Test] アプリケーション起動確認完了');

    // 正常終了
    await electronApp.close();
    expect(electronApp.isRunning()).toBe(false);
    
    console.log('[Test] アプリケーション終了確認完了');
  });

  test('起動時間の測定', async () => {
    console.log('[Test] 起動時間測定を開始...');
    
    const startTime = Date.now();
    
    // アプリケーション起動
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    // メインウィンドウ取得
    const mainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(mainWindow);

    // マスコット読み込み完了まで待機
    await mainWindowPage.waitForMascotLoad();

    const actualStartupTime = Date.now() - startTime;
    const expectedStartupTime = TestData.performanceExpectations().expectedStartupTime;

    console.log(`[Test] 実際の起動時間: ${actualStartupTime}ms`);
    console.log(`[Test] 期待起動時間: ${expectedStartupTime}ms`);

    // 起動時間が期待値以内であることを確認
    expect(actualStartupTime).toBeLessThan(expectedStartupTime);

    // ElectronAppクラスの起動時間測定も確認
    const measuredStartupTime = electronApp.measureStartupTime();
    expect(measuredStartupTime).toBeLessThan(expectedStartupTime);
    
    console.log('[Test] 起動時間測定完了');
  });

  test('複数回の起動・終了サイクル', async () => {
    const cycles = 3;
    
    for (let i = 0; i < cycles; i++) {
      console.log(`[Test] 起動・終了サイクル ${i + 1}/${cycles} を開始...`);
      
      // 起動
      await electronApp.launch({
        headless: false,
        timeout: 30000
      });
      
      expect(electronApp.isRunning()).toBe(true);
      
      // メインウィンドウ確認
      const mainWindow = await electronApp.getMainWindow();
      expect(mainWindow).toBeTruthy();
      
      mainWindowPage = new MainWindowPage(mainWindow);
      await mainWindowPage.waitForMascotLoad();
      
      // 少し待機（実際の使用をシミュレート）
      await mainWindow.waitForTimeout(1000);
      
      // 終了
      await electronApp.close();
      expect(electronApp.isRunning()).toBe(false);
      
      // 次のサイクルまで少し待機
      if (i < cycles - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`[Test] 起動・終了サイクル ${i + 1}/${cycles} 完了`);
    }
  });

  test('異常終了からの回復', async () => {
    console.log('[Test] 異常終了テストを開始...');
    
    // 最初の起動
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });
    
    const mainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();
    
    console.log('[Test] アプリケーション起動完了、強制終了を実行...');
    
    // 強制終了（クラッシュシミュレーション）
    await electronApp.simulateCrash();
    expect(electronApp.isRunning()).toBe(false);
    
    console.log('[Test] 強制終了完了、再起動を試行...');
    
    // 少し待機してから再起動
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 新しいElectronAppインスタンスで再起動
    electronApp = new ElectronApp();
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });
    
    // 正常に再起動できることを確認
    expect(electronApp.isRunning()).toBe(true);
    
    const newMainWindow = await electronApp.getMainWindow();
    expect(newMainWindow).toBeTruthy();
    
    mainWindowPage = new MainWindowPage(newMainWindow);
    await mainWindowPage.waitForMascotLoad();
    
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);
    
    console.log('[Test] 異常終了からの回復テスト完了');
  });

  test('メモリ使用量の監視', async () => {
    console.log('[Test] メモリ使用量監視テストを開始...');
    
    // アプリケーション起動
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });
    
    const mainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();
    
    // 初期メモリ使用量を取得
    const initialMemory = await electronApp.getMemoryUsage();
    console.log(`[Test] 初期メモリ使用量: ${initialMemory.workingSetSize} bytes`);
    
    // 何らかの操作を実行（マスコットアニメーション）
    await mainWindowPage.startMascotAnimation('wave');
    await mainWindow.waitForTimeout(5000);
    
    // メモリ使用量を再取得
    const afterActionMemory = await electronApp.getMemoryUsage();
    console.log(`[Test] 操作後メモリ使用量: ${afterActionMemory.workingSetSize} bytes`);
    
    // メモリ使用量が期待値以内であることを確認
    const maxMemoryUsage = TestData.performanceExpectations().maxMemoryUsage;
    expect(afterActionMemory.workingSetSize).toBeLessThan(maxMemoryUsage);
    
    // メモリ増加が極端でないことを確認（10倍以内）
    const memoryIncrease = afterActionMemory.workingSetSize / initialMemory.workingSetSize;
    expect(memoryIncrease).toBeLessThan(10);
    
    console.log('[Test] メモリ使用量監視テスト完了');
  });

  test('ウィンドウ境界の取得と確認', async () => {
    console.log('[Test] ウィンドウ境界テストを開始...');
    
    // アプリケーション起動
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });
    
    const mainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();
    
    // ウィンドウ境界を取得
    const bounds = await electronApp.getWindowBounds(mainWindow);
    
    console.log(`[Test] ウィンドウ境界: x=${bounds.x}, y=${bounds.y}, width=${bounds.width}, height=${bounds.height}`);
    
    // 境界値が妥当であることを確認
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    
    // 一般的な画面サイズ範囲内であることを確認
    expect(bounds.width).toBeLessThan(5000);
    expect(bounds.height).toBeLessThan(5000);
    
    console.log('[Test] ウィンドウ境界テスト完了');
  });

  test('エラー状態での起動確認', async () => {
    console.log('[Test] エラー状態起動テストを開始...');
    
    // 無効な引数で起動を試行
    await electronApp.launch({
      headless: false,
      timeout: 30000,
      args: ['--invalid-arg']
    });
    
    // それでもアプリケーションが起動することを確認
    expect(electronApp.isRunning()).toBe(true);
    
    const mainWindow = await electronApp.getMainWindow();
    expect(mainWindow).toBeTruthy();
    
    mainWindowPage = new MainWindowPage(mainWindow);
    
    // エラーメッセージが表示されていないことを確認
    const errorMessage = await mainWindowPage.getErrorMessage();
    expect(errorMessage).toBeNull();
    
    // マスコットが正常に表示されることを確認
    await mainWindowPage.waitForMascotLoad();
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);
    
    console.log('[Test] エラー状態起動テスト完了');
  });

  test('スクリーンショット撮影機能', async () => {
    console.log('[Test] スクリーンショット撮影テストを開始...');
    
    // アプリケーション起動
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });
    
    const mainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();
    
    // スクリーンショットを撮影
    const screenshot = await electronApp.captureScreenshot(mainWindow);
    expect(screenshot).toBeTruthy();
    expect(screenshot.length).toBeGreaterThan(0);
    
    // MainWindowPageのスクリーンショット機能も確認
    const pageScreenshot = await mainWindowPage.captureScreenshot();
    expect(pageScreenshot).toBeTruthy();
    expect(pageScreenshot.length).toBeGreaterThan(0);
    
    console.log('[Test] スクリーンショット撮影テスト完了');
  });

  test('アプリケーション起動時の環境変数確認', async () => {
    console.log('[Test] 環境変数確認テストを開始...');
    
    // E2Eテスト用環境変数を設定して起動
    await electronApp.launch({
      headless: false,
      timeout: 30000,
      env: {
        ...process.env,
        E2E_TEST_MODE: 'true',
        NODE_ENV: 'test'
      }
    });
    
    const mainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();
    
    // アプリケーションが環境変数を正しく認識していることを確認
    const isTestMode = await mainWindow.evaluate(() => {
      return process.env.E2E_TEST_MODE === 'true';
    });
    
    expect(isTestMode).toBe(true);
    
    console.log('[Test] 環境変数確認テスト完了');
  });
});

test.describe('アプリケーション起動パフォーマンステスト', () => {
  let electronApp: ElectronApp;

  test.beforeEach(async () => {
    electronApp = new ElectronApp();
  });

  test.afterEach(async () => {
    if (electronApp && electronApp.isRunning()) {
      await electronApp.close();
    }
  });

  test('高速起動テスト', async () => {
    console.log('[Test] 高速起動テストを開始...');
    
    const maxStartupTime = 3000; // 3秒以内
    const startTime = Date.now();
    
    // アプリケーション起動
    await electronApp.launch({
      headless: true, // ヘッドレスで高速化
      timeout: maxStartupTime + 5000
    });
    
    const mainWindow = await electronApp.getMainWindow();
    const actualStartupTime = Date.now() - startTime;
    
    console.log(`[Test] 高速起動時間: ${actualStartupTime}ms`);
    
    // 高速起動時間以内であることを確認
    expect(actualStartupTime).toBeLessThan(maxStartupTime);
    expect(mainWindow).toBeTruthy();
    
    console.log('[Test] 高速起動テスト完了');
  });

  test('リソース制限下での起動', async () => {
    console.log('[Test] リソース制限起動テストを開始...');
    
    // メモリ制限付きで起動
    await electronApp.launch({
      headless: false,
      timeout: 45000,
      args: ['--max-old-space-size=512'] // 512MBに制限
    });
    
    const mainWindow = await electronApp.getMainWindow();
    expect(mainWindow).toBeTruthy();
    
    const mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();
    
    // メモリ使用量が制限内であることを確認
    const memoryUsage = await electronApp.getMemoryUsage();
    const memoryUsageMB = memoryUsage.workingSetSize / (1024 * 1024);
    
    console.log(`[Test] メモリ使用量: ${memoryUsageMB.toFixed(2)}MB`);
    
    // 制限値の範囲内であることを確認
    expect(memoryUsageMB).toBeLessThan(512);
    
    console.log('[Test] リソース制限起動テスト完了');
  });
});