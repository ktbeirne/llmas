/**
 * 設定管理ヘルパーユーティリティ
 * 
 * DOM操作、イベント管理、エラーハンドリング等の共通機能
 */

import type { ValidationError, SettingsResult } from '../interfaces/SettingsInterfaces';

/**
 * DOM要素を安全に取得する
 */
export function safeGetElementById<T extends HTMLElement = HTMLElement>(
  id: string,
  expectedType?: string
): T | null {
  try {
    const element = document.getElementById(id);
    
    if (!element) {
      console.warn(`[SettingsHelpers] Element with id '${id}' not found`);
      return null;
    }

    if (expectedType && element.tagName.toLowerCase() !== expectedType.toLowerCase()) {
      console.warn(
        `[SettingsHelpers] Element '${id}' expected to be ${expectedType}, but was ${element.tagName}`
      );
    }

    return element as T;
  } catch (error) {
    console.error(`[SettingsHelpers] Error getting element '${id}':`, error);
    return null;
  }
}

/**
 * DOM要素の値を安全に取得する
 */
export function safeGetElementValue(element: HTMLElement | null): string {
  if (!element) {
    return '';
  }

  try {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element.value || '';
    }
    
    if (element instanceof HTMLSelectElement) {
      return element.value || '';
    }

    return element.textContent || '';
  } catch (error) {
    console.error('[SettingsHelpers] Error getting element value:', error);
    return '';
  }
}

/**
 * DOM要素の値を安全に設定する
 */
export function safeSetElementValue(element: HTMLElement | null, value: string): boolean {
  if (!element) {
    return false;
  }

  try {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = value;
      return true;
    }
    
    if (element instanceof HTMLSelectElement) {
      element.value = value;
      return true;
    }

    element.textContent = value;
    return true;
  } catch (error) {
    console.error('[SettingsHelpers] Error setting element value:', error);
    return false;
  }
}

/**
 * CSSクラスを安全に操作する
 */
export function safeToggleClass(
  element: HTMLElement | null,
  className: string,
  force?: boolean
): boolean {
  if (!element) {
    return false;
  }

  try {
    if (force !== undefined) {
      element.classList.toggle(className, force);
    } else {
      element.classList.toggle(className);
    }
    return true;
  } catch (error) {
    console.error('[SettingsHelpers] Error toggling class:', error);
    return false;
  }
}

/**
 * 要素の表示状態を安全に設定する
 */
export function safeSetDisplay(
  element: HTMLElement | null,
  display: string
): boolean {
  if (!element) {
    return false;
  }

  try {
    element.style.display = display;
    return true;
  } catch (error) {
    console.error('[SettingsHelpers] Error setting display:', error);
    return false;
  }
}

/**
 * イベントリスナーを安全に追加する
 */
export function safeAddEventListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | null,
  type: K,
  listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
  options?: boolean | AddEventListenerOptions
): boolean {
  if (!element) {
    return false;
  }

  try {
    element.addEventListener(type, listener, options);
    return true;
  } catch (error) {
    console.error('[SettingsHelpers] Error adding event listener:', error);
    return false;
  }
}

/**
 * イベントリスナーを安全に削除する
 */
export function safeRemoveEventListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | null,
  type: K,
  listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
  options?: boolean | EventListenerOptions
): boolean {
  if (!element) {
    return false;
  }

  try {
    element.removeEventListener(type, listener, options);
    return true;
  } catch (error) {
    console.error('[SettingsHelpers] Error removing event listener:', error);
    return false;
  }
}

/**
 * 数値を安全にパースする
 */
export function safeParseInt(value: string, defaultValue: number = 0): number {
  try {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  } catch (error) {
    console.error('[SettingsHelpers] Error parsing integer:', error);
    return defaultValue;
  }
}

/**
 * 浮動小数点数を安全にパースする
 */
export function safeParseFloat(value: string, defaultValue: number = 0.0): number {
  try {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  } catch (error) {
    console.error('[SettingsHelpers] Error parsing float:', error);
    return defaultValue;
  }
}

/**
 * 文字列を安全にトリムする
 */
export function safeTrim(value: any, defaultValue: string = ''): string {
  try {
    if (typeof value === 'string') {
      return value.trim();
    }
    return String(value || defaultValue).trim();
  } catch (error) {
    console.error('[SettingsHelpers] Error trimming string:', error);
    return defaultValue;
  }
}

/**
 * バリデーションエラーを表示する
 */
export function showValidationErrors(errors: ValidationError[]): void {
  if (errors.length === 0) {
    return;
  }

  const message = errors.length === 1
    ? errors[0].message
    : '以下のエラーがあります:\n' + errors.map(error => `• ${error.message}`).join('\n');

  alert(message);
}

/**
 * 成功メッセージを表示する（ボタンベース）
 */
export function showSuccessMessage(
  button: HTMLButtonElement | null,
  message: string,
  duration: number = 2000
): void {
  if (!button) {
    alert(message);
    return;
  }

  const originalText = button.textContent;
  const originalColor = button.style.backgroundColor;

  try {
    button.textContent = message;
    button.style.backgroundColor = '#28a745';

    setTimeout(() => {
      if (button) {
        button.textContent = originalText;
        button.style.backgroundColor = originalColor;
      }
    }, duration);
  } catch (error) {
    console.error('[SettingsHelpers] Error showing success message:', error);
    alert(message);
  }
}

/**
 * エラーメッセージを表示する
 */
export function showErrorMessage(message: string, error?: any): void {
  console.error('[SettingsHelpers] Error:', message, error);
  
  let displayMessage = message;
  if (error && error instanceof Error) {
    displayMessage += `\n詳細: ${error.message}`;
  }
  
  alert(displayMessage);
}

/**
 * 確認ダイアログを表示する
 */
export function showConfirmDialog(message: string): boolean {
  try {
    return confirm(message);
  } catch (error) {
    console.error('[SettingsHelpers] Error showing confirm dialog:', error);
    return false;
  }
}

/**
 * 設定結果を処理する
 */
export function handleSettingsResult(
  result: SettingsResult,
  successMessage: string,
  errorMessage: string,
  button?: HTMLButtonElement | null
): boolean {
  if (result.success) {
    if (button) {
      showSuccessMessage(button, successMessage);
    } else {
      alert(successMessage);
    }
    return true;
  } else {
    const fullErrorMessage = result.error
      ? `${errorMessage}\n詳細: ${result.error}`
      : errorMessage;
    showErrorMessage(fullErrorMessage);
    return false;
  }
}

/**
 * 非同期処理を安全に実行する
 */
export async function safeAsyncCall<T>(
  asyncFunction: () => Promise<T>,
  errorMessage: string = '処理中にエラーが発生しました'
): Promise<T | null> {
  try {
    return await asyncFunction();
  } catch (error) {
    console.error('[SettingsHelpers] Async call failed:', error);
    showErrorMessage(errorMessage, error);
    return null;
  }
}

/**
 * オブジェクトを安全にディープクローンする
 */
export function safeDeepClone<T>(obj: T): T | null {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('[SettingsHelpers] Error deep cloning object:', error);
    return null;
  }
}

/**
 * デバウンス関数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * スロットル関数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * ElectronAPIの存在確認
 */
export function checkElectronAPI(): boolean {
  if (typeof window === 'undefined' || !window.electronAPI) {
    console.error('[SettingsHelpers] ElectronAPI is not available');
    return false;
  }
  return true;
}

/**
 * ElectronAPIメソッドの存在確認
 */
export function checkElectronAPIMethod(methodName: string): boolean {
  if (!checkElectronAPI()) {
    return false;
  }

  if (typeof (window.electronAPI as any)[methodName] !== 'function') {
    console.error(`[SettingsHelpers] ElectronAPI method '${methodName}' is not available`);
    return false;
  }

  return true;
}