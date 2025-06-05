/**
 * reactApiTest.test.ts - React ElectronAPI 統合テストのテストファイル
 *
 * Phase 3.1.7: ElectronAPI React側アクセス確認・IPC通信テスト
 * ReactElectronAPITester の動作を検証
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ReactElectronAPITester } from './reactApiTest';

// ElectronAPIのモック
const mockElectronAPI = {
  getWindowSettings: vi.fn(),
  getChatSettings: vi.fn(),
  getTheme: vi.fn(),
  getExpressionSettings: vi.fn(),
  getAppInfo: vi.fn(),
  saveWindowSettings: vi.fn(),
};

// Window オブジェクトのモック
declare global {
  interface Window {
    electronAPI: typeof mockElectronAPI;
  }
}

describe('ReactElectronAPITester', () => {
  let tester: ReactElectronAPITester;

  beforeEach(() => {
    tester = new ReactElectronAPITester();

    // モックをリセット
    vi.clearAllMocks();

    // window.electronAPIをモック
    global.window = global.window || ({} as Window & typeof globalThis);
    (global.window as any).electronAPI = mockElectronAPI;
  });

  afterEach(() => {
    // モックを削除
    delete (global.window as any).electronAPI;
  });

  describe('ElectronAPI存在確認テスト', () => {
    it('ElectronAPIが利用可能な場合、成功結果を返す', async () => {
      const results = await tester.runAllTests();

      const existenceTest = results.find(r => r.name === 'ElectronAPI Existence Check');
      expect(existenceTest).toBeDefined();
      expect(existenceTest?.success).toBe(true);
      expect(existenceTest?.data?.availableMethods).toEqual(Object.keys(mockElectronAPI));
    });

    it('ElectronAPIが利用不可能な場合、失敗結果を返す', async () => {
      delete (global.window as any).electronAPI;

      const results = await tester.runAllTests();

      const existenceTest = results.find(r => r.name === 'ElectronAPI Existence Check');
      expect(existenceTest).toBeDefined();
      expect(existenceTest?.success).toBe(false);
      expect(existenceTest?.error).toContain('window.electronAPI is not available');
    });
  });

  describe('個別APIメソッドテスト', () => {
    it('getWindowSettings テストが正常動作する', async () => {
      const mockSettings = { width: 400, height: 800 };
      mockElectronAPI.getWindowSettings.mockResolvedValue(mockSettings);

      const results = await tester.runAllTests();

      const windowTest = results.find(r => r.name === 'getWindowSettings');
      expect(windowTest).toBeDefined();
      expect(windowTest?.success).toBe(true);
      expect(windowTest?.data).toEqual(mockSettings);
      expect(mockElectronAPI.getWindowSettings).toHaveBeenCalled();
    });

    it('getChatSettings テストが正常動作する', async () => {
      const mockSettings = { userName: 'Test User', mascotName: 'Test Mascot' };
      mockElectronAPI.getChatSettings.mockResolvedValue(mockSettings);

      const results = await tester.runAllTests();

      const chatTest = results.find(r => r.name === 'getChatSettings');
      expect(chatTest).toBeDefined();
      expect(chatTest?.success).toBe(true);
      expect(chatTest?.data).toEqual(mockSettings);
      expect(mockElectronAPI.getChatSettings).toHaveBeenCalled();
    });

    it('getTheme テストが正常動作する', async () => {
      const mockTheme = { id: 'default', name: 'Default Theme' };
      mockElectronAPI.getTheme.mockResolvedValue(mockTheme);

      const results = await tester.runAllTests();

      const themeTest = results.find(r => r.name === 'getTheme');
      expect(themeTest).toBeDefined();
      expect(themeTest?.success).toBe(true);
      expect(themeTest?.data).toEqual(mockTheme);
      expect(mockElectronAPI.getTheme).toHaveBeenCalled();
    });

    it('getExpressionSettings テストが正常動作する', async () => {
      const mockSettings = { expressions: ['happy', 'sad', 'surprised'] };
      mockElectronAPI.getExpressionSettings.mockResolvedValue(mockSettings);

      const results = await tester.runAllTests();

      const expressionTest = results.find(r => r.name === 'getExpressionSettings');
      expect(expressionTest).toBeDefined();
      expect(expressionTest?.success).toBe(true);
      expect(expressionTest?.data).toEqual(mockSettings);
      expect(mockElectronAPI.getExpressionSettings).toHaveBeenCalled();
    });

    it('getAppInfo テストが正常動作する', async () => {
      const mockAppInfo = { version: '1.0.0', platform: 'linux', arch: 'x64' };
      mockElectronAPI.getAppInfo.mockResolvedValue(mockAppInfo);

      const results = await tester.runAllTests();

      const appInfoTest = results.find(r => r.name === 'getAppInfo');
      expect(appInfoTest).toBeDefined();
      expect(appInfoTest?.success).toBe(true);
      expect(appInfoTest?.data).toEqual(mockAppInfo);
      expect(mockElectronAPI.getAppInfo).toHaveBeenCalled();
    });
  });

  describe('エラーハンドリングテスト', () => {
    it('APIメソッドがエラーを投げた場合、適切にハンドリングする', async () => {
      const errorMessage = 'Test API Error';
      mockElectronAPI.getWindowSettings.mockRejectedValue(new Error(errorMessage));

      const results = await tester.runAllTests();

      const windowTest = results.find(r => r.name === 'getWindowSettings');
      expect(windowTest).toBeDefined();
      expect(windowTest?.success).toBe(false);
      expect(windowTest?.error).toContain(errorMessage);
    });

    it('存在しないメソッドを適切にハンドリングする', async () => {
      const results = await tester.runAllTests();

      const errorTest = results.find(r => r.name === 'Error Handling Test');
      expect(errorTest).toBeDefined();
      expect(errorTest?.success).toBe(true);
    });
  });

  describe('IPC通信テスト', () => {
    it('IPC通信テストが正常動作する（saveWindowSettingsが利用可能）', async () => {
      const mockCurrentSettings = { width: 400, height: 800 };
      mockElectronAPI.getWindowSettings.mockResolvedValue(mockCurrentSettings);
      mockElectronAPI.saveWindowSettings.mockResolvedValue(true);

      const results = await tester.runAllTests();

      const ipcTest = results.find(r => r.name === 'IPC Communication Test');
      expect(ipcTest).toBeDefined();
      expect(ipcTest?.success).toBe(true);
      expect(ipcTest?.data?.currentSettings).toEqual(mockCurrentSettings);
    });

    it('IPC通信テストがスキップされる（saveWindowSettingsが利用不可能）', async () => {
      delete (mockElectronAPI as any).saveWindowSettings;

      const results = await tester.runAllTests();

      const ipcTest = results.find(r => r.name === 'IPC Communication Test');
      expect(ipcTest).toBeDefined();
      expect(ipcTest?.success).toBe(true);
      expect(ipcTest?.data?.message).toContain('test skipped');
    });
  });

  describe('テスト結果集計', () => {
    it('成功率が正しく計算される', async () => {
      // いくつかのAPIを失敗させる
      mockElectronAPI.getChatSettings.mockRejectedValue(new Error('Test Error'));
      mockElectronAPI.getTheme.mockRejectedValue(new Error('Test Error'));

      const results = await tester.runAllTests();

      const successfulTests = results.filter(r => r.success).length;
      const totalTests = results.length;
      const successRate = (successfulTests / totalTests) * 100;

      expect(successRate).toBeGreaterThan(0);
      expect(successRate).toBeLessThanOrEqual(100);
      expect(results.length).toBeGreaterThan(0);
    });

    it('各テストに実行時間が記録される', async () => {
      const results = await tester.runAllTests();

      results.forEach(result => {
        expect(result.duration).toBeDefined();
        expect(typeof result.duration).toBe('number');
        expect(result.duration).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('パフォーマンステスト', () => {
    it('全テストが合理的な時間内に完了する', async () => {
      const startTime = performance.now();
      await tester.runAllTests();
      const endTime = performance.now();

      const totalDuration = endTime - startTime;

      // 全テストが3秒以内に完了することを確認
      expect(totalDuration).toBeLessThan(3000);
    });
  });
});
