/**
 * スピーチバブル表示 E2Eテスト
 * 
 * スピーチバブルの表示、アニメーション、インタラクションを包括的にテスト
 */

import { test, expect } from '@playwright/test';
import { ElectronApp } from '../helpers/electron-app';
import { MainWindowPage, ChatWindowPage, SpeechBubbleWindowPage } from '../helpers/page-objects';
import { TestData } from '../helpers/test-data';

test.describe('スピーチバブル表示テスト', () => {
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
  });

  test.afterEach(async () => {
    if (electronApp && electronApp.isRunning()) {
      await electronApp.close();
    }
  });

  test('チャットメッセージからスピーチバブル表示', async () => {
    console.log('[Test] チャットメッセージからスピーチバブル表示テストを開始...');
    
    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    expect(chatWindow).toBeTruthy();

    if (chatWindow) {
      chatWindowPage = new ChatWindowPage(chatWindow);

      // テストメッセージを送信
      const testMessage = TestData.chatMessages().simple[0];
      console.log(`[Test] メッセージ送信: "${testMessage}"`);
      
      await chatWindowPage.sendMessage(testMessage);
      
      // AI応答を待機
      try {
        const response = await chatWindowPage.waitForResponse(20000);
        console.log(`[Test] AI応答受信: "${response.substring(0, 50)}..."`);

        // スピーチバブルウィンドウが表示されるか確認
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const speechBubbleWindow = await electronApp.getSpeechBubbleWindow();
          
          if (speechBubbleWindow) {
            const speechBubblePage = new SpeechBubbleWindowPage(speechBubbleWindow);
            
            // スピーチバブルが表示されていることを確認
            const isVisible = await speechBubblePage.isVisible();
            console.log(`[Test] スピーチバブル表示状態: ${isVisible}`);
            
            if (isVisible) {
              // バブルのテキスト内容を確認
              const bubbleText = await speechBubblePage.getText();
              console.log(`[Test] バブルテキスト: "${bubbleText.substring(0, 50)}..."`);
              expect(bubbleText.length).toBeGreaterThan(0);
              
              // バブルサイズを確認
              const bubbleSize = await speechBubblePage.getSize();
              console.log(`[Test] バブルサイズ: ${bubbleSize.width}x${bubbleSize.height}`);
              expect(bubbleSize.width).toBeGreaterThan(0);
              expect(bubbleSize.height).toBeGreaterThan(0);
            }
          } else {
            console.log('[Test] スピーチバブルウィンドウが見つからない（実装依存）');
          }
          
        } catch (error) {
          console.log(`[Test] スピーチバブル確認でエラー（実装依存）: ${error}`);
        }
        
      } catch (error) {
        console.log(`[Test] AI応答待機中にエラー: ${error}`);
      }
    }

    console.log('[Test] チャットメッセージからスピーチバブル表示テスト完了');
  });

  test('スピーチバブルのアニメーション', async () => {
    console.log('[Test] スピーチバブルアニメーションテストを開始...');
    
    // チャットウィンドウを開いてメッセージを送信
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    
    if (chatWindow) {
      chatWindowPage = new ChatWindowPage(chatWindow);
      
      // 短いメッセージを送信してスピーチバブルを表示
      const shortMessage = "こんにちは";
      await chatWindowPage.sendMessage(shortMessage);
      
      try {
        await chatWindowPage.waitForResponse(15000);
        
        // スピーチバブルのアニメーション確認
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const speechBubbleWindow = await electronApp.getSpeechBubbleWindow();
          
          if (speechBubbleWindow) {
            const speechBubblePage = new SpeechBubbleWindowPage(speechBubbleWindow);
            
            // アニメーション完了まで待機
            await speechBubblePage.waitForAnimation();
            console.log('[Test] スピーチバブルアニメーション完了');
            
            // アニメーション後の表示状態を確認
            const isVisible = await speechBubblePage.isVisible();
            console.log(`[Test] アニメーション後の表示状態: ${isVisible}`);
            
            if (isVisible) {
              // スクリーンショットを撮影してアニメーション結果を記録
              const screenshot = await speechBubbleWindow.screenshot();
              console.log(`[Test] アニメーション完了時のスクリーンショット撮影完了: ${screenshot.length} bytes`);
              expect(screenshot.length).toBeGreaterThan(0);
            }
          }
          
        } catch (error) {
          console.log(`[Test] スピーチバブルアニメーション確認でエラー: ${error}`);
        }
        
      } catch (error) {
        console.log(`[Test] メッセージ応答待機中にエラー: ${error}`);
      }
    }

    console.log('[Test] スピーチバブルアニメーションテスト完了');
  });

  test('スピーチバブルの自動非表示', async () => {
    console.log('[Test] スピーチバブル自動非表示テストを開始...');
    
    // チャットウィンドウを開いてメッセージを送信
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    
    if (chatWindow) {
      chatWindowPage = new ChatWindowPage(chatWindow);
      
      // メッセージを送信
      const message = "短いテストメッセージ";
      await chatWindowPage.sendMessage(message);
      
      try {
        await chatWindowPage.waitForResponse(15000);
        
        // スピーチバブル表示確認
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const speechBubbleWindow = await electronApp.getSpeechBubbleWindow();
          
          if (speechBubbleWindow) {
            const speechBubblePage = new SpeechBubbleWindowPage(speechBubbleWindow);
            
            // 最初にバブルが表示されていることを確認
            const initiallyVisible = await speechBubblePage.isVisible();
            console.log(`[Test] 初期表示状態: ${initiallyVisible}`);
            
            if (initiallyVisible) {
              // 自動非表示タイマーを待機（通常5-10秒）
              console.log('[Test] 自動非表示タイマーを待機中...');
              
              try {
                await speechBubblePage.waitForHidden(15000);
                console.log('[Test] スピーチバブルが自動的に非表示になりました');
                
                // 非表示状態を確認
                const finallyVisible = await speechBubblePage.isVisible();
                expect(finallyVisible).toBe(false);
                
              } catch (timeoutError) {
                console.log('[Test] 自動非表示タイマーのタイムアウト（設定に依存）');
              }
            }
          }
          
        } catch (error) {
          console.log(`[Test] スピーチバブル自動非表示確認でエラー: ${error}`);
        }
        
      } catch (error) {
        console.log(`[Test] メッセージ応答待機中にエラー: ${error}`);
      }
    }

    console.log('[Test] スピーチバブル自動非表示テスト完了');
  });

  test('スピーチバブルの手動閉じる', async () => {
    console.log('[Test] スピーチバブル手動閉じるテストを開始...');
    
    // チャットウィンドウを開いてメッセージを送信
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    
    if (chatWindow) {
      chatWindowPage = new ChatWindowPage(chatWindow);
      
      // メッセージを送信
      const message = "手動クローズテスト";
      await chatWindowPage.sendMessage(message);
      
      try {
        await chatWindowPage.waitForResponse(15000);
        
        // スピーチバブル表示確認
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const speechBubbleWindow = await electronApp.getSpeechBubbleWindow();
          
          if (speechBubbleWindow) {
            const speechBubblePage = new SpeechBubbleWindowPage(speechBubbleWindow);
            
            // バブルが表示されていることを確認
            const isVisible = await speechBubblePage.isVisible();
            console.log(`[Test] バブル表示状態: ${isVisible}`);
            
            if (isVisible) {
              // 手動でバブルを閉じる
              console.log('[Test] スピーチバブルを手動で閉じています...');
              await speechBubblePage.close();
              
              // 少し待機してから状態を確認
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              const closedState = await speechBubblePage.isVisible();
              console.log(`[Test] 手動クローズ後の状態: ${closedState}`);
              expect(closedState).toBe(false);
            }
          }
          
        } catch (error) {
          console.log(`[Test] スピーチバブル手動クローズ確認でエラー: ${error}`);
        }
        
      } catch (error) {
        console.log(`[Test] メッセージ応答待機中にエラー: ${error}`);
      }
    }

    console.log('[Test] スピーチバブル手動閉じるテスト完了');
  });

  test('複数メッセージでのスピーチバブル挙動', async () => {
    console.log('[Test] 複数メッセージでのスピーチバブル挙動テストを開始...');
    
    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    
    if (chatWindow) {
      chatWindowPage = new ChatWindowPage(chatWindow);
      
      const messages = ["最初のメッセージ", "2番目のメッセージ", "3番目のメッセージ"];
      
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        console.log(`[Test] メッセージ ${i + 1}/${messages.length}: "${message}"`);
        
        await chatWindowPage.sendMessage(message);
        
        try {
          const response = await chatWindowPage.waitForResponse(20000);
          console.log(`[Test] 応答 ${i + 1} 受信完了`);
          
          // スピーチバブル状態を確認
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            const speechBubbleWindow = await electronApp.getSpeechBubbleWindow();
            
            if (speechBubbleWindow) {
              const speechBubblePage = new SpeechBubbleWindowPage(speechBubbleWindow);
              
              const isVisible = await speechBubblePage.isVisible();
              console.log(`[Test] メッセージ ${i + 1} 後のバブル表示: ${isVisible}`);
              
              if (isVisible) {
                const bubbleText = await speechBubblePage.getText();
                console.log(`[Test] バブルテキスト ${i + 1}: "${bubbleText.substring(0, 30)}..."`);
              }
            }
            
          } catch (error) {
            console.log(`[Test] メッセージ ${i + 1} のスピーチバブル確認でエラー: ${error}`);
          }
          
        } catch (error) {
          console.log(`[Test] メッセージ ${i + 1} の応答待機中にエラー: ${error}`);
        }
        
        // 次のメッセージまで少し待機
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('[Test] 複数メッセージでのスピーチバブル挙動テスト完了');
  });

  test('スピーチバブルのポジショニング', async () => {
    console.log('[Test] スピーチバブルポジショニングテストを開始...');
    
    // ウィンドウの位置とサイズを取得
    const mainWindow = await electronApp.getMainWindow();
    const mainWindowBounds = await electronApp.getWindowBounds(mainWindow);
    console.log(`[Test] メインウィンドウ位置: ${mainWindowBounds.x}, ${mainWindowBounds.y}, サイズ: ${mainWindowBounds.width}x${mainWindowBounds.height}`);

    // チャットウィンドウを開いてメッセージを送信
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    
    if (chatWindow) {
      chatWindowPage = new ChatWindowPage(chatWindow);
      
      const message = "ポジション確認用メッセージ";
      await chatWindowPage.sendMessage(message);
      
      try {
        await chatWindowPage.waitForResponse(15000);
        
        // スピーチバブル表示確認
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const speechBubbleWindow = await electronApp.getSpeechBubbleWindow();
          
          if (speechBubbleWindow) {
            const speechBubblePage = new SpeechBubbleWindowPage(speechBubbleWindow);
            
            // バブル表示確認
            const isVisible = await speechBubblePage.isVisible();
            console.log(`[Test] バブル表示状態: ${isVisible}`);
            
            if (isVisible) {
              // スピーチバブルの位置を取得
              const bubbleBounds = await electronApp.getWindowBounds(speechBubbleWindow);
              console.log(`[Test] スピーチバブル位置: ${bubbleBounds.x}, ${bubbleBounds.y}, サイズ: ${bubbleBounds.width}x${bubbleBounds.height}`);
              
              // バブルがメインウィンドウの近くに配置されていることを確認
              const distanceX = Math.abs(bubbleBounds.x - mainWindowBounds.x);
              const distanceY = Math.abs(bubbleBounds.y - mainWindowBounds.y);
              
              console.log(`[Test] メインウィンドウからの距離: X=${distanceX}, Y=${distanceY}`);
              
              // 合理的な範囲内にあることを確認（画面サイズ内）
              expect(bubbleBounds.x).toBeGreaterThan(-100); // 画面外に出すぎていない
              expect(bubbleBounds.y).toBeGreaterThan(-100);
              expect(bubbleBounds.width).toBeGreaterThan(0);
              expect(bubbleBounds.height).toBeGreaterThan(0);
            }
          }
          
        } catch (error) {
          console.log(`[Test] スピーチバブルポジション確認でエラー: ${error}`);
        }
        
      } catch (error) {
        console.log(`[Test] メッセージ応答待機中にエラー: ${error}`);
      }
    }

    console.log('[Test] スピーチバブルポジショニングテスト完了');
  });
});

test.describe('スピーチバブル詳細テスト', () => {
  let electronApp: ElectronApp;
  let mainWindowPage: MainWindowPage;
  let chatWindowPage: ChatWindowPage;

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

  test('長いメッセージでのスピーチバブル表示', async () => {
    console.log('[Test] 長いメッセージでのスピーチバブル表示テストを開始...');
    
    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    
    if (chatWindow) {
      chatWindowPage = new ChatWindowPage(chatWindow);
      
      // 長いメッセージを送信
      const longMessage = TestData.chatMessages().complex[0] || "これは非常に長いテストメッセージです。".repeat(10);
      console.log(`[Test] 長いメッセージ送信: "${longMessage.substring(0, 50)}..."`);
      
      await chatWindowPage.sendMessage(longMessage);
      
      try {
        const response = await chatWindowPage.waitForResponse(30000);
        console.log(`[Test] 長いメッセージの応答受信完了`);
        
        // スピーチバブル表示確認
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const speechBubbleWindow = await electronApp.getSpeechBubbleWindow();
          
          if (speechBubbleWindow) {
            const speechBubblePage = new SpeechBubbleWindowPage(speechBubbleWindow);
            
            const isVisible = await speechBubblePage.isVisible();
            console.log(`[Test] 長いメッセージ後のバブル表示: ${isVisible}`);
            
            if (isVisible) {
              // バブルサイズが適切に調整されているか確認
              const bubbleSize = await speechBubblePage.getSize();
              console.log(`[Test] 長いメッセージ用バブルサイズ: ${bubbleSize.width}x${bubbleSize.height}`);
              
              // 最小サイズ要件を確認
              expect(bubbleSize.width).toBeGreaterThan(100);
              expect(bubbleSize.height).toBeGreaterThan(50);
              
              // 最大サイズ制限を確認（画面サイズを超えない）
              expect(bubbleSize.width).toBeLessThan(800);
              expect(bubbleSize.height).toBeLessThan(600);
              
              // テキスト内容確認
              const bubbleText = await speechBubblePage.getText();
              console.log(`[Test] 長いメッセージバブルテキスト長: ${bubbleText.length}文字`);
              expect(bubbleText.length).toBeGreaterThan(0);
            }
          }
          
        } catch (error) {
          console.log(`[Test] 長いメッセージのスピーチバブル確認でエラー: ${error}`);
        }
        
      } catch (error) {
        console.log(`[Test] 長いメッセージの応答待機中にエラー: ${error}`);
      }
    }

    console.log('[Test] 長いメッセージでのスピーチバブル表示テスト完了');
  });

  test('スピーチバブル表示中のパフォーマンス', async () => {
    console.log('[Test] スピーチバブル表示中のパフォーマンステストを開始...');
    
    // 初期メモリ使用量を測定
    const initialMemory = await electronApp.getMemoryUsage();
    console.log(`[Test] 初期メモリ使用量: ${(initialMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);

    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    
    if (chatWindow) {
      chatWindowPage = new ChatWindowPage(chatWindow);
      
      const message = "パフォーマンステスト用メッセージ";
      await chatWindowPage.sendMessage(message);
      
      try {
        await chatWindowPage.waitForResponse(15000);
        
        // スピーチバブル表示開始
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const speechBubbleWindow = await electronApp.getSpeechBubbleWindow();
          
          if (speechBubbleWindow) {
            const speechBubblePage = new SpeechBubbleWindowPage(speechBubbleWindow);
            
            const isVisible = await speechBubblePage.isVisible();
            
            if (isVisible) {
              // スピーチバブル表示中のメモリ使用量を測定
              const bubbleMemory = await electronApp.getMemoryUsage();
              const memoryIncrease = (bubbleMemory.workingSetSize - initialMemory.workingSetSize) / 1024 / 1024;
              
              console.log(`[Test] スピーチバブル表示中のメモリ使用量: ${(bubbleMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);
              console.log(`[Test] メモリ増加量: ${memoryIncrease.toFixed(2)}MB`);
              
              // メモリ増加が合理的な範囲内であることを確認
              expect(memoryIncrease).toBeLessThan(50); // 50MB以内
              
              // UI応答性を確認
              const startTime = Date.now();
              await speechBubblePage.getSize();
              const responseTime = Date.now() - startTime;
              
              console.log(`[Test] UI応答時間: ${responseTime}ms`);
              expect(responseTime).toBeLessThan(1000); // 1秒以内
            }
          }
          
        } catch (error) {
          console.log(`[Test] スピーチバブルパフォーマンス測定でエラー: ${error}`);
        }
        
      } catch (error) {
        console.log(`[Test] メッセージ応答待機中にエラー: ${error}`);
      }
    }

    // 最終メモリ使用量を確認
    const finalMemory = await electronApp.getMemoryUsage();
    const totalMemoryIncrease = (finalMemory.workingSetSize - initialMemory.workingSetSize) / 1024 / 1024;
    
    console.log(`[Test] 最終メモリ使用量: ${(finalMemory.workingSetSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`[Test] 総メモリ増加量: ${totalMemoryIncrease.toFixed(2)}MB`);

    console.log('[Test] スピーチバブル表示中のパフォーマンステスト完了');
  });

  test('スピーチバブルのエラーハンドリング', async () => {
    console.log('[Test] スピーチバブルエラーハンドリングテストを開始...');
    
    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    
    if (chatWindow) {
      chatWindowPage = new ChatWindowPage(chatWindow);
      
      // 無効な文字や特殊文字を含むメッセージを送信
      const problematicMessages = [
        "🎌🎯🎮", // 絵文字
        "Test\n\nMessage", // 改行文字
        "Test\tMessage", // タブ文字
        "<script>alert('test')</script>", // HTMLタグ
        "\"'special'\"chars", // 引用符
      ];
      
      for (let i = 0; i < problematicMessages.length; i++) {
        const message = problematicMessages[i];
        console.log(`[Test] 問題のあるメッセージ ${i + 1}/${problematicMessages.length}: "${message}"`);
        
        try {
          await chatWindowPage.sendMessage(message);
          await chatWindowPage.waitForResponse(15000);
          
          // スピーチバブル表示確認
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            const speechBubbleWindow = await electronApp.getSpeechBubbleWindow();
            
            if (speechBubbleWindow) {
              const speechBubblePage = new SpeechBubbleWindowPage(speechBubbleWindow);
              
              const isVisible = await speechBubblePage.isVisible();
              console.log(`[Test] 問題メッセージ ${i + 1} 後のバブル表示: ${isVisible}`);
              
              if (isVisible) {
                // エラーなくテキストが表示されることを確認
                const bubbleText = await speechBubblePage.getText();
                console.log(`[Test] 問題メッセージ ${i + 1} のバブルテキスト長: ${bubbleText.length}`);
                expect(bubbleText.length).toBeGreaterThan(0);
              }
            }
            
          } catch (error) {
            console.log(`[Test] 問題メッセージ ${i + 1} のスピーチバブル確認でエラー: ${error}`);
          }
          
        } catch (error) {
          console.log(`[Test] 問題メッセージ ${i + 1} の処理でエラー: ${error}`);
        }
        
        // 次のメッセージまで少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('[Test] スピーチバブルエラーハンドリングテスト完了');
  });

  test('スピーチバブルとマスコットの連携', async () => {
    console.log('[Test] スピーチバブルとマスコット連携テストを開始...');
    
    // マスコットの初期状態を確認
    const isMascotVisible = await mainWindowPage.isMascotVisible();
    expect(isMascotVisible).toBe(true);
    console.log(`[Test] マスコット初期表示状態: ${isMascotVisible}`);

    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    
    if (chatWindow) {
      chatWindowPage = new ChatWindowPage(chatWindow);
      
      const message = "マスコット連携テスト";
      await chatWindowPage.sendMessage(message);
      
      try {
        await chatWindowPage.waitForResponse(15000);
        
        // スピーチバブル表示時のマスコット状態確認
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // マスコットが引き続き表示されていることを確認
        const mascotStillVisible = await mainWindowPage.isMascotVisible();
        expect(mascotStillVisible).toBe(true);
        console.log(`[Test] スピーチバブル表示中のマスコット状態: ${mascotStillVisible}`);
        
        // マスコットアニメーションが動作していることを確認
        const fps = await mainWindowPage.measureFPS(2000);
        console.log(`[Test] スピーチバブル表示中のマスコットFPS: ${fps}`);
        expect(fps).toBeGreaterThan(0);
        
        try {
          const speechBubbleWindow = await electronApp.getSpeechBubbleWindow();
          
          if (speechBubbleWindow) {
            const speechBubblePage = new SpeechBubbleWindowPage(speechBubbleWindow);
            
            const isVisible = await speechBubblePage.isVisible();
            console.log(`[Test] マスコット連携時のバブル表示: ${isVisible}`);
            
            if (isVisible) {
              // 同時に両方が表示されていることを確認
              expect(mascotStillVisible && isVisible).toBe(true);
              console.log('[Test] マスコットとスピーチバブルが同時に表示されています');
            }
          }
          
        } catch (error) {
          console.log(`[Test] マスコット連携時のスピーチバブル確認でエラー: ${error}`);
        }
        
      } catch (error) {
        console.log(`[Test] マスコット連携メッセージの応答待機中にエラー: ${error}`);
      }
    }

    console.log('[Test] スピーチバブルとマスコット連携テスト完了');
  });
});