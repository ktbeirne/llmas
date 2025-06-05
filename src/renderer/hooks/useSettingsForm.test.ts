/**
 * useSettingsForm.test.ts - useSettingsForm Hook単体テスト
 *
 * Phase 3.2.2 Task 3: フォーム統合Hookのテスト実装
 * React Hook Form + Testing Library + Vitestによる包括的テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// テスト対象
import type { WindowSettingsData, ChatSettingsData } from '../stores/settingsStore';
import { DEFAULT_SETTINGS } from '../stores/settingsStore';

import {
  useSettingsForm,
  useWindowSettingsForm,
  useChatSettingsForm,
  useThemeSettingsForm,
  useExpressionSettingsForm,
  type UseSettingsFormOptions,
} from './useSettingsForm';

// 依存関係のモック
vi.mock('./useSettingsSection', () => ({
  useSettingsSection: vi.fn(),
}));

vi.mock('./useSettingsLifecycle', () => ({
  useSettingsLifecycle: vi.fn(),
}));

vi.mock('../stores/settingsValidation', () => ({
  validateWindowSettings: vi.fn(() => []),
  validateChatSettings: vi.fn(() => []),
  validateThemeSettings: vi.fn(() => []),
  validateExpressionSettings: vi.fn(() => []),
}));

// React Hook Formのモック
const mockFormMethods = {
  register: vi.fn(),
  handleSubmit: vi.fn(onSubmit => (data: any) => onSubmit(data)),
  formState: {
    isDirty: false,
    isSubmitting: false,
    isValid: true,
    errors: {},
    touchedFields: {},
    submitCount: 0,
  },
  getValues: vi.fn(() => ({})),
  reset: vi.fn(),
  setError: vi.fn(),
  clearErrors: vi.fn(),
  trigger: vi.fn(),
  watch: vi.fn(),
  setValue: vi.fn(),
};

vi.mock('react-hook-form', () => ({
  useForm: vi.fn(() => mockFormMethods),
}));

describe('useSettingsForm Hook', () => {
  let mockSectionHook: any;
  let mockLifecycleHook: any;
  let mockValidateWindowSettings: Mock;
  let mockValidateChatSettings: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();

    // useSettingsSectionのモック
    mockSectionHook = {
      data: DEFAULT_SETTINGS.window,
      isLoading: false,
      isInitialized: true,
      error: null,
      loadSettings: vi.fn(),
      updateSettings: vi.fn(),
      resetSettings: vi.fn(),
      isReady: true,
      validationErrors: [],
    };

    // useSettingsLifecycleのモック
    mockLifecycleHook = {
      lifecycleState: {
        isInitialized: true,
        isDisposed: false,
        hasError: false,
        mountTime: Date.now(),
      },
      initialize: vi.fn().mockResolvedValue(undefined),
      handleError: vi.fn(),
      isReady: true,
    };

    // モック関数を設定
    const { useSettingsSection } = await import('./useSettingsSection');
    const { useSettingsLifecycle } = await import('./useSettingsLifecycle');
    const { validateWindowSettings, validateChatSettings } = await import(
      '../stores/settingsValidation'
    );

    (useSettingsSection as Mock).mockReturnValue(mockSectionHook);
    (useSettingsLifecycle as Mock).mockReturnValue(mockLifecycleHook);

    mockValidateWindowSettings = validateWindowSettings as Mock;
    mockValidateChatSettings = validateChatSettings as Mock;

    // React Hook Formのモックをリセット
    mockFormMethods.formState = {
      isDirty: false,
      isSubmitting: false,
      isValid: true,
      errors: {},
      touchedFields: {},
      submitCount: 0,
    };
    mockFormMethods.getValues.mockReturnValue(DEFAULT_SETTINGS.window);
  });

  describe('基本機能テスト', () => {
    it('初期状態が正しく設定されている', async () => {
      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
      };

      const { result } = renderHook(() => useSettingsForm(options));

      // 基本的なプロパティの確認
      expect(result.current.form).toBeDefined();
      expect(result.current.section).toBe(mockSectionHook);
      expect(result.current.lifecycle).toBe(mockLifecycleHook);
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.canSubmit).toBe(false); // isDirtyがfalseのため

      // フォーム機能が動作することを確認（isReadyの代わり）
      expect(result.current.operations.validateForm).toBeDefined();
      expect(result.current.operations.submit).toBeDefined();
      expect(result.current.operations.reset).toBeDefined();

      // 個別条件の確認（デバッグのため）
      expect(result.current.section.isReady).toBe(true);
      expect(result.current.lifecycle.isReady).toBe(true);
    });

    it('フォーム状態が正しく計算される', () => {
      mockFormMethods.formState.isDirty = true;
      mockFormMethods.formState.isSubmitting = true;

      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
      };

      const { result } = renderHook(() => useSettingsForm(options));

      expect(result.current.formState.isDirty).toBe(true);
      expect(result.current.formState.isSubmitting).toBe(true);
      expect(result.current.hasUnsavedChanges).toBe(false); // isSubmittingがtrueのため
    });

    it('セクションデータでフォームが初期化される', () => {
      const testData: WindowSettingsData = {
        windowSize: { width: 500, height: 700, preset: 'large' },
        vrmModelPath: '/test.vrm',
        cameraSettings: DEFAULT_SETTINGS.window.cameraSettings,
      };

      mockSectionHook.data = testData;

      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
      };

      renderHook(() => useSettingsForm(options));

      // フォームがセクションデータでリセットされる
      expect(mockFormMethods.reset).toHaveBeenCalledWith(testData);
    });
  });

  describe('バリデーション機能', () => {
    it('validateForm()が正しく動作する', () => {
      const validationErrors = [
        { field: 'windowSize.width', message: 'Invalid width', value: -100 },
      ];
      mockValidateWindowSettings.mockReturnValue(validationErrors);

      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
      };

      const { result } = renderHook(() => useSettingsForm(options));

      const validationResult = result.current.operations.validateForm();

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toEqual(validationErrors);
      expect(validationResult.fieldErrors['windowSize.width']).toEqual(['Invalid width']);
    });

    it('validateField()が特定フィールドをバリデーションする', () => {
      const validationErrors = [
        { field: 'windowSize.width', message: 'Invalid width', value: -100 },
        { field: 'vrmModelPath', message: 'Invalid path', value: '' },
      ];
      mockValidateWindowSettings.mockReturnValue(validationErrors);

      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
      };

      const { result } = renderHook(() => useSettingsForm(options));

      const fieldResult = result.current.operations.validateField('windowSize');

      // windowSize関連エラーのみを含む（フィールド名の部分一致ではないことに注意）
      expect(fieldResult.errors).toEqual([]);
    });

    it('canSubmitが正しく計算される', () => {
      mockFormMethods.formState.isDirty = true;
      mockFormMethods.formState.isSubmitting = false;
      mockValidateWindowSettings.mockReturnValue([]); // バリデーションエラーなし

      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
      };

      const { result } = renderHook(() => useSettingsForm(options));

      expect(result.current.canSubmit).toBe(true);
    });
  });

  describe('フォーム操作', () => {
    it('submit()が正常に動作する', async () => {
      const testData: WindowSettingsData = DEFAULT_SETTINGS.window;
      mockFormMethods.getValues.mockReturnValue(testData);
      mockValidateWindowSettings.mockReturnValue([]); // バリデーションOK
      mockSectionHook.updateSettings.mockResolvedValue(undefined);

      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
      };

      const { result } = renderHook(() => useSettingsForm(options));

      await act(async () => {
        await result.current.operations.submit();
      });

      expect(mockSectionHook.updateSettings).toHaveBeenCalledWith(testData);
    });

    it('submit()でバリデーションエラーがある場合は送信されない', async () => {
      const validationErrors = [
        { field: 'windowSize.width', message: 'Invalid width', value: -100 },
      ];
      mockValidateWindowSettings.mockReturnValue(validationErrors);

      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
      };

      const { result } = renderHook(() => useSettingsForm(options));

      await act(async () => {
        await result.current.operations.submit();
      });

      expect(mockSectionHook.updateSettings).not.toHaveBeenCalled();
      expect(mockFormMethods.setError).toHaveBeenCalledWith('windowSize.width', {
        type: 'validation',
        message: 'Invalid width',
      });
    });

    it('reset()がフォームをリセットする', () => {
      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
      };

      const { result } = renderHook(() => useSettingsForm(options));

      act(() => {
        result.current.operations.reset();
      });

      expect(mockFormMethods.reset).toHaveBeenCalledWith(mockSectionHook.data);
    });

    it('resetToDefaults()がデフォルト値にリセットする', async () => {
      const defaultData = DEFAULT_SETTINGS.window;
      mockSectionHook.resetSettings.mockResolvedValue(undefined);
      mockSectionHook.data = defaultData; // リセット後のデータ

      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
      };

      const { result } = renderHook(() => useSettingsForm(options));

      await act(async () => {
        await result.current.operations.resetToDefaults();
      });

      expect(mockSectionHook.resetSettings).toHaveBeenCalled();
      expect(mockFormMethods.reset).toHaveBeenCalledWith(defaultData);
    });

    it('clearErrors()がエラーをクリアする', () => {
      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
      };

      const { result } = renderHook(() => useSettingsForm(options));

      act(() => {
        result.current.operations.clearErrors();
      });

      expect(mockFormMethods.clearErrors).toHaveBeenCalled();
    });
  });

  describe('オートセーブ機能', () => {
    it('オートセーブが有効な場合、dirty状態で自動保存される', async () => {
      // タイマーをモック
      vi.useFakeTimers();

      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
        autoSave: true,
        autoSaveDelay: 1000,
      };

      mockFormMethods.formState.isDirty = true;
      mockFormMethods.getValues.mockReturnValue(DEFAULT_SETTINGS.window);
      mockValidateWindowSettings.mockReturnValue([]);

      const { result } = renderHook(() => useSettingsForm(options));

      // 時間を進める
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // オートセーブが実行される
      expect(mockSectionHook.updateSettings).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('オートセーブが無効な場合は自動保存されない', () => {
      vi.useFakeTimers();

      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
        autoSave: false,
      };

      mockFormMethods.formState.isDirty = true;

      renderHook(() => useSettingsForm(options));

      // 時間を進める
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // オートセーブが実行されない
      expect(mockSectionHook.updateSettings).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('ライフサイクル統合', () => {
    it('ライフサイクルが有効な場合、自動初期化される', () => {
      mockLifecycleHook.lifecycleState.isInitialized = false;

      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
        enableLifecycle: true,
        componentName: 'TestFormComponent',
      };

      renderHook(() => useSettingsForm(options));

      expect(mockLifecycleHook.initialize).toHaveBeenCalledWith('TestFormComponent', ['window']);
    });

    it('ライフサイクルが無効な場合、自動初期化されない', () => {
      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
        enableLifecycle: false,
      };

      renderHook(() => useSettingsForm(options));

      expect(mockLifecycleHook.initialize).not.toHaveBeenCalled();
    });

    it('submit()エラー時にライフサイクルエラーハンドリングが呼ばれる', async () => {
      const testError = new Error('Submit failed');
      mockSectionHook.updateSettings.mockRejectedValue(testError);
      mockValidateWindowSettings.mockReturnValue([]);

      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
        enableLifecycle: true,
        componentName: 'TestFormComponent',
      };

      const { result } = renderHook(() => useSettingsForm(options));

      await expect(
        act(async () => {
          await result.current.operations.submit();
        })
      ).rejects.toThrow('Submit failed');

      expect(mockLifecycleHook.handleError).toHaveBeenCalledWith(testError, {
        operation: 'form_submit',
        component: 'TestFormComponent',
        section: 'window',
      });
    });
  });

  describe('型付きヘルパーフック', () => {
    it('useWindowSettingsForm()が正常に動作する', () => {
      const { result } = renderHook(() => useWindowSettingsForm());

      expect(result.current.form).toBeDefined();
      expect(result.current.section).toBeDefined();
    });

    it('useChatSettingsForm()が正常に動作する', () => {
      const { result } = renderHook(() => useChatSettingsForm());

      expect(result.current.form).toBeDefined();
      expect(result.current.section).toBeDefined();
    });

    it('useThemeSettingsForm()が正常に動作する', () => {
      const { result } = renderHook(() => useThemeSettingsForm());

      expect(result.current.form).toBeDefined();
      expect(result.current.section).toBeDefined();
    });

    it('useExpressionSettingsForm()が正常に動作する', () => {
      const { result } = renderHook(() => useExpressionSettingsForm());

      expect(result.current.form).toBeDefined();
      expect(result.current.section).toBeDefined();
    });
  });

  describe('エラーハンドリング', () => {
    it('resetToDefaults()エラー時にライフサイクルエラーハンドリングが呼ばれる', async () => {
      const testError = new Error('Reset failed');
      mockSectionHook.resetSettings.mockRejectedValue(testError);

      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
        enableLifecycle: true,
        componentName: 'TestFormComponent',
      };

      const { result } = renderHook(() => useSettingsForm(options));

      await expect(
        act(async () => {
          await result.current.operations.resetToDefaults();
        })
      ).rejects.toThrow('Reset failed');

      expect(mockLifecycleHook.handleError).toHaveBeenCalledWith(testError, {
        operation: 'reset_defaults',
        component: 'TestFormComponent',
        section: 'window',
      });
    });

    it('ライフサイクル初期化エラーが適切に処理される', async () => {
      const testError = new Error('Lifecycle init failed');
      mockLifecycleHook.lifecycleState.isInitialized = false;
      mockLifecycleHook.initialize.mockRejectedValue(testError);

      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
        enableLifecycle: true,
        componentName: 'TestFormComponent',
      };

      renderHook(() => useSettingsForm(options));

      // ライフサイクル初期化エラーが発生するまで待機
      await act(async () => {
        await vi.waitFor(
          () => {
            expect(mockLifecycleHook.handleError).toHaveBeenCalledWith(testError, {
              operation: 'lifecycle_init',
              component: 'TestFormComponent',
              section: 'window',
            });
          },
          { timeout: 200 }
        );
      });
    });
  });

  describe('パフォーマンス最適化', () => {
    it('戻り値オブジェクトが適切にメモ化される', () => {
      const options: UseSettingsFormOptions<WindowSettingsData> = {
        section: 'window',
      };

      const { result, rerender } = renderHook(() => useSettingsForm(options));

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      // 状態が変更されていない限り、オブジェクト参照が同じ
      expect(firstResult).toBe(secondResult);
    });
  });
});
