/**
 * Input.tsx - 共通Inputコンポーネント
 * 
 * Phase 3.5.2.1 Task 2: Input実装 (types: text, number, password)
 * デザインシステム準拠、TypeScript厳密型定義、アクセシビリティ対応
 */

import React, { forwardRef, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

import { cn } from '../../utils/cn';

/**
 * Inputのtype型定義
 */
export type InputType = 'text' | 'number' | 'password' | 'email' | 'tel' | 'url' | 'search';

/**
 * Inputのsize型定義
 */
export type InputSize = 'sm' | 'md' | 'lg';

/**
 * Inputのvariant型定義（状態別スタイル）
 */
export type InputVariant = 'default' | 'error' | 'success';

/**
 * Input Props型定義
 */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** 入力フィールドのタイプ */
  type?: InputType;
  
  /** 入力フィールドのサイズ */
  size?: InputSize;
  
  /** 入力フィールドのバリアント（状態） */
  variant?: InputVariant;
  
  /** ラベルテキスト */
  label?: string;
  
  /** エラーメッセージ */
  error?: string;
  
  /** ヘルプテキスト */
  helpText?: string;
  
  /** 左側アイコン */
  leftIcon?: ReactNode;
  
  /** 右側アイコン */
  rightIcon?: ReactNode;
  
  /** パスワード表示切り替えボタンを表示するか（type='password'時のみ） */
  showPasswordToggle?: boolean;
  
  /** 全幅かどうか */
  fullWidth?: boolean;
  
  /** ラベルを必須マークで表示するか */
  required?: boolean;
  
  /** test-id (テスト用) */
  'data-testid'?: string;
  
  /** カスタムクラス */
  className?: string;
  
  /** ラベル用のカスタムクラス */
  labelClassName?: string;
  
  /** エラーメッセージ用のカスタムクラス */
  errorClassName?: string;
  
  /** ヘルプテキスト用のカスタムクラス */
  helpClassName?: string;
}

/**
 * ベーススタイル定義
 */
const baseStyles = [
  'block',
  'w-full',
  'rounded-md',
  'border',
  'bg-white',
  'px-3',
  'py-2',
  'text-sm',
  'placeholder-gray-500',
  'transition-colors',
  'duration-200',
  'focus:outline-none',
  'focus:ring-1',
  'disabled:bg-gray-50',
  'disabled:text-gray-500',
  'disabled:cursor-not-allowed',
].join(' ');

/**
 * Variant別スタイル（デザインシステム準拠）
 */
const variantStyles: Record<InputVariant, string> = {
  default: [
    'border-gray-300',
    'focus:border-primary',
    'focus:ring-primary',
  ].join(' '),
  
  error: [
    'border-red-500',
    'focus:border-red-500',
    'focus:ring-red-500',
  ].join(' '),
  
  success: [
    'border-green-500',
    'focus:border-green-500',
    'focus:ring-green-500',
  ].join(' '),
};

/**
 * Size別スタイル
 */
const sizeStyles: Record<InputSize, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

/**
 * ラベルのスタイル
 */
const labelBaseStyles = [
  'block',
  'text-sm',
  'font-medium',
  'text-gray-700',
  'mb-1',
].join(' ');

/**
 * エラーメッセージのスタイル
 */
const errorStyles = [
  'mt-1',
  'text-xs',
  'text-red-600',
].join(' ');

/**
 * ヘルプテキストのスタイル
 */
const helpStyles = [
  'mt-1',
  'text-xs',
  'text-gray-500',
].join(' ');

/**
 * パスワード表示切り替えアイコン
 */
const EyeIcon: React.FC<{ isVisible: boolean }> = ({ isVisible }) => (
  <svg
    className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    {isVisible ? (
      <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
        />
    ) : (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </>
    )}
  </svg>
);

/**
 * Input コンポーネント
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      size = 'md',
      variant = 'default',
      label,
      error,
      helpText,
      leftIcon,
      rightIcon,
      showPasswordToggle = false,
      fullWidth = true,
      required = false,
      className,
      labelClassName,
      errorClassName,
      helpClassName,
      disabled,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    // パスワード表示状態管理
    const [showPassword, setShowPassword] = useState(false);
    
    // 実際の入力タイプ（パスワード表示切り替え考慮）
    const actualType = type === 'password' && showPassword ? 'text' : type;
    
    // エラー状態の場合はvariantをerrorに変更
    const actualVariant = error ? 'error' : variant;
    
    // 統合されたクラス名
    const inputClasses = cn(
      baseStyles,
      variantStyles[actualVariant],
      sizeStyles[size],
      !fullWidth && 'w-auto',
      (leftIcon || rightIcon || (type === 'password' && showPasswordToggle)) && 'relative',
      leftIcon && 'pl-10',
      (rightIcon || (type === 'password' && showPasswordToggle)) && 'pr-10',
      className
    );
    
    // パスワード表示切り替えハンドラ
    const togglePasswordVisibility = () => {
      setShowPassword(prev => !prev);
    };
    
    // 一意なIDの生成（ラベルとの関連付け用）
    const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div className={cn('w-full', !fullWidth && 'w-auto')}>
        {/* ラベル */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(labelBaseStyles, labelClassName)}
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-label="必須">
                *
              </span>
            )}
          </label>
        )}
        
        {/* 入力フィールドコンテナ */}
        <div className="relative">
          {/* 左アイコン */}
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">
                {leftIcon}
              </span>
            </div>
          )}
          
          {/* 入力フィールド */}
          <input
            ref={ref}
            id={inputId}
            type={actualType}
            className={inputClasses}
            disabled={disabled}
            required={required}
            data-testid={testId}
            aria-invalid={actualVariant === 'error'}
            aria-describedby={cn(
              error && `${inputId}-error`,
              helpText && `${inputId}-help`
            )}
            {...props}
          />
          
          {/* 右側のアイコンまたはパスワード表示切り替えボタン */}
          {(rightIcon || (type === 'password' && showPasswordToggle)) && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {type === 'password' && showPasswordToggle ? (
                <button
                  type="button"
                  className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
                  onClick={togglePasswordVisibility}
                  disabled={disabled}
                  aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示する'}
                  data-testid={`${testId}-password-toggle`}
                >
                  <EyeIcon isVisible={showPassword} />
                </button>
              ) : (
                <span className="text-gray-400 pointer-events-none">
                  {rightIcon}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* エラーメッセージ */}
        {error && (
          <p
            id={`${inputId}-error`}
            className={cn(errorStyles, errorClassName)}
            role="alert"
            data-testid={`${testId}-error`}
          >
            {error}
          </p>
        )}
        
        {/* ヘルプテキスト */}
        {helpText && !error && (
          <p
            id={`${inputId}-help`}
            className={cn(helpStyles, helpClassName)}
            data-testid={`${testId}-help`}
          >
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

// displayNameを設定（DevToolsでの表示用）
Input.displayName = 'Input';

// デフォルトエクスポート
export default Input;

/**
 * Input関連の型定義エクスポート
 */
export type {
  InputProps,
  InputType,
  InputSize,
  InputVariant,
};