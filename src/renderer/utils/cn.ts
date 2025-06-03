/**
 * cn.ts - クラス名結合ユーティリティ
 * 
 * Phase 3.5.2.1: UIコンポーネント用クラス名結合機能
 * Tailwind CSS との統合に最適化
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * クラス名を結合・マージするユーティリティ関数
 * 
 * Tailwind CSSのクラス競合を解決し、条件付きクラス名をサポート
 * 
 * @param inputs - クラス名の配列または条件付きオブジェクト
 * @returns マージされたクラス名文字列
 * 
 * @example
 * ```tsx
 * // 基本的な使用法
 * cn('bg-red-500', 'text-white') // => 'bg-red-500 text-white'
 * 
 * // 条件付きクラス名
 * cn('base-class', {
 *   'active-class': isActive,
 *   'disabled-class': isDisabled
 * })
 * 
 * // Tailwindクラス競合の解決
 * cn('bg-red-500', 'bg-blue-500') // => 'bg-blue-500' (後のクラスが優先)
 * 
 * // undefined/null の安全な処理
 * cn('base', undefined, null, 'valid') // => 'base valid'
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * 条件付きクラス名のヘルパー関数
 * 
 * @param condition - 条件
 * @param classWhenTrue - 条件がtrueの時のクラス名
 * @param classWhenFalse - 条件がfalseの時のクラス名
 * @returns 条件に応じたクラス名
 * 
 * @example
 * ```tsx
 * const buttonClass = conditionalClass(
 *   isLoading,
 *   'opacity-50 cursor-not-allowed',
 *   'hover:bg-blue-600'
 * );
 * ```
 */
export function conditionalClass(
  condition: boolean,
  classWhenTrue: string,
  classWhenFalse?: string
): string {
  return condition ? classWhenTrue : (classWhenFalse || '');
}

/**
 * variant に基づくクラス名選択のヘルパー
 * 
 * @param variant - 現在のvariant
 * @param variantClasses - variant毎のクラス名マップ
 * @param defaultClass - デフォルトクラス名
 * @returns 選択されたクラス名
 * 
 * @example
 * ```tsx
 * const variantClass = variantClass(
 *   currentVariant,
 *   {
 *     primary: 'bg-blue-500 text-white',
 *     secondary: 'bg-gray-500 text-white',
 *     danger: 'bg-red-500 text-white'
 *   },
 *   'bg-gray-300 text-gray-700'
 * );
 * ```
 */
export function variantClass<T extends string>(
  variant: T,
  variantClasses: Record<T, string>,
  defaultClass = ''
): string {
  return variantClasses[variant] || defaultClass;
}

/**
 * サイズに基づくクラス名選択のヘルパー
 * 
 * @param size - 現在のサイズ
 * @param sizeClasses - サイズ毎のクラス名マップ
 * @param defaultClass - デフォルトクラス名
 * @returns 選択されたクラス名
 */
export function sizeClass<T extends string>(
  size: T,
  sizeClasses: Record<T, string>,
  defaultClass = ''
): string {
  return sizeClasses[size] || defaultClass;
}

/**
 * レスポンシブクラス名生成のヘルパー
 * 
 * @param baseClass - ベースクラス名
 * @param responsive - レスポンシブ設定
 * @returns レスポンシブクラス名
 * 
 * @example
 * ```tsx
 * const responsiveClass = responsiveClass('text-sm', {
 *   md: 'text-base',
 *   lg: 'text-lg',
 *   xl: 'text-xl'
 * });
 * // => 'text-sm md:text-base lg:text-lg xl:text-xl'
 * ```
 */
export function responsiveClass(
  baseClass: string,
  responsive: Partial<Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', string>>
): string {
  const responsiveClasses = Object.entries(responsive)
    .map(([breakpoint, className]) => `${breakpoint}:${className}`)
    .join(' ');
  
  return cn(baseClass, responsiveClasses);
}

/**
 * フォーカス状態のクラス名生成
 * 
 * @param baseClass - ベースクラス名
 * @param focusClass - フォーカス時のクラス名
 * @returns フォーカス対応クラス名
 */
export function focusClass(baseClass: string, focusClass: string): string {
  return cn(baseClass, `focus:${focusClass}`, 'focus:outline-none');
}

/**
 * ホバー状態のクラス名生成
 * 
 * @param baseClass - ベースクラス名
 * @param hoverClass - ホバー時のクラス名
 * @returns ホバー対応クラス名
 */
export function hoverClass(baseClass: string, hoverClass: string): string {
  return cn(baseClass, `hover:${hoverClass}`);
}

/**
 * アクティブ状態のクラス名生成
 * 
 * @param baseClass - ベースクラス名
 * @param activeClass - アクティブ時のクラス名
 * @returns アクティブ対応クラス名
 */
export function activeClass(baseClass: string, activeClass: string): string {
  return cn(baseClass, `active:${activeClass}`);
}

/**
 * 無効状態のクラス名生成
 * 
 * @param baseClass - ベースクラス名
 * @param disabledClass - 無効時のクラス名
 * @returns 無効対応クラス名
 */
export function disabledClass(baseClass: string, disabledClass: string): string {
  return cn(baseClass, `disabled:${disabledClass}`);
}

export default cn;