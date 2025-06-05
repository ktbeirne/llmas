/**
 * settingsValidation.ts - Settings バリデーション実装
 *
 * Phase 3.2.1 Task 2: 各設定セクション用のバリデーション機能
 * BaseSettingsComponentのバリデーション機能をReact対応
 */

import type { ValidationError } from '../../settings/interfaces/SettingsInterfaces';

import type {
  WindowSettingsData,
  ChatSettingsData,
  ThemeSettingsData,
  ExpressionSettingsData,
} from './settingsStore';

/**
 * バリデーション結果型
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * 共通バリデーションヘルパー
 */
export class ValidationHelpers {
  /**
   * 必須フィールドチェック
   */
  static required(value: any, fieldName: string): ValidationError | null {
    if (value === null || value === undefined || value === '') {
      return {
        field: fieldName,
        message: `${fieldName}は必須項目です`,
        value,
      };
    }
    return null;
  }

  /**
   * 数値範囲チェック
   */
  static numberRange(
    value: number,
    fieldName: string,
    min?: number,
    max?: number
  ): ValidationError | null {
    if (typeof value !== 'number' || isNaN(value)) {
      return {
        field: fieldName,
        message: `${fieldName}は有効な数値である必要があります`,
        value,
      };
    }

    if (min !== undefined && value < min) {
      return {
        field: fieldName,
        message: `${fieldName}は${min}以上である必要があります`,
        value,
      };
    }

    if (max !== undefined && value > max) {
      return {
        field: fieldName,
        message: `${fieldName}は${max}以下である必要があります`,
        value,
      };
    }

    return null;
  }

  /**
   * 文字列長制限チェック
   */
  static stringLength(
    value: string,
    fieldName: string,
    minLength?: number,
    maxLength?: number
  ): ValidationError | null {
    if (typeof value !== 'string') {
      return {
        field: fieldName,
        message: `${fieldName}は文字列である必要があります`,
        value,
      };
    }

    if (minLength !== undefined && value.length < minLength) {
      return {
        field: fieldName,
        message: `${fieldName}は${minLength}文字以上である必要があります`,
        value,
      };
    }

    if (maxLength !== undefined && value.length > maxLength) {
      return {
        field: fieldName,
        message: `${fieldName}は${maxLength}文字以下である必要があります`,
        value,
      };
    }

    return null;
  }

  /**
   * ファイルパス検証
   */
  static filePath(value: string, fieldName: string): ValidationError | null {
    if (!value || typeof value !== 'string') {
      return {
        field: fieldName,
        message: `${fieldName}は有効なファイルパスである必要があります`,
        value,
      };
    }

    // 基本的なパス形式チェック
    const pathRegex = /^[^\0<>:"|?*\x00-\x1f]+$/;
    if (!pathRegex.test(value)) {
      return {
        field: fieldName,
        message: `${fieldName}に無効な文字が含まれています`,
        value,
      };
    }

    // VRMファイル拡張子チェック（VRMモデルパスの場合）
    if (fieldName.includes('vrm') && !value.toLowerCase().endsWith('.vrm')) {
      return {
        field: fieldName,
        message: 'VRMモデルファイルは.vrm拡張子である必要があります',
        value,
      };
    }

    return null;
  }

  /**
   * プリセット値チェック
   */
  static preset<T>(
    value: T,
    fieldName: string,
    allowedValues: readonly T[]
  ): ValidationError | null {
    if (!allowedValues.includes(value)) {
      return {
        field: fieldName,
        message: `${fieldName}は有効な値である必要があります (${allowedValues.join(', ')})`,
        value,
      };
    }
    return null;
  }

  /**
   * 複数エラーの統合
   */
  static combineErrors(errors: (ValidationError | null)[]): ValidationError[] {
    return errors.filter((error): error is ValidationError => error !== null);
  }
}

/**
 * Window設定バリデーション
 */
export function validateWindowSettings(data: WindowSettingsData): ValidationError[] {
  const errors: (ValidationError | null)[] = [];

  // ウィンドウサイズ検証
  if (data.windowSize) {
    errors.push(
      ValidationHelpers.numberRange(data.windowSize.width, '幅', 200, 2000),
      ValidationHelpers.numberRange(data.windowSize.height, '高さ', 300, 2000)
    );

    // プリセット検証
    const allowedPresets = ['small', 'medium', 'large', 'custom'] as const;
    errors.push(
      ValidationHelpers.preset(data.windowSize.preset, 'サイズプリセット', allowedPresets)
    );

    // カスタムサイズの追加検証
    if (data.windowSize.preset === 'custom') {
      if (data.windowSize.width < 300 || data.windowSize.height < 400) {
        errors.push({
          field: 'customSize',
          message: 'カスタムサイズは最小300x400である必要があります',
          value: { width: data.windowSize.width, height: data.windowSize.height },
        });
      }
    }
  }

  // VRMモデルパス検証
  errors.push(
    ValidationHelpers.required(data.vrmModelPath, 'VRMモデルパス'),
    ValidationHelpers.filePath(data.vrmModelPath, 'VRMモデルパス')
  );

  // カメラ設定検証
  if (data.cameraSettings) {
    const { position, target, zoom } = data.cameraSettings;

    // ポジション検証
    errors.push(
      ValidationHelpers.numberRange(position.x, 'カメラX座標', -20, 20),
      ValidationHelpers.numberRange(position.y, 'カメラY座標', -10, 10),
      ValidationHelpers.numberRange(position.z, 'カメラZ座標', 1, 20)
    );

    // ターゲット検証
    errors.push(
      ValidationHelpers.numberRange(target.x, 'ターゲットX座標', -10, 10),
      ValidationHelpers.numberRange(target.y, 'ターゲットY座標', -5, 5),
      ValidationHelpers.numberRange(target.z, 'ターゲットZ座標', -10, 10)
    );

    // ズーム検証
    errors.push(ValidationHelpers.numberRange(zoom, 'ズーム', 0.1, 5.0));
  }

  // ウィンドウ境界検証
  if (data.mainWindowBounds) {
    const bounds = data.mainWindowBounds;
    errors.push(
      ValidationHelpers.numberRange(bounds.width, 'ウィンドウ幅', 200, 2000),
      ValidationHelpers.numberRange(bounds.height, 'ウィンドウ高さ', 300, 2000),
      ValidationHelpers.numberRange(bounds.x, 'ウィンドウX座標', -2000, 2000),
      ValidationHelpers.numberRange(bounds.y, 'ウィンドウY座標', -2000, 2000)
    );
  }

  return ValidationHelpers.combineErrors(errors);
}

/**
 * Chat設定バリデーション
 */
export function validateChatSettings(data: ChatSettingsData): ValidationError[] {
  const errors: (ValidationError | null)[] = [];

  // ユーザー名検証
  errors.push(
    ValidationHelpers.required(data.userName, 'ユーザー名'),
    ValidationHelpers.stringLength(data.userName, 'ユーザー名', 1, 50)
  );

  // マスコット名検証
  errors.push(
    ValidationHelpers.required(data.mascotName, 'マスコット名'),
    ValidationHelpers.stringLength(data.mascotName, 'マスコット名', 1, 50)
  );

  // システムプロンプトコア検証
  errors.push(
    ValidationHelpers.required(data.systemPromptCore, 'システムプロンプト'),
    ValidationHelpers.stringLength(data.systemPromptCore, 'システムプロンプト', 10, 2000)
  );

  // システムプロンプトの内容チェック
  if (data.systemPromptCore) {
    // 極端に短い場合の警告
    if (data.systemPromptCore.length < 20) {
      errors.push({
        field: 'systemPromptCore',
        message: 'システムプロンプトが短すぎます。より詳細な指示を含めることを推奨します',
        value: data.systemPromptCore,
      });
    }

    // 危険なキーワードチェック（基本的なフィルター）
    const dangerousKeywords = ['ignore', 'forget', 'override', 'system'];
    const lowerPrompt = data.systemPromptCore.toLowerCase();

    for (const keyword of dangerousKeywords) {
      if (lowerPrompt.includes(`ignore ${keyword}`) || lowerPrompt.includes(`forget ${keyword}`)) {
        errors.push({
          field: 'systemPromptCore',
          message: 'システムプロンプトに不適切な指示が含まれている可能性があります',
          value: data.systemPromptCore,
        });
        break;
      }
    }
  }

  // チャットウィンドウ境界検証
  if (data.chatWindowBounds) {
    const bounds = data.chatWindowBounds;
    errors.push(
      ValidationHelpers.numberRange(bounds.width, 'チャットウィンドウ幅', 300, 1200),
      ValidationHelpers.numberRange(bounds.height, 'チャットウィンドウ高さ', 400, 1000),
      ValidationHelpers.numberRange(bounds.x, 'チャットウィンドウX座標', -2000, 2000),
      ValidationHelpers.numberRange(bounds.y, 'チャットウィンドウY座標', -2000, 2000)
    );
  }

  return ValidationHelpers.combineErrors(errors);
}

/**
 * Theme設定バリデーション
 */
export function validateThemeSettings(data: ThemeSettingsData): ValidationError[] {
  const errors: (ValidationError | null)[] = [];

  // 現在のテーマ検証
  errors.push(
    ValidationHelpers.required(data.currentTheme, '現在のテーマ'),
    ValidationHelpers.stringLength(data.currentTheme, '現在のテーマ', 1, 50)
  );

  // 利用可能なテーマとの整合性チェック
  if (data.availableThemes && data.availableThemes.length > 0) {
    const availableThemeIds = data.availableThemes.map(theme => theme.id);

    if (!availableThemeIds.includes(data.currentTheme)) {
      errors.push({
        field: 'currentTheme',
        message: '選択されたテーマは利用可能なテーマに含まれていません',
        value: data.currentTheme,
      });
    }
  }

  // 各テーマ情報の検証
  if (data.availableThemes) {
    data.availableThemes.forEach((theme, index) => {
      // テーマID検証
      if (!theme.id || theme.id.length === 0) {
        errors.push({
          field: `availableThemes[${index}].id`,
          message: 'テーマIDは必須です',
          value: theme.id,
        });
      }

      // テーマ名検証
      if (!theme.name || theme.name.length === 0) {
        errors.push({
          field: `availableThemes[${index}].name`,
          message: 'テーマ名は必須です',
          value: theme.name,
        });
      }

      // 色設定検証
      if (theme.colors) {
        const colorFields = ['primary', 'secondary', 'accent', 'background'] as const;

        colorFields.forEach(colorField => {
          const color = theme.colors[colorField];
          if (!color || !isValidColor(color)) {
            errors.push({
              field: `availableThemes[${index}].colors.${colorField}`,
              message: `${colorField}色の形式が無効です`,
              value: color,
            });
          }
        });
      }
    });
  }

  return ValidationHelpers.combineErrors(errors);
}

/**
 * Expression設定バリデーション
 */
export function validateExpressionSettings(data: ExpressionSettingsData): ValidationError[] {
  const errors: (ValidationError | null)[] = [];

  // デフォルト表情検証
  errors.push(
    ValidationHelpers.required(data.defaultExpression, 'デフォルト表情'),
    ValidationHelpers.stringLength(data.defaultExpression, 'デフォルト表情', 1, 50)
  );

  // 表情設定の検証
  if (data.settings) {
    Object.entries(data.settings).forEach(([expressionName, setting]) => {
      // 表情名検証
      if (!expressionName || expressionName.length === 0) {
        errors.push({
          field: 'expressionName',
          message: '表情名は必須です',
          value: expressionName,
        });
      }

      // デフォルト重み検証
      errors.push(
        ValidationHelpers.numberRange(
          setting.defaultWeight,
          `${expressionName}のデフォルト重み`,
          0.0,
          1.0
        )
      );

      // enabled フラグ検証
      if (typeof setting.enabled !== 'boolean') {
        errors.push({
          field: `${expressionName}.enabled`,
          message: '有効フラグはtrueまたはfalseである必要があります',
          value: setting.enabled,
        });
      }
    });

    // デフォルト表情が設定に含まれているかチェック
    if (data.defaultExpression && !data.settings[data.defaultExpression]) {
      errors.push({
        field: 'defaultExpression',
        message: 'デフォルト表情が表情設定に含まれていません',
        value: data.defaultExpression,
      });
    }

    // 最低1つの表情が有効であることをチェック
    const enabledExpressions = Object.values(data.settings).filter(setting => setting.enabled);
    if (enabledExpressions.length === 0) {
      errors.push({
        field: 'settings',
        message: '少なくとも1つの表情を有効にする必要があります',
        value: data.settings,
      });
    }
  }

  // 利用可能な表情との整合性チェック
  if (data.availableExpressions && data.settings) {
    const availableExpressionNames = data.availableExpressions.map(expr => expr.name);

    // 設定に存在するが利用可能でない表情をチェック
    Object.keys(data.settings).forEach(settingName => {
      if (!availableExpressionNames.includes(settingName)) {
        errors.push({
          field: 'settings',
          message: `表情"${settingName}"は利用可能な表情に含まれていません`,
          value: settingName,
        });
      }
    });
  }

  return ValidationHelpers.combineErrors(errors);
}

/**
 * 色値の検証ヘルパー
 */
function isValidColor(color: string): boolean {
  // HEX色形式チェック (#RRGGBB または #RGB)
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

  // RGB/RGBA形式チェック
  const rgbRegex = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)$/;

  // HSL/HSLA形式チェック
  const hslRegex = /^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(?:,\s*[\d.]+\s*)?\)$/;

  // 名前付き色（基本的なもの）
  const namedColors = [
    'black',
    'white',
    'red',
    'green',
    'blue',
    'yellow',
    'cyan',
    'magenta',
    'transparent',
    'inherit',
    'currentColor',
  ];

  return (
    hexRegex.test(color) ||
    rgbRegex.test(color) ||
    hslRegex.test(color) ||
    namedColors.includes(color.toLowerCase())
  );
}

/**
 * バリデーション実行の統合ファンクション
 */
export function validateSettingsData<
  T extends keyof {
    window: WindowSettingsData;
    chat: ChatSettingsData;
    theme: ThemeSettingsData;
    expressions: ExpressionSettingsData;
  },
>(
  section: T,
  data: T extends 'window'
    ? WindowSettingsData
    : T extends 'chat'
      ? ChatSettingsData
      : T extends 'theme'
        ? ThemeSettingsData
        : T extends 'expressions'
          ? ExpressionSettingsData
          : never
): ValidationResult {
  let errors: ValidationError[] = [];

  try {
    switch (section) {
      case 'window':
        errors = validateWindowSettings(data as WindowSettingsData);
        break;
      case 'chat':
        errors = validateChatSettings(data as ChatSettingsData);
        break;
      case 'theme':
        errors = validateThemeSettings(data as ThemeSettingsData);
        break;
      case 'expressions':
        errors = validateExpressionSettings(data as ExpressionSettingsData);
        break;
      default:
        errors = [
          {
            field: 'section',
            message: `未知の設定セクション: ${section}`,
            value: section,
          },
        ];
    }
  } catch (error) {
    errors = [
      {
        field: 'validation',
        message: `バリデーション中にエラーが発生しました: ${error}`,
        value: data,
      },
    ];
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// バリデーション関数は個別にエクスポート済み
