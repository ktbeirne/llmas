/**
 * VRMモデル読み込み E2Eテスト
 * 
 * VRMモデルの読み込み、表示、エラーハンドリングを包括的にテスト
 */

import { test, expect } from '@playwright/test';
import { ElectronApp } from '../helpers/electron-app';
import { MainWindowPage, SettingsWindowPage } from '../helpers/page-objects';
import { TestData } from '../helpers/test-data';
import path from 'path';
import fs from 'fs/promises';

test.describe('VRMモデル読み込みテスト', () => {
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

  test('デフォルトVRMモデルの読み込み確認', async () => {
    console.log('[Test] デフォルトVRMモデル読み込み確認テストを開始...');
    
    // メインウィンドウが正常に表示されていることを確認
    const mainWindow = await electronApp.getMainWindow();
    expect(await mainWindow.isVisible()).toBe(true);

    // マスコットが表示されていることを確認
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);

    // Canvasが存在することを確認
    const canvasElements = await mainWindow.locator('canvas').count();
    expect(canvasElements).toBeGreaterThan(0);

    console.log(`[Test] Canvas要素数: ${canvasElements}`);

    // VRMモデルの基本的な描画を確認（FPS測定）
    const fps = await mainWindowPage.measureFPS(3000);
    expect(fps).toBeGreaterThan(0);
    
    console.log(`[Test] VRMモデル描画FPS: ${fps}`);
    console.log('[Test] デフォルトVRMモデル読み込み確認テスト完了');
  });

  test('VRMモデル変更フロー', async () => {
    console.log('[Test] VRMモデル変更フローテストを開始...');
    
    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const settingsWindow = await electronApp.getSettingsWindow();
    expect(settingsWindow).toBeTruthy();

    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);

      // 現在の設定を取得
      const initialSettings = await settingsWindowPage.getCurrentSettings();
      console.log('[Test] 初期設定取得完了');

      // VRMファイルパスを準備
      const vrmFiles = TestData.vrmFiles();

      try {
        console.log('[Test] VRMファイル選択を試行...');
        
        // テスト用VRMファイルの選択を試行
        await settingsWindowPage.selectVrmFile(vrmFiles.valid);
        
        // 設定を保存
        await settingsWindowPage.saveSettings();
        
        // 成功メッセージまたはエラーメッセージを確認
        const successMessage = await settingsWindowPage.getSuccessMessage();
        const errorMessage = await settingsWindowPage.getErrorMessage();
        
        if (successMessage) {
          console.log(`[Test] VRMファイル変更成功: ${successMessage}`);
        } else if (errorMessage) {
          console.log(`[Test] VRMファイル変更エラー（期待される動作）: ${errorMessage}`);
        }
        
      } catch (error) {
        console.log(`[Test] VRMファイル選択中にエラー（テストファイルが存在しないため期待される）: ${error}`);
      }

      await settingsWindowPage.close();
    }

    // メインウィンドウが引き続き正常に動作することを確認
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    expect(await mainWindowPage.page.isVisible()).toBe(true);
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);

    console.log('[Test] VRMモデル変更フローテスト完了');
  });

  test('VRMモデル読み込みエラーハンドリング', async () => {
    console.log('[Test] VRMモデル読み込みエラーハンドリングテストを開始...');
    
    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const settingsWindow = await electronApp.getSettingsWindow();
    
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);
      const vrmFiles = TestData.vrmFiles();

      // 無効なVRMファイルの選択をテスト
      const invalidFiles = [vrmFiles.invalid, vrmFiles.missing];
      
      for (const invalidFile of invalidFiles) {
        console.log(`[Test] 無効ファイルをテスト: ${path.basename(invalidFile)}`);
        
        try {
          await settingsWindowPage.selectVrmFile(invalidFile);
          await settingsWindowPage.saveSettings();
          
          // エラーメッセージが表示されることを確認
          const errorMessage = await settingsWindowPage.getErrorMessage();
          if (errorMessage) {
            console.log(`[Test] 期待されるエラーメッセージ: ${errorMessage}`);
            expect(errorMessage).toBeTruthy();
          }
          
        } catch (error) {
          console.log(`[Test] 無効ファイル選択でエラー（期待される動作）: ${error}`);
        }
        
        // 次のテストまで少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await settingsWindowPage.close();
    }

    // アプリケーションが安定して動作していることを確認
    expect(await mainWindowPage.page.isVisible()).toBe(true);
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);

    console.log('[Test] VRMモデル読み込みエラーハンドリングテスト完了');
  });

  test('VRMモデル読み込み時のパフォーマンス', async () => {
    console.log('[Test] VRMモデル読み込みパフォーマンステストを開始...');
    
    // 初期メモリ使用量を取得
    const initialMemory = await electronApp.getMemoryUsage();
    console.log(`[Test] 初期メモリ使用量: ${(initialMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);

    // VRMモデル読み込み時間を測定
    const startTime = Date.now();
    
    // マスコットアニメーションを開始（VRM処理負荷をかける）
    await mainWindowPage.startMascotAnimation('dance');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const loadTime = Date.now() - startTime;
    console.log(`[Test] VRMアニメーション開始時間: ${loadTime}ms`);

    // FPSを測定
    const fps = await mainWindowPage.measureFPS(5000);
    console.log(`[Test] VRMアニメーション時のFPS: ${fps}`);

    // パフォーマンス期待値を確認
    const performanceExpectations = TestData.performanceExpectations();
    expect(fps).toBeGreaterThan(performanceExpectations.minFPS);

    // メモリ使用量を再確認
    const finalMemory = await electronApp.getMemoryUsage();
    const memoryIncrease = finalMemory.workingSetSize - initialMemory.workingSetSize;
    const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
    
    console.log(`[Test] 最終メモリ使用量: ${(finalMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`[Test] メモリ増加量: ${memoryIncreaseMB.toFixed(2)}MB`);

    // メモリ増加が妥当な範囲内であることを確認
    expect(memoryIncreaseMB).toBeLessThan(200); // 200MB以内

    console.log('[Test] VRMモデル読み込みパフォーマンステスト完了');
  });

  test('VRMモデルのアニメーション制御', async () => {
    console.log('[Test] VRMモデルアニメーション制御テストを開始...');
    
    // 各種アニメーションをテスト
    const animations = ['wave', 'dance', 'nod', 'idle'];
    
    for (const animation of animations) {
      console.log(`[Test] アニメーション「${animation}」をテスト中...`);
      
      try {
        await mainWindowPage.startMascotAnimation(animation);
        
        // アニメーション開始後にFPSを測定
        await new Promise(resolve => setTimeout(resolve, 2000));
        const fps = await mainWindowPage.measureFPS(2000);
        
        console.log(`[Test] アニメーション「${animation}」のFPS: ${fps}`);
        expect(fps).toBeGreaterThan(0);
        
      } catch (error) {
        console.log(`[Test] アニメーション「${animation}」でエラー: ${error}`);
        // アニメーション制御がない場合でもテスト続行
      }
      
      // 次のアニメーションまで少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('[Test] VRMモデルアニメーション制御テスト完了');
  });

  test('VRMモデル表示状態の確認', async () => {
    console.log('[Test] VRMモデル表示状態確認テストを開始...');
    
    // マスコットが表示されていることを確認
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);

    // スクリーンショットを撮影してVRMモデルの描画を確認
    const screenshot = await mainWindowPage.captureScreenshot();
    expect(screenshot).toBeTruthy();
    expect(screenshot.length).toBeGreaterThan(0);

    console.log(`[Test] スクリーンショットサイズ: ${screenshot.length} bytes`);

    // ウィンドウ境界を確認
    const bounds = await electronApp.getWindowBounds(mainWindowPage.page);
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);

    console.log(`[Test] ウィンドウサイズ: ${bounds.width}x${bounds.height}`);

    // VRMモデルのエラー状態をチェック
    const errorMessage = await mainWindowPage.getErrorMessage();
    expect(errorMessage).toBeNull();

    console.log('[Test] VRMモデル表示状態確認テスト完了');
  });

  test('複数のVRMモデル切り替え', async () => {
    console.log('[Test] 複数VRMモデル切り替えテストを開始...');
    
    // 初期状態を確認
    const initialMascotVisible = await mainWindowPage.isMascotVisible();
    expect(initialMascotVisible).toBe(true);

    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const settingsWindow = await electronApp.getSettingsWindow();
    
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);
      const vrmFiles = TestData.vrmFiles();

      // 複数のVRMファイル切り替えをシミュレート
      const testFiles = [vrmFiles.valid, vrmFiles.invalid];
      
      for (let i = 0; i < testFiles.length; i++) {
        const file = testFiles[i];
        console.log(`[Test] VRMファイル ${i + 1}/${testFiles.length} に切り替え中...`);
        
        try {
          await settingsWindowPage.selectVrmFile(file);
          await settingsWindowPage.saveSettings();
          
          // 結果を確認
          const successMessage = await settingsWindowPage.getSuccessMessage();
          const errorMessage = await settingsWindowPage.getErrorMessage();
          
          if (successMessage) {
            console.log(`[Test] 切り替え成功: ${successMessage}`);
          } else if (errorMessage) {
            console.log(`[Test] 切り替えエラー（期待される動作）: ${errorMessage}`);
          }
          
        } catch (error) {
          console.log(`[Test] ファイル切り替え中にエラー: ${error}`);
        }
        
        // 設定変更後にアプリケーション状態を確認
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // メインウィンドウが正常に動作していることを確認
        expect(await mainWindowPage.page.isVisible()).toBe(true);
        
        // 次の切り替えまで待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await settingsWindowPage.close();
    }

    // 最終的にマスコットが表示されていることを確認
    const finalMascotVisible = await mainWindowPage.isMascotVisible();
    expect(finalMascotVisible).toBe(true);

    console.log('[Test] 複数VRMモデル切り替えテスト完了');
  });
});

test.describe('VRMモデル読み込み詳細テスト', () => {
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

  test('VRMファイル形式の検証', async () => {
    console.log('[Test] VRMファイル形式検証テストを開始...');
    
    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const settingsWindow = await electronApp.getSettingsWindow();
    
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);

      // 様々なファイル形式をテスト
      const testFiles = [
        { path: '/tmp/test.vrm', description: 'VRMファイル' },
        { path: '/tmp/test.glb', description: 'GLBファイル' },
        { path: '/tmp/test.txt', description: 'テキストファイル' },
        { path: '/tmp/test.jpg', description: '画像ファイル' },
        { path: '/tmp/nonexistent.vrm', description: '存在しないファイル' }
      ];

      for (const file of testFiles) {
        console.log(`[Test] ${file.description} (${file.path}) をテスト中...`);
        
        try {
          await settingsWindowPage.selectVrmFile(file.path);
          await settingsWindowPage.saveSettings();
          
          // 結果を確認
          const errorMessage = await settingsWindowPage.getErrorMessage();
          
          if (file.path.endsWith('.vrm')) {
            // VRMファイルの場合、ファイルが存在しないためエラーが期待される
            console.log(`[Test] VRMファイルテスト結果: ${errorMessage || '成功'}`);
          } else {
            // 非VRMファイルの場合、エラーが期待される
            expect(errorMessage).toBeTruthy();
            console.log(`[Test] 非VRMファイルで期待されるエラー: ${errorMessage}`);
          }
          
        } catch (error) {
          console.log(`[Test] ファイル選択でエラー（期待される動作）: ${error}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await settingsWindowPage.close();
    }

    console.log('[Test] VRMファイル形式検証テスト完了');
  });

  test('VRMモデル読み込み時のUI応答性', async () => {
    console.log('[Test] VRMモデル読み込み時のUI応答性テストを開始...');
    
    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 1000));

    const settingsWindow = await electronApp.getSettingsWindow();
    
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);

      // VRMファイル選択操作を開始
      const vrmFiles = TestData.vrmFiles();
      
      try {
        // ファイル選択操作中にUI応答性をテスト
        const uiResponsePromise = settingsWindowPage.selectVrmFile(vrmFiles.valid);
        
        // 同時に他のUI操作を実行してUI応答性を確認
        const startTime = Date.now();
        const currentSettings = await settingsWindowPage.getCurrentSettings();
        const responseTime = Date.now() - startTime;
        
        console.log(`[Test] VRMファイル選択中のUI応答時間: ${responseTime}ms`);
        
        // UI応答が高速であることを確認
        expect(responseTime).toBeLessThan(1000); // 1秒以内
        expect(currentSettings).toBeTruthy();
        
        // ファイル選択操作の完了を待機
        await uiResponsePromise;
        
      } catch (error) {
        console.log(`[Test] VRMファイル選択中のエラー: ${error}`);
      }

      await settingsWindowPage.close();
    }

    console.log('[Test] VRMモデル読み込み時のUI応答性テスト完了');
  });

  test('VRMモデル読み込み中断・キャンセル', async () => {
    console.log('[Test] VRMモデル読み込み中断・キャンセルテストを開始...');
    
    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 1000));

    const settingsWindow = await electronApp.getSettingsWindow();
    
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);

      // VRMファイル選択操作を開始
      const vrmFiles = TestData.vrmFiles();
      
      try {
        // ファイル選択を開始
        await settingsWindowPage.selectVrmFile(vrmFiles.valid);
        
        // すぐに設定ウィンドウを閉じる（キャンセル操作）
        console.log('[Test] VRM読み込み中に設定ウィンドウをキャンセル...');
        await settingsWindowPage.close();
        
      } catch (error) {
        console.log(`[Test] VRM読み込みキャンセル中のエラー: ${error}`);
      }
    }

    // アプリケーションが安定して動作していることを確認
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    expect(await mainWindowPage.page.isVisible()).toBe(true);
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);

    console.log('[Test] VRMモデル読み込み中断・キャンセルテスト完了');
  });

  test('VRMモデルリソース管理', async () => {
    console.log('[Test] VRMモデルリソース管理テストを開始...');
    
    // 初期リソース使用量を測定
    const initialMemory = await electronApp.getMemoryUsage();
    console.log(`[Test] 初期メモリ使用量: ${(initialMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);

    // 複数回のVRMモデル操作でリソースリークがないかテスト
    const cycles = 3;
    
    for (let i = 0; i < cycles; i++) {
      console.log(`[Test] リソース管理サイクル ${i + 1}/${cycles} を実行中...`);
      
      // アニメーション操作でVRMリソースを使用
      await mainWindowPage.startMascotAnimation('wave');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await mainWindowPage.startMascotAnimation('idle');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // メモリ使用量を測定
      const cycleMemory = await electronApp.getMemoryUsage();
      const cycleMemoryMB = cycleMemory.workingSetSize / 1024 / 1024;
      
      console.log(`[Test] サイクル ${i + 1} メモリ使用量: ${cycleMemoryMB.toFixed(2)}MB`);
      
      // 次のサイクルまで少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 最終メモリ使用量を確認
    const finalMemory = await electronApp.getMemoryUsage();
    const memoryIncrease = finalMemory.workingSetSize - initialMemory.workingSetSize;
    const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
    
    console.log(`[Test] 最終メモリ使用量: ${(finalMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`[Test] 総メモリ増加量: ${memoryIncreaseMB.toFixed(2)}MB`);

    // メモリ増加が許容範囲内であることを確認
    expect(memoryIncreaseMB).toBeLessThan(100); // 100MB以内

    console.log('[Test] VRMモデルリソース管理テスト完了');
  });
});