/**
 * E2Eテスト用Playwright設定ファイル
 * 
 * Electronアプリケーションのエンドツーエンドテストを実行するための設定
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  // テストディレクトリの指定
  testDir: './tests/e2e',
  
  // 並列実行の設定
  fullyParallel: true,
  
  // CI環境でのテスト失敗時の再試行設定
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // レポート設定
  reporter: [
    ['html', { 
      outputFolder: 'test-results/e2e-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'test-results/e2e-results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/e2e-junit.xml' 
    }]
  ],
  
  // 出力ディレクトリ
  outputDir: 'test-results/e2e-artifacts',
  
  // デフォルト設定
  use: {
    // 失敗時のトレース記録
    trace: 'on-first-retry',
    
    // スクリーンショット設定
    screenshot: 'only-on-failure',
    
    // ビデオ録画設定
    video: 'retain-on-failure',
    
    // アクションタイムアウト（30秒）
    actionTimeout: 30000,
    
    // ナビゲーションタイムアウト（30秒）
    navigationTimeout: 30000,
  },
  
  // プロジェクト設定
  projects: [
    {
      name: 'electron-main',
      testMatch: /.*\.spec\.ts/,
      use: {
        // Electron固有設定
        headless: false, // GUIテストのためheadlessは無効
        viewport: null,  // Electronは独自のウィンドウサイズを使用
      }
    }
  ],
  
  // テストタイムアウト設定（5分）
  timeout: 300000,
  
  // 期待値タイムアウト（10秒）
  expect: {
    timeout: 10000,
  },
  
  // グローバルセットアップ・ティアダウン
  globalSetup: require.resolve('./tests/e2e/helpers/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/helpers/global-teardown.ts'),
  
  // E2Eテストではパッケージ済みElectronアプリを直接起動するため無効
  // webServer: undefined,
});