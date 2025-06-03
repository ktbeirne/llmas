/**
 * E2Eテスト実行前のグローバルセットアップ
 * 
 * 全テスト実行前に一度だけ実行される処理を定義
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('[E2E Setup] E2Eテスト環境のセットアップを開始します...');
  
  try {
    // テスト結果ディレクトリの準備
    const testResultsDir = path.join(process.cwd(), 'test-results');
    await fs.mkdir(testResultsDir, { recursive: true });
    await fs.mkdir(path.join(testResultsDir, 'e2e-artifacts'), { recursive: true });
    await fs.mkdir(path.join(testResultsDir, 'e2e-report'), { recursive: true });
    
    // 既存のテスト結果ファイルをクリア
    try {
      await fs.unlink(path.join(testResultsDir, 'e2e-results.json'));
    } catch (error) {
      // ファイルが存在しない場合は無視
    }
    
    try {
      await fs.unlink(path.join(testResultsDir, 'e2e-junit.xml'));
    } catch (error) {
      // ファイルが存在しない場合は無視
    }
    
    // 環境変数の設定
    process.env.E2E_TEST_MODE = 'true';
    process.env.NODE_ENV = 'test';
    
    // Electronアプリケーションのビルド状態確認
    const buildDir = path.join(process.cwd(), '.vite', 'build');
    try {
      await fs.access(buildDir);
      console.log('[E2E Setup] Electronアプリケーションのビルドファイルが見つかりました');
    } catch (error) {
      console.warn('[E2E Setup] 警告: Electronアプリケーションのビルドファイルが見つかりません');
      console.warn('[E2E Setup] テスト実行前に "npm run package" を実行することを推奨します');
    }
    
    // テスト用データベース・設定ファイルの準備
    const testConfigDir = path.join(process.cwd(), 'test-data');
    await fs.mkdir(testConfigDir, { recursive: true });
    
    // テスト用設定ファイルの作成
    const testSettings = {
      userName: 'E2E Test User',
      mascotName: 'Test Mascot',
      theme: 'light',
      cameraSettings: {
        position: { x: 0, y: 0, z: 5 },
        target: { x: 0, y: 0, z: 0 },
        zoom: 1.0
      }
    };
    
    await fs.writeFile(
      path.join(testConfigDir, 'test-settings.json'),
      JSON.stringify(testSettings, null, 2)
    );
    
    console.log('[E2E Setup] E2Eテスト環境のセットアップが完了しました');
    
  } catch (error) {
    console.error('[E2E Setup] エラー: セットアップに失敗しました', error);
    throw error;
  }
}

export default globalSetup;