/**
 * 設定バリデーションユーティリティ
 * 
 * 各設定コンポーネントで使用する共通バリデーション機能
 */

import type { 
  WindowSettings,
  ChatSettings,
  ExpressionSettings,
  ThemeSettings
} from '../interfaces/SettingsInterfaces';
import type { 
  ValidationError,
  ValidationResult,
  NumericRangeRule,
  StringLengthRule,
  ValidationContext,
  WindowSizePreset,
  ThemeId
} from '../core/BaseTypes';
import { WINDOW_SIZE_LIMITS, SYSTEM_PROMPT_LIMITS } from '../interfaces/SettingsInterfaces';

/**
 * 数値範囲バリデーション
 */
export function validateNumericRange(
  value: number,
  rule: NumericRangeRule,
  fieldName: string
): ValidationError | null {
  if (rule.min !== undefined && value < rule.min) {
    return {
      field: fieldName,
      message: rule.message || `${fieldName}は${rule.min}以上で入力してください。`,
      value
    };
  }

  if (rule.max !== undefined && value > rule.max) {
    return {
      field: fieldName,
      message: rule.message || `${fieldName}は${rule.max}以下で入力してください。`,
      value
    };
  }

  return null;
}

/**
 * 文字列長バリデーション
 */
export function validateStringLength(
  value: string,
  rule: StringLengthRule,
  fieldName: string
): ValidationError | null {
  const length = value.length;

  if (rule.minLength !== undefined && length < rule.minLength) {
    return {
      field: fieldName,
      message: rule.message || `${fieldName}は${rule.minLength}文字以上で入力してください。`,
      value
    };
  }

  if (rule.maxLength !== undefined && length > rule.maxLength) {
    return {
      field: fieldName,
      message: rule.message || `${fieldName}は${rule.maxLength}文字以下で入力してください。`,
      value
    };
  }

  return null;
}

/**
 * ウィンドウ設定バリデーション
 */
export function validateWindowSettings(settings: Partial<WindowSettings>): ValidationError[] {
  const errors: ValidationError[] = [];

  // 幅のバリデーション
  if (typeof settings.width === 'number') {
    const widthError = validateNumericRange(
      settings.width,
      {
        min: WINDOW_SIZE_LIMITS.width.min,
        max: WINDOW_SIZE_LIMITS.width.max,
        message: `幅は${WINDOW_SIZE_LIMITS.width.min}〜${WINDOW_SIZE_LIMITS.width.max}の範囲で入力してください。`
      },
      'width'
    );
    if (widthError) errors.push(widthError);
  }

  // 高さのバリデーション
  if (typeof settings.height === 'number') {
    const heightError = validateNumericRange(
      settings.height,
      {
        min: WINDOW_SIZE_LIMITS.height.min,
        max: WINDOW_SIZE_LIMITS.height.max,
        message: `高さは${WINDOW_SIZE_LIMITS.height.min}〜${WINDOW_SIZE_LIMITS.height.max}の範囲で入力してください。`
      },
      'height'
    );
    if (heightError) errors.push(heightError);
  }

  // プリセットのバリデーション
  if (settings.preset) {
    const validPresets: WindowSizePreset[] = ['small', 'medium', 'large', 'custom'];
    if (!validPresets.includes(settings.preset as WindowSizePreset)) {
      errors.push({
        field: 'preset',
        message: '無効なプリセットが選択されています。有効な値: small, medium, large, custom',
        value: settings.preset
      });
    }
  }

  return errors;
}

/**
 * チャット設定バリデーション
 */
export function validateChatSettings(settings: Partial<ChatSettings>): ValidationError[] {
  const errors: ValidationError[] = [];

  // ユーザー名のバリデーション
  if (settings.userName !== undefined) {
    if (typeof settings.userName !== 'string') {
      errors.push({
        field: 'userName',
        message: 'ユーザー名は文字列で入力してください。',
        value: settings.userName
      });
    } else if (settings.userName.trim().length === 0) {
      errors.push({
        field: 'userName',
        message: 'ユーザー名を入力してください。',
        value: settings.userName
      });
    }
  }

  // マスコット名のバリデーション
  if (settings.mascotName !== undefined) {
    if (typeof settings.mascotName !== 'string') {
      errors.push({
        field: 'mascotName',
        message: 'マスコット名は文字列で入力してください。',
        value: settings.mascotName
      });
    } else if (settings.mascotName.trim().length === 0) {
      errors.push({
        field: 'mascotName',
        message: 'マスコット名を入力してください。',
        value: settings.mascotName
      });
    }
  }

  // システムプロンプトのバリデーション
  if (settings.systemPrompt !== undefined) {
    if (typeof settings.systemPrompt !== 'string') {
      errors.push({
        field: 'systemPrompt',
        message: 'システムプロンプトは文字列で入力してください。',
        value: settings.systemPrompt
      });
    } else {
      const lengthError = validateStringLength(
        settings.systemPrompt,
        {
          maxLength: SYSTEM_PROMPT_LIMITS.maxLength,
          message: `システムプロンプトは${SYSTEM_PROMPT_LIMITS.maxLength}文字以下で入力してください。`
        },
        'systemPrompt'
      );
      if (lengthError) errors.push(lengthError);
    }
  }

  return errors;
}

/**
 * 表情設定バリデーション
 */
export function validateExpressionSettings(settings: ExpressionSettings): ValidationError[] {
  const errors: ValidationError[] = [];

  Object.entries(settings).forEach(([expressionName, config]) => {
    // 有効フラグのバリデーション
    if (typeof config.enabled !== 'boolean') {
      errors.push({
        field: `${expressionName}.enabled`,
        message: `${expressionName}の有効フラグは真偽値で設定してください。`,
        value: config.enabled
      });
    }

    // デフォルト重みのバリデーション
    if (typeof config.defaultWeight !== 'number') {
      errors.push({
        field: `${expressionName}.defaultWeight`,
        message: `${expressionName}のデフォルト重みは数値で設定してください。`,
        value: config.defaultWeight
      });
    } else {
      const weightError = validateNumericRange(
        config.defaultWeight,
        {
          min: 0,
          max: 1,
          message: `${expressionName}のデフォルト重みは0〜1の範囲で設定してください。`
        },
        `${expressionName}.defaultWeight`
      );
      if (weightError) errors.push(weightError);
    }
  });

  return errors;
}

/**
 * 汎用バリデーション実行
 */
export function runValidation(
  data: any,
  validatorFunctions: Array<(data: any) => ValidationError[]>
): ValidationResult {
  const allErrors: ValidationError[] = [];

  validatorFunctions.forEach(validator => {
    try {
      const errors = validator(data);
      allErrors.push(...errors);
    } catch (error) {
      allErrors.push({
        field: 'validation',
        message: `バリデーション実行中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        value: data
      });
    }
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * フィールド単位のバリデーション
 */
export function validateField(
  value: any,
  fieldName: string,
  rules: Array<(value: any, fieldName: string) => ValidationError | null>
): ValidationError[] {
  const errors: ValidationError[] = [];

  rules.forEach(rule => {
    try {
      const error = rule(value, fieldName);
      if (error) errors.push(error);
    } catch (error) {
      errors.push({
        field: fieldName,
        message: `フィールドバリデーション中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        value
      });
    }
  });

  return errors;
}

/**
 * 必須フィールドチェック
 */
export function validateRequired(value: any, fieldName: string): ValidationError | null {
  if (value === null || value === undefined || value === '') {
    return {
      field: fieldName,
      message: `${fieldName}は必須項目です。`,
      value
    };
  }
  return null;
}

/**
 * 数値チェック
 */
export function validateNumber(value: any, fieldName: string): ValidationError | null {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      field: fieldName,
      message: `${fieldName}は有効な数値で入力してください。`,
      value
    };
  }
  return null;
}

/**
 * 文字列チェック
 */
export function validateString(value: any, fieldName: string): ValidationError | null {
  if (typeof value !== 'string') {
    return {
      field: fieldName,
      message: `${fieldName}は文字列で入力してください。`,
      value
    };
  }
  return null;
}

/**
 * テーマ設定バリデーション
 */
export function validateThemeSettings(settings: Partial<ThemeSettings>): ValidationError[] {
  const errors: ValidationError[] = [];

  // 選択テーマのバリデーション
  if (settings.selectedTheme !== undefined) {
    if (typeof settings.selectedTheme !== 'string') {
      errors.push({
        field: 'selectedTheme',
        message: '選択されたテーマIDは文字列で指定してください。',
        value: settings.selectedTheme
      });
    } else if (settings.selectedTheme.trim().length === 0) {
      errors.push({
        field: 'selectedTheme',
        message: 'テーマIDを指定してください。',
        value: settings.selectedTheme
      });
    }
  }

  // 利用可能テーマ配列のバリデーション
  if (settings.availableThemes !== undefined) {
    if (!Array.isArray(settings.availableThemes)) {
      errors.push({
        field: 'availableThemes',
        message: '利用可能テーマは配列で指定してください。',
        value: settings.availableThemes
      });
    } else {
      settings.availableThemes.forEach((theme, index) => {
        // テーマIDのバリデーション
        if (!theme.id || typeof theme.id !== 'string' || theme.id.trim().length === 0) {
          errors.push({
            field: `availableThemes[${index}].id`,
            message: `テーマ${index + 1}のIDは必須で、空ではない文字列で指定してください。`,
            value: theme.id
          });
        }

        // テーマ名のバリデーション
        if (!theme.name || typeof theme.name !== 'string' || theme.name.trim().length === 0) {
          errors.push({
            field: `availableThemes[${index}].name`,
            message: `テーマ${index + 1}の名前は必須で、空ではない文字列で指定してください。`,
            value: theme.name
          });
        }

        // 説明のバリデーション
        if (theme.description && typeof theme.description !== 'string') {
          errors.push({
            field: `availableThemes[${index}].description`,
            message: `テーマ${index + 1}の説明は文字列で指定してください。`,
            value: theme.description
          });
        }

        // プレビューカラー配列のバリデーション
        if (theme.preview !== undefined) {
          if (!Array.isArray(theme.preview)) {
            errors.push({
              field: `availableThemes[${index}].preview`,
              message: `テーマ${index + 1}のプレビューカラーは配列で指定してください。`,
              value: theme.preview
            });
          } else {
            theme.preview.forEach((color, colorIndex) => {
              if (typeof color !== 'string') {
                errors.push({
                  field: `availableThemes[${index}].preview[${colorIndex}]`,
                  message: `テーマ${index + 1}のプレビューカラー${colorIndex + 1}は文字列で指定してください。`,
                  value: color
                });
              } else if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
                errors.push({
                  field: `availableThemes[${index}].preview[${colorIndex}]`,
                  message: `テーマ${index + 1}のプレビューカラー${colorIndex + 1}は有効な16進数カラーコード（#RRGGBB）で指定してください。`,
                  value: color
                });
              }
            });
          }
        }
      });
    }
  }

  return errors;
}

/**
 * バリデーションエラーをユーザーフレンドリーなメッセージに変換
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return '';
  }

  if (errors.length === 1) {
    return errors[0].message;
  }

  return '以下のエラーがあります:\n' + errors.map(error => `• ${error.message}`).join('\n');
}