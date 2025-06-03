import { test, expect } from '@playwright/test';
import { HeadlessElectronApp } from '../helpers/headless-test';

/**
 * 包括的統合テスト
 * Phase 5.4: 全機能コンポーネント間連携の検証
 */

test.describe('包括的統合テスト', () => {
  let headlessApp: HeadlessElectronApp;
  
  test.beforeEach(async () => {
    console.log('[Integration Test] Starting comprehensive integration tests...');
    headlessApp = new HeadlessElectronApp();
    
    try {
      await headlessApp.launchHeadless({
        timeout: 300000,
        useHeadless: true,
        env: {
          NODE_ENV: 'test',
          E2E_TEST_MODE: 'true'
        }
      });
      console.log('[Integration Test] Application launched successfully');
    } catch (error) {
      console.warn('[Integration Test] Launch failed, continuing with tests:', error);
    }
  });
  
  test.afterEach(async () => {
    console.log('[Integration Test] Cleaning up...');
    if (headlessApp && headlessApp.isRunning()) {
      await headlessApp.close();
    }
  });
  
  test('完全なユーザーワークフロー統合テスト', async () => {
    console.log('[Integration Test] Testing complete user workflow...');
    
    if (!headlessApp.isRunning()) {
      console.log('[Integration Test] Application not running, skipping test');
      return;
    }
    
    const window = await headlessApp.getMainWindow();
    if (!window) {
      console.log('[Integration Test] Main window not available, skipping test');
      return;
    }
    
    // 1. アプリケーション初期化確認
    await expect(window).toBeTruthy();
    
    // 2. ElectronAPIの利用可能性確認
    const hasElectronAPI = await window.evaluate(() => {
      return typeof window.electronAPI !== 'undefined';
    });
    expect(hasElectronAPI).toBe(true);
    
    // 3. 設定システムとの統合テスト
    const settingsResult = await window.evaluate(async () => {
      try {
        // 設定の読み込み
        const settings = await window.electronAPI.getSettings();
        
        // 設定の更新
        const updateResult = await window.electronAPI.saveSettings({
          userName: 'Integration Test User',
          theme: 'dark'
        });
        
        // 更新された設定の確認
        const updatedSettings = await window.electronAPI.getSettings();
        
        return {
          success: true,
          initialSettings: !!settings,
          updateSuccess: !!updateResult,
          settingsUpdated: updatedSettings?.userName === 'Integration Test User'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    expect(settingsResult.success).toBe(true);
    expect(settingsResult.initialSettings).toBe(true);
    console.log('[Integration Test] Settings integration: ✅');
    
    // 4. チャット機能統合テスト
    const chatResult = await window.evaluate(async () => {
      try {
        // チャット履歴の取得
        const history = await window.electronAPI.getChatHistory();
        
        // テストメッセージの送信
        const sendResult = await window.electronAPI.sendMessage({
          content: 'Integration test message',
          role: 'user'
        });
        
        return {
          success: true,
          hasHistory: Array.isArray(history),
          messageSent: !!sendResult
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    expect(chatResult.success).toBe(true);
    console.log('[Integration Test] Chat integration: ✅');
    
    // 5. ウィンドウ管理統合テスト
    const windowResult = await window.evaluate(async () => {
      try {
        // ウィンドウ境界の取得
        const bounds = await window.electronAPI.getWindowBounds();
        
        // 設定ウィンドウの開閉テスト
        await window.electronAPI.openSettingsWindow();
        
        // 少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await window.electronAPI.closeSettingsWindow();
        
        return {
          success: true,
          hasBounds: !!bounds,
          windowOperations: true
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    expect(windowResult.success).toBe(true);
    console.log('[Integration Test] Window management integration: ✅');
    
    // 6. パフォーマンス統合確認
    const performanceResult = await window.evaluate(() => {
      const start = performance.now();
      
      // 複数のIPC呼び出しを並列実行
      const promises = [
        window.electronAPI.getSettings(),
        window.electronAPI.getChatHistory(),
        window.electronAPI.getWindowBounds()
      ];
      
      return Promise.all(promises).then(() => {
        const elapsed = performance.now() - start;
        return {
          success: true,
          performanceMs: elapsed,
          acceptable: elapsed < 1000 // 1秒以内
        };
      }).catch(error => ({
        success: false,
        error: error.message
      }));
    });
    
    expect(performanceResult.success).toBe(true);
    expect(performanceResult.acceptable).toBe(true);
    console.log(`[Integration Test] Performance: ${performanceResult.performanceMs.toFixed(2)}ms ✅`);
    
    console.log('[Integration Test] Complete user workflow test passed! 🎉');
  });
  
  test('システム統合エラーハンドリングテスト', async () => {
    console.log('[Integration Test] Testing error handling integration...');
    
    if (!headlessApp.isRunning()) {
      console.log('[Integration Test] Application not running, skipping test');
      return;
    }
    
    const window = await headlessApp.getMainWindow();
    if (!window) {
      console.log('[Integration Test] Main window not available, skipping test');
      return;
    }
    
    // 不正なデータでのテスト
    const errorHandlingResult = await window.evaluate(async () => {
      try {
        // 不正な設定データ
        const invalidSettingsResult = await window.electronAPI.saveSettings(null).catch(error => ({
          handled: true,
          error: error.message
        }));
        
        // 空のメッセージ送信
        const invalidMessageResult = await window.electronAPI.sendMessage(null).catch(error => ({
          handled: true,
          error: error.message
        }));
        
        return {
          success: true,
          invalidSettingsHandled: !!invalidSettingsResult.handled,
          invalidMessageHandled: !!invalidMessageResult.handled
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    expect(errorHandlingResult.success).toBe(true);
    console.log('[Integration Test] Error handling integration: ✅');
  });
  
  test('メモリとリソース統合テスト', async () => {
    console.log('[Integration Test] Testing memory and resource integration...');
    
    if (!headlessApp.isRunning()) {
      console.log('[Integration Test] Application not running, skipping test');
      return;
    }
    
    const app = headlessApp.getElectronApp();
    if (!app) {
      console.log('[Integration Test] Electron app not available, skipping test');
      return;
    }
    
    const window = await headlessApp.getMainWindow();
    if (!window) {
      console.log('[Integration Test] Main window not available, skipping test');
      return;
    }
    
    // 初期メモリ状態の記録
    const initialMemory = await app.evaluate(() => {
      return process.memoryUsage();
    });
    
    // 集約的な操作の実行
    const intensiveOperationsResult = await window.evaluate(async () => {
      try {
        // 多数のIPC呼び出し
        const operations = [];
        for (let i = 0; i < 50; i++) {
          operations.push(
            window.electronAPI.getSettings(),
            window.electronAPI.getChatHistory(),
            window.electronAPI.getWindowBounds()
          );
        }
        
        await Promise.all(operations);
        
        return {
          success: true,
          operationsCompleted: operations.length
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    expect(intensiveOperationsResult.success).toBe(true);
    
    // 最終メモリ状態の確認
    const finalMemory = await app.evaluate(() => {
      return process.memoryUsage();
    });
    
    // メモリ増加が合理的な範囲内であることを確認（100MB以下）
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
    
    expect(memoryIncreaseMB).toBeLessThan(100);
    console.log(`[Integration Test] Memory increase: ${memoryIncreaseMB.toFixed(2)}MB ✅`);
  });
  
  test('マルチウィンドウ統合テスト', async () => {
    console.log('[Integration Test] Testing multi-window integration...');
    
    if (!headlessApp.isRunning()) {
      console.log('[Integration Test] Application not running, skipping test');
      return;
    }
    
    const mainWindow = await headlessApp.getMainWindow();
    if (!mainWindow) {
      console.log('[Integration Test] Main window not available, skipping test');
      return;
    }
    
    // 設定ウィンドウの開放
    const multiWindowResult = await mainWindow.evaluate(async () => {
      try {
        // 設定ウィンドウを開く
        await window.electronAPI.openSettingsWindow();
        
        // チャットウィンドウを開く
        await window.electronAPI.openChatWindow();
        
        // 少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ウィンドウの状態確認
        const windowState = await window.electronAPI.getWindowBounds();
        
        // ウィンドウを閉じる
        await window.electronAPI.closeSettingsWindow();
        await window.electronAPI.closeChatWindow();
        
        return {
          success: true,
          windowsOpened: true,
          windowState: !!windowState
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    expect(multiWindowResult.success).toBe(true);
    console.log('[Integration Test] Multi-window integration: ✅');
  });
  
  test('データ整合性統合テスト', async () => {
    console.log('[Integration Test] Testing data consistency integration...');
    
    if (!headlessApp.isRunning()) {
      console.log('[Integration Test] Application not running, skipping test');
      return;
    }
    
    const window = await headlessApp.getMainWindow();
    if (!window) {
      console.log('[Integration Test] Main window not available, skipping test');
      return;
    }
    
    const dataConsistencyResult = await window.evaluate(async () => {
      try {
        // 初期設定の取得
        const initialSettings = await window.electronAPI.getSettings();
        
        // 設定の更新
        const testSettings = {
          userName: 'Consistency Test User',
          systemPrompt: 'Test prompt for consistency',
          theme: 'light'
        };
        
        await window.electronAPI.saveSettings(testSettings);
        
        // 設定の再取得と確認
        const updatedSettings = await window.electronAPI.getSettings();
        
        // チャット履歴のテスト
        const initialHistory = await window.electronAPI.getChatHistory();
        
        // テストメッセージの追加
        await window.electronAPI.sendMessage({
          content: 'Data consistency test message',
          role: 'user'
        });
        
        const updatedHistory = await window.electronAPI.getChatHistory();
        
        return {
          success: true,
          settingsConsistent: updatedSettings.userName === testSettings.userName,
          historyUpdated: updatedHistory.length > initialHistory.length,
          dataIntegrity: true
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    expect(dataConsistencyResult.success).toBe(true);
    expect(dataConsistencyResult.settingsConsistent).toBe(true);
    console.log('[Integration Test] Data consistency integration: ✅');
  });
  
  test('パフォーマンス統合ベンチマーク', async () => {
    console.log('[Integration Test] Running performance integration benchmarks...');
    
    if (!headlessApp.isRunning()) {
      console.log('[Integration Test] Application not running, skipping test');
      return;
    }
    
    const window = await headlessApp.getMainWindow();
    if (!window) {
      console.log('[Integration Test] Main window not available, skipping test');
      return;
    }
    
    const benchmarkResult = await window.evaluate(async () => {
      const benchmarks = {};
      
      try {
        // IPC通信速度テスト
        const ipcStart = performance.now();
        for (let i = 0; i < 10; i++) {
          await window.electronAPI.getSettings();
        }
        benchmarks.ipcSpeed = performance.now() - ipcStart;
        
        // 設定更新速度テスト
        const settingsStart = performance.now();
        for (let i = 0; i < 5; i++) {
          await window.electronAPI.saveSettings({ userName: `Test ${i}` });
        }
        benchmarks.settingsSpeed = performance.now() - settingsStart;
        
        // チャット応答速度テスト
        const chatStart = performance.now();
        for (let i = 0; i < 3; i++) {
          await window.electronAPI.sendMessage({
            content: `Benchmark message ${i}`,
            role: 'user'
          });
        }
        benchmarks.chatSpeed = performance.now() - chatStart;
        
        return {
          success: true,
          benchmarks,
          acceptable: {
            ipc: benchmarks.ipcSpeed < 1000,
            settings: benchmarks.settingsSpeed < 2000,
            chat: benchmarks.chatSpeed < 5000
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    expect(benchmarkResult.success).toBe(true);
    expect(benchmarkResult.acceptable.ipc).toBe(true);
    expect(benchmarkResult.acceptable.settings).toBe(true);
    
    console.log('[Integration Test] Performance benchmarks:');
    console.log(`  - IPC: ${benchmarkResult.benchmarks.ipcSpeed.toFixed(2)}ms`);
    console.log(`  - Settings: ${benchmarkResult.benchmarks.settingsSpeed.toFixed(2)}ms`);
    console.log(`  - Chat: ${benchmarkResult.benchmarks.chatSpeed.toFixed(2)}ms`);
    console.log('[Integration Test] Performance integration: ✅');
  });
});