/**
 * hmrTest.test.ts - Hot Module Replacement (HMR) 機能テストのテストファイル
 *
 * Phase 3.1.8: Hot reload動作確認・開発環境最適化
 * HMRTester の動作を検証
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HMRTester } from './hmrTest';

// import.meta.hotのモック
const mockImportMetaHot = {
  accept: vi.fn(),
  dispose: vi.fn(),
  invalidate: vi.fn(),
  data: {},
  on: vi.fn(),
  send: vi.fn(),
};

// グローバルモックの設定
declare global {
  namespace globalThis {
    var importMetaHot: typeof mockImportMetaHot | undefined;
  }
}

describe('HMRTester', () => {
  let tester: HMRTester;

  beforeEach(() => {
    tester = new HMRTester();

    // モックをリセット
    vi.clearAllMocks();

    // window オブジェクトのモック
    global.window = global.window || ({} as Window & typeof globalThis);

    // import.meta.hot のモック設定
    globalThis.importMetaHot = mockImportMetaHot;

    // import.meta のモック（テスト環境では undefined になる可能性があるため）
    Object.defineProperty(import.meta, 'hot', {
      value: mockImportMetaHot,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // モックをクリーンアップ
    delete globalThis.importMetaHot;
    delete (global.window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    delete (global.window as any).$RefreshReg$;
  });

  describe('HMR基本機能テスト', () => {
    it('HMRが利用可能な場合、正常に検出される', async () => {
      const results = await tester.runHMRTests();

      const hmrAvailabilityTest = results.find(r => r.feature === 'HMR Availability');
      expect(hmrAvailabilityTest).toBeDefined();
      expect(hmrAvailabilityTest?.status).toBe('working');
      expect(hmrAvailabilityTest?.details).toContain('import.meta.hot is available');
    });

    it('HMRが利用不可能な場合、適切に検出される', async () => {
      // import.meta.hot を削除
      Object.defineProperty(import.meta, 'hot', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const results = await tester.runHMRTests();

      const hmrAvailabilityTest = results.find(r => r.feature === 'HMR Availability');
      expect(hmrAvailabilityTest).toBeDefined();
      expect(hmrAvailabilityTest?.status).toBe('not-working');
      expect(hmrAvailabilityTest?.details).toContain('import.meta.hot is undefined');
    });
  });

  describe('Vite HMR API テスト', () => {
    it('利用可能なVite HMR APIを正しく検出する', async () => {
      const results = await tester.runHMRTests();

      const viteAPITest = results.find(r => r.feature === 'Vite HMR API');
      expect(viteAPITest).toBeDefined();
      expect(viteAPITest?.status).toBe('working');
      expect(viteAPITest?.details).toContain('accept');
      expect(viteAPITest?.details).toContain('dispose');
      expect(viteAPITest?.details).toContain('invalidate');
      expect(viteAPITest?.details).toContain('data');
    });

    it('HMRが利用不可能な場合、Vite APIも利用不可能として検出される', async () => {
      Object.defineProperty(import.meta, 'hot', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const results = await tester.runHMRTests();

      const viteAPITest = results.find(r => r.feature === 'Vite HMR API');
      expect(viteAPITest).toBeDefined();
      expect(viteAPITest?.status).toBe('not-working');
      expect(viteAPITest?.details).toContain('import.meta.hot is not available');
    });
  });

  describe('React Hot Reload テスト', () => {
    it('React Refreshが利用可能な場合、正常に検出される', async () => {
      // React Refresh のモック
      (global.window as any).$RefreshReg$ = vi.fn();

      const results = await tester.runHMRTests();

      const reactHotReloadTest = results.find(r => r.feature === 'React Hot Reload');
      expect(reactHotReloadTest).toBeDefined();
      expect(reactHotReloadTest?.status).toBe('working');
      expect(reactHotReloadTest?.details).toContain('React Refresh ($RefreshReg$) is available');
    });

    it('React Refreshが利用不可能な場合、適切に検出される', async () => {
      const results = await tester.runHMRTests();

      const reactHotReloadTest = results.find(r => r.feature === 'React Hot Reload');
      expect(reactHotReloadTest).toBeDefined();
      expect(reactHotReloadTest?.status).toBe('not-working');
      expect(reactHotReloadTest?.details).toContain(
        'React Refresh ($RefreshReg$) is not available'
      );
    });
  });

  describe('開発環境ツールテスト', () => {
    it('利用可能な開発ツールを正しく検出する', async () => {
      // React DevToolsのモック
      (global.window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {};
      (global.window as any).electronAPI = {};

      const results = await tester.runHMRTests();

      const devToolsTest = results.find(r => r.feature === 'Development Tools');
      expect(devToolsTest).toBeDefined();
      expect(devToolsTest?.status).toBe('working');
      expect(devToolsTest?.details).toContain('React DevTools');
      expect(devToolsTest?.details).toContain('Electron DevTools');
      expect(devToolsTest?.details).toContain('Console API');
    });

    it('開発ツールが利用不可能な場合を適切にハンドリングする', async () => {
      // console APIも削除（極端なケース）
      const originalConsole = global.console;
      delete (global as any).console;

      const results = await tester.runHMRTests();

      const devToolsTest = results.find(r => r.feature === 'Development Tools');
      expect(devToolsTest).toBeDefined();
      expect(devToolsTest?.status).toBe('not-working');

      // console APIを復元
      global.console = originalConsole;
    });
  });

  describe('WebSocket接続テスト', () => {
    it('HMR WebSocket通信が利用可能な場合、正常に検出される', async () => {
      const results = await tester.runHMRTests();

      const websocketTest = results.find(r => r.feature === 'WebSocket Connection');
      expect(websocketTest).toBeDefined();
      expect(websocketTest?.status).toBe('working');
      expect(websocketTest?.details).toContain('HMR WebSocket communication is available');
    });

    it('WebSocket通信が利用不可能な場合、適切に検出される', async () => {
      // send メソッドを削除
      const mockHotWithoutSend = { ...mockImportMetaHot };
      delete (mockHotWithoutSend as any).send;

      Object.defineProperty(import.meta, 'hot', {
        value: mockHotWithoutSend,
        writable: true,
        configurable: true,
      });

      const results = await tester.runHMRTests();

      const websocketTest = results.find(r => r.feature === 'WebSocket Connection');
      expect(websocketTest).toBeDefined();
      expect(websocketTest?.status).toBe('not-working');
      expect(websocketTest?.details).toContain('HMR WebSocket communication is not available');
    });
  });

  describe('HMR監視機能テスト', () => {
    it('HMR監視が正常に開始される', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      tester.startHMRMonitoring();

      expect(consoleSpy).toHaveBeenCalledWith('🔄 [HMR Test] Starting HMR monitoring...');
      expect(mockImportMetaHot.accept).toHaveBeenCalled();
      expect(mockImportMetaHot.on).toHaveBeenCalledWith('vite:error', expect.any(Function));
      expect(mockImportMetaHot.on).toHaveBeenCalledWith('vite:ws:connect', expect.any(Function));
      expect(mockImportMetaHot.on).toHaveBeenCalledWith('vite:ws:disconnect', expect.any(Function));

      consoleSpy.mockRestore();
    });
  });

  describe('テスト結果集計', () => {
    it('成功率が正しく計算される', async () => {
      const results = await tester.runHMRTests();

      const workingTests = results.filter(r => r.status === 'working').length;
      const totalTests = results.length;
      const successRate = (workingTests / totalTests) * 100;

      expect(successRate).toBeGreaterThan(0);
      expect(successRate).toBeLessThanOrEqual(100);
      expect(results.length).toBeGreaterThan(0);
    });

    it('各テストにタイムスタンプが記録される', async () => {
      const results = await tester.runHMRTests();

      results.forEach(result => {
        expect(result.timestamp).toBeDefined();
        expect(typeof result.timestamp).toBe('string');
        // ISO形式の日付文字列であることを確認
        expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
      });
    });

    it('テスト結果にはすべての必要なフィールドが含まれている', async () => {
      const results = await tester.runHMRTests();

      results.forEach(result => {
        expect(result).toHaveProperty('feature');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('details');
        expect(result).toHaveProperty('timestamp');

        expect(['working', 'not-working', 'unknown']).toContain(result.status);
        expect(typeof result.feature).toBe('string');
        expect(typeof result.details).toBe('string');
      });
    });
  });

  describe('パフォーマンステスト', () => {
    it('全HMRテストが合理的な時間内に完了する', async () => {
      const startTime = performance.now();
      await tester.runHMRTests();
      const endTime = performance.now();

      const totalDuration = endTime - startTime;

      // 全テストが1秒以内に完了することを確認
      expect(totalDuration).toBeLessThan(1000);
    });
  });
});
