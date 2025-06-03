/**
 * バリデーション関連の型定義
 * 
 * 各設定コンポーネントで使用するバリデーション機能の共通型
 * 基本型はBaseTypes.tsに統一されています
 */

import type { 
  ValidationError,
  ValidationResult,
  NumericRangeRule,
  StringLengthRule,
  PatternRule,
  ValidationSeverity,
  ExtendedValidationError,
  ValidationContext,
  ValidatorFunction,
  FieldValidatorFunction
} from '../core/BaseTypes';

/**
 * バリデーションルール
 */
export interface ValidationRule<T = any> {
  /**
   * ルール名
   */
  name: string;

  /**
   * バリデーション関数
   */
  validate: (value: T) => boolean;

  /**
   * エラーメッセージ
   */
  message: string;
}

/**
 * フィールドバリデーション設定
 */
export interface FieldValidation<T = any> {
  /**
   * フィールド名
   */
  field: string;

  /**
   * 適用するルール
   */
  rules: ValidationRule<T>[];

  /**
   * 必須フィールドかどうか
   */
  required?: boolean;
}


/**
 * カスタムバリデーションルール
 */
export interface CustomRule<T = any> {
  validate: (value: T) => boolean | Promise<boolean>;
  message: string;
}

/**
 * バリデーション設定のプリセット
 */
export interface ValidationPresets {
  /**
   * ウィンドウサイズバリデーション
   */
  windowSize: {
    width: FieldValidation<number>;
    height: FieldValidation<number>;
  };

  /**
   * チャット設定バリデーション
   */
  chat: {
    userName: FieldValidation<string>;
    mascotName: FieldValidation<string>;
    systemPrompt: FieldValidation<string>;
  };

  /**
   * 表情設定バリデーション
   */
  expression: {
    defaultWeight: FieldValidation<number>;
    enabled: FieldValidation<boolean>;
  };
}

/**
 * 後方互換性のための型再エクスポート
 */
export type {
  ValidationError,
  ValidationResult,
  NumericRangeRule,
  StringLengthRule,
  PatternRule,
  ValidationSeverity,
  ExtendedValidationError,
  ValidationContext,
  ValidatorFunction,
  FieldValidatorFunction
} from '../core/BaseTypes';