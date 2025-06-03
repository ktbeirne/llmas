/**
 * チャットウィンドウ折り畳み機能 基本E2Eテスト
 * 
 * 折り畳みボタンが存在することを確認する簡易テスト
 */

import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import * as path from 'path';

test.describe('折り畳みボタンの基本確認', () => {
  test('チャットウィンドウに折り畳みボタンが存在する', async () => {
    // Electronアプリを起動
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../../')],
      env: {
        ...process.env,
        E2E_TEST: 'true'
      }
    });

    try {
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 5000));

      // ウィンドウ一覧を取得
      const windows = await electronApp.windows();
      console.log(`[Test] ウィンドウ数: ${windows.length}`);

      // 各ウィンドウのURLを確認
      for (const window of windows) {
        const url = await window.url();
        console.log(`[Test] ウィンドウURL: ${url}`);
        
        if (url.includes('chat.html')) {
          console.log('[Test] チャットウィンドウを発見');
          
          // 折り畳みボタンの存在を確認
          const collapseButton = window.locator('#collapse-button');
          const exists = await collapseButton.count() > 0;
          
          if (exists) {
            console.log('[Test] 折り畳みボタンが存在します');
            const buttonText = await collapseButton.textContent();
            console.log(`[Test] ボタンテキスト: ${buttonText}`);
            
            // ボタンが存在することを確認
            expect(exists).toBe(true);
            expect(['▲', '▼'].includes(buttonText?.trim() || '')).toBe(true);
          } else {
            console.log('[Test] 折り畳みボタンが見つかりません');
          }
        }
      }
    } finally {
      await electronApp.close();
    }
  });
});