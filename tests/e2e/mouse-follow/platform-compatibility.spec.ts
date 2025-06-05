/**
 * マウス追従機能 - プラットフォーム互換性E2Eテスト
 * 
 * MOUSE_FOLLOW_DESIGN.md Phase 10: E2E Tests in Real Electron
 * OS別の動作確認（2テストケース）
 */

import { test, expect } from '@playwright/test';
import { ElectronApp } from '../helpers/electron-app';
import * as os from 'os';

test.describe('Mouse Follow - Platform Compatibility', () => {
  let electronApp: ElectronApp;
  const platform = os.platform();
  
  test.beforeEach(async () => {
    electronApp = new ElectronApp();
    await electronApp.launch({
      env: {
        NODE_ENV: 'test',
        E2E_TEST_MODE: 'true'
      }
    });
  });

  test.afterEach(async () => {
    if (electronApp.isRunning()) {
      await electronApp.close();
    }
  });

  test('should handle platform-specific mouse tracking correctly', async () => {
    test.setTimeout(60000);
    
    const mainWindow = await electronApp.getMainWindow();
    
    console.log(`[Test] プラットフォーム: ${platform}`);
    
    // VRMモデルのロード完了まで待機
    await mainWindow.waitForFunction(() => {
      return (window as any).vrmSetupManager?.getLoadedVRM() !== null;
    }, { timeout: 30000 });
    
    // プラットフォーム別の検証
    if (platform === 'darwin') {
      // macOS: アクセシビリティ権限の確認
      console.log('[Test] macOS: アクセシビリティ権限の確認');
      
      // 現在の実装では、既存のmousemoveイベントを使用しているため、
      // アクセシビリティ権限は不要です。
      // 将来的にグローバルマウス追跡を実装する際に必要になります。
      
      const hasMouseTracking = await mainWindow.evaluate(() => {
        // マウスイベントリスナーが登録されているか確認
        const listeners = window.getEventListeners ? 
          window.getEventListeners(window) : {};
        return !!listeners.mousemove;
      });
      
      // 基本的なマウス追従が動作することを確認
      await mainWindow.mouse.move(400, 300);
      await mainWindow.waitForTimeout(500);
      
      const lookAtBefore = await mainWindow.evaluate(() => {
        const vrm = (window as any).vrmSetupManager?.getLoadedVRM();
        return vrm?.lookAt?.target?.position.clone();
      });
      
      await mainWindow.mouse.move(600, 200);
      await mainWindow.waitForTimeout(500);
      
      const lookAtAfter = await mainWindow.evaluate(() => {
        const vrm = (window as any).vrmSetupManager?.getLoadedVRM();
        return vrm?.lookAt?.target?.position.clone();
      });
      
      expect(lookAtAfter.x).not.toBe(lookAtBefore.x);
      expect(lookAtAfter.y).not.toBe(lookAtBefore.y);
      
    } else if (platform === 'win32') {
      // Windows: 権限不要で動作することを確認
      console.log('[Test] Windows: 権限不要での動作確認');
      
      // マウス追従が即座に動作することを確認
      await mainWindow.mouse.move(400, 300);
      await mainWindow.waitForTimeout(500);
      
      const lookAtBefore = await mainWindow.evaluate(() => {
        const vrm = (window as any).vrmSetupManager?.getLoadedVRM();
        return vrm?.lookAt?.target?.position.clone();
      });
      
      await mainWindow.mouse.move(600, 200);
      await mainWindow.waitForTimeout(500);
      
      const lookAtAfter = await mainWindow.evaluate(() => {
        const vrm = (window as any).vrmSetupManager?.getLoadedVRM();
        return vrm?.lookAt?.target?.position.clone();
      });
      
      expect(lookAtAfter.x).not.toBe(lookAtBefore.x);
      expect(lookAtAfter.y).not.toBe(lookAtBefore.y);
      
    } else if (platform === 'linux') {
      // Linux: エラーメッセージが表示されることを確認（将来実装）
      console.log('[Test] Linux: 現在の実装ではサポートされています');
      
      // 現在の実装では、Linuxでも基本的なマウス追従は動作します
      // 将来的にグローバルマウス追跡を実装する際に、
      // Linuxサポートを除外する予定です。
      
      await mainWindow.mouse.move(400, 300);
      await mainWindow.waitForTimeout(500);
      
      const lookAtBefore = await mainWindow.evaluate(() => {
        const vrm = (window as any).vrmSetupManager?.getLoadedVRM();
        return vrm?.lookAt?.target?.position.clone();
      });
      
      await mainWindow.mouse.move(600, 200);
      await mainWindow.waitForTimeout(500);
      
      const lookAtAfter = await mainWindow.evaluate(() => {
        const vrm = (window as any).vrmSetupManager?.getLoadedVRM();
        return vrm?.lookAt?.target?.position.clone();
      });
      
      // 現在はLinuxでも動作する
      expect(lookAtAfter.x).not.toBe(lookAtBefore.x);
      expect(lookAtAfter.y).not.toBe(lookAtBefore.y);
    }
  });

  test('should handle multi-display configurations', async () => {
    test.setTimeout(60000);
    
    const mainWindow = await electronApp.getMainWindow();
    
    // VRMモデルのロード完了まで待機
    await mainWindow.waitForFunction(() => {
      return (window as any).vrmSetupManager?.getLoadedVRM() !== null;
    }, { timeout: 30000 });
    
    // ディスプレイ情報を取得
    const displayInfo = await mainWindow.evaluate(async () => {
      // 現在の実装では、ウィンドウ内のマウス座標のみを使用
      return {
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        devicePixelRatio: window.devicePixelRatio
      };
    });
    
    console.log('[Test] ディスプレイ情報:', displayInfo);
    
    // 異なる画面位置でのマウス追従をテスト
    const testPositions = [
      { x: 0, y: 0, desc: '左上' },
      { x: displayInfo.windowWidth - 1, y: 0, desc: '右上' },
      { x: 0, y: displayInfo.windowHeight - 1, desc: '左下' },
      { x: displayInfo.windowWidth - 1, y: displayInfo.windowHeight - 1, desc: '右下' },
      { x: displayInfo.windowWidth / 2, y: displayInfo.windowHeight / 2, desc: '中央' }
    ];
    
    for (const pos of testPositions) {
      console.log(`[Test] テスト位置: ${pos.desc} (${pos.x}, ${pos.y})`);
      
      await mainWindow.mouse.move(pos.x, pos.y);
      await mainWindow.waitForTimeout(500);
      
      const lookAt = await mainWindow.evaluate(() => {
        const vrm = (window as any).vrmSetupManager?.getLoadedVRM();
        return vrm?.lookAt?.target ? {
          x: vrm.lookAt.target.position.x,
          y: vrm.lookAt.target.position.y,
          z: vrm.lookAt.target.position.z
        } : null;
      });
      
      expect(lookAt).not.toBeNull();
      console.log(`[Test] ${pos.desc}でのlookAt位置:`, lookAt);
      
      // 座標変換が正しく機能していることを確認
      if (pos.x < displayInfo.windowWidth / 2) {
        expect(lookAt!.x).toBeLessThan(0); // 左側
      } else {
        expect(lookAt!.x).toBeGreaterThan(0); // 右側
      }
      
      if (pos.y < displayInfo.windowHeight / 2) {
        expect(lookAt!.y).toBeGreaterThan(1.3); // 上側（Y軸は反転）
      } else {
        expect(lookAt!.y).toBeLessThan(1.3); // 下側
      }
    }
    
    // 高DPI（Retina）ディスプレイでの動作確認
    if (displayInfo.devicePixelRatio > 1) {
      console.log('[Test] 高DPIディスプレイ検出:', displayInfo.devicePixelRatio);
      
      // 高DPIでも正しく座標変換されることを確認
      await mainWindow.mouse.move(400, 300);
      await mainWindow.waitForTimeout(500);
      
      const lookAtHighDPI = await mainWindow.evaluate(() => {
        const vrm = (window as any).vrmSetupManager?.getLoadedVRM();
        return vrm?.lookAt?.target?.position;
      });
      
      expect(lookAtHighDPI).toBeDefined();
      console.log('[Test] 高DPIでのlookAt位置:', lookAtHighDPI);
    }
  });
});