/**
 * マウス追従機能 - 基本機能E2Eテスト
 * 
 * MOUSE_FOLLOW_DESIGN.md Phase 10: E2E Tests in Real Electron
 * 基本的なマウス追従動作の検証（3テストケース）
 */

import { test, expect } from '@playwright/test';
import { ElectronApp } from '../helpers/electron-app';

test.describe('Mouse Follow - Basic Functionality', () => {
  let electronApp: ElectronApp;
  
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

  test('should track mouse movement and update VRM head position', async () => {
    test.setTimeout(60000); // 1分のタイムアウト
    
    const mainWindow = await electronApp.getMainWindow();
    
    // VRMモデルのロード完了まで待機
    await mainWindow.waitForFunction(() => {
      const vrmCanvas = document.getElementById('vrm-canvas');
      return vrmCanvas !== null;
    }, { timeout: 30000 });
    
    console.log('[Test] VRMキャンバスが表示されました');
    
    // VRMモデルの準備完了まで待機
    await mainWindow.waitForFunction(() => {
      return (window as any).vrmSetupManager?.getLoadedVRM() !== null;
    }, { timeout: 30000 });
    
    console.log('[Test] VRMモデルのロードが完了しました');
    
    // マウスを画面の中央に移動
    await mainWindow.mouse.move(400, 300);
    await mainWindow.waitForTimeout(1000);
    
    // 初期のlookAt位置を記録
    const initialLookAt = await mainWindow.evaluate(() => {
      const vrm = (window as any).vrmSetupManager?.getLoadedVRM();
      if (vrm?.lookAt?.target) {
        return {
          x: vrm.lookAt.target.position.x,
          y: vrm.lookAt.target.position.y,
          z: vrm.lookAt.target.position.z
        };
      }
      return null;
    });
    
    console.log('[Test] 初期lookAt位置:', initialLookAt);
    
    // マウスを右上に移動
    await mainWindow.mouse.move(600, 100);
    await mainWindow.waitForTimeout(1000);
    
    // lookAt位置が変更されたことを確認
    const updatedLookAt = await mainWindow.evaluate(() => {
      const vrm = (window as any).vrmSetupManager?.getLoadedVRM();
      if (vrm?.lookAt?.target) {
        return {
          x: vrm.lookAt.target.position.x,
          y: vrm.lookAt.target.position.y,
          z: vrm.lookAt.target.position.z
        };
      }
      return null;
    });
    
    console.log('[Test] 更新後のlookAt位置:', updatedLookAt);
    
    // lookAtターゲットが存在し、位置が変更されたことを確認
    expect(updatedLookAt).not.toBeNull();
    expect(updatedLookAt?.x).not.toBe(initialLookAt?.x);
    expect(updatedLookAt?.y).not.toBe(initialLookAt?.y);
  });

  test('should smoothly interpolate head movement', async () => {
    test.setTimeout(60000);
    
    const mainWindow = await electronApp.getMainWindow();
    
    // VRMモデルのロード完了まで待機
    await mainWindow.waitForFunction(() => {
      return (window as any).vrmSetupManager?.getLoadedVRM() !== null;
    }, { timeout: 30000 });
    
    // 初期位置
    await mainWindow.mouse.move(400, 300);
    await mainWindow.waitForTimeout(500);
    
    // 位置変化を記録するための配列
    const positions: Array<{x: number, y: number, z: number}> = [];
    
    // マウスを素早く移動しながら、lookAt位置を記録
    const recordInterval = setInterval(async () => {
      const pos = await mainWindow.evaluate(() => {
        const vrm = (window as any).vrmSetupManager?.getLoadedVRM();
        if (vrm?.lookAt?.target) {
          return {
            x: vrm.lookAt.target.position.x,
            y: vrm.lookAt.target.position.y,
            z: vrm.lookAt.target.position.z
          };
        }
        return null;
      });
      
      if (pos) {
        positions.push(pos);
      }
    }, 100); // 100msごとに記録
    
    // マウスを素早く移動
    await mainWindow.mouse.move(600, 100, { steps: 10 });
    await mainWindow.waitForTimeout(1000);
    
    clearInterval(recordInterval);
    
    console.log('[Test] 記録された位置数:', positions.length);
    
    // スムージングが効いているか確認（急激な変化がないこと）
    let hasSmoothing = true;
    for (let i = 1; i < positions.length; i++) {
      const deltaX = Math.abs(positions[i].x - positions[i-1].x);
      const deltaY = Math.abs(positions[i].y - positions[i-1].y);
      
      // 急激な変化（0.5以上）がないことを確認
      if (deltaX > 0.5 || deltaY > 0.5) {
        hasSmoothing = false;
        console.log(`[Test] 急激な変化を検出: deltaX=${deltaX}, deltaY=${deltaY}`);
        break;
      }
    }
    
    expect(hasSmoothing).toBe(true);
    expect(positions.length).toBeGreaterThan(3); // 複数の中間位置が記録されていること
  });

  test('should maintain natural head rotation limits', async () => {
    test.setTimeout(60000);
    
    const mainWindow = await electronApp.getMainWindow();
    
    // VRMモデルのロード完了まで待機
    await mainWindow.waitForFunction(() => {
      return (window as any).vrmSetupManager?.getLoadedVRM() !== null;
    }, { timeout: 30000 });
    
    // 画面の端にマウスを移動（極端な位置）
    const extremePositions = [
      { x: 0, y: 0 },      // 左上
      { x: 800, y: 0 },    // 右上
      { x: 0, y: 600 },    // 左下
      { x: 800, y: 600 }   // 右下
    ];
    
    for (const pos of extremePositions) {
      await mainWindow.mouse.move(pos.x, pos.y);
      await mainWindow.waitForTimeout(1000);
      
      // lookAt位置を取得
      const lookAtPos = await mainWindow.evaluate(() => {
        const vrm = (window as any).vrmSetupManager?.getLoadedVRM();
        if (vrm?.lookAt?.target) {
          return {
            x: vrm.lookAt.target.position.x,
            y: vrm.lookAt.target.position.y,
            z: vrm.lookAt.target.position.z
          };
        }
        return null;
      });
      
      console.log(`[Test] 極端な位置 (${pos.x}, ${pos.y}) でのlookAt:`, lookAtPos);
      
      // 自然な範囲内に制限されているか確認
      expect(lookAtPos).not.toBeNull();
      expect(Math.abs(lookAtPos!.x)).toBeLessThanOrEqual(3); // X軸の制限
      expect(Math.abs(lookAtPos!.y - 1.3)).toBeLessThanOrEqual(2); // Y軸の制限（頭の高さ基準）
    }
  });
});