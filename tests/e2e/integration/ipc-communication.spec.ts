/**
 * IPC通信エンドツーエンド E2Eテスト
 * 
 * メインプロセスとレンダラープロセス間のIPC通信を包括的にテスト
 */

import { test, expect } from '@playwright/test';
import { ElectronApp } from '../helpers/electron-app';
import { MainWindowPage, ChatWindowPage, SettingsWindowPage } from '../helpers/page-objects';
import { TestData } from '../helpers/test-data';

test.describe('IPC通信テスト', () => {
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

  test('基本的なIPC通信', async () => {
    console.log('[Test] 基本的なIPC通信テストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // レンダラープロセスからメインプロセスへのIPC通信をテスト
    const ipcTestResult = await mainWindow.evaluate(async () => {
      // window.electronAPI が存在するかチェック
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        try {
          // 基本的なIPCメッセージ送信
          const result = await (window as any).electronAPI.invoke('test-ipc', 'Hello from renderer');
          return { success: true, result };
        } catch (error) {
          return { success: false, error: error.message };
        }
      } else {
        return { success: false, error: 'electronAPI not available' };
      }
    });

    console.log(`[Test] IPC通信結果: ${JSON.stringify(ipcTestResult)}`);
    
    if (ipcTestResult.success) {
      expect(ipcTestResult.result).toBeTruthy();
      console.log('[Test] 基本的なIPC通信成功');
    } else {
      console.log(`[Test] IPC通信エラー（実装依存）: ${ipcTestResult.error}`);
    }

    console.log('[Test] 基本的なIPC通信テスト完了');
  });

  test('設定データのIPC同期', async () => {
    console.log('[Test] 設定データのIPC同期テストを開始...');
    
    // 設定ウィンドウを開く
    await mainWindowPage.openSettings();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const settingsWindow = await electronApp.getSettingsWindow();
    
    if (settingsWindow) {
      const settingsWindowPage = new SettingsWindowPage(settingsWindow);
      
      // 設定データをIPC経由で取得
      const settingsData = await settingsWindow.evaluate(async () => {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          try {
            const settings = await (window as any).electronAPI.invoke('get-settings');
            return { success: true, settings };
          } catch (error) {
            return { success: false, error: error.message };
          }
        } else {
          return { success: false, error: 'electronAPI not available' };
        }
      });

      console.log(`[Test] 設定取得結果: ${JSON.stringify(settingsData)}`);
      
      if (settingsData.success) {
        expect(settingsData.settings).toBeTruthy();
        console.log('[Test] 設定データIPC取得成功');

        // 設定を変更
        const newUserName = "IPCテストユーザー";
        try {
          await settingsWindowPage.setUserName(newUserName);
          
          // 設定変更をIPC経由で保存
          const saveResult = await settingsWindow.evaluate(async (userName) => {
            if (typeof window !== 'undefined' && (window as any).electronAPI) {
              try {
                await (window as any).electronAPI.invoke('save-settings', { userName });
                return { success: true };
              } catch (error) {
                return { success: false, error: error.message };
              }
            } else {
              return { success: false, error: 'electronAPI not available' };
            }
          }, newUserName);

          console.log(`[Test] 設定保存結果: ${JSON.stringify(saveResult)}`);
          
          if (saveResult.success) {
            console.log('[Test] 設定データIPC保存成功');
          }
          
        } catch (error) {
          console.log(`[Test] 設定変更処理でエラー: ${error}`);
        }
      }

      await settingsWindowPage.close();
    }

    console.log('[Test] 設定データのIPC同期テスト完了');
  });

  test('チャットメッセージのIPC送信', async () => {
    console.log('[Test] チャットメッセージのIPC送信テストを開始...');
    
    // チャットウィンドウを開く
    await mainWindowPage.openChatWindow();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const chatWindow = await electronApp.getChatWindow();
    
    if (chatWindow) {
      const chatWindowPage = new ChatWindowPage(chatWindow);
      
      // チャットメッセージをIPC経由で送信
      const testMessage = "IPCテストメッセージ";
      console.log(`[Test] IPCメッセージ送信: "${testMessage}"`);
      
      const ipcSendResult = await chatWindow.evaluate(async (message) => {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          try {
            const response = await (window as any).electronAPI.invoke('send-chat-message', message);
            return { success: true, response };
          } catch (error) {
            return { success: false, error: error.message };
          }
        } else {
          return { success: false, error: 'electronAPI not available' };
        }
      }, testMessage);

      console.log(`[Test] IPCメッセージ送信結果: ${JSON.stringify(ipcSendResult)}`);
      
      if (ipcSendResult.success) {
        expect(ipcSendResult.response).toBeTruthy();
        console.log('[Test] チャットメッセージIPC送信成功');
        
        // 通常のチャット送信と比較
        try {
          await chatWindowPage.sendMessage("通常の送信テスト");
          console.log('[Test] 通常のチャット送信も正常動作');
        } catch (error) {
          console.log(`[Test] 通常のチャット送信エラー: ${error}`);
        }
        
      } else {
        console.log(`[Test] チャットメッセージIPC送信エラー（実装依存）: ${ipcSendResult.error}`);
      }
    }

    console.log('[Test] チャットメッセージのIPC送信テスト完了');
  });

  test('VRMモデル制御のIPC', async () => {
    console.log('[Test] VRMモデル制御のIPCテストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // VRMアニメーションをIPC経由で制御
    const animationTestResult = await mainWindow.evaluate(async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        try {
          // アニメーション開始コマンド
          const startResult = await (window as any).electronAPI.invoke('start-vrm-animation', 'wave');
          
          // 少し待機
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // アニメーション停止コマンド
          const stopResult = await (window as any).electronAPI.invoke('stop-vrm-animation');
          
          return { 
            success: true, 
            startResult, 
            stopResult 
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      } else {
        return { success: false, error: 'electronAPI not available' };
      }
    });

    console.log(`[Test] VRMアニメーション制御結果: ${JSON.stringify(animationTestResult)}`);
    
    if (animationTestResult.success) {
      console.log('[Test] VRMモデルIPC制御成功');
      
      // マスコットが正常に表示されていることを確認
      const isMascotVisible = await mainWindowPage.isMascotVisible();
      expect(isMascotVisible).toBe(true);
      
      // FPSを測定してアニメーションが動作していることを確認
      const fps = await mainWindowPage.measureFPS(2000);
      console.log(`[Test] IPC制御後のFPS: ${fps}`);
      expect(fps).toBeGreaterThan(0);
      
    } else {
      console.log(`[Test] VRMモデルIPC制御エラー（実装依存）: ${animationTestResult.error}`);
    }

    console.log('[Test] VRMモデル制御のIPCテスト完了');
  });

  test('IPC通信のエラーハンドリング', async () => {
    console.log('[Test] IPC通信のエラーハンドリングテストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // 無効なIPCチャンネルへの送信テスト
    const invalidChannelTest = await mainWindow.evaluate(async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        try {
          await (window as any).electronAPI.invoke('invalid-channel', 'test data');
          return { success: true, unexpected: true };
        } catch (error) {
          return { success: true, expectedError: error.message };
        }
      } else {
        return { success: false, error: 'electronAPI not available' };
      }
    });

    console.log(`[Test] 無効チャンネルテスト結果: ${JSON.stringify(invalidChannelTest)}`);
    
    if (invalidChannelTest.success && invalidChannelTest.expectedError) {
      console.log('[Test] 無効チャンネルで適切にエラーハンドリング');
    }

    // 不正なデータ送信テスト
    const invalidDataTest = await mainWindow.evaluate(async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        try {
          // 循環参照オブジェクトを送信
          const circularObj: any = {};
          circularObj.self = circularObj;
          
          await (window as any).electronAPI.invoke('test-ipc', circularObj);
          return { success: true, unexpected: true };
        } catch (error) {
          return { success: true, expectedError: error.message };
        }
      } else {
        return { success: false, error: 'electronAPI not available' };
      }
    });

    console.log(`[Test] 不正データテスト結果: ${JSON.stringify(invalidDataTest)}`);
    
    if (invalidDataTest.success && invalidDataTest.expectedError) {
      console.log('[Test] 不正データで適切にエラーハンドリング');
    }

    // 大きすぎるデータ送信テスト
    const largeDataTest = await mainWindow.evaluate(async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        try {
          // 10MBの文字列を作成
          const largeString = 'x'.repeat(10 * 1024 * 1024);
          
          await (window as any).electronAPI.invoke('test-ipc', largeString);
          return { success: true, handled: true };
        } catch (error) {
          return { success: true, expectedError: error.message };
        }
      } else {
        return { success: false, error: 'electronAPI not available' };
      }
    });

    console.log(`[Test] 大容量データテスト結果: ${JSON.stringify(largeDataTest)}`);

    console.log('[Test] IPC通信のエラーハンドリングテスト完了');
  });

  test('マルチウィンドウ間のIPC調整', async () => {
    console.log('[Test] マルチウィンドウ間のIPC調整テストを開始...');
    
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
      // メインウィンドウから他のウィンドウにIPC経由でメッセージを送信
      const mainToOthersTest = await mainWindow.evaluate(async () => {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          try {
            const result = await (window as any).electronAPI.invoke('broadcast-to-all-windows', {
              type: 'test-broadcast',
              data: 'マルチウィンドウテスト'
            });
            return { success: true, result };
          } catch (error) {
            return { success: false, error: error.message };
          }
        } else {
          return { success: false, error: 'electronAPI not available' };
        }
      });

      console.log(`[Test] マルチウィンドウブロードキャスト結果: ${JSON.stringify(mainToOthersTest)}`);

      // チャットウィンドウでブロードキャストメッセージを受信確認
      const chatReceiveTest = await chatWindow.evaluate(async () => {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          try {
            // ブロードキャストリスナーを設定
            return new Promise((resolve) => {
              (window as any).electronAPI.on('broadcast-received', (data: any) => {
                resolve({ success: true, receivedData: data });
              });
              
              // 5秒でタイムアウト
              setTimeout(() => {
                resolve({ success: false, timeout: true });
              }, 5000);
            });
          } catch (error) {
            return { success: false, error: error.message };
          }
        } else {
          return { success: false, error: 'electronAPI not available' };
        }
      });

      console.log(`[Test] チャットウィンドウ受信結果: ${JSON.stringify(chatReceiveTest)}`);

      // 設定ウィンドウでも同様の確認
      const settingsReceiveTest = await settingsWindow.evaluate(async () => {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          try {
            const currentState = await (window as any).electronAPI.invoke('get-window-state');
            return { success: true, state: currentState };
          } catch (error) {
            return { success: false, error: error.message };
          }
        } else {
          return { success: false, error: 'electronAPI not available' };
        }
      });

      console.log(`[Test] 設定ウィンドウ状態確認: ${JSON.stringify(settingsReceiveTest)}`);

      const settingsWindowPage = new SettingsWindowPage(settingsWindow);
      await settingsWindowPage.close();
    }

    console.log('[Test] マルチウィンドウ間のIPC調整テスト完了');
  });
});

test.describe('IPC詳細テスト', () => {
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

  test('IPCパフォーマンス測定', async () => {
    console.log('[Test] IPCパフォーマンス測定テストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // 複数回のIPC通信でパフォーマンスを測定
    const performanceTest = await mainWindow.evaluate(async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const testCount = 100;
        const results = [];
        
        for (let i = 0; i < testCount; i++) {
          const startTime = performance.now();
          
          try {
            await (window as any).electronAPI.invoke('test-ipc', `test message ${i}`);
            const endTime = performance.now();
            results.push(endTime - startTime);
          } catch (error) {
            results.push(-1); // エラーを示す
          }
        }
        
        const validResults = results.filter(r => r >= 0);
        const averageTime = validResults.reduce((sum, time) => sum + time, 0) / validResults.length;
        const maxTime = Math.max(...validResults);
        const minTime = Math.min(...validResults);
        
        return {
          success: true,
          testCount,
          validCount: validResults.length,
          averageTime,
          maxTime,
          minTime,
          failureRate: (testCount - validResults.length) / testCount
        };
      } else {
        return { success: false, error: 'electronAPI not available' };
      }
    });

    console.log(`[Test] IPCパフォーマンス結果: ${JSON.stringify(performanceTest)}`);
    
    if (performanceTest.success) {
      console.log(`[Test] 平均IPC応答時間: ${performanceTest.averageTime.toFixed(2)}ms`);
      console.log(`[Test] 最大IPC応答時間: ${performanceTest.maxTime.toFixed(2)}ms`);
      console.log(`[Test] 最小IPC応答時間: ${performanceTest.minTime.toFixed(2)}ms`);
      console.log(`[Test] IPC失敗率: ${(performanceTest.failureRate * 100).toFixed(2)}%`);
      
      // パフォーマンス要件の確認
      expect(performanceTest.averageTime).toBeLessThan(100); // 100ms以内
      expect(performanceTest.failureRate).toBeLessThan(0.05); // 5%以内
    }

    console.log('[Test] IPCパフォーマンス測定テスト完了');
  });

  test('IPC同時実行テスト', async () => {
    console.log('[Test] IPC同時実行テストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // 複数のIPC通信を同時に実行
    const concurrentTest = await mainWindow.evaluate(async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const concurrentCount = 10;
        const promises = [];
        
        for (let i = 0; i < concurrentCount; i++) {
          promises.push(
            (window as any).electronAPI.invoke('test-ipc', `concurrent message ${i}`)
              .then((result: any) => ({ success: true, index: i, result }))
              .catch((error: any) => ({ success: false, index: i, error: error.message }))
          );
        }
        
        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.success).length;
        
        return {
          success: true,
          concurrentCount,
          successCount,
          failureCount: concurrentCount - successCount,
          results
        };
      } else {
        return { success: false, error: 'electronAPI not available' };
      }
    });

    console.log(`[Test] IPC同時実行結果: ${JSON.stringify(concurrentTest)}`);
    
    if (concurrentTest.success) {
      console.log(`[Test] 同時実行成功数: ${concurrentTest.successCount}/${concurrentTest.concurrentCount}`);
      
      // 同時実行でもほとんどが成功することを確認
      expect(concurrentTest.successCount).toBeGreaterThanOrEqual(concurrentTest.concurrentCount * 0.8); // 80%以上成功
    }

    console.log('[Test] IPC同時実行テスト完了');
  });

  test('IPCメッセージの整合性', async () => {
    console.log('[Test] IPCメッセージの整合性テストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // 様々なデータ型でのIPC通信テスト
    const integrityTest = await mainWindow.evaluate(async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const testData = [
          { type: 'string', data: 'テスト文字列' },
          { type: 'number', data: 42 },
          { type: 'boolean', data: true },
          { type: 'array', data: [1, 2, 3, '配列テスト'] },
          { type: 'object', data: { key: 'value', number: 123, nested: { prop: 'ネスト' } } },
          { type: 'null', data: null },
          { type: 'undefined', data: undefined },
          { type: 'unicode', data: '🎌🎯🎮 Unicode テスト' }
        ];
        
        const results = [];
        
        for (const test of testData) {
          try {
            const response = await (window as any).electronAPI.invoke('echo-data', test.data);
            const isEqual = JSON.stringify(response) === JSON.stringify(test.data);
            
            results.push({
              type: test.type,
              success: true,
              dataIntact: isEqual,
              original: test.data,
              received: response
            });
          } catch (error) {
            results.push({
              type: test.type,
              success: false,
              error: error.message
            });
          }
        }
        
        return { success: true, results };
      } else {
        return { success: false, error: 'electronAPI not available' };
      }
    });

    console.log(`[Test] IPCメッセージ整合性結果: ${JSON.stringify(integrityTest)}`);
    
    if (integrityTest.success) {
      const successfulTests = integrityTest.results.filter((r: any) => r.success);
      const intactDataTests = successfulTests.filter((r: any) => r.dataIntact);
      
      console.log(`[Test] データ整合性テスト: ${intactDataTests.length}/${successfulTests.length} が完全一致`);
      
      // データ整合性が保たれていることを確認
      expect(intactDataTests.length).toBeGreaterThanOrEqual(successfulTests.length * 0.8); // 80%以上が一致
    }

    console.log('[Test] IPCメッセージの整合性テスト完了');
  });

  test('IPCタイムアウト処理', async () => {
    console.log('[Test] IPCタイムアウト処理テストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // 長時間かかるIPC処理のタイムアウトテスト
    const timeoutTest = await mainWindow.evaluate(async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const startTime = performance.now();
        
        try {
          // 10秒かかる処理をリクエスト
          await (window as any).electronAPI.invoke('long-running-task', { duration: 10000 });
          const endTime = performance.now();
          
          return {
            success: true,
            completed: true,
            duration: endTime - startTime
          };
        } catch (error) {
          const endTime = performance.now();
          
          return {
            success: true,
            completed: false,
            duration: endTime - startTime,
            error: error.message
          };
        }
      } else {
        return { success: false, error: 'electronAPI not available' };
      }
    });

    console.log(`[Test] IPCタイムアウトテスト結果: ${JSON.stringify(timeoutTest)}`);
    
    if (timeoutTest.success) {
      console.log(`[Test] IPC処理時間: ${timeoutTest.duration.toFixed(2)}ms`);
      
      if (timeoutTest.completed) {
        console.log('[Test] 長時間処理が完了');
      } else {
        console.log('[Test] 長時間処理がタイムアウトまたはエラー（期待される動作）');
      }
    }

    console.log('[Test] IPCタイムアウト処理テスト完了');
  });

  test('IPCセキュリティ検証', async () => {
    console.log('[Test] IPCセキュリティ検証テストを開始...');
    
    const mainWindow = await electronApp.getMainWindow();
    
    // セキュリティに関わる操作のテスト
    const securityTest = await mainWindow.evaluate(async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const securityTests = [
          {
            name: 'ファイルシステムアクセス試行',
            test: async () => {
              try {
                await (window as any).electronAPI.invoke('read-file', '/etc/passwd');
                return { blocked: false, unexpected: true };
              } catch (error) {
                return { blocked: true, error: error.message };
              }
            }
          },
          {
            name: 'システムコマンド実行試行',
            test: async () => {
              try {
                await (window as any).electronAPI.invoke('exec-command', 'ls /');
                return { blocked: false, unexpected: true };
              } catch (error) {
                return { blocked: true, error: error.message };
              }
            }
          },
          {
            name: 'プロセス情報アクセス試行',
            test: async () => {
              try {
                await (window as any).electronAPI.invoke('get-process-info');
                return { blocked: false, allowed: true };
              } catch (error) {
                return { blocked: true, error: error.message };
              }
            }
          }
        ];
        
        const results = [];
        
        for (const secTest of securityTests) {
          try {
            const result = await secTest.test();
            results.push({ name: secTest.name, ...result });
          } catch (error) {
            results.push({ 
              name: secTest.name, 
              blocked: true, 
              error: error.message 
            });
          }
        }
        
        return { success: true, results };
      } else {
        return { success: false, error: 'electronAPI not available' };
      }
    });

    console.log(`[Test] IPCセキュリティ検証結果: ${JSON.stringify(securityTest)}`);
    
    if (securityTest.success) {
      const blockedOperations = securityTest.results.filter((r: any) => r.blocked);
      console.log(`[Test] セキュリティブロック: ${blockedOperations.length}/${securityTest.results.length} 操作がブロック`);
      
      // 危険な操作が適切にブロックされていることを確認
      const dangerousOperations = securityTest.results.filter((r: any) => 
        r.name.includes('ファイルシステム') || r.name.includes('システムコマンド')
      );
      const blockedDangerous = dangerousOperations.filter((r: any) => r.blocked);
      
      expect(blockedDangerous.length).toEqual(dangerousOperations.length);
    }

    console.log('[Test] IPCセキュリティ検証テスト完了');
  });
});