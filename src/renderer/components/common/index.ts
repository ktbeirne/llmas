/**
 * index.ts - 共通コンポーネント統合エクスポート
 * 
 * Phase 3.5.2.1: 共通コンポーネント基盤構築完了
 * すべての共通UIコンポーネントを一箇所からエクスポート
 */

// Button コンポーネント
export { default as Button } from './Button';
export type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
} from './Button';

// Input コンポーネント
export { default as Input } from './Input';
export type {
  InputProps,
  InputType,
  InputSize,
  InputVariant,
} from './Input';

// Select コンポーネント
export { default as Select } from './Select';
export type {
  SelectProps,
  SelectOption,
  SelectSize,
  SelectVariant,
} from './Select';

// FormField コンポーネント (一時的にコメントアウト)
// export { default as FormField } from './FormField';
// export type {
//   FormFieldProps,
//   FormFieldType,
//   FormFieldLayout,
//   FormFieldSize,
//   BaseFormFieldProps,
//   InputFormFieldProps,
//   SelectFormFieldProps,
//   TextareaFormFieldProps,
//   CheckboxFormFieldProps,
//   RadioFormFieldProps,
//   ButtonFormFieldProps,
//   CustomFormFieldProps,
// } from './FormField';

// Card コンポーネント
export { default as Card } from './Card';
export type {
  CardProps,
  CardVariant,
  CardSize,
  CardPadding,
  CardHeader,
} from './Card';

// Lazy loading コンポーネント (Code Splitting)
export { default as LazyComponent, LazySettingsWindow, LazyChatApp, useComponentLoading } from './LazyComponent';

// 既存テストコンポーネント（Phase 3.5.1）
export { default as HMRTestComponent } from './HMRTestComponent';
export { default as ElectronAPITestComponent } from './ElectronAPITestComponent';

/**
 * 共通型定義のまとめ
 */

// サイズの共通型（複数コンポーネントで使用）
export type CommonSize = 'sm' | 'md' | 'lg';

// バリアントの共通型パターン
export type CommonVariant = 
  | 'default' 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'error' 
  | 'warning';

// レイアウトの共通型
export type CommonLayout = 'vertical' | 'horizontal' | 'inline';

/**
 * 共通プロパティインターフェース
 */

// 基本コンポーネントプロパティ
export interface BaseComponentProps {
  /** カスタムクラス名 */
  className?: string;
  
  /** 子要素 */
  children?: React.ReactNode;
  
  /** test-id (テスト用) */
  'data-testid'?: string;
  
  /** 無効状態 */
  disabled?: boolean;
  
  /** 全幅表示 */
  fullWidth?: boolean;
}

// フォーム関連の基本プロパティ
export interface BaseFormProps extends BaseComponentProps {
  /** ラベル */
  label?: string;
  
  /** エラーメッセージ */
  error?: string;
  
  /** ヘルプテキスト */
  helpText?: string;
  
  /** 必須フィールド */
  required?: boolean;
}

/**
 * ユーティリティ型定義
 */

// コンポーネントサイズのマッピング
export interface ComponentSizeMap {
  button: ButtonSize;
  input: InputSize;
  select: SelectSize;
  // formField: FormFieldSize;
  card: CardSize;
}

// コンポーネントバリアントのマッピング
export interface ComponentVariantMap {
  button: ButtonVariant;
  input: InputVariant;
  select: SelectVariant;
  card: CardVariant;
}

/**
 * コンポーネント識別用の型
 */
export type ComponentType = 
  | 'button'
  | 'input' 
  | 'select'
  // | 'formField'
  | 'card';

/**
 * 統合コンポーネントプロパティ型
 * ジェネリクスを使用してコンポーネントタイプに応じたプロパティを提供
 */
export type ComponentPropsMap = {
  button: ButtonProps;
  input: InputProps;
  select: SelectProps;
  // formField: FormFieldProps;
  card: CardProps;
};

/**
 * ヘルパー型定義
 */

// プロパティから特定のキーを除外するヘルパー
export type OmitProps<T, K extends keyof T> = Omit<T, K>;

// プロパティから特定のキーのみを選択するヘルパー
export type PickProps<T, K extends keyof T> = Pick<T, K>;

// プロパティを部分的にオプショナルにするヘルパー
export type PartialProps<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * React関連の再エクスポート（便利性のため）
 */
export type { ReactNode, ReactElement, ComponentProps } from 'react';

/**
 * デフォルトエクスポート（オブジェクト形式）
 * 名前空間としての使用をサポート
 */
const CommonComponents = {
  Button,
  Input,
  Select,
  // FormField,
  Card,
  LazyComponent,
  LazySettingsWindow,
  LazyChatApp,
  HMRTestComponent,
  ElectronAPITestComponent,
} as const;

export default CommonComponents;

/**
 * 使用例とドキュメント
 * 
 * @example
 * // 個別インポート
 * import { Button, Input, FormField } from './components/common';
 * 
 * // 型定義インポート
 * import type { ButtonProps, InputProps } from './components/common';
 * 
 * // 名前空間インポート
 * import CommonComponents from './components/common';
 * const { Button, Input } = CommonComponents;
 * 
 * // 統合プロパティ型の使用
 * const buttonProps: ComponentPropsMap['button'] = {
 *   variant: 'primary',
 *   size: 'md',
 *   children: 'Click me'
 * };
 */