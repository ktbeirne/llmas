/**
 * 初回セットアップフロー E2Eテスト
 * 
 * 初回起動時のユーザーセットアップ体験のテスト
 */

import { test, expect } from '@playwright/test';
import { ElectronApp } from '../helpers/electron-app';
import { MainWindowPage, SettingsWindowPage } from '../helpers/page-objects';
import { TestData } from '../helpers/test-data';
import fs from 'fs/promises';
import path from 'path';

test.describe('初回セットアップフローテスト', () => {
  let electronApp: ElectronApp;
  let mainWindowPage: MainWindowPage;

  test.beforeEach(async () => {
    electronApp = new ElectronApp();
    
    // 設定ファイルをクリアして初回起動状態を作成
    await clearUserSettings();
  });

  test.afterEach(async () => {
    if (electronApp && electronApp.isRunning()) {
      await electronApp.close();
    }
  });

  test('完全な初回セットアップフロー', async () => {
    console.log('[Test] 完全な初回セットアップフローテストを開始...');
    
    // 初回起動
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const mainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(mainWindow);

    // 初回起動時のウェルカム画面や設定プロンプトをチェック
    console.log('[Test] 初回起動の確認中...');
    
    // アプリケーションが起動していることを確認
    expect(await mainWindow.isVisible()).toBe(true);
    
    // 初回起動時の特別な表示があるかチェック
    try {
      // ウェルカムメッセージやセットアップボタンの確認
      const welcomeMessage = await mainWindow.locator('[data-testid="welcome-message"]').textContent({ timeout: 5000 });
      if (welcomeMessage) {
        console.log(`[Test] ウェルカムメッセージ検出: ${welcomeMessage}`);
        expect(welcomeMessage).toContain('ようこそ');
      }
    } catch (error) {
      console.log('[Test] ウェルカムメッセージは表示されていません（通常起動）');
    }

    // デフォルトマスコットの読み込みを待機
    await mainWindowPage.waitForMascotLoad();
    
    // マスコットが表示されていることを確認
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);

    console.log('[Test] 基本的な初回起動確認完了');

    // 設定ウィンドウを開いて初期セットアップを開始
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const settingsWindow = await electronApp.getSettingsWindow();
    expect(settingsWindow).toBeTruthy();

    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);

      // 初回セットアップの設定を行う
      console.log('[Test] 初回セットアップ設定を開始...');
      
      // ユーザー名の設定
      const testUserName = '初回セットアップユーザー';
      await settingsWindowPage.setUserName(testUserName);
      
      // マスコット名の設定
      const testMascotName = '初回マスコット';
      await settingsWindowPage.setMascotName(testMascotName);
      
      // テーマの選択
      await settingsWindowPage.changeTheme('light');
      
      // カメラ設定
      const initialCameraSettings = TestData.cameraVariations()[0];
      await settingsWindowPage.setCameraSettings(initialCameraSettings);

      // 設定を保存
      await settingsWindowPage.saveSettings();
      
      // 成功メッセージの確認
      const successMessage = await settingsWindowPage.getSuccessMessage();
      expect(successMessage).toBeTruthy();
      console.log(`[Test] 設定保存成功: ${successMessage}`);
      
      // 設定ウィンドウを閉じる
      await settingsWindowPage.close();
    }

    console.log('[Test] 初回セットアップ完了');

    // 設定が適用されていることを確認
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // アプリケーションが正常に動作していることを確認
    expect(await mainWindow.isVisible()).toBe(true);
    const finalMascotCheck = await mainWindowPage.isMascotVisible();
    expect(finalMascotCheck).toBe(true);

    console.log('[Test] 完全な初回セットアップフローテスト完了');
  });

  test('デフォルト設定での初回起動', async () => {
    console.log('[Test] デフォルト設定初回起動テストを開始...');
    
    // 初回起動
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const mainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    // デフォルト設定で正常に動作することを確認
    expect(await mainWindow.isVisible()).toBe(true);
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);

    // 設定ウィンドウを開いてデフォルト値を確認
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const settingsWindow = await electronApp.getSettingsWindow();
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);
      
      const currentSettings = await settingsWindowPage.getCurrentSettings();
      
      // デフォルト値の確認
      console.log(`[Test] デフォルトユーザー名: ${currentSettings.userName}`);
      console.log(`[Test] デフォルトマスコット名: ${currentSettings.mascotName}`);
      console.log(`[Test] デフォルトテーマ: ${currentSettings.theme}`);
      
      // デフォルト値が設定されていることを確認
      expect(currentSettings.userName).toBeTruthy();
      expect(currentSettings.mascotName).toBeTruthy();
      expect(['light', 'dark', 'auto']).toContain(currentSettings.theme);
      
      await settingsWindowPage.close();
    }

    console.log('[Test] デフォルト設定初回起動テスト完了');
  });

  test('設定の段階的セットアップ', async () => {
    console.log('[Test] 段階的セットアップテストを開始...');
    
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const mainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    // 段階1: ユーザー名のみ設定
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 1000));

    let settingsWindow = await electronApp.getSettingsWindow();
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);
      
      await settingsWindowPage.setUserName('段階1ユーザー');
      await settingsWindowPage.saveSettings();
      await settingsWindowPage.close();
    }

    console.log('[Test] 段階1（ユーザー名）完了');

    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 段階2: マスコット名を追加
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 1000));

    settingsWindow = await electronApp.getSettingsWindow();
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);
      
      await settingsWindowPage.setMascotName('段階2マスコット');
      await settingsWindowPage.saveSettings();
      await settingsWindowPage.close();
    }

    console.log('[Test] 段階2（マスコット名）完了');

    // 段階3: テーマとカメラ設定を追加
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 1000));

    settingsWindow = await electronApp.getSettingsWindow();
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);
      
      await settingsWindowPage.changeTheme('dark');
      
      const customCameraSettings = TestData.cameraVariations()[1];
      await settingsWindowPage.setCameraSettings(customCameraSettings);
      
      await settingsWindowPage.saveSettings();
      
      // 最終的な設定を確認
      const finalSettings = await settingsWindowPage.getCurrentSettings();
      expect(finalSettings.userName).toBe('段階1ユーザー');
      expect(finalSettings.mascotName).toBe('段階2マスコット');
      expect(finalSettings.theme).toBe('dark');
      
      await settingsWindowPage.close();
    }

    console.log('[Test] 段階的セットアップテスト完了');
  });

  test('無効な設定での初回セットアップ', async () => {
    console.log('[Test] 無効な設定セットアップテストを開始...');
    
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

      // 無効な設定を試行
      console.log('[Test] 無効な設定を試行中...');
      
      // 空の名前を設定
      await settingsWindowPage.setUserName('');
      await settingsWindowPage.setMascotName('');

      // 無効なカメラ設定
      const invalidCameraSettings = {
        position: { x: 999999, y: -999999, z: 0 },
        target: { x: 0, y: 0, z: 0 },
        zoom: -1
      };
      
      try {
        await settingsWindowPage.setCameraSettings(invalidCameraSettings);
        await settingsWindowPage.saveSettings();
        
        // エラーメッセージの確認
        const errorMessage = await settingsWindowPage.getErrorMessage();
        if (errorMessage) {
          console.log(`[Test] 期待されるエラーメッセージ: ${errorMessage}`);
        }
        
      } catch (error) {
        console.log(`[Test] 無効な設定でエラーが発生（期待される動作）: ${error}`);
      }

      // 有効な設定に戻す
      await settingsWindowPage.setUserName('修正後ユーザー');
      await settingsWindowPage.setMascotName('修正後マスコット');
      
      const validCameraSettings = TestData.cameraVariations()[0];
      await settingsWindowPage.setCameraSettings(validCameraSettings);
      
      await settingsWindowPage.saveSettings();
      
      // 成功メッセージの確認
      const successMessage = await settingsWindowPage.getSuccessMessage();
      expect(successMessage).toBeTruthy();
      
      await settingsWindowPage.close();
    }

    console.log('[Test] 無効な設定セットアップテスト完了');
  });

  test('VRMファイル選択での初回セットアップ', async () => {
    console.log('[Test] VRMファイル選択セットアップテストを開始...');
    
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const mainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    // VRMファイルパスを準備
    const vrmFiles = TestData.vrmFiles();
    
    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const settingsWindow = await electronApp.getSettingsWindow();
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);

      // 基本設定
      await settingsWindowPage.setUserName('VRMテストユーザー');
      await settingsWindowPage.setMascotName('VRMテストマスコット');

      // VRMファイル選択のテスト
      try {
        console.log('[Test] VRMファイル選択をテスト中...');
        
        // テスト用のVRMファイルパスを使用（実際のファイルは存在しない可能性がある）
        await settingsWindowPage.selectVrmFile(vrmFiles.valid);
        
        console.log('[Test] VRMファイル選択完了');
        
      } catch (error) {
        console.log(`[Test] VRMファイル選択中にエラー（期待される動作）: ${error}`);
      }

      // 基本設定を保存
      await settingsWindowPage.saveSettings();
      
      // 設定が保存されたことを確認
      const successMessage = await settingsWindowPage.getSuccessMessage();
      if (successMessage) {
        console.log(`[Test] 設定保存成功: ${successMessage}`);
      }
      
      await settingsWindowPage.close();
    }

    // VRMファイル変更後もアプリケーションが正常に動作することを確認
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    expect(await mainWindow.isVisible()).toBe(true);
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);

    console.log('[Test] VRMファイル選択セットアップテスト完了');
  });

  test('設定のリセットと再セットアップ', async () => {
    console.log('[Test] 設定リセットと再セットアップテストを開始...');
    
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const mainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    // 初期設定を行う
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    let settingsWindow = await electronApp.getSettingsWindow();
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);

      // 初期設定
      await settingsWindowPage.setUserName('リセット前ユーザー');
      await settingsWindowPage.setMascotName('リセット前マスコット');
      await settingsWindowPage.changeTheme('dark');
      await settingsWindowPage.saveSettings();
      
      console.log('[Test] 初期設定完了');
      
      // 設定をリセット
      await settingsWindowPage.resetSettings();
      
      console.log('[Test] 設定リセット実行');
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // リセット後の設定を確認
      const resetSettings = await settingsWindowPage.getCurrentSettings();
      console.log(`[Test] リセット後ユーザー名: ${resetSettings.userName}`);
      console.log(`[Test] リセット後マスコット名: ${resetSettings.mascotName}`);
      console.log(`[Test] リセット後テーマ: ${resetSettings.theme}`);
      
      // 再設定
      await settingsWindowPage.setUserName('リセット後ユーザー');
      await settingsWindowPage.setMascotName('リセット後マスコット');
      await settingsWindowPage.changeTheme('light');
      await settingsWindowPage.saveSettings();
      
      // 最終設定を確認
      const finalSettings = await settingsWindowPage.getCurrentSettings();
      expect(finalSettings.userName).toBe('リセット後ユーザー');
      expect(finalSettings.mascotName).toBe('リセット後マスコット');
      expect(finalSettings.theme).toBe('light');
      
      await settingsWindowPage.close();
    }

    console.log('[Test] 設定リセットと再セットアップテスト完了');
  });

  test('設定の永続化確認', async () => {
    console.log('[Test] 設定永続化確認テストを開始...');
    
    // 初回起動で設定
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const mainWindow = await electronApp.getMainWindow();
    mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    const persistentUserName = '永続化テストユーザー';
    const persistentMascotName = '永続化テストマスコット';
    const persistentTheme = 'dark';

    // 設定を行う
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    let settingsWindow = await electronApp.getSettingsWindow();
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);

      await settingsWindowPage.setUserName(persistentUserName);
      await settingsWindowPage.setMascotName(persistentMascotName);
      await settingsWindowPage.changeTheme(persistentTheme);
      
      const persistentCameraSettings = TestData.cameraVariations()[2];
      await settingsWindowPage.setCameraSettings(persistentCameraSettings);
      
      await settingsWindowPage.saveSettings();
      await settingsWindowPage.close();
    }

    console.log('[Test] 初回設定完了、アプリケーションを再起動...');

    // アプリケーションを終了
    await electronApp.close();
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

    settingsWindow = await electronApp.getSettingsWindow();
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);
      
      const restoredSettings = await settingsWindowPage.getCurrentSettings();
      
      // 設定が正しく復元されていることを確認
      expect(restoredSettings.userName).toBe(persistentUserName);
      expect(restoredSettings.mascotName).toBe(persistentMascotName);
      expect(restoredSettings.theme).toBe(persistentTheme);
      
      console.log('[Test] 設定が正常に永続化されました');
      
      await settingsWindowPage.close();
    }

    console.log('[Test] 設定永続化確認テスト完了');
  });
});

test.describe('初回セットアップ エラーハンドリングテスト', () => {
  let electronApp: ElectronApp;

  test.beforeEach(async () => {
    electronApp = new ElectronApp();
    await clearUserSettings();
  });

  test.afterEach(async () => {
    if (electronApp && electronApp.isRunning()) {
      await electronApp.close();
    }
  });

  test('設定保存失敗時の処理', async () => {
    console.log('[Test] 設定保存失敗時の処理テストを開始...');
    
    await electronApp.launch({
      headless: false,
      timeout: 30000
    });

    const mainWindow = await electronApp.getMainWindow();
    const mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const settingsWindow = await electronApp.getSettingsWindow();
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);

      // 設定を入力
      await settingsWindowPage.setUserName('エラーテストユーザー');
      await settingsWindowPage.setMascotName('エラーテストマスコット');

      // 設定保存を試行（エラーが発生する可能性をテスト）
      try {
        await settingsWindowPage.saveSettings();
        
        // 成功した場合
        const successMessage = await settingsWindowPage.getSuccessMessage();
        if (successMessage) {
          console.log('[Test] 設定保存に成功しました');
        }
        
      } catch (error) {
        console.log(`[Test] 設定保存中にエラーが発生: ${error}`);
        
        // エラーメッセージの確認
        const errorMessage = await settingsWindowPage.getErrorMessage();
        if (errorMessage) {
          console.log(`[Test] エラーメッセージ: ${errorMessage}`);
        }
      }

      // アプリケーションが引き続き動作することを確認
      expect(await settingsWindow.isVisible()).toBe(true);
      
      await settingsWindowPage.close();
    }

    // メインウィンドウが正常に動作することを確認
    expect(await mainWindow.isVisible()).toBe(true);
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);

    console.log('[Test] 設定保存失敗時の処理テスト完了');
  });

  test('初回起動時のパフォーマンス', async () => {
    console.log('[Test] 初回起動パフォーマンステストを開始...');
    
    const maxInitialSetupTime = 15000; // 15秒以内
    const startTime = Date.now();
    
    await electronApp.launch({
      headless: false,
      timeout: maxInitialSetupTime + 10000
    });

    const mainWindow = await electronApp.getMainWindow();
    const mainWindowPage = new MainWindowPage(mainWindow);
    await mainWindowPage.waitForMascotLoad();

    const setupTime = Date.now() - startTime;
    console.log(`[Test] 初回セットアップ時間: ${setupTime}ms`);

    // セットアップ時間が制限内であることを確認
    expect(setupTime).toBeLessThan(maxInitialSetupTime);

    // 基本機能が動作することを確認
    expect(await mainWindow.isVisible()).toBe(true);
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);

    console.log('[Test] 初回起動パフォーマンステスト完了');
  });
});

/**
 * ユーザー設定をクリアして初回起動状態を作成
 */
async function clearUserSettings(): Promise<void> {
  try {
    const settingsPath = path.join(process.cwd(), 'test-data', 'user-settings.json');
    await fs.unlink(settingsPath);
    console.log('[Setup] ユーザー設定ファイルをクリアしました');
  } catch (error) {
    // ファイルが存在しない場合は無視
    console.log('[Setup] ユーザー設定ファイルが存在しません（初回起動状態）');
  }
}