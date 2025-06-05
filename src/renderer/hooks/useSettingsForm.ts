/**
 * useSettingsForm.ts - 設定フォーム統合管理Hook
 *
 * Phase 3.2.2 Task 3: React Hook Form統合とバリデーション機能
 * useSettingsSection、settingsValidationとの連携によるフォーム管理
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  useForm,
  type UseFormReturn,
  type UseFormProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

import type {
  SettingsSection,
  SettingsDataMap,
  WindowSettingsData,
  ChatSettingsData,
  ThemeSettingsData,
  ExpressionSettingsData,
} from '../stores/settingsStore';
import {
  validateWindowSettings,
  validateChatSettings,
  validateThemeSettings,
  validateExpressionSettings,
  type ValidationError,
} from '../stores/settingsValidation';

import { useSettingsSection, type UseSettingsSectionReturn } from './useSettingsSection';
import { useSettingsLifecycle, type UseSettingsLifecycleReturn } from './useSettingsLifecycle';

/**
 * フォーム状態型定義
 */
export interface FormState {
  isDirty: boolean;
  isSubmitting: boolean;
  isValid: boolean;
  hasErrors: boolean;
  touchedFields: Record<string, boolean>;
  submitCount: number;
}

/**
 * バリデーション結果型定義
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  fieldErrors: Record<string, string[]>;
}

/**
 * フォーム操作型定義
 */
export interface FormOperations<T> {
  submit: () => Promise<void>;
  reset: () => void;
  resetToDefaults: () => Promise<void>;
  validateField: (fieldName: keyof T) => ValidationResult;
  validateForm: () => ValidationResult;
  clearErrors: () => void;
  markFieldAsTouched: (fieldName: keyof T) => void;
}

/**
 * useSettingsForm戻り値型定義
 */
export interface UseSettingsFormReturn<T extends SettingsDataMap[SettingsSection]> {
  // React Hook Form統合
  form: UseFormReturn<T>;

  // セクション管理
  section: UseSettingsSectionReturn<SettingsSection>;
  lifecycle: UseSettingsLifecycleReturn;

  // フォーム状態
  formState: FormState;
  validationResult: ValidationResult;

  // フォーム操作
  operations: FormOperations<T>;

  // 便利な状態
  canSubmit: boolean;
  hasUnsavedChanges: boolean;
  isReady: boolean;
}

/**
 * useSettingsForm設定オプション
 */
export interface UseSettingsFormOptions<T> extends Omit<UseFormProps<T>, 'defaultValues'> {
  section: SettingsSection;
  autoSave?: boolean;
  autoSaveDelay?: number;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  resetOnSuccess?: boolean;
  enableLifecycle?: boolean;
  componentName?: string;
}

/**
 * 設定フォーム統合管理Hook
 *
 * @param options - フォーム設定オプション
 * @returns フォーム管理機能
 */
export function useSettingsForm<T extends SettingsDataMap[SettingsSection]>(
  options: UseSettingsFormOptions<T>
): UseSettingsFormReturn<T> {
  const {
    section,
    autoSave = false,
    autoSaveDelay = 1000,
    validateOnChange = true,
    validateOnBlur = true,
    resetOnSuccess = false,
    enableLifecycle = true,
    componentName = `SettingsForm_${section}`,
    ...formOptions
  } = options;

  // Hook統合
  const sectionHook = useSettingsSection(section);
  const lifecycleHook = useSettingsLifecycle(componentName);

  // React Hook Form初期化
  const form = useForm<T>({
    mode: validateOnChange ? 'onChange' : validateOnBlur ? 'onBlur' : 'onSubmit',
    defaultValues: sectionHook.data || undefined,
    ...formOptions,
  });

  // 内部状態管理
  const autoSaveTimerRef = useRef<number | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const lastSubmitDataRef = useRef<T | null>(null);

  // バリデーション関数の選択
  const validateData = useCallback(
    (data: T): ValidationError[] => {
      switch (section) {
        case 'window':
          return validateWindowSettings(data as WindowSettingsData);
        case 'chat':
          return validateChatSettings(data as ChatSettingsData);
        case 'theme':
          return validateThemeSettings(data as ThemeSettingsData);
        case 'expressions':
          return validateExpressionSettings(data as ExpressionSettingsData);
        default:
          console.warn(`[useSettingsForm] Unknown section: ${section}`);
          return [];
      }
    },
    [section]
  );

  // フォーム状態の計算
  const formState: FormState = useMemo(
    () => ({
      isDirty: form.formState.isDirty,
      isSubmitting: form.formState.isSubmitting,
      isValid: form.formState.isValid,
      hasErrors: Object.keys(form.formState.errors).length > 0,
      touchedFields: form.formState.touchedFields as Record<string, boolean>,
      submitCount: form.formState.submitCount,
    }),
    [form.formState]
  );

  // バリデーション結果の計算
  const validationResult: ValidationResult = useMemo(() => {
    const currentData = form.getValues();
    const errors = validateData(currentData);

    const fieldErrors: Record<string, string[]> = {};
    errors.forEach(error => {
      if (!fieldErrors[error.field]) {
        fieldErrors[error.field] = [];
      }
      fieldErrors[error.field].push(error.message);
    });

    return {
      isValid: errors.length === 0,
      errors,
      fieldErrors,
    };
  }, [form, validateData]);

  // データ同期: Section → Form
  useEffect(() => {
    if (sectionHook.data && !isInitializedRef.current) {
      console.log(
        `[useSettingsForm] Initializing form with data for ${section}:`,
        sectionHook.data
      );
      form.reset(sectionHook.data);
      isInitializedRef.current = true;
    }
  }, [sectionHook.data, form, section]);

  // ライフサイクル初期化
  useEffect(() => {
    if (enableLifecycle && !lifecycleHook.lifecycleState.isInitialized) {
      console.log(`[useSettingsForm] Auto-initializing lifecycle for ${componentName}...`);
      lifecycleHook.initialize(componentName, [section]).catch(error => {
        console.error(`[useSettingsForm] Lifecycle initialization failed:`, error);
        lifecycleHook.handleError(error, {
          operation: 'lifecycle_init',
          component: componentName,
          section,
        });
      });
    }
  }, [enableLifecycle, lifecycleHook, componentName, section]);

  // フォーム操作メソッド
  const operations: FormOperations<T> = useMemo(
    () => ({
      submit: async (): Promise<void> => {
        console.log(`[useSettingsForm] Submitting form for ${section}...`);

        try {
          const data = form.getValues();
          const validationErrors = validateData(data);

          if (validationErrors.length > 0) {
            console.warn(
              `[useSettingsForm] Form validation failed for ${section}:`,
              validationErrors
            );

            // React Hook Formにエラーを設定
            validationErrors.forEach(error => {
              form.setError(error.field as FieldPath<T>, {
                type: 'validation',
                message: error.message,
              });
            });

            return;
          }

          // セクション更新
          await sectionHook.updateSettings(data);

          // 成功後の処理
          lastSubmitDataRef.current = data;

          if (resetOnSuccess) {
            form.reset(data); // dirtyフラグをクリア
          }

          console.log(`[useSettingsForm] Form submitted successfully for ${section}`);
        } catch (error) {
          const formError = error as Error;
          console.error(`[useSettingsForm] Form submission failed for ${section}:`, formError);

          // ライフサイクルエラーハンドリング
          if (enableLifecycle) {
            lifecycleHook.handleError(formError, {
              operation: 'form_submit',
              component: componentName,
              section,
            });
          }

          throw formError;
        }
      },

      reset: (): void => {
        console.log(`[useSettingsForm] Resetting form for ${section}...`);

        if (sectionHook.data) {
          form.reset(sectionHook.data);
        } else {
          form.reset();
        }

        // オートセーブタイマーをクリア
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
          autoSaveTimerRef.current = null;
        }
      },

      resetToDefaults: async (): Promise<void> => {
        console.log(`[useSettingsForm] Resetting form to defaults for ${section}...`);

        try {
          await sectionHook.resetSettings();
          form.reset(sectionHook.data || undefined);

          console.log(`[useSettingsForm] Form reset to defaults for ${section}`);
        } catch (error) {
          const resetError = error as Error;
          console.error(
            `[useSettingsForm] Failed to reset to defaults for ${section}:`,
            resetError
          );

          if (enableLifecycle) {
            lifecycleHook.handleError(resetError, {
              operation: 'reset_defaults',
              component: componentName,
              section,
            });
          }

          throw resetError;
        }
      },

      validateField: (fieldName: keyof T): ValidationResult => {
        const currentData = form.getValues();
        const allErrors = validateData(currentData);
        const fieldErrors = allErrors.filter(error => error.field === fieldName);

        return {
          isValid: fieldErrors.length === 0,
          errors: fieldErrors,
          fieldErrors: fieldErrors.reduce(
            (acc, error) => {
              if (!acc[error.field]) acc[error.field] = [];
              acc[error.field].push(error.message);
              return acc;
            },
            {} as Record<string, string[]>
          ),
        };
      },

      validateForm: (): ValidationResult => {
        return validationResult;
      },

      clearErrors: (): void => {
        form.clearErrors();
      },

      markFieldAsTouched: (fieldName: keyof T): void => {
        form.trigger(fieldName as FieldPath<T>);
      },
    }),
    [
      form,
      section,
      validateData,
      sectionHook,
      lifecycleHook,
      resetOnSuccess,
      enableLifecycle,
      componentName,
      validationResult,
    ]
  );

  // オートセーブ機能
  useEffect(() => {
    if (!autoSave || !formState.isDirty) {
      return;
    }

    // 既存のタイマーをクリア
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // 新しいタイマーを設定
    autoSaveTimerRef.current = window.setTimeout(async () => {
      try {
        console.log(`[useSettingsForm] Auto-saving form for ${section}...`);
        await operations.submit();
        console.log(`[useSettingsForm] Auto-save completed for ${section}`);
      } catch (error) {
        console.error(`[useSettingsForm] Auto-save failed for ${section}:`, error);
      }
    }, autoSaveDelay);

    // クリーンアップ
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [autoSave, autoSaveDelay, formState.isDirty, operations, section]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // 計算プロパティ
  const canSubmit = useMemo(() => {
    return (
      formState.isDirty &&
      validationResult.isValid &&
      !formState.isSubmitting &&
      sectionHook.isReady
    );
  }, [formState.isDirty, formState.isSubmitting, validationResult.isValid, sectionHook.isReady]);

  const hasUnsavedChanges = useMemo(() => {
    return formState.isDirty && !formState.isSubmitting;
  }, [formState.isDirty, formState.isSubmitting]);

  const isReady = useMemo(() => {
    return (
      sectionHook.isReady &&
      (enableLifecycle ? lifecycleHook.isReady : true) &&
      isInitializedRef.current
    );
  }, [sectionHook.isReady, lifecycleHook.isReady, enableLifecycle]);

  // 戻り値オブジェクト（メモ化）
  return useMemo(
    () => ({
      // React Hook Form統合
      form,

      // セクション管理
      section: sectionHook,
      lifecycle: lifecycleHook,

      // フォーム状態
      formState,
      validationResult,

      // フォーム操作
      operations,

      // 便利な状態
      canSubmit,
      hasUnsavedChanges,
      isReady,
    }),
    [
      form,
      sectionHook,
      lifecycleHook,
      formState,
      validationResult,
      operations,
      canSubmit,
      hasUnsavedChanges,
      isReady,
    ]
  );
}

/**
 * 特定セクション用の型付きフォームHooks
 */
export const useWindowSettingsForm = (
  options?: Omit<UseSettingsFormOptions<WindowSettingsData>, 'section'>
) => useSettingsForm<WindowSettingsData>({ section: 'window', ...options });

export const useChatSettingsForm = (
  options?: Omit<UseSettingsFormOptions<ChatSettingsData>, 'section'>
) => useSettingsForm<ChatSettingsData>({ section: 'chat', ...options });

export const useThemeSettingsForm = (
  options?: Omit<UseSettingsFormOptions<ThemeSettingsData>, 'section'>
) => useSettingsForm<ThemeSettingsData>({ section: 'theme', ...options });

export const useExpressionSettingsForm = (
  options?: Omit<UseSettingsFormOptions<ExpressionSettingsData>, 'section'>
) => useSettingsForm<ExpressionSettingsData>({ section: 'expressions', ...options });

export default useSettingsForm;
