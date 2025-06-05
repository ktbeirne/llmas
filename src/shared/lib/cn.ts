/**
 * Class Name Utility - FSD Phase 1.2
 * Tailwind CSS クラス名を結合するためのユーティリティ
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * クラス名を結合し、Tailwind CSSの競合を解決
 * @param inputs - クラス名の配列
 * @returns 結合されたクラス名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}