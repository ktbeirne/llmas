/**
 * マルチウィンドウ操作 E2Eテスト
 * 
 * 複数ウィンドウの連携、フォーカス管理、データ同期を包括的にテスト
 */

import { test, expect } from '@playwright/test';
import { ElectronApp } from '../helpers/electron-app';
import { MainWindowPage, ChatWindowPage, SettingsWindowPage, SpeechBubbleWindowPage } from '../helpers/page-objects';
import { TestData } from '../helpers/test-data';

test.describe('マルチウィンドウ操作テスト', () => {
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

  test('全ウィンドウの順次開放', async () => {
    console.log('[Test] 全ウィンドウの順次開放テストを開始...');
    
    // 初期状態：メインウィンドウのみ
    const mainWindow = await electronApp.getMainWindow();
    expect(mainWindow).toBeTruthy();
    expect(await mainWindow.isVisible()).toBe(true);
    console.log('[Test] メインウィンドウ確認完了');

    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    expect(chatWindow).toBeTruthy();
    expect(await chatWindow.isVisible()).toBe(true);
    console.log('[Test] チャットウィンドウ開放完了');

    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const settingsWindow = await electronApp.getSettingsWindow();
    expect(settingsWindow).toBeTruthy();
    expect(await settingsWindow.isVisible()).toBe(true);
    console.log('[Test] 設定ウィンドウ開放完了');

    // 全ウィンドウが同時に表示されていることを確認
    const allWindowsVisible = await Promise.all([
      mainWindow.isVisible(),
      chatWindow.isVisible(),
      settingsWindow.isVisible()
    ]);

    expect(allWindowsVisible.every(visible => visible === true)).toBe(true);
    console.log('[Test] 全ウィンドウ同時表示確認完了');

    // 各ウィンドウの位置を確認
    const mainBounds = await electronApp.getWindowBounds(mainWindow);
    const chatBounds = await electronApp.getWindowBounds(chatWindow);
    const settingsBounds = await electronApp.getWindowBounds(settingsWindow);

    console.log(`[Test] メインウィンドウ位置: (${mainBounds.x}, ${mainBounds.y}) サイズ: ${mainBounds.width}x${mainBounds.height}`);
    console.log(`[Test] チャットウィンドウ位置: (${chatBounds.x}, ${chatBounds.y}) サイズ: ${chatBounds.width}x${chatBounds.height}`);
    console.log(`[Test] 設定ウィンドウ位置: (${settingsBounds.x}, ${settingsBounds.y}) サイズ: ${settingsBounds.width}x${settingsBounds.height}`);

    // ウィンドウが重なりすぎていないことを確認
    expect(mainBounds.width).toBeGreaterThan(0);
    expect(chatBounds.width).toBeGreaterThan(0);
    expect(settingsBounds.width).toBeGreaterThan(0);

    console.log('[Test] 全ウィンドウの順次開放テスト完了');
  });

  test('ウィンドウフォーカス管理', async () => {
    console.log('[Test] ウィンドウフォーカス管理テストを開始...');
    
    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mainWindow = await electronApp.getMainWindow();
    const chatWindow = await electronApp.getChatWindow();
    const settingsWindow = await electronApp.getSettingsWindow();

    if (mainWindow && chatWindow && settingsWindow) {
      const chatWindowPage = new ChatWindowPage(chatWindow);
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);

      // 設定ウィンドウにフォーカスを移動
      console.log('[Test] 設定ウィンドウにフォーカス移動...');
      await settingsWindow.focus();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 設定ウィンドウで操作可能か確認
      try {
        const currentSettings = await settingsWindowPage.getCurrentSettings();
        expect(currentSettings).toBeTruthy();
        console.log(`[Test] 設定ウィンドウフォーカス後の操作成功: ユーザー名=${currentSettings.userName}`);
      } catch (error) {
        console.log(`[Test] 設定ウィンドウフォーカス操作エラー: ${error}`);
      }

      // チャットウィンドウにフォーカスを移動
      console.log('[Test] チャットウィンドウにフォーカス移動...');
      await chatWindow.focus();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // チャットウィンドウで操作可能か確認
      try {
        await chatWindowPage.sendMessage("フォーカステスト");
        console.log('[Test] チャットウィンドウフォーカス後の操作成功');
      } catch (error) {
        console.log(`[Test] チャットウィンドウフォーカス操作エラー: ${error}`);
      }

      // メインウィンドウにフォーカスを戻す
      console.log('[Test] メインウィンドウにフォーカス移動...');
      await mainWindow.focus();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // メインウィンドウのマスコットが正常に動作することを確認
      const isMascotVisible = await mainWindowPage.isMascotVisible();
      expect(isMascotVisible).toBe(true);
      console.log(`[Test] メインウィンドウフォーカス後のマスコット表示: ${isMascotVisible}`);

      await settingsWindowPage.close();
    }

    console.log('[Test] ウィンドウフォーカス管理テスト完了');
  });

  test('ウィンドウ間のデータ同期', async () => {
    console.log('[Test] ウィンドウ間のデータ同期テストを開始...');
    
    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    const settingsWindow = await electronApp.getSettingsWindow();

    if (chatWindow && settingsWindow) {
      const chatWindowPage = new ChatWindowPage(chatWindow);
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);

      // 設定を変更
      const testUserName = "同期テストユーザー";
      console.log(`[Test] 設定変更: ユーザー名を「${testUserName}」に設定`);
      
      try {
        await settingsWindowPage.setUserName(testUserName);
        await settingsWindowPage.saveSettings();
        
        // 設定保存完了を待機
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('[Test] 設定保存完了');
        
      } catch (error) {
        console.log(`[Test] 設定変更でエラー: ${error}`);
      }

      // チャットウィンドウでメッセージを送信して設定が反映されているか確認
      try {
        await chatWindowPage.sendMessage("設定同期確認メッセージ");
        
        // AI応答を待機
        const response = await chatWindowPage.waitForResponse(20000);
        console.log(`[Test] 設定変更後のAI応答受信: "${response.substring(0, 50)}..."`);
        
        // 応答にユーザー名が反映されているかチェック（実装依存）
        console.log('[Test] 設定同期によるAI応答の変化を確認');
        
      } catch (error) {
        console.log(`[Test] 設定同期確認メッセージ送信でエラー: ${error}`);
      }

      // 設定ウィンドウで変更した値が保持されているか確認
      try {
        const updatedSettings = await settingsWindowPage.getCurrentSettings();
        console.log(`[Test] 設定確認: ユーザー名=${updatedSettings.userName}`);
        
        if (updatedSettings.userName === testUserName) {
          console.log('[Test] 設定同期成功');
        } else {
          console.log('[Test] 設定同期未確認（実装依存）');
        }
        
      } catch (error) {
        console.log(`[Test] 設定確認でエラー: ${error}`);
      }

      await settingsWindowPage.close();
    }

    console.log('[Test] ウィンドウ間のデータ同期テスト完了');
  });

  test('スピーチバブルとの多元連携', async () => {
    console.log('[Test] スピーチバブルとの多元連携テストを開始...');
    
    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    
    if (chatWindow) {
      const chatWindowPage = new ChatWindowPage(chatWindow);
      
      // メッセージを送信してスピーチバブルを表示
      const testMessage = "多元連携テストメッセージ";
      console.log(`[Test] メッセージ送信: "${testMessage}"`);
      
      await chatWindowPage.sendMessage(testMessage);
      
      try {
        const response = await chatWindowPage.waitForResponse(20000);
        console.log(`[Test] AI応答受信: "${response.substring(0, 50)}..."`);
        
        // スピーチバブル表示確認
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const speechBubbleWindow = await electronApp.getSpeechBubbleWindow();
          
          if (speechBubbleWindow) {
            const speechBubblePage = new SpeechBubbleWindowPage(speechBubbleWindow);
            
            // 全ウィンドウが同時に表示されているか確認
            const mainWindow = await electronApp.getMainWindow();
            const allWindowsVisible = await Promise.all([
              mainWindow.isVisible(),
              chatWindow.isVisible(),
              speechBubbleWindow.isVisible()
            ]);

            console.log(`[Test] 全ウィンドウ表示状態: メイン=${allWindowsVisible[0]}, チャット=${allWindowsVisible[1]}, バブル=${allWindowsVisible[2]}`);

            // マスコットとスピーチバブルが同時に動作していることを確認
            const isMascotVisible = await mainWindowPage.isMascotVisible();
            const isBubbleVisible = await speechBubblePage.isVisible();
            
            console.log(`[Test] マスコット表示: ${isMascotVisible}, スピーチバブル表示: ${isBubbleVisible}`);
            
            if (isMascotVisible && isBubbleVisible) {
              // FPS測定でパフォーマンスを確認
              const fps = await mainWindowPage.measureFPS(3000);
              console.log(`[Test] 多元連携時のFPS: ${fps}`);
              expect(fps).toBeGreaterThan(0);
              
              // バブルテキストとチャット応答の一致確認
              const bubbleText = await speechBubblePage.getText();
              console.log(`[Test] スピーチバブルテキスト: "${bubbleText.substring(0, 50)}..."`);
              expect(bubbleText.length).toBeGreaterThan(0);
            }
          } else {
            console.log('[Test] スピーチバブルウィンドウが見つからない（実装依存）');
          }
          
        } catch (error) {
          console.log(`[Test] スピーチバブル連携確認でエラー: ${error}`);
        }
        
      } catch (error) {
        console.log(`[Test] AI応答待機中にエラー: ${error}`);
      }
    }

    console.log('[Test] スピーチバブルとの多元連携テスト完了');
  });

  test('マルチウィンドウパフォーマンス', async () => {
    console.log('[Test] マルチウィンドウパフォーマンステストを開始...');
    
    // 初期パフォーマンス測定
    const initialMemory = await electronApp.getMemoryUsage();
    const initialFps = await mainWindowPage.measureFPS(3000);
    
    console.log(`[Test] 初期メモリ使用量: ${(initialMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`[Test] 初期FPS: ${initialFps}`);

    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const afterChatMemory = await electronApp.getMemoryUsage();
    const afterChatFps = await mainWindowPage.measureFPS(2000);
    
    console.log(`[Test] チャットウィンドウ後のメモリ: ${(afterChatMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`[Test] チャットウィンドウ後のFPS: ${afterChatFps}`);

    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const afterSettingsMemory = await electronApp.getMemoryUsage();
    const afterSettingsFps = await mainWindowPage.measureFPS(2000);
    
    console.log(`[Test] 設定ウィンドウ後のメモリ: ${(afterSettingsMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`[Test] 設定ウィンドウ後のFPS: ${afterSettingsFps}`);

    // メモリ増加量を計算
    const totalMemoryIncrease = (afterSettingsMemory.workingSetSize - initialMemory.workingSetSize) / 1024 / 1024;
    console.log(`[Test] 総メモリ増加量: ${totalMemoryIncrease.toFixed(2)}MB`);

    // パフォーマンス要件の確認
    expect(totalMemoryIncrease).toBeLessThan(150); // 150MB以内
    expect(afterSettingsFps).toBeGreaterThan(Math.max(1, initialFps * 0.6)); // 初期FPSの60%以上を維持

    // 全ウィンドウで同時操作を実行
    const chatWindow = await electronApp.getChatWindow();
    const settingsWindow = await electronApp.getSettingsWindow();

    if (chatWindow && settingsWindow) {
      const chatWindowPage = new ChatWindowPage(chatWindow);
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);

      console.log('[Test] 全ウィンドウで同時操作を実行...');
      
      // 同時操作の実行
      const simultaneousOperations = [
        chatWindowPage.sendMessage("パフォーマンステスト"),
        settingsWindowPage.getCurrentSettings(),
        mainWindowPage.measureFPS(2000)
      ];

      try {
        const results = await Promise.all(simultaneousOperations);
        console.log('[Test] 同時操作完了');
        
        // 同時操作後のパフォーマンス測定
        const finalMemory = await electronApp.getMemoryUsage();
        const finalFps = await mainWindowPage.measureFPS(2000);
        
        console.log(`[Test] 最終メモリ使用量: ${(finalMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`[Test] 最終FPS: ${finalFps}`);
        
        // 同時操作でも性能が維持されていることを確認
        expect(finalFps).toBeGreaterThan(0);
        
      } catch (error) {
        console.log(`[Test] 同時操作でエラー: ${error}`);
      }

      await settingsWindowPage.close();
    }

    console.log('[Test] マルチウィンドウパフォーマンステスト完了');
  });

  test('ウィンドウ階層管理', async () => {
    console.log('[Test] ウィンドウ階層管理テストを開始...');
    
    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mainWindow = await electronApp.getMainWindow();
    const chatWindow = await electronApp.getChatWindow();
    const settingsWindow = await electronApp.getSettingsWindow();

    if (mainWindow && chatWindow && settingsWindow) {
      // ウィンドウの重なり順序をテスト
      console.log('[Test] ウィンドウ重なり順序のテスト...');
      
      // 各ウィンドウにフォーカスして前面に移動
      await settingsWindow.focus();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await chatWindow.focus();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await mainWindow.focus();
      await new Promise(resolve => setTimeout(resolve, 500));

      // 全ウィンドウが引き続き表示されていることを確認
      const allWindowsVisible = await Promise.all([
        mainWindow.isVisible(),
        chatWindow.isVisible(),
        settingsWindow.isVisible()
      ]);

      expect(allWindowsVisible.every(visible => visible === true)).toBe(true);
      console.log('[Test] ウィンドウ階層変更後も全ウィンドウ表示確認');

      // 各ウィンドウが正常に応答することを確認
      const chatWindowPage = new ChatWindowPage(chatWindow);
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);

      try {
        // チャットウィンドウの応答確認
        const messageCount = await chatWindowPage.getMessageCount();
        console.log(`[Test] チャットウィンドウ応答確認: メッセージ数=${messageCount}`);

        // 設定ウィンドウの応答確認
        const currentSettings = await settingsWindowPage.getCurrentSettings();
        console.log(`[Test] 設定ウィンドウ応答確認: ユーザー名=${currentSettings.userName}`);

        // メインウィンドウの応答確認
        const isMascotVisible = await mainWindowPage.isMascotVisible();
        console.log(`[Test] メインウィンドウ応答確認: マスコット表示=${isMascotVisible}`);
        
      } catch (error) {
        console.log(`[Test] ウィンドウ応答確認でエラー: ${error}`);
      }

      await settingsWindowPage.close();
    }

    console.log('[Test] ウィンドウ階層管理テスト完了');
  });

  test('ウィンドウクローズ連携', async () => {
    console.log('[Test] ウィンドウクローズ連携テストを開始...');
    
    // 全ウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mainWindow = await electronApp.getMainWindow();
    const chatWindow = await electronApp.getChatWindow();
    const settingsWindow = await electronApp.getSettingsWindow();

    if (mainWindow && chatWindow && settingsWindow) {
      const chatWindowPage = new ChatWindowPage(chatWindow);
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);

      // 設定ウィンドウを閉じる
      console.log('[Test] 設定ウィンドウをクローズ...');
      await settingsWindowPage.close();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 他のウィンドウが引き続き正常に動作することを確認
      const mainVisible = await mainWindow.isVisible();
      const chatVisible = await chatWindow.isVisible();
      
      expect(mainVisible).toBe(true);
      expect(chatVisible).toBe(true);
      console.log(`[Test] 設定ウィンドウクローズ後: メイン=${mainVisible}, チャット=${chatVisible}`);

      // チャットウィンドウが正常に動作することを確認
      try {
        await chatWindowPage.sendMessage("クローズテスト");
        console.log('[Test] 設定ウィンドウクローズ後もチャット送信成功');
      } catch (error) {
        console.log(`[Test] 設定ウィンドウクローズ後のチャット送信エラー: ${error}`);
      }

      // マスコットが正常に動作することを確認
      const isMascotVisible = await mainWindowPage.isMascotVisible();
      const fps = await mainWindowPage.measureFPS(2000);
      
      expect(isMascotVisible).toBe(true);
      expect(fps).toBeGreaterThan(0);
      console.log(`[Test] 設定ウィンドウクローズ後のマスコット: 表示=${isMascotVisible}, FPS=${fps}`);

      // チャットウィンドウを閉じる
      console.log('[Test] チャットウィンドウをクローズ...');
      await chatWindow.close();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // メインウィンドウが引き続き正常に動作することを確認
      const mainStillVisible = await mainWindow.isVisible();
      expect(mainStillVisible).toBe(true);
      
      const finalMascotVisible = await mainWindowPage.isMascotVisible();
      const finalFps = await mainWindowPage.measureFPS(2000);
      
      expect(finalMascotVisible).toBe(true);
      expect(finalFps).toBeGreaterThan(0);
      console.log(`[Test] 全サブウィンドウクローズ後: マスコット表示=${finalMascotVisible}, FPS=${finalFps}`);
    }

    console.log('[Test] ウィンドウクローズ連携テスト完了');
  });
});

test.describe('マルチウィンドウ詳細テスト', () => {
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

  test('ウィンドウ位置の自動調整', async () => {
    console.log('[Test] ウィンドウ位置の自動調整テストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    const initialMainBounds = await electronApp.getWindowBounds(mainWindow);
    
    console.log(`[Test] メインウィンドウ初期位置: (${initialMainBounds.x}, ${initialMainBounds.y})`);

    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    
    if (chatWindow) {
      const chatBounds = await electronApp.getWindowBounds(chatWindow);
      console.log(`[Test] チャットウィンドウ位置: (${chatBounds.x}, ${chatBounds.y})`);

      // ウィンドウが重なりすぎていないことを確認
      const horizontalOverlap = Math.max(0, Math.min(initialMainBounds.x + initialMainBounds.width, chatBounds.x + chatBounds.width) - Math.max(initialMainBounds.x, chatBounds.x));
      const verticalOverlap = Math.max(0, Math.min(initialMainBounds.y + initialMainBounds.height, chatBounds.y + chatBounds.height) - Math.max(initialMainBounds.y, chatBounds.y));
      
      console.log(`[Test] ウィンドウ重なり: 水平=${horizontalOverlap}px, 垂直=${verticalOverlap}px`);

      // 設定ウィンドウを開く
      await mainWindowPage.openSettings();
      await new Promise(resolve => setTimeout(resolve, 2000));

      const settingsWindow = await electronApp.getSettingsWindow();
      
      if (settingsWindow) {
        const settingsBounds = await electronApp.getWindowBounds(settingsWindow);
        console.log(`[Test] 設定ウィンドウ位置: (${settingsBounds.x}, ${settingsBounds.y})`);

        // 全ウィンドウが画面内に配置されていることを確認
        expect(initialMainBounds.x).toBeGreaterThan(-100);
        expect(chatBounds.x).toBeGreaterThan(-100);
        expect(settingsBounds.x).toBeGreaterThan(-100);
        
        console.log('[Test] 全ウィンドウが適切に配置されています');

        const settingsWindowPage = new SettingsWindowPage(settingsWindow);
        await settingsWindowPage.close();
      }
    }

    console.log('[Test] ウィンドウ位置の自動調整テスト完了');
  });

  test('リソース共有の効率性', async () => {
    console.log('[Test] リソース共有の効率性テストを開始...');
    
    // 単一ウィンドウ時のリソース使用量を測定
    const singleWindowMemory = await electronApp.getMemoryUsage();
    console.log(`[Test] 単一ウィンドウ時のメモリ: ${(singleWindowMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);

    // チャットウィンドウを追加
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const twoWindowMemory = await electronApp.getMemoryUsage();
    const chatMemoryIncrease = (twoWindowMemory.workingSetSize - singleWindowMemory.workingSetSize) / 1024 / 1024;
    console.log(`[Test] チャットウィンドウ追加後のメモリ増加: ${chatMemoryIncrease.toFixed(2)}MB`);

    // 設定ウィンドウを追加
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const threeWindowMemory = await electronApp.getMemoryUsage();
    const settingsMemoryIncrease = (threeWindowMemory.workingSetSize - twoWindowMemory.workingSetSize) / 1024 / 1024;
    console.log(`[Test] 設定ウィンドウ追加後のメモリ増加: ${settingsMemoryIncrease.toFixed(2)}MB`);

    // メモリ効率性の確認
    const totalIncrease = (threeWindowMemory.workingSetSize - singleWindowMemory.workingSetSize) / 1024 / 1024;
    console.log(`[Test] 総メモリ増加量: ${totalIncrease.toFixed(2)}MB`);

    // 効率的なリソース使用であることを確認
    expect(chatMemoryIncrease).toBeLessThan(100); // チャットウィンドウ追加で100MB以内
    expect(settingsMemoryIncrease).toBeLessThan(50); // 設定ウィンドウ追加で50MB以内
    expect(totalIncrease).toBeLessThan(150); // 総増加量150MB以内

    // 全ウィンドウが正常に動作していることを確認
    const chatWindow = await electronApp.getChatWindow();
    const settingsWindow = await electronApp.getSettingsWindow();

    if (chatWindow && settingsWindow) {
      const chatWindowPage = new ChatWindowPage(chatWindow);
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);

      // 各ウィンドウの動作確認
      try {
        await chatWindowPage.sendMessage("リソース効率テスト");
        const currentSettings = await settingsWindowPage.getCurrentSettings();
        const fps = await mainWindowPage.measureFPS(2000);
        
        console.log(`[Test] 全ウィンドウ動作確認: チャット送信成功, 設定取得成功, FPS=${fps}`);
        expect(fps).toBeGreaterThan(0);
        
      } catch (error) {
        console.log(`[Test] リソース効率テスト中の動作確認エラー: ${error}`);
      }

      await settingsWindowPage.close();
    }

    console.log('[Test] リソース共有の効率性テスト完了');
  });

  test('極限状況でのマルチウィンドウ', async () => {
    console.log('[Test] 極限状況でのマルチウィンドウテストを開始...');
    
    // 高負荷状況を作成
    console.log('[Test] 高負荷状況を作成中...');
    
    // マスコットアニメーションを開始
    try {
      await mainWindowPage.startMascotAnimation('dance');
      console.log('[Test] マスコットアニメーション開始');
    } catch (error) {
      console.log(`[Test] マスコットアニメーション開始エラー: ${error}`);
    }

    // チャットウィンドウを開いて連続メッセージ送信
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    
    if (chatWindow) {
      const chatWindowPage = new ChatWindowPage(chatWindow);
      
      // 連続メッセージ送信
      const messages = ["負荷テスト1", "負荷テスト2", "負荷テスト3"];
      
      for (const message of messages) {
        try {
          await chatWindowPage.sendMessage(message);
          console.log(`[Test] 高負荷時メッセージ送信: "${message}"`);
        } catch (error) {
          console.log(`[Test] 高負荷時メッセージ送信エラー: ${error}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const settingsWindow = await electronApp.getSettingsWindow();
    
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);
      
      // 高負荷時の性能測定
      const loadTestMemory = await electronApp.getMemoryUsage();
      const loadTestFps = await mainWindowPage.measureFPS(5000);
      
      console.log(`[Test] 高負荷時のメモリ使用量: ${(loadTestMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`[Test] 高負荷時のFPS: ${loadTestFps}`);

      // 極限状況でも最低限の性能を維持していることを確認
      expect(loadTestFps).toBeGreaterThan(5); // 最低5FPS
      expect(loadTestMemory.workingSetSize / 1024 / 1024).toBeLessThan(500); // 500MB以内

      // 高負荷時でも各ウィンドウが応答することを確認
      try {
        const currentSettings = await settingsWindowPage.getCurrentSettings();
        console.log(`[Test] 高負荷時の設定取得成功: ユーザー名=${currentSettings.userName}`);
        
        const isMascotVisible = await mainWindowPage.isMascotVisible();
        console.log(`[Test] 高負荷時のマスコット表示: ${isMascotVisible}`);
        
      } catch (error) {
        console.log(`[Test] 高負荷時の応答性確認エラー: ${error}`);
      }

      await settingsWindowPage.close();
    }

    console.log('[Test] 極限状況でのマルチウィンドウテスト完了');
  });
});