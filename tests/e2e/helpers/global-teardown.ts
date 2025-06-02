/**
 * E2Eテスト実行後のグローバルティアダウン
 * 
 * 全テスト実行後に一度だけ実行される処理を定義
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('[E2E Teardown] E2Eテスト環境のクリーンアップを開始します...');
  
  try {
    // 環境変数のクリア
    delete process.env.E2E_TEST_MODE;
    
    // テスト中に作成された一時ファイルのクリーンアップ
    const testConfigDir = path.join(process.cwd(), 'test-data');
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
      console.log('[E2E Teardown] テストデータディレクトリをクリーンアップしました');
    } catch (error) {
      console.warn('[E2E Teardown] 警告: テストデータディレクトリのクリーンアップに失敗しました', error);
    }
    
    // Electronプロセスが残っていないかチェック
    if (process.platform !== 'win32') {
      try {
        const { exec } = require('child_process');
        exec('pkill -f electron || true', (error: any, stdout: string, stderr: string) => {
          if (error) {
            console.warn('[E2E Teardown] Electronプロセスの終了確認中にエラーが発生しました:', error);
          }
        });
      } catch (error) {
        console.warn('[E2E Teardown] Electronプロセスチェックに失敗しました:', error);
      }
    }
    
    // テスト結果の最終処理
    const testResultsDir = path.join(process.cwd(), 'test-results');
    try {
      const resultsFile = path.join(testResultsDir, 'e2e-results.json');
      await fs.access(resultsFile);
      
      // テスト結果の統計情報をログ出力
      const results = JSON.parse(await fs.readFile(resultsFile, 'utf-8'));
      console.log('[E2E Teardown] テスト実行結果:');
      console.log(`  - 実行されたテスト: ${results.stats?.expected || 'N/A'}`);
      console.log(`  - 成功したテスト: ${results.stats?.passed || 'N/A'}`);
      console.log(`  - 失敗したテスト: ${results.stats?.failed || 'N/A'}`);
      console.log(`  - スキップされたテスト: ${results.stats?.skipped || 'N/A'}`);
      
    } catch (error) {
      console.warn('[E2E Teardown] テスト結果ファイルの読み込みに失敗しました');
    }
    
    console.log('[E2E Teardown] E2Eテスト環境のクリーンアップが完了しました');
    
  } catch (error) {
    console.error('[E2E Teardown] エラー: クリーンアップに失敗しました', error);
    // ティアダウンの失敗はテスト結果に影響しないよう、エラーをスローしない
  }
}

export default globalTeardown;