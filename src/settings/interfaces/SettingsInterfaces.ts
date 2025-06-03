/**
 * 設定コンポーネント共通インターフェース
 * 
 * 全ての設定コンポーネントが実装すべき基本インターフェース
 * TDD準拠で既存機能を保持しながら分離可能にする
 */

import type {
  WindowSizePreset,
  ThemeId,
  SettingsSection,
  ValidationError,
  ThemeInfo,
  WindowSettingsData,
  ChatSettingsData,
  ThemeSettingsData,
  ExpressionSettingsData
} from '../core/BaseTypes';

/**
 * 設定コンポーネントの共通インターフェース
 */
export interface SettingsComponent {
  /**
   * コンポーネントを初期化する
   * DOM要素の取得、イベントリスナーの設定等を行う
   */
  initialize(): Promise<void>;

  /**
   * 現在の設定を読み込んでUIに反映する
   */
  loadSettings(): Promise<void>;

  /**
   * 現在のUI状態の設定を保存する
   */
  applySettings(): Promise<void>;

  /**
   * 設定をデフォルト値にリセットする
   */
  resetSettings(): Promise<void>;

  /**
   * 現在のUI状態のバリデーションエラーを取得する
   */
  getValidationErrors(): ValidationError[];

  /**
   * コンポーネントを破棄する
   * イベントリスナーの削除等のクリーンアップを行う
   */
  dispose(): void;
}

/**
 * 設定データ構造（厳密型使用）
 * BaseTypes.tsからの型を使用してDOM依存を排除
 */
export type WindowSettings = WindowSettingsData;
export type ChatSettings = ChatSettingsData;
export type ThemeSettings = ThemeSettingsData;
export type ExpressionSettings = ExpressionSettingsData;

/**
 * VRM表情情報
 */
export interface VRMExpressionInfo {
  name: string;
  displayName: string;
  isPreset: boolean;
}

/**
 * 設定操作の結果
 */
export interface SettingsResult {
  success: boolean;
  error?: string;
  data?: any;
}



/**
 * 設定状態管理インターフェース
 */
export interface SettingsStateManager {
  /**
   * 指定セクションの設定を保存する
   */
  saveSettings(section: SettingsSection, data: any): Promise<SettingsResult>;

  /**
   * 指定セクションの設定を読み込む
   */
  loadSettings(section: SettingsSection): Promise<any>;

  /**
   * 指定セクションの設定をバリデーションする
   */
  validateSettings(section: SettingsSection, data: any): ValidationError[];

  /**
   * 設定変更の通知を購読する
   */
  subscribe(section: SettingsSection, callback: (data: any) => void): void;

  /**
   * 設定変更を通知する
   */
  notify(section: SettingsSection, data: any): void;

  /**
   * 購読を解除する
   */
  unsubscribe(section: SettingsSection, callback: (data: any) => void): void;
}


/**
 * ウィンドウサイズプリセット定義
 */
export const WINDOW_SIZE_PRESETS = {
  small: { width: 300, height: 600 },
  medium: { width: 400, height: 800 },
  large: { width: 500, height: 1000 }
} as const;

/**
 * ウィンドウサイズバリデーション制限
 */
export const WINDOW_SIZE_LIMITS = {
  width: { min: 200, max: 1000 },
  height: { min: 300, max: 1200 }
} as const;

/**
 * システムプロンプト制限
 */
export const SYSTEM_PROMPT_LIMITS = {
  maxLength: 50000,
  performanceWarningLength: 10000
} as const;

/**
 * 後方互換性のための re-export
 * BaseTypes.ts からの厳密型を再エクスポート
 */
export type {
  WindowSizePreset,
  ThemeId,
  SettingsSection,
  ValidationError,
  ThemeInfo,
  WindowSettingsData,
  ChatSettingsData,
  ThemeSettingsData,
  ExpressionSettingsData
} from '../core/BaseTypes';

/**
 * React移行準備のためのバインディング型 re-export
 */
export type {
  WindowSettingsBindings,
  ChatSettingsBindings,
  ThemeSettingsBindings,
  ExpressionSettingsBindings
} from '../core/BaseTypes';

/**
 * 統一されたバリデーション型 re-export
 */
export type {
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
 * DOM型定義の参照（VanillaJS実装用）
 * React移行時には使用されなくなる
 */
export type {
  BaseSettingsElements,
  WindowSettingsElements,
  ChatSettingsElements,
  ThemeSettingsElements,
  ExpressionSettingsElements
} from '../types/DOMTypes';