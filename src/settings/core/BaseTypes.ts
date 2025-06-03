/**
 * Phase 2.5 基盤型定義
 * 
 * BaseSettingsComponent と関連クラスで使用する共通型定義
 */

/**
 * イベントリスナーエントリ
 */
export interface EventListenerEntry {
  element: HTMLElement;
  type: string;
  listener: EventListener;
}

/**
 * 解放可能リソース
 */
export interface DisposableResource {
  dispose(): void;
}

/**
 * パフォーマンス情報
 */
export interface PerformanceInfo {
  operation: string;
  duration: number;
  timestamp: Date;
  memoryUsage?: MemoryInfo;
}

/**
 * メモリ情報
 */
export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/**
 * エラーエントリ
 */
export interface ErrorEntry {
  timestamp: Date;
  error: string;
  stack?: string;
  context: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * エラーハンドリング戦略
 */
export interface ErrorStrategy {
  context: string;
  showToUser: boolean;
  retry: boolean;
  fallback?: () => void;
  severity: 'low' | 'medium' | 'high';
}

/**
 * UI制御設定
 */
export interface UIControlConfig<T> {
  defaultValue: T;
  validation?: (value: T) => ValidationError[];
  onChange?: (value: T) => void;
  debounceMs?: number;
}

/**
 * UI制御インターフェース
 */
export interface UIControl<T> {
  readonly value: T;
  setValue(value: T): void;
  setDisabled(disabled: boolean): void;
  setValidation(errors: ValidationError[]): void;
  focus(): void;
}

/**
 * UI操作抽象化インターフェース
 */
export interface UIAdapter<TBindings = any> {
  bind<T>(controlId: string, config: UIControlConfig<T>): UIControl<T>;
  updateUI(bindings: Partial<TBindings>): void;
  addEventListener<K extends keyof HTMLElementEventMap>(
    elementId: string,
    type: K,
    listener: EventListener
  ): void;
  cleanup(): void;
}

/**
 * DOM更新操作
 */
export interface DOMUpdate {
  operation: () => void;
  priority: 'high' | 'medium' | 'low';
}

/**
 * 仮想化リスト設定
 */
export interface VirtualListConfig {
  itemHeight: number;
  bufferSize: number;
  renderItem: (item: any, index: number) => HTMLElement;
}

/**
 * 厳密な文字列リテラル型
 */
export type WindowSizePreset = 'small' | 'medium' | 'large' | 'custom';
export type ThemeId = 'default' | 'dark' | 'sakura' | 'ocean';
export type SettingsSection = 'window' | 'chat' | 'theme' | 'expressions';
export type ErrorSeverity = 'low' | 'medium' | 'high';

/**
 * バリデーションエラー
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * テーマ情報
 */
export interface ThemeInfo {
  id: ThemeId;
  name: string;
  description: string;
  preview: string[];
}

/**
 * バリデーション関連の統一型定義
 */

/**
 * バリデーション結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * 数値範囲バリデーションルール
 */
export interface NumericRangeRule {
  min?: number;
  max?: number;
  message?: string;
}

/**
 * 文字列長バリデーションルール
 */
export interface StringLengthRule {
  minLength?: number;
  maxLength?: number;
  message?: string;
}

/**
 * パターンマッチングルール
 */
export interface PatternRule {
  pattern: RegExp;
  message: string;
}

/**
 * バリデーションエラーの重要度
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * 拡張バリデーションエラー
 */
export interface ExtendedValidationError extends ValidationError {
  severity: ValidationSeverity;
  code?: string;
  suggestion?: string;
}

/**
 * バリデーションコンテキスト
 */
export interface ValidationContext {
  section: SettingsSection;
  data: any;
  previousData?: any;
  config?: any;
}

/**
 * バリデーター関数の型
 */
export type ValidatorFunction<T = any> = (
  value: T,
  context?: ValidationContext
) => ValidationResult | Promise<ValidationResult>;

/**
 * フィールドバリデーター関数の型
 */
export type FieldValidatorFunction<T = any> = (
  value: T,
  field: string,
  context?: ValidationContext
) => ValidationError[] | Promise<ValidationError[]>;

/**
 * 設定データ型定義（DOM非依存）
 */
export interface WindowSettingsData {
  preset: WindowSizePreset;
  width: number;
  height: number;
  vrmModelPath: string;
}

export interface ChatSettingsData {
  userName: string;
  mascotName: string;
  systemPrompt: string;
}

export interface ThemeSettingsData {
  selectedTheme: ThemeId;
  availableThemes: ThemeInfo[];
}

export interface ExpressionSettingsData {
  [expressionName: string]: {
    enabled: boolean;
    defaultWeight: number;
  };
}

/**
 * UIバインディング型定義（React移行準備）
 */
export interface WindowSettingsBindings {
  preset: UIControl<WindowSizePreset>;
  customWidth: UIControl<number>;
  customHeight: UIControl<number>;
  vrmModelPath: UIControl<string>;
}

export interface ChatSettingsBindings {
  userName: UIControl<string>;
  mascotName: UIControl<string>;
  systemPrompt: UIControl<string>;
}

export interface ThemeSettingsBindings {
  selectedTheme: UIControl<ThemeId>;
  themePreview: UIControl<boolean>;
}

export interface ExpressionSettingsBindings {
  [expressionName: string]: {
    enabled: UIControl<boolean>;
    defaultWeight: UIControl<number>;
  };
}