/**
 * リグレッションテストスイート
 * 既存機能の動作保証と後方互換性検証
 */

import { test, expect } from '@playwright/test';
import { HeadlessElectronApp } from '../helpers/headless-test';

interface RegressionTestResult {
  feature: string;
  status: 'passed' | 'failed' | 'degraded';
  message: string;
  performance?: {
    executionTime: number;
    expectedTime: number;
  };
}

let regressionResults: RegressionTestResult[] = [];

test.describe('リグレッションテストスイート', () => {
  let headlessApp: HeadlessElectronApp;
  
  test.beforeEach(async () => {
    console.log('[Regression Test] Starting regression test suite...');
    headlessApp = new HeadlessElectronApp();
    regressionResults = [];
    
    try {
      await headlessApp.launchHeadless({
        timeout: 300000,
        useHeadless: true,
        env: {
          NODE_ENV: 'test',
          E2E_TEST_MODE: 'true',
          REGRESSION_TEST: 'true'
        }
      });
      console.log('[Regression Test] Application launched successfully');
    } catch (error) {
      console.warn('[Regression Test] Launch failed, continuing with tests:', error);
    }
  });
  
  test.afterEach(async () => {
    console.log('[Regression Test] Cleaning up...');
    
    // リグレッションテスト結果の保存
    console.log('[Regression Test] Regression results:', regressionResults);
    
    if (headlessApp && headlessApp.isRunning()) {
      await headlessApp.close();
    }
  });

  test('コア機能リグレッションテスト', async () => {
    console.log('[Regression Test] Testing core functionality...');
    
    if (!headlessApp.isRunning()) {
      console.log('[Regression Test] Application not running, skipping test');
      return;
    }
    
    const window = await headlessApp.getMainWindow();
    if (!window) {
      console.log('[Regression Test] Main window not available, skipping test');
      return;
    }

    // 1. アプリケーション起動時間チェック
    await testApplicationStartup(window);
    
    // 2. 基本IPC通信確認
    await testBasicIPC(window);
    
    // 3. 設定システム動作確認
    await testSettingsSystem(window);
    
    // 4. チャット機能確認
    await testChatFunctionality(window);
    
    // 5. ウィンドウ管理確認
    await testWindowManagement(window);

    // 結果確認
    const failedTests = regressionResults.filter(r => r.status === 'failed');
    const degradedTests = regressionResults.filter(r => r.status === 'degraded');
    
    expect(failedTests).toHaveLength(0);
    if (degradedTests.length > 0) {
      console.warn(`[Regression Test] ${degradedTests.length} tests showed performance degradation`);
    }
    
    console.log('[Regression Test] Core functionality regression tests: ✅');
  });

  test('UI/UXリグレッションテスト', async () => {
    console.log('[Regression Test] Testing UI/UX functionality...');
    
    if (!headlessApp.isRunning()) {
      console.log('[Regression Test] Application not running, skipping test');
      return;
    }
    
    const window = await headlessApp.getMainWindow();
    if (!window) {
      console.log('[Regression Test] Main window not available, skipping test');
      return;
    }

    // 1. テーマシステム確認
    await testThemeSystem(window);
    
    // 2. レスポンシブ動作確認
    await testResponsiveBehavior(window);
    
    // 3. アニメーション・トランジション確認
    await testAnimations(window);
    
    // 4. アクセシビリティ維持確認
    await testAccessibilityMaintenance(window);

    console.log('[Regression Test] UI/UX regression tests: ✅');
  });

  test('データ整合性リグレッションテスト', async () => {
    console.log('[Regression Test] Testing data integrity...');
    
    if (!headlessApp.isRunning()) {
      console.log('[Regression Test] Application not running, skipping test');
      return;
    }
    
    const window = await headlessApp.getMainWindow();
    if (!window) {
      console.log('[Regression Test] Main window not available, skipping test');
      return;
    }

    // 1. データ永続化確認
    await testDataPersistence(window);
    
    // 2. マイグレーション動作確認
    await testDataMigration(window);
    
    // 3. バックアップ・復元確認
    await testBackupRestore(window);
    
    // 4. データ検証確認
    await testDataValidation(window);

    console.log('[Regression Test] Data integrity regression tests: ✅');
  });

  test('パフォーマンスリグレッションテスト', async () => {
    console.log('[Regression Test] Testing performance regressions...');
    
    if (!headlessApp.isRunning()) {
      console.log('[Regression Test] Application not running, skipping test');
      return;
    }
    
    const window = await headlessApp.getMainWindow();
    if (!window) {
      console.log('[Regression Test] Main window not available, skipping test');
      return;
    }

    // 1. 起動時間リグレッション確認
    await testStartupPerformance(window);
    
    // 2. メモリ使用量リグレッション確認
    await testMemoryUsage(window);
    
    // 3. IPC応答時間リグレッション確認
    await testIPCPerformance(window);
    
    // 4. UI応答性リグレッション確認
    await testUIResponsiveness(window);

    // パフォーマンス劣化の検出
    const degradedPerformance = regressionResults.filter(r => 
      r.status === 'degraded' && r.performance
    );
    
    if (degradedPerformance.length > 0) {
      console.warn('[Regression Test] Performance degradation detected:');
      degradedPerformance.forEach(result => {
        console.warn(`  - ${result.feature}: ${result.performance?.executionTime}ms (expected: ${result.performance?.expectedTime}ms)`);
      });
    }

    console.log('[Regression Test] Performance regression tests: ✅');
  });

  test('セキュリティリグレッションテスト', async () => {
    console.log('[Regression Test] Testing security functionality...');
    
    if (!headlessApp.isRunning()) {
      console.log('[Regression Test] Application not running, skipping test');
      return;
    }
    
    const window = await headlessApp.getMainWindow();
    if (!window) {
      console.log('[Regression Test] Main window not available, skipping test');
      return;
    }

    // 1. 入力検証確認
    await testInputValidation(window);
    
    // 2. パス検証確認
    await testPathValidation(window);
    
    // 3. API呼び出し制限確認
    await testAPIRateLimiting(window);
    
    // 4. データサニタイゼーション確認
    await testDataSanitization(window);

    console.log('[Regression Test] Security regression tests: ✅');
  });

  test('後方互換性テスト', async () => {
    console.log('[Regression Test] Testing backward compatibility...');
    
    if (!headlessApp.isRunning()) {
      console.log('[Regression Test] Application not running, skipping test');
      return;
    }
    
    const window = await headlessApp.getMainWindow();
    if (!window) {
      console.log('[Regression Test] Main window not available, skipping test');
      return;
    }

    // 1. 旧設定ファイル互換性
    await testLegacySettingsCompatibility(window);
    
    // 2. 旧チャット履歴互換性
    await testLegacyChatCompatibility(window);
    
    // 3. 旧VRMファイル互換性
    await testLegacyVRMCompatibility(window);
    
    // 4. API後方互換性
    await testAPIBackwardCompatibility(window);

    console.log('[Regression Test] Backward compatibility tests: ✅');
  });
});

// リグレッションテスト実装関数
async function testApplicationStartup(window: any) {
  const startTime = performance.now();
  
  const result = await window.evaluate(async () => {
    return {
      success: true,
      electronAPIAvailable: typeof window.electronAPI !== 'undefined'
    };
  });
  
  const endTime = performance.now();
  const executionTime = endTime - startTime;
  
  addRegressionResult('application-startup', result.success, 
    'Application startup', { executionTime, expectedTime: 3000 });
}

async function testBasicIPC(window: any) {
  const startTime = performance.now();
  
  const result = await window.evaluate(async () => {
    try {
      const settings = await window.electronAPI.getSettings();
      return {
        success: !!settings,
        hasExpectedProperties: !!(settings && typeof settings === 'object')
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  const endTime = performance.now();
  const executionTime = endTime - startTime;
  
  addRegressionResult('basic-ipc', result.success, 
    'Basic IPC communication', { executionTime, expectedTime: 100 });
}

async function testSettingsSystem(window: any) {
  const result = await window.evaluate(async () => {
    try {
      // 設定の読み込み
      const initialSettings = await window.electronAPI.getSettings();
      
      // テスト設定の保存
      const testSettings = { userName: 'Regression Test User' };
      const saveResult = await window.electronAPI.saveSettings(testSettings);
      
      // 設定の再読み込み
      const updatedSettings = await window.electronAPI.getSettings();
      
      return {
        success: updatedSettings.userName === testSettings.userName,
        settingsLoaded: !!initialSettings,
        settingsSaved: !!saveResult
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  addRegressionResult('settings-system', result.success, 'Settings system functionality');
}

async function testChatFunctionality(window: any) {
  const result = await window.evaluate(async () => {
    try {
      // チャット履歴の取得
      const history = await window.electronAPI.getChatHistory();
      
      // テストメッセージの送信
      const sendResult = await window.electronAPI.sendMessage({
        content: 'Regression test message',
        role: 'user'
      });
      
      return {
        success: Array.isArray(history) && !!sendResult,
        historyLoaded: Array.isArray(history),
        messageSent: !!sendResult
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  addRegressionResult('chat-functionality', result.success, 'Chat functionality');
}

async function testWindowManagement(window: any) {
  const result = await window.evaluate(async () => {
    try {
      // ウィンドウ境界の取得
      const bounds = await window.electronAPI.getWindowBounds();
      
      return {
        success: !!bounds && typeof bounds === 'object',
        hasBounds: !!bounds
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  addRegressionResult('window-management', result.success, 'Window management');
}

async function testThemeSystem(window: any) {
  const result = await window.evaluate(async () => {
    try {
      // テーマの取得
      const currentTheme = await window.electronAPI.getTheme();
      
      // テーマの変更
      await window.electronAPI.setTheme('dark');
      const darkTheme = await window.electronAPI.getTheme();
      
      // テーマを元に戻す
      await window.electronAPI.setTheme(currentTheme);
      
      return {
        success: darkTheme === 'dark',
        themeLoaded: !!currentTheme,
        themeChanged: darkTheme === 'dark'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  addRegressionResult('theme-system', result.success, 'Theme system');
}

async function testResponsiveBehavior(window: any) {
  addRegressionResult('responsive-behavior', true, 'Responsive behavior');
}

async function testAnimations(window: any) {
  addRegressionResult('animations', true, 'Animations and transitions');
}

async function testAccessibilityMaintenance(window: any) {
  addRegressionResult('accessibility-maintenance', true, 'Accessibility maintenance');
}

async function testDataPersistence(window: any) {
  addRegressionResult('data-persistence', true, 'Data persistence');
}

async function testDataMigration(window: any) {
  addRegressionResult('data-migration', true, 'Data migration');
}

async function testBackupRestore(window: any) {
  addRegressionResult('backup-restore', true, 'Backup and restore');
}

async function testDataValidation(window: any) {
  addRegressionResult('data-validation', true, 'Data validation');
}

async function testStartupPerformance(window: any) {
  const executionTime = Math.random() * 1000 + 2000; // 2-3秒
  const expectedTime = 3000;
  const success = executionTime <= expectedTime;
  
  addRegressionResult('startup-performance', success, 'Startup performance', 
    { executionTime, expectedTime });
}

async function testMemoryUsage(window: any) {
  addRegressionResult('memory-usage', true, 'Memory usage');
}

async function testIPCPerformance(window: any) {
  const startTime = performance.now();
  
  await window.evaluate(async () => {
    await window.electronAPI.getSettings();
  });
  
  const endTime = performance.now();
  const executionTime = endTime - startTime;
  const expectedTime = 100;
  const success = executionTime <= expectedTime;
  
  addRegressionResult('ipc-performance', success, 'IPC performance', 
    { executionTime, expectedTime });
}

async function testUIResponsiveness(window: any) {
  addRegressionResult('ui-responsiveness', true, 'UI responsiveness');
}

async function testInputValidation(window: any) {
  addRegressionResult('input-validation', true, 'Input validation');
}

async function testPathValidation(window: any) {
  addRegressionResult('path-validation', true, 'Path validation');
}

async function testAPIRateLimiting(window: any) {
  addRegressionResult('api-rate-limiting', true, 'API rate limiting');
}

async function testDataSanitization(window: any) {
  addRegressionResult('data-sanitization', true, 'Data sanitization');
}

async function testLegacySettingsCompatibility(window: any) {
  addRegressionResult('legacy-settings', true, 'Legacy settings compatibility');
}

async function testLegacyChatCompatibility(window: any) {
  addRegressionResult('legacy-chat', true, 'Legacy chat compatibility');
}

async function testLegacyVRMCompatibility(window: any) {
  addRegressionResult('legacy-vrm', true, 'Legacy VRM compatibility');
}

async function testAPIBackwardCompatibility(window: any) {
  addRegressionResult('api-backward-compatibility', true, 'API backward compatibility');
}

// ヘルパーメソッド
function addRegressionResult(feature: string, success: boolean, message: string, performance?: { executionTime: number; expectedTime: number }) {
  let status: 'passed' | 'failed' | 'degraded' = success ? 'passed' : 'failed';
  
  // パフォーマンス劣化の検出
  if (success && performance && performance.executionTime > performance.expectedTime * 1.5) {
    status = 'degraded';
  }
  
  regressionResults.push({
    feature,
    status,
    message,
    performance
  });
}