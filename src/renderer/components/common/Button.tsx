/**
 * Button.tsx - 共通Buttonコンポーネント
 * 
 * Phase 3.5.2.1 Task 1: Button実装 (variants: primary, secondary, danger)
 * デザインシステム準拠、TypeScript厳密型定義、アクセシビリティ対応
 */

import React, { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

/**
 * Buttonのvariant型定義
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';

/**
 * Buttonのsize型定義
 */
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Button Props型定義
 */
export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** ボタンのvariant (デザインシステム準拠) */
  variant?: ButtonVariant;
  
  /** ボタンのサイズ */
  size?: ButtonSize;
  
  /** ボタンの内容 */
  children?: ReactNode;
  
  /** loading状態 */
  isLoading?: boolean;
  
  /** loading時のテキスト */
  loadingText?: string;
  
  /** 左側アイコン */
  leftIcon?: ReactNode;
  
  /** 右側アイコン */
  rightIcon?: ReactNode;
  
  /** 全幅かどうか */
  fullWidth?: boolean;
  
  /** test-id (テスト用) */
  'data-testid'?: string;
  
  /** カスタムクラス */
  className?: string;
}

/**
 * Buttonのベーススタイル
 */
const baseStyles = [
  'inline-flex',
  'items-center',
  'justify-center',
  'gap-2',
  'font-medium',
  'transition-all',
  'duration-200',
  'ease-in-out',
  'rounded-lg',
  'border',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-offset-2',
  'disabled:cursor-not-allowed',
  'disabled:opacity-50',
  'select-none',
  'whitespace-nowrap',
].join(' ');

/**
 * Variant別スタイル（デザインシステムカラーパレット準拠）
 */
const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-primary',
    'border-primary', 
    'text-gray-800',
    'hover:bg-primary/90',
    'hover:border-primary/90',
    'active:bg-primary/80',
    'focus:ring-primary/50',
    'shadow-sm',
    'hover:shadow-md',
  ].join(' '),
  
  secondary: [
    'bg-secondary',
    'border-secondary',
    'text-gray-800', 
    'hover:bg-secondary/90',
    'hover:border-secondary/90',
    'active:bg-secondary/80',
    'focus:ring-secondary/50',
    'shadow-sm',
    'hover:shadow-md',
  ].join(' '),
  
  danger: [
    'bg-red-500',
    'border-red-500',
    'text-white',
    'hover:bg-red-600',
    'hover:border-red-600',
    'active:bg-red-700',
    'focus:ring-red-500/50',
    'shadow-sm',
    'hover:shadow-md',
  ].join(' '),
  
  ghost: [
    'bg-transparent',
    'border-transparent',
    'text-gray-700',
    'hover:bg-background',
    'hover:border-background',
    'active:bg-gray-50',
    'focus:ring-gray-300',
  ].join(' '),
  
  outline: [
    'bg-transparent',
    'border-gray-300',
    'text-gray-700',
    'hover:bg-background',
    'hover:border-primary',
    'active:bg-gray-50',
    'focus:ring-primary/50',
  ].join(' '),
};

/**
 * Size別スタイル
 */
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
  xl: 'px-8 py-3 text-lg',
};

/**
 * Loading Spinner コンポーネント
 */
const LoadingSpinner: React.FC<{ size: ButtonSize }> = ({ size }) => {
  const spinnerSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  }[size];
  
  return (
    <svg 
      className={cn('animate-spin', spinnerSize)}
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

/**
 * Button コンポーネント
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      children,
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    // 実際の disabled 状態 (loading中も無効化)
    const isDisabled = disabled || isLoading;
    
    // 表示するテキスト
    const displayText = isLoading ? (loadingText || children) : children;
    
    // 統合されたクラス名
    const buttonClasses = cn(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && 'w-full',
      className
    );
    
    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={isDisabled}
        data-testid={testId}
        aria-disabled={isDisabled}
        {...props}
      >
        {/* Loading中は左アイコンをスピナーに置き換え */}
        {isLoading ? (
          <LoadingSpinner size={size} />
        ) : (
          leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
        )}
        
        {/* テキスト内容 */}
        {displayText && (
          <span className={isLoading ? 'opacity-75' : ''}>
            {displayText}
          </span>
        )}
        
        {/* 右アイコン (loading中は非表示) */}
        {!isLoading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

// displayNameを設定（DevToolsでの表示用）
Button.displayName = 'Button';

// デフォルトエクスポート
export default Button;

/**
 * Button関連の型定義エクスポート
 */
export type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
};