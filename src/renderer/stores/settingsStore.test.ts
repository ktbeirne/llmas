/**
 * settingsStore.test.ts - React版設定ストア単体テスト
 *
 * Phase 3.2.1 Task 5: Zustand Storeの包括的なテストスイート
 * パフォーマンス統合、エラーハンドリング、バリデーション機能をテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// テスト対象
import { useSettingsStore, DEFAULT_SETTINGS } from './settingsStore';
import type {
  SettingsSection,
  WindowSettingsData,
  ChatSettingsData,
  ThemeSettingsData,
  ExpressionSettingsData,
} from './settingsStore';

// モック化
vi.mock('./performanceIntegration', () => {
  const mockPerformanceIntegrator = {
    startSettingsOperation: vi.fn(() => 'mock-operation-id'),
    endSettingsOperation: vi.fn(() => 150),
    recordSettingsError: vi.fn(),
    getComprehensiveMetrics: vi.fn(() => ({
      performance: { operationCount: 5, averageTime: 120 },
      errors: { errorCount: 1 },
      sections: { window: { healthScore: 85 } },
      summary: { totalOperations: 10, totalErrors: 1, overallHealth: 90 },
    })),
    generatePerformanceReport: vi.fn(() => 'Mock Performance Report'),
    resetAllMetrics: vi.fn(),
    performanceManager: {
      trackReactRender: vi.fn(),
    },
  };

  return {
    settingsPerformanceIntegrator: mockPerformanceIntegrator,
    ReactErrorHandler: {
      handleReactError: vi.fn(),
    },
    SettingsPerformanceIntegrator: vi.fn(() => mockPerformanceIntegrator),
  };
});

vi.mock('./settingsValidation', () => ({
  validateWindowSettings: vi.fn(() => []),
  validateChatSettings: vi.fn(() => []),
  validateThemeSettings: vi.fn(() => []),
  validateExpressionSettings: vi.fn(() => []),
}));

// ElectronAPI モック - Promise.resolveを返すように修正
const createPromiseMock = (returnValue: any) => {
  const mock = vi.fn(() => Promise.resolve(returnValue));
  // .catch() メソッドも対応
  mock.mockReturnValue({
    ...Promise.resolve(returnValue),
    catch: vi.fn(() => Promise.resolve(returnValue)),
  });
  return mock;
};

const mockElectronAPI = {
  getSettings: createPromiseMock({
    windowSize: { width: 400, height: 600, preset: 'medium' },
    vrmModelPath: '/test.vrm',
  }),
  getMainWindowBounds: createPromiseMock(null),
  getCameraSettings: createPromiseMock({
    position: { x: 0, y: 1, z: 5 },
    target: { x: 0, y: 1, z: 0 },
    zoom: 1.0,
  }),
  getUserName: createPromiseMock('TestUser'),
  getMascotName: createPromiseMock('TestMascot'),
  getSystemPromptCore: createPromiseMock('Test system prompt'),
  getChatWindowBounds: createPromiseMock(null),
  getChatWindowVisible: createPromiseMock(true),
  getTheme: createPromiseMock('default'),
  getAvailableThemes: createPromiseMock([]),
  getExpressionSettings: createPromiseMock({}),
  getAvailableExpressions: createPromiseMock([]),
  getDefaultExpression: createPromiseMock('neutral'),
  saveAllDisplaySettings: createPromiseMock({ success: true }),
  setCameraSettings: createPromiseMock({ success: true }),
  setMainWindowBounds: createPromiseMock({ success: true }),
  setUserName: createPromiseMock({ success: true }),
  setMascotName: createPromiseMock({ success: true }),
  setSystemPromptCore: createPromiseMock({ success: true }),
  setChatWindowVisible: createPromiseMock({ success: true }),
  setChatWindowBounds: createPromiseMock({ success: true }),
  setTheme: createPromiseMock({ success: true }),
  setExpressionSettings: createPromiseMock({ success: true }),
  setDefaultExpression: createPromiseMock({ success: true }),
  updateToolsAndReinitializeGemini: createPromiseMock({ success: true }),
};

// グローバル window オブジェクトのモック
Object.defineProperty(global, 'window', {
  value: {
    electronAPI: mockElectronAPI,
    dispatchEvent: vi.fn(),
  },
  writable: true,
});

// Performance API モック
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000,
    },
  },
  writable: true,
});

describe('React Settings Store (Zustand)', () => {
  beforeEach(async () => {
    // モックをリセット
    vi.clearAllMocks();

    // バリデーションモックを正常動作（エラーなし）にリセット
    const {
      validateWindowSettings,
      validateChatSettings,
      validateThemeSettings,
      validateExpressionSettings,
    } = await import('./settingsValidation');
    (validateWindowSettings as Mock).mockReturnValue([]);
    (validateChatSettings as Mock).mockReturnValue([]);
    (validateThemeSettings as Mock).mockReturnValue([]);
    (validateExpressionSettings as Mock).mockReturnValue([]);

    // パフォーマンス警告テストの場合はdispose()をスキップ
    const currentTestName = expect.getState().currentTestName;
    if (!currentTestName?.includes('長時間操作の警告')) {
      // ストアをクリーンな状態にリセット（パフォーマンステスト以外）
      const { result } = renderHook(() => useSettingsStore());
      act(() => {
        result.current.dispose(); // 現在はresetとして動作
      });
    }

    // デフォルトの成功レスポンスを設定
    Object.values(mockElectronAPI).forEach((mockFn: Mock) => {
      if (mockFn.mockReturnValue === undefined) {
        mockFn.mockResolvedValue({ success: true });
      }
    });
  });

  describe('初期化とライフサイクル', () => {
    it('初期状態が正しく設定されている', () => {
      const { result } = renderHook(() => useSettingsStore());
      const state = result.current;

      expect(state.isDisposed).toBe(false);
      expect(state.window).toBe(null);
      expect(state.chat).toBe(null);
      expect(state.theme).toBe(null);
      expect(state.expressions).toBe(null);

      expect(state.isLoading.window).toBe(false);
      expect(state.isLoading.chat).toBe(false);
      expect(state.isLoading.theme).toBe(false);
      expect(state.isLoading.expressions).toBe(false);

      expect(state.isInitialized.window).toBe(false);
      expect(state.isInitialized.chat).toBe(false);
      expect(state.isInitialized.theme).toBe(false);
      expect(state.isInitialized.expressions).toBe(false);
    });

    it('dispose()によってストアが正しくリセットされる', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.dispose();
      });

      // dispose()は現在reset機能として動作（再利用可能）
      expect(result.current.isDisposed).toBe(false);
      expect(result.current.window).toBe(null);
      expect(result.current.chat).toBe(null);
      expect(result.current.theme).toBe(null);
      expect(result.current.expressions).toBe(null);

      // 初期化状態もリセットされる
      expect(result.current.isInitialized.window).toBe(false);
      expect(result.current.isInitialized.chat).toBe(false);
      expect(result.current.isInitialized.theme).toBe(false);
      expect(result.current.isInitialized.expressions).toBe(false);
    });
  });

  describe('設定読み込み機能', () => {
    it('Window設定が正常に読み込まれる', async () => {
      const mockWindowSettings = {
        windowSize: { width: 500, height: 700, preset: 'large' },
        vrmModelPath: '/test/model.vrm',
      };
      const mockCameraSettings = {
        position: { x: 1, y: 2, z: 3 },
        target: { x: 0, y: 1, z: 0 },
        zoom: 1.5,
      };

      mockElectronAPI.getSettings.mockResolvedValue(mockWindowSettings);
      mockElectronAPI.getCameraSettings.mockResolvedValue(mockCameraSettings);

      const { result } = renderHook(() => useSettingsStore());

      await act(async () => {
        await result.current.loadSettings('window');
      });

      expect(result.current.window).toMatchObject({
        windowSize: mockWindowSettings.windowSize,
        vrmModelPath: mockWindowSettings.vrmModelPath,
        cameraSettings: mockCameraSettings,
      });
      expect(result.current.isInitialized.window).toBe(true);
      expect(result.current.isLoading.window).toBe(false);
    });

    it('Chat設定が正常に読み込まれる', async () => {
      mockElectronAPI.getUserName.mockResolvedValue('TestUser');
      mockElectronAPI.getMascotName.mockResolvedValue('TestMascot');
      mockElectronAPI.getSystemPromptCore.mockResolvedValue('Test system prompt');
      mockElectronAPI.getChatWindowVisible.mockResolvedValue(true);

      const { result } = renderHook(() => useSettingsStore());

      await act(async () => {
        await result.current.loadSettings('chat');
      });

      expect(result.current.chat).toMatchObject({
        userName: 'TestUser',
        mascotName: 'TestMascot',
        systemPromptCore: 'Test system prompt',
        chatWindowVisible: true,
      });
      expect(result.current.isInitialized.chat).toBe(true);
    });

    it('読み込みエラー時にデフォルト設定が適用される', async () => {
      mockElectronAPI.getSettings.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useSettingsStore());

      await act(async () => {
        await result.current.loadSettings('window');
      });

      expect(result.current.window).toMatchObject(DEFAULT_SETTINGS.window);
      expect(result.current.errors.window).toBeInstanceOf(Error);
      expect(result.current.isLoading.window).toBe(false);
    });

    it('全セクション並行初期化が動作する', async () => {
      mockElectronAPI.getSettings.mockResolvedValue(DEFAULT_SETTINGS.window);
      mockElectronAPI.getUserName.mockResolvedValue('User');
      mockElectronAPI.getTheme.mockResolvedValue('default');
      mockElectronAPI.getExpressionSettings.mockResolvedValue({});

      const { result } = renderHook(() => useSettingsStore());

      await act(async () => {
        await result.current.initializeAllSections();
      });

      expect(result.current.isInitialized.window).toBe(true);
      expect(result.current.isInitialized.chat).toBe(true);
      expect(result.current.isInitialized.theme).toBe(true);
      expect(result.current.isInitialized.expressions).toBe(true);
    });
  });

  describe('設定更新機能', () => {
    it('Window設定が正常に更新される', async () => {
      const newWindowSettings: WindowSettingsData = {
        windowSize: { width: 600, height: 800, preset: 'custom' },
        vrmModelPath: '/new/model.vrm',
        cameraSettings: {
          position: { x: 2, y: 3, z: 4 },
          target: { x: 1, y: 1, z: 1 },
          zoom: 2.0,
        },
      };

      mockElectronAPI.saveAllDisplaySettings.mockResolvedValue({ success: true });
      mockElectronAPI.setCameraSettings.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useSettingsStore());

      await act(async () => {
        await result.current.updateSettings('window', newWindowSettings);
      });

      expect(result.current.window).toEqual(newWindowSettings);
      expect(mockElectronAPI.saveAllDisplaySettings).toHaveBeenCalled();
      expect(mockElectronAPI.setCameraSettings).toHaveBeenCalledWith(
        newWindowSettings.cameraSettings
      );
    });

    it('バリデーションエラー時に更新が停止される', async () => {
      const { validateWindowSettings } = await import('./settingsValidation');
      (validateWindowSettings as Mock).mockReturnValue([
        { field: 'width', message: 'Invalid width', value: -100 },
      ]);

      const invalidSettings: WindowSettingsData = {
        windowSize: { width: -100, height: 200, preset: 'custom' },
        vrmModelPath: '/model.vrm',
        cameraSettings: DEFAULT_SETTINGS.window.cameraSettings,
      };

      const { result } = renderHook(() => useSettingsStore());

      await act(async () => {
        await result.current.updateSettings('window', invalidSettings);
      });

      expect(result.current.validation.window).toHaveLength(1);
      expect(mockElectronAPI.saveAllDisplaySettings).not.toHaveBeenCalled();
    });

    it('設定リセットが正常に動作する', async () => {
      mockElectronAPI.saveAllDisplaySettings.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useSettingsStore());

      await act(async () => {
        await result.current.resetSettings('window');
      });

      expect(mockElectronAPI.saveAllDisplaySettings).toHaveBeenCalledWith(
        expect.objectContaining(DEFAULT_SETTINGS.window)
      );
    });
  });

  describe('パフォーマンス統合機能', () => {
    let mockIntegrator: any;

    beforeEach(async () => {
      const { settingsPerformanceIntegrator } = await import('./performanceIntegration');
      mockIntegrator = settingsPerformanceIntegrator;
    });

    it('startOperation/endOperationが統合システムを使用する', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        const operationId = result.current.startOperation('testOperation', 'window');
        expect(operationId).toBe('mock-operation-id');
        expect(mockIntegrator.startSettingsOperation).toHaveBeenCalledWith(
          'window',
          'testOperation'
        );
      });

      act(() => {
        const duration = result.current.endOperation('testOperation', 'window');
        expect(duration).toBe(150);
        expect(mockIntegrator.endSettingsOperation).toHaveBeenCalled();
      });
    });

    it('getPerformanceMetricsが統合メトリクスを含む', () => {
      const { result } = renderHook(() => useSettingsStore());

      const metrics = result.current.getPerformanceMetrics();

      expect(metrics).toHaveProperty('comprehensive');
      expect(metrics.comprehensive).toMatchObject({
        performance: { operationCount: 5, averageTime: 120 },
        summary: { overallHealth: 90 },
      });
      expect(mockIntegrator.getComprehensiveMetrics).toHaveBeenCalled();
    });

    it('getComprehensivePerformanceReportが正常に動作する', () => {
      const { result } = renderHook(() => useSettingsStore());

      const report = result.current.getComprehensivePerformanceReport();

      expect(report).toBe('Mock Performance Report');
      expect(mockIntegrator.generatePerformanceReport).toHaveBeenCalled();
    });

    it('resetIntegratedMetricsが統合システムをリセットする', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.resetIntegratedMetrics();
      });

      expect(mockIntegrator.resetAllMetrics).toHaveBeenCalled();
    });

    it('trackComponentRenderがReactパフォーマンス管理に委譲される', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.trackComponentRender('TestComponent', 25.5);
      });

      expect(mockIntegrator.performanceManager.trackReactRender).toHaveBeenCalledWith(
        'TestComponent',
        25.5
      );
    });
  });

  describe('エラーハンドリング統合', () => {
    let mockIntegrator: any;

    beforeEach(async () => {
      const { settingsPerformanceIntegrator } = await import('./performanceIntegration');
      mockIntegrator = settingsPerformanceIntegrator;
    });

    it('handleErrorが統合エラーハンドリングシステムを使用する', () => {
      const { result } = renderHook(() => useSettingsStore());
      const testError = new Error('Test error');

      act(() => {
        result.current.handleError('window', testError, 'testOperation');
      });

      expect(mockIntegrator.recordSettingsError).toHaveBeenCalledWith(
        'window',
        testError,
        'testOperation'
      );
      expect(result.current.errors.window).toBe(testError);
      expect(result.current.errorState.hasError).toBe(true);
      expect(result.current.errorState.errorHistory).toHaveLength(1);
    });

    it('clearErrorsが正常に動作する', () => {
      const { result } = renderHook(() => useSettingsStore());
      const testError = new Error('Test error');

      // エラーを設定
      act(() => {
        result.current.handleError('window', testError, 'testOperation');
      });

      // エラーをクリア
      act(() => {
        result.current.clearErrors('window');
      });

      expect(result.current.errors.window).toBe(null);
    });

    it('エラー履歴制限が動作する（100件制限）', () => {
      const { result } = renderHook(() => useSettingsStore());

      // 105個のエラーを追加
      act(() => {
        for (let i = 0; i < 105; i++) {
          result.current.handleError('window', new Error(`Error ${i}`), 'operation');
        }
      });

      expect(result.current.errorState.errorHistory).toHaveLength(100);
    });
  });

  describe('バリデーション機能', () => {
    it('validateSettingsが各セクションの対応するバリデーターを呼び出す', async () => {
      const { validateWindowSettings } = await import('./settingsValidation');

      const { result } = renderHook(() => useSettingsStore());
      const testData: WindowSettingsData = {
        windowSize: { width: 400, height: 600, preset: 'medium' },
        vrmModelPath: '/test.vrm',
        cameraSettings: DEFAULT_SETTINGS.window.cameraSettings,
      };

      result.current.validateSettings('window', testData);

      expect(validateWindowSettings).toHaveBeenCalledWith(testData);
    });

    it('clearValidationErrorsが正常に動作する', async () => {
      const { validateWindowSettings } = await import('./settingsValidation');
      (validateWindowSettings as Mock).mockReturnValue([
        { field: 'test', message: 'test error', value: 'test' },
      ]);

      const { result } = renderHook(() => useSettingsStore());

      // バリデーションエラーを生成するために無効なデータで更新を試行
      const invalidData: WindowSettingsData = {
        windowSize: { width: 400, height: 600, preset: 'medium' },
        vrmModelPath: '/test.vrm',
        cameraSettings: DEFAULT_SETTINGS.window.cameraSettings,
      };

      await act(async () => {
        await result.current.updateSettings('window', invalidData);
      });

      // バリデーションエラーが設定されていることを確認
      expect(result.current.validation.window).toHaveLength(1);

      // エラーをクリア
      act(() => {
        result.current.clearValidationErrors('window');
      });

      expect(result.current.validation.window).toHaveLength(0);
    });
  });

  describe('デバッグ・開発支援機能', () => {
    it('getDebugInfoが完全な状態情報を返す', () => {
      const { result } = renderHook(() => useSettingsStore());

      const debugInfo = result.current.getDebugInfo();

      expect(debugInfo).toHaveProperty('state');
      expect(debugInfo).toHaveProperty('performance');
      expect(debugInfo).toHaveProperty('errors');

      expect(debugInfo.state).toMatchObject({
        window: null,
        chat: null,
        theme: null,
        expressions: null,
        isDisposed: false,
      });
    });
  });

  describe('ElectronAPI統合', () => {
    it('ElectronAPIが利用できない場合のエラーハンドリング', async () => {
      // 新しいwindowオブジェクトでElectronAPIを無効化
      const originalWindow = global.window;
      Object.defineProperty(global, 'window', {
        value: { electronAPI: null },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useSettingsStore());

      await act(async () => {
        await result.current.loadSettings('window');
      });

      expect(result.current.errors.window).toBeInstanceOf(Error);
      expect(result.current.errors.window?.message).toContain('ElectronAPI not available');

      // windowオブジェクトを復元
      Object.defineProperty(global, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    });

    it('並行API呼び出しによるパフォーマンス最適化', async () => {
      // Promise.allの動作を確認するため、API呼び出しを遅延させる
      mockElectronAPI.getSettings.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(DEFAULT_SETTINGS.window), 10))
      );
      mockElectronAPI.getCameraSettings.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve(DEFAULT_SETTINGS.window.cameraSettings), 10)
          )
      );

      const { result } = renderHook(() => useSettingsStore());

      const startTime = Date.now();
      await act(async () => {
        await result.current.loadSettings('window');
      });
      const endTime = Date.now();

      // 並行実行により、シーケンシャル実行（20ms以上）より速い（15ms以下）
      expect(endTime - startTime).toBeLessThan(15);
      expect(mockElectronAPI.getSettings).toHaveBeenCalled();
      expect(mockElectronAPI.getCameraSettings).toHaveBeenCalled();
    });
  });

  describe('パフォーマンス最適化', () => {
    it('メモリ使用量が追跡される', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.startOperation('memoryTest');
        result.current.endOperation('memoryTest');
      });

      const metrics = result.current.getPerformanceMetrics();
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.memoryUsage?.usedJSHeapSize).toBe(1000000);
    });
  });
});
