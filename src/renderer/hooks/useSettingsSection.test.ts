/**
 * useSettingsSection.test.ts - useSettingsSection Hook単体テスト
 *
 * Phase 3.2.2 Task 1: Custom Hooksのテスト実装
 * React Testing Library + Vitestによる包括的テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// テスト対象
import {
  useSettingsSection,
  useWindowSettings,
  useChatSettings,
  useThemeSettings,
  useExpressionSettings,
  useMultipleSettingsSections,
} from './useSettingsSection';
import type { WindowSettingsData, ChatSettingsData } from '../stores/settingsStore';
import { DEFAULT_SETTINGS } from '../stores/settingsStore';

// ストアモック
vi.mock('../stores/settingsStore', async () => {
  const actual = await vi.importActual('../stores/settingsStore');

  const createMockStore = () => ({
    // 状態
    window: null,
    chat: null,
    theme: null,
    expressions: null,

    isLoading: {
      window: false,
      chat: false,
      theme: false,
      expressions: false,
    },

    isInitialized: {
      window: false,
      chat: false,
      theme: false,
      expressions: false,
    },

    errors: {
      window: null,
      chat: null,
      theme: null,
      expressions: null,
    },

    validation: {
      window: [],
      chat: [],
      theme: [],
      expressions: [],
    },

    // メソッドモック
    loadSettings: vi.fn(),
    updateSettings: vi.fn(),
    resetSettings: vi.fn(),
    validateSettings: vi.fn(() => []),
    clearValidationErrors: vi.fn(),
    clearErrors: vi.fn(),
    initializeAllSections: vi.fn(),
  });

  const mockStore = createMockStore();

  return {
    ...actual,
    useSettingsStore: vi.fn(() => mockStore),
    DEFAULT_SETTINGS: {
      window: {
        windowSize: { width: 400, height: 600, preset: 'medium' },
        vrmModelPath: '/test.vrm',
        cameraSettings: { position: { x: 0, y: 1, z: 5 }, target: { x: 0, y: 1, z: 0 }, zoom: 1.0 },
      },
      chat: {
        userName: 'TestUser',
        mascotName: 'TestMascot',
        systemPromptCore: 'Test prompt',
        chatWindowVisible: true,
      },
      theme: { currentTheme: 'default', availableThemes: [] },
      expressions: { settings: {}, availableExpressions: [], defaultExpression: 'neutral' },
    },
  };
});

describe('useSettingsSection Hook', () => {
  let mockStore: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // 新しいモックストアインスタンスを取得
    const { useSettingsStore } = await import('../stores/settingsStore');
    mockStore = (useSettingsStore as Mock)();

    // デフォルトの成功レスポンスを設定
    mockStore.loadSettings.mockResolvedValue(undefined);
    mockStore.updateSettings.mockResolvedValue(undefined);
    mockStore.resetSettings.mockResolvedValue(undefined);
    mockStore.initializeAllSections.mockResolvedValue(undefined);
  });

  describe('基本機能テスト', () => {
    it('初期状態が正しく設定されている', () => {
      const { result } = renderHook(() => useSettingsSection('window'));

      expect(result.current.data).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.validationErrors).toEqual([]);
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.isReady).toBe(false);
    });

    it('自動初期化が実行される', async () => {
      renderHook(() => useSettingsSection('window'));

      // useEffectによる自動初期化の確認
      await vi.waitFor(() => {
        expect(mockStore.loadSettings).toHaveBeenCalledWith('window');
      });
    });

    it('loadSettings()が正常に動作する', async () => {
      const { result } = renderHook(() => useSettingsSection('window'));

      await act(async () => {
        await result.current.loadSettings();
      });

      expect(mockStore.loadSettings).toHaveBeenCalledWith('window');
    });

    it('updateSettings()が正常に動作する', async () => {
      const { result } = renderHook(() => useSettingsSection('window'));
      const testData: WindowSettingsData = {
        windowSize: { width: 500, height: 700, preset: 'large' },
        vrmModelPath: '/new.vrm',
        cameraSettings: { position: { x: 1, y: 2, z: 3 }, target: { x: 0, y: 0, z: 0 }, zoom: 1.5 },
      };

      await act(async () => {
        await result.current.updateSettings(testData);
      });

      expect(mockStore.updateSettings).toHaveBeenCalledWith('window', testData);
    });

    it('resetSettings()が正常に動作する', async () => {
      const { result } = renderHook(() => useSettingsSection('window'));

      await act(async () => {
        await result.current.resetSettings();
      });

      expect(mockStore.resetSettings).toHaveBeenCalledWith('window');
    });

    it('refreshSettings()がエラークリアと再読み込みを実行する', async () => {
      const { result } = renderHook(() => useSettingsSection('window'));

      await act(async () => {
        await result.current.refreshSettings();
      });

      expect(mockStore.clearErrors).toHaveBeenCalledWith('window');
      expect(mockStore.loadSettings).toHaveBeenCalledWith('window');
    });
  });

  describe('バリデーション機能', () => {
    it('validateData()が正常に動作する', () => {
      const { result } = renderHook(() => useSettingsSection('window'));
      const testData: WindowSettingsData = DEFAULT_SETTINGS.window;

      const isValid = result.current.validateData(testData);

      expect(mockStore.validateSettings).toHaveBeenCalledWith('window', testData);
      expect(isValid).toBe(true);
    });

    it('バリデーションエラー時にvalidateData()がfalseを返す', () => {
      mockStore.validateSettings.mockReturnValue([
        { field: 'width', message: 'Invalid width', value: -100 },
      ]);

      const { result } = renderHook(() => useSettingsSection('window'));
      const testData: WindowSettingsData = DEFAULT_SETTINGS.window;

      const isValid = result.current.validateData(testData);

      expect(isValid).toBe(false);
    });

    it('clearValidationErrors()が正常に動作する', () => {
      const { result } = renderHook(() => useSettingsSection('window'));

      act(() => {
        result.current.clearValidationErrors();
      });

      expect(mockStore.clearValidationErrors).toHaveBeenCalledWith('window');
    });

    it('バリデーションエラーがある場合にhasUnsavedChangesがtrueになる', () => {
      // バリデーションエラーをモック
      mockStore.validation.window = [{ field: 'test', message: 'test error', value: 'test' }];

      const { result } = renderHook(() => useSettingsSection('window'));

      expect(result.current.hasUnsavedChanges).toBe(true);
    });
  });

  describe('状態管理', () => {
    it('データが読み込まれた状態でisReadyがtrueになる', () => {
      mockStore.isInitialized.window = true;
      mockStore.isLoading.window = false;
      mockStore.errors.window = null;

      const { result } = renderHook(() => useSettingsSection('window'));

      expect(result.current.isReady).toBe(true);
    });

    it('ローディング中はisReadyがfalseになる', () => {
      mockStore.isInitialized.window = true;
      mockStore.isLoading.window = true;
      mockStore.errors.window = null;

      const { result } = renderHook(() => useSettingsSection('window'));

      expect(result.current.isReady).toBe(false);
    });

    it('エラーがある場合はisReadyがfalseになる', () => {
      mockStore.isInitialized.window = true;
      mockStore.isLoading.window = false;
      mockStore.errors.window = new Error('Test error');

      const { result } = renderHook(() => useSettingsSection('window'));

      expect(result.current.isReady).toBe(false);
    });
  });

  describe('エラーハンドリング', () => {
    it('loadSettings()のエラーが適切に処理される', async () => {
      const testError = new Error('Load failed');
      mockStore.loadSettings.mockRejectedValue(testError);

      const { result } = renderHook(() => useSettingsSection('window'));

      await expect(
        act(async () => {
          await result.current.loadSettings();
        })
      ).rejects.toThrow('Load failed');
    });

    it('updateSettings()のエラーが適切に処理される', async () => {
      const testError = new Error('Update failed');
      mockStore.updateSettings.mockRejectedValue(testError);

      const { result } = renderHook(() => useSettingsSection('window'));
      const testData: WindowSettingsData = DEFAULT_SETTINGS.window;

      await expect(
        act(async () => {
          await result.current.updateSettings(testData);
        })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('型付きヘルパーフック', () => {
    it('useWindowSettings()が正常に動作する', () => {
      const { result } = renderHook(() => useWindowSettings());

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('loadSettings');
      expect(result.current).toHaveProperty('updateSettings');
    });

    it('useChatSettings()が正常に動作する', () => {
      const { result } = renderHook(() => useChatSettings());

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('loadSettings');
      expect(result.current).toHaveProperty('updateSettings');
    });

    it('useThemeSettings()が正常に動作する', () => {
      const { result } = renderHook(() => useThemeSettings());

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('loadSettings');
      expect(result.current).toHaveProperty('updateSettings');
    });

    it('useExpressionSettings()が正常に動作する', () => {
      const { result } = renderHook(() => useExpressionSettings());

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('loadSettings');
      expect(result.current).toHaveProperty('updateSettings');
    });
  });

  describe('useMultipleSettingsSections', () => {
    it('複数セクションの状態が正しく取得される', () => {
      const { result } = renderHook(() => useMultipleSettingsSections());

      expect(result.current.sections).toHaveProperty('window');
      expect(result.current.sections).toHaveProperty('chat');
      expect(result.current.sections).toHaveProperty('theme');
      expect(result.current.sections).toHaveProperty('expressions');
    });

    it('loadAllSections()が全セクション初期化を実行する', async () => {
      const { result } = renderHook(() => useMultipleSettingsSections());

      await act(async () => {
        await result.current.loadAllSections();
      });

      expect(mockStore.initializeAllSections).toHaveBeenCalled();
    });

    it('いずれかのセクションがローディング中の場合isAnyLoadingがtrueになる', () => {
      mockStore.isLoading.window = true;

      const { result } = renderHook(() => useMultipleSettingsSections());

      expect(result.current.isAnyLoading).toBe(true);
    });

    it('いずれかのセクションにエラーがある場合hasAnyErrorがtrueになる', () => {
      mockStore.errors.chat = new Error('Chat error');

      const { result } = renderHook(() => useMultipleSettingsSections());

      expect(result.current.hasAnyError).toBe(true);
    });

    it('全セクションがready状態の場合areAllReadyがtrueになる', () => {
      // すべてのセクションをready状態に
      ['window', 'chat', 'theme', 'expressions'].forEach(section => {
        mockStore.isInitialized[section] = true;
        mockStore.isLoading[section] = false;
        mockStore.errors[section] = null;
      });

      const { result } = renderHook(() => useMultipleSettingsSections());

      expect(result.current.areAllReady).toBe(true);
    });
  });

  describe('パフォーマンス最適化', () => {
    it('データが変更されない限り戻り値オブジェクトが再生成されない', () => {
      const { result, rerender } = renderHook(() => useSettingsSection('window'));

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      // オブジェクト参照が同じであることを確認（メモ化効果）
      expect(firstResult).toBe(secondResult);
    });

    it('関数が再生成されない（useCallback効果）', () => {
      const { result, rerender } = renderHook(() => useSettingsSection('window'));

      const firstLoadFunction = result.current.loadSettings;
      rerender();
      const secondLoadFunction = result.current.loadSettings;

      expect(firstLoadFunction).toBe(secondLoadFunction);
    });
  });
});
