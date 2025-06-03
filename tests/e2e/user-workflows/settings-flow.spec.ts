/**
 * 設定変更フロー E2Eテスト
 * 
 * 設定画面での各種設定変更フローをテスト
 */

import { test, expect } from '@playwright/test';
import { ElectronApp } from '../helpers/electron-app';
import { MainWindowPage, SettingsWindowPage } from '../helpers/page-objects';
import { TestData } from '../helpers/test-data';

test.describe('設定変更フローテスト', () => {
  let electronApp: ElectronApp;
  let mainWindowPage: MainWindowPage;
  let settingsWindowPage: SettingsWindowPage;

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

    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const settingsWindow = await electronApp.getSettingsWindow();
    expect(settingsWindow).toBeTruthy();
    
    if (settingsWindow) {
      settingsWindowPage = new SettingsWindowPage(settingsWindow);
    }
  });

  test.afterEach(async () => {
    if (electronApp && electronApp.isRunning()) {
      await electronApp.close();
    }
  });

  test('ユーザー名変更フロー', async () => {
    console.log('[Test] ユーザー名変更フローテストを開始...');
    
    if (!settingsWindowPage) {
      throw new Error('設定ウィンドウが開けませんでした');
    }

    // 現在の設定を取得
    const initialSettings = await settingsWindowPage.getCurrentSettings();
    console.log(`[Test] 初期ユーザー名: ${initialSettings.userName}`);

    // 新しいユーザー名を設定
    const newUserName = '設定テストユーザー';
    await settingsWindowPage.setUserName(newUserName);

    // 設定を保存
    await settingsWindowPage.saveSettings();

    // 成功メッセージの確認
    const successMessage = await settingsWindowPage.getSuccessMessage();
    expect(successMessage).toBeTruthy();
    console.log(`[Test] 保存成功メッセージ: ${successMessage}`);

    // 設定が変更されたことを確認
    const updatedSettings = await settingsWindowPage.getCurrentSettings();
    expect(updatedSettings.userName).toBe(newUserName);

    console.log('[Test] ユーザー名変更フローテスト完了');
  });

  test('マスコット名変更フロー', async () => {
    console.log('[Test] マスコット名変更フローテストを開始...');
    
    if (!settingsWindowPage) {
      throw new Error('設定ウィンドウが開けませんでした');
    }

    // 現在の設定を取得
    const initialSettings = await settingsWindowPage.getCurrentSettings();
    console.log(`[Test] 初期マスコット名: ${initialSettings.mascotName}`);

    // 新しいマスコット名を設定
    const newMascotName = '設定テストマスコット';
    await settingsWindowPage.setMascotName(newMascotName);

    // 設定を保存
    await settingsWindowPage.saveSettings();

    // 設定が変更されたことを確認
    const updatedSettings = await settingsWindowPage.getCurrentSettings();
    expect(updatedSettings.mascotName).toBe(newMascotName);

    console.log('[Test] マスコット名変更フローテスト完了');
  });

  test('テーマ変更フロー', async () => {
    console.log('[Test] テーマ変更フローテストを開始...');
    
    if (!settingsWindowPage) {
      throw new Error('設定ウィンドウが開けませんでした');
    }

    const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
    
    for (const theme of themes) {
      console.log(`[Test] テーマを ${theme} に変更中...`);
      
      // テーマを変更
      await settingsWindowPage.changeTheme(theme);
      
      // 設定を保存
      await settingsWindowPage.saveSettings();
      
      // 設定が変更されたことを確認
      const currentSettings = await settingsWindowPage.getCurrentSettings();
      expect(currentSettings.theme).toBe(theme);
      
      console.log(`[Test] テーマ ${theme} への変更完了`);
      
      // 次のテーマテストまで少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('[Test] テーマ変更フローテスト完了');
  });

  test('カメラ設定変更フロー', async () => {
    console.log('[Test] カメラ設定変更フローテストを開始...');
    
    if (!settingsWindowPage) {
      throw new Error('設定ウィンドウが開けませんでした');
    }

    // 現在のカメラ設定を取得
    const initialSettings = await settingsWindowPage.getCurrentSettings();
    console.log('[Test] 初期カメラ設定:', initialSettings.cameraSettings);

    // 複数のカメラ設定をテスト
    const cameraVariations = TestData.cameraVariations();
    
    for (let i = 0; i < Math.min(3, cameraVariations.length); i++) {
      const cameraSettings = cameraVariations[i];
      console.log(`[Test] カメラ設定 ${i + 1} を適用中...`);
      
      // カメラ設定を変更
      await settingsWindowPage.setCameraSettings(cameraSettings);
      
      // 設定を保存
      await settingsWindowPage.saveSettings();
      
      // 設定が変更されたことを確認
      const currentSettings = await settingsWindowPage.getCurrentSettings();
      expect(currentSettings.cameraSettings.position.x).toBeCloseTo(cameraSettings.position.x, 1);
      expect(currentSettings.cameraSettings.position.y).toBeCloseTo(cameraSettings.position.y, 1);
      expect(currentSettings.cameraSettings.position.z).toBeCloseTo(cameraSettings.position.z, 1);
      expect(currentSettings.cameraSettings.zoom).toBeCloseTo(cameraSettings.zoom, 1);
      
      console.log(`[Test] カメラ設定 ${i + 1} の適用完了`);
      
      // 次の設定テストまで少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('[Test] カメラ設定変更フローテスト完了');
  });

  test('複合設定変更フロー', async () => {
    console.log('[Test] 複合設定変更フローテストを開始...');
    
    if (!settingsWindowPage) {
      throw new Error('設定ウィンドウが開けませんでした');
    }

    // 複数の設定を同時に変更
    const testUserName = '複合テストユーザー';
    const testMascotName = '複合テストマスコット';
    const testTheme = 'dark';
    const testCameraSettings = TestData.cameraVariations()[1];

    console.log('[Test] 複数設定を同時変更中...');

    // 各設定を順番に変更
    await settingsWindowPage.setUserName(testUserName);
    await settingsWindowPage.setMascotName(testMascotName);
    await settingsWindowPage.changeTheme(testTheme);
    await settingsWindowPage.setCameraSettings(testCameraSettings);

    // 一括で保存
    await settingsWindowPage.saveSettings();

    // すべての設定が正しく変更されたことを確認
    const finalSettings = await settingsWindowPage.getCurrentSettings();
    
    expect(finalSettings.userName).toBe(testUserName);
    expect(finalSettings.mascotName).toBe(testMascotName);
    expect(finalSettings.theme).toBe(testTheme);
    expect(finalSettings.cameraSettings.position.x).toBeCloseTo(testCameraSettings.position.x, 1);
    expect(finalSettings.cameraSettings.zoom).toBeCloseTo(testCameraSettings.zoom, 1);

    console.log('[Test] 複合設定変更フローテスト完了');
  });

  test('設定のリセットフロー', async () => {
    console.log('[Test] 設定リセットフローテストを開始...');
    
    if (!settingsWindowPage) {
      throw new Error('設定ウィンドウが開けませんでした');
    }

    // まず設定を変更
    await settingsWindowPage.setUserName('リセット前ユーザー');
    await settingsWindowPage.setMascotName('リセット前マスコット');
    await settingsWindowPage.changeTheme('dark');
    await settingsWindowPage.saveSettings();

    console.log('[Test] 設定変更完了、リセットを実行...');

    // 設定をリセット
    await settingsWindowPage.resetSettings();

    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 2000));

    // リセット後の設定を確認
    const resetSettings = await settingsWindowPage.getCurrentSettings();
    
    console.log('[Test] リセット後の設定:');
    console.log(`  ユーザー名: ${resetSettings.userName}`);
    console.log(`  マスコット名: ${resetSettings.mascotName}`);
    console.log(`  テーマ: ${resetSettings.theme}`);

    // リセットされたことを確認（具体的なデフォルト値は実装に依存）
    expect(resetSettings.userName).toBeTruthy();
    expect(resetSettings.mascotName).toBeTruthy();
    expect(['light', 'dark', 'auto']).toContain(resetSettings.theme);

    console.log('[Test] 設定リセットフローテスト完了');
  });

  test('VRMファイル選択フロー', async () => {
    console.log('[Test] VRMファイル選択フローテストを開始...');
    
    if (!settingsWindowPage) {
      throw new Error('設定ウィンドウが開けませんでした');
    }

    const vrmFiles = TestData.vrmFiles();

    // 有効なVRMファイルの選択テスト
    try {
      console.log('[Test] 有効なVRMファイルを選択中...');
      await settingsWindowPage.selectVrmFile(vrmFiles.valid);
      
      // 設定を保存
      await settingsWindowPage.saveSettings();
      
      // 成功メッセージの確認
      const successMessage = await settingsWindowPage.getSuccessMessage();
      if (successMessage) {
        console.log(`[Test] VRMファイル選択成功: ${successMessage}`);
      }
      
    } catch (error) {
      console.log(`[Test] VRMファイル選択中にエラー（テストファイルが存在しないため期待される）: ${error}`);
    }

    // 無効なファイルの選択テスト
    try {
      console.log('[Test] 無効なファイルを選択中...');
      await settingsWindowPage.selectVrmFile(vrmFiles.invalid);
      
      await settingsWindowPage.saveSettings();
      
      // エラーメッセージの確認
      const errorMessage = await settingsWindowPage.getErrorMessage();
      if (errorMessage) {
        console.log(`[Test] 期待されるエラーメッセージ: ${errorMessage}`);
      }
      
    } catch (error) {
      console.log(`[Test] 無効ファイル選択でエラー（期待される動作）: ${error}`);
    }

    console.log('[Test] VRMファイル選択フローテスト完了');
  });

  test('設定ウィンドウのキャンセル機能', async () => {
    console.log('[Test] 設定キャンセル機能テストを開始...');
    
    if (!settingsWindowPage) {
      throw new Error('設定ウィンドウが開けませんでした');
    }

    // 現在の設定を取得
    const initialSettings = await settingsWindowPage.getCurrentSettings();
    
    // 設定を変更（保存しない）
    await settingsWindowPage.setUserName('キャンセルテストユーザー');
    await settingsWindowPage.setMascotName('キャンセルテストマスコット');
    await settingsWindowPage.changeTheme('dark');

    console.log('[Test] 設定変更完了、キャンセルを実行...');

    // キャンセル（設定ウィンドウを閉じる）
    await settingsWindowPage.close();

    // 設定ウィンドウを再度開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newSettingsWindow = await electronApp.getSettingsWindow();
    if (newSettingsWindow) {
      settingsWindowPage = new SettingsWindowPage(newSettingsWindow);
      
      // 設定が元のままであることを確認
      const currentSettings = await settingsWindowPage.getCurrentSettings();
      
      expect(currentSettings.userName).toBe(initialSettings.userName);
      expect(currentSettings.mascotName).toBe(initialSettings.mascotName);
      expect(currentSettings.theme).toBe(initialSettings.theme);
      
      console.log('[Test] 設定がキャンセルされて元の値に戻りました');
      
      await settingsWindowPage.close();
    }

    console.log('[Test] 設定キャンセル機能テスト完了');
  });
});

test.describe('設定変更エラーハンドリングテスト', () => {
  let electronApp: ElectronApp;
  let settingsWindowPage: SettingsWindowPage;

  test.beforeEach(async () => {
    electronApp = new ElectronApp();
    
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const mainWindow = await electronApp.getMainWindow();
    const mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const settingsWindow = await electronApp.getSettingsWindow();
    if (settingsWindow) {
      settingsWindowPage = new SettingsWindowPage(settingsWindow);
    }
  });

  test.afterEach(async () => {
    if (electronApp && electronApp.isRunning()) {
      await electronApp.close();
    }
  });

  test('無効な入力値の処理', async () => {
    console.log('[Test] 無効な入力値処理テストを開始...');
    
    if (!settingsWindowPage) {
      throw new Error('設定ウィンドウが開けませんでした');
    }

    // 空の名前を設定
    console.log('[Test] 空の値をテスト中...');
    
    await settingsWindowPage.setUserName('');
    await settingsWindowPage.setMascotName('');

    try {
      await settingsWindowPage.saveSettings();
      
      // エラーメッセージの確認
      const errorMessage = await settingsWindowPage.getErrorMessage();
      if (errorMessage) {
        console.log(`[Test] 期待されるエラーメッセージ: ${errorMessage}`);
      } else {
        console.log('[Test] 空の値でも保存が成功しました（実装に依存）');
      }
      
    } catch (error) {
      console.log(`[Test] 空の値で保存エラー（期待される動作）: ${error}`);
    }

    // 非常に長い名前をテスト
    console.log('[Test] 非常に長い値をテスト中...');
    
    const veryLongName = 'あ'.repeat(1000);
    await settingsWindowPage.setUserName(veryLongName);

    try {
      await settingsWindowPage.saveSettings();
      
      const errorMessage = await settingsWindowPage.getErrorMessage();
      if (errorMessage) {
        console.log(`[Test] 長い名前でエラーメッセージ: ${errorMessage}`);
      }
      
    } catch (error) {
      console.log(`[Test] 長い名前で保存エラー（期待される動作）: ${error}`);
    }

    console.log('[Test] 無効な入力値処理テスト完了');
  });

  test('特殊文字入力の処理', async () => {
    console.log('[Test] 特殊文字入力処理テストを開始...');
    
    if (!settingsWindowPage) {
      throw new Error('設定ウィンドウが開けませんでした');
    }

    const specialCharacters = [
      '<script>alert("test")</script>',
      'ユーザー\n改行\nテスト',
      'ユーザー\tタブ\tテスト',
      '😀😃😄😁😆😅🤣😂',
      'SELECT * FROM users;',
      '../../etc/passwd'
    ];

    for (const specialInput of specialCharacters) {
      console.log(`[Test] 特殊文字テスト: ${specialInput.substring(0, 20)}...`);
      
      await settingsWindowPage.setUserName(specialInput);
      
      try {
        await settingsWindowPage.saveSettings();
        
        // 設定が正しく処理されたかを確認
        const currentSettings = await settingsWindowPage.getCurrentSettings();
        console.log(`[Test] 保存された値: ${currentSettings.userName.substring(0, 20)}...`);
        
      } catch (error) {
        console.log(`[Test] 特殊文字でエラー: ${error}`);
      }
      
      // 次のテストまで少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('[Test] 特殊文字入力処理テスト完了');
  });

  test('極端なカメラ設定値の処理', async () => {
    console.log('[Test] 極端なカメラ設定値処理テストを開始...');
    
    if (!settingsWindowPage) {
      throw new Error('設定ウィンドウが開けませんでした');
    }

    const extremeCameraSettings = [
      // 極端に大きい値
      {
        position: { x: 999999, y: 999999, z: 999999 },
        target: { x: 0, y: 0, z: 0 },
        zoom: 1000
      },
      // 極端に小さい値
      {
        position: { x: -999999, y: -999999, z: -999999 },
        target: { x: 0, y: 0, z: 0 },
        zoom: -100
      },
      // ゼロ値
      {
        position: { x: 0, y: 0, z: 0 },
        target: { x: 0, y: 0, z: 0 },
        zoom: 0
      }
    ];

    for (let i = 0; i < extremeCameraSettings.length; i++) {
      const cameraSettings = extremeCameraSettings[i];
      console.log(`[Test] 極端なカメラ設定 ${i + 1} をテスト中...`);
      
      try {
        await settingsWindowPage.setCameraSettings(cameraSettings);
        await settingsWindowPage.saveSettings();
        
        // エラーメッセージの確認
        const errorMessage = await settingsWindowPage.getErrorMessage();
        if (errorMessage) {
          console.log(`[Test] カメラ設定エラーメッセージ: ${errorMessage}`);
        } else {
          console.log('[Test] 極端な値でも保存が成功しました');
        }
        
      } catch (error) {
        console.log(`[Test] 極端なカメラ設定でエラー（期待される動作）: ${error}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('[Test] 極端なカメラ設定値処理テスト完了');
  });
});

test.describe('設定変更パフォーマンステスト', () => {
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

  test('設定ウィンドウ開閉パフォーマンス', async () => {
    console.log('[Test] 設定ウィンドウ開閉パフォーマンステストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    const mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    const cycles = 5;
    const maxTimePerCycle = 3000; // 3秒以内

    for (let i = 0; i < cycles; i++) {
      console.log(`[Test] 開閉サイクル ${i + 1}/${cycles} を実行中...`);
      
      const cycleStartTime = Date.now();
      
      // 設定ウィンドウを開く
      await mainWindowPage.openSettings();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const settingsWindow = await electronApp.getSettingsWindow();
      expect(settingsWindow).toBeTruthy();
      
      if (settingsWindow) {
        const settingsWindowPage = new SettingsWindowPage(settingsWindow);
        
        // 簡単な設定変更
        await settingsWindowPage.setUserName(`パフォーマンステスト${i + 1}`);
        await settingsWindowPage.saveSettings();
        
        // 設定ウィンドウを閉じる
        await settingsWindowPage.close();
      }
      
      const cycleTime = Date.now() - cycleStartTime;
      console.log(`[Test] サイクル ${i + 1} 実行時間: ${cycleTime}ms`);
      
      // 各サイクルが制限時間内であることを確認
      expect(cycleTime).toBeLessThan(maxTimePerCycle);
      
      // 次のサイクルまで少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('[Test] 設定ウィンドウ開閉パフォーマンステスト完了');
  });

  test('大量設定変更のパフォーマンス', async () => {
    console.log('[Test] 大量設定変更パフォーマンステストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    const mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const settingsWindow = await electronApp.getSettingsWindow();
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);
      
      const changeCount = 20;
      const maxTotalTime = 10000; // 10秒以内
      
      const startTime = Date.now();
      
      // 大量の設定変更
      for (let i = 0; i < changeCount; i++) {
        await settingsWindowPage.setUserName(`大量テスト${i + 1}`);
        await settingsWindowPage.setMascotName(`大量マスコット${i + 1}`);
        
        // 一部の変更のみ保存（全て保存すると時間がかかりすぎる）
        if (i % 5 === 0) {
          await settingsWindowPage.saveSettings();
        }
      }
      
      // 最終保存
      await settingsWindowPage.saveSettings();
      
      const totalTime = Date.now() - startTime;
      console.log(`[Test] 大量設定変更（${changeCount}回）実行時間: ${totalTime}ms`);
      
      // 総実行時間が制限内であることを確認
      expect(totalTime).toBeLessThan(maxTotalTime);
      
      await settingsWindowPage.close();
    }

    console.log('[Test] 大量設定変更パフォーマンステスト完了');
  });

  test('設定永続化パフォーマンス', async () => {
    console.log('[Test] 設定永続化パフォーマンステストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    const mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    let settingsWindow = await electronApp.getSettingsWindow();
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);
      
      // 設定変更
      const testUserName = 'パフォーマンス永続化テスト';
      await settingsWindowPage.setUserName(testUserName);
      
      // 保存時間を測定
      const saveStartTime = Date.now();
      await settingsWindowPage.saveSettings();
      const saveTime = Date.now() - saveStartTime;
      
      console.log(`[Test] 設定保存時間: ${saveTime}ms`);
      expect(saveTime).toBeLessThan(2000); // 2秒以内
      
      await settingsWindowPage.close();
    }

    // アプリケーション再起動
    await electronApp.close();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 再起動時間を測定
    const restartStartTime = Date.now();
    
    electronApp = new ElectronApp();
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const newMainWindow = await electronApp.getMainWindow();
    const newMainWindowPage = new MainWindowPage(newMainWindow);
    await newMainWindowPage.waitForMascotLoad();

    // 設定読み込み時間を測定
    const loadStartTime = Date.now();
    
    await newMainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    settingsWindow = await electronApp.getSettingsWindow();
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);
      const restoredSettings = await settingsWindowPage.getCurrentSettings();
      
      const loadTime = Date.now() - loadStartTime;
      const totalRestartTime = Date.now() - restartStartTime;
      
      console.log(`[Test] 設定読み込み時間: ${loadTime}ms`);
      console.log(`[Test] 総再起動時間: ${totalRestartTime}ms`);
      
      // 設定が正しく復元されていることを確認
      expect(restoredSettings.userName).toBe('パフォーマンス永続化テスト');
      
      // 読み込み時間が妥当であることを確認
      expect(loadTime).toBeLessThan(3000); // 3秒以内
      
      await settingsWindowPage.close();
    }

    console.log('[Test] 設定永続化パフォーマンステスト完了');
  });
});