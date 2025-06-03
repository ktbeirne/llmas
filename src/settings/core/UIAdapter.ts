/**
 * UIAdapter
 * 
 * UI操作の抽象化レイヤー
 * DOM操作とReact Hooksを統一的に扱うための抽象化
 */

import type { 
  UIAdapter, 
  UIControl, 
  UIControlConfig,
  EventListenerEntry 
} from './BaseTypes';
import type { ValidationError } from '../interfaces/SettingsInterfaces';
import { 
  safeGetElementById,
  safeGetElementValue,
  safeSetElementValue,
  safeAddEventListener,
  debounce
} from '../utils/SettingsHelpers';
import ResourceManager from './ResourceManager';

/**
 * DOM操作ベースのUIコントロール実装
 */
class VanillaUIControl<T> implements UIControl<T> {
  private _value: T;
  private _element: HTMLElement;
  private _config: UIControlConfig<T>;
  private _validation: ValidationError[] = [];
  private _disabled = false;
  private resourceManager: ResourceManager;

  constructor(
    element: HTMLElement, 
    config: UIControlConfig<T>,
    resourceManager: ResourceManager
  ) {
    this._element = element;
    this._config = config;
    this._value = config.defaultValue;
    this.resourceManager = resourceManager;

    this.initializeElement();
    this.setupEventListeners();
  }

  get value(): T {
    return this._value;
  }

  setValue(value: T): void {
    if (this._disabled) return;

    this._value = value;
    this.updateElement();
    this.validateValue();

    if (this._config.onChange) {
      this._config.onChange(value);
    }
  }

  setDisabled(disabled: boolean): void {
    this._disabled = disabled;
    
    if (this._element instanceof HTMLInputElement || 
        this._element instanceof HTMLSelectElement || 
        this._element instanceof HTMLTextAreaElement) {
      this._element.disabled = disabled;
    }

    if (disabled) {
      this._element.classList.add('disabled');
    } else {
      this._element.classList.remove('disabled');
    }
  }

  setValidation(errors: ValidationError[]): void {
    this._validation = errors;
    this.updateValidationDisplay();
  }

  focus(): void {
    if (!this._disabled && this._element.focus) {
      this._element.focus();
    }
  }

  private initializeElement(): void {
    // 初期値を設定
    this.updateElement();
    
    // CSS クラス追加
    this._element.classList.add('ui-control');
    
    // アクセシビリティ属性
    if (!this._element.hasAttribute('role')) {
      if (this._element instanceof HTMLInputElement) {
        this._element.setAttribute('role', 'textbox');
      } else if (this._element instanceof HTMLSelectElement) {
        this._element.setAttribute('role', 'combobox');
      }
    }
  }

  private setupEventListeners(): void {
    const handler = this._config.debounceMs 
      ? debounce(this.handleElementChange.bind(this), this._config.debounceMs)
      : this.handleElementChange.bind(this);

    // 要素タイプに応じたイベント設定
    if (this._element instanceof HTMLInputElement) {
      const inputType = this._element.type;
      
      if (inputType === 'checkbox' || inputType === 'radio') {
        this.resourceManager.safeAddEventListener(this._element, 'change', handler);
      } else {
        this.resourceManager.safeAddEventListener(this._element, 'input', handler);
        this.resourceManager.safeAddEventListener(this._element, 'blur', this.handleBlur.bind(this));
      }
    } else if (this._element instanceof HTMLSelectElement) {
      this.resourceManager.safeAddEventListener(this._element, 'change', handler);
    } else if (this._element instanceof HTMLTextAreaElement) {
      this.resourceManager.safeAddEventListener(this._element, 'input', handler);
      this.resourceManager.safeAddEventListener(this._element, 'blur', this.handleBlur.bind(this));
    }

    // フォーカス管理
    this.resourceManager.safeAddEventListener(this._element, 'focus', this.handleFocus.bind(this));
  }

  private handleElementChange(): void {
    const newValue = this.extractValueFromElement();
    if (newValue !== this._value) {
      this.setValue(newValue);
    }
  }

  private handleFocus(): void {
    this._element.classList.add('focused');
    // バリデーションエラーの一時的な非表示
    this.updateValidationDisplay(false);
  }

  private handleBlur(): void {
    this._element.classList.remove('focused');
    // バリデーション再表示
    this.updateValidationDisplay(true);
  }

  private extractValueFromElement(): T {
    if (this._element instanceof HTMLInputElement) {
      const inputType = this._element.type;
      
      if (inputType === 'checkbox') {
        return this._element.checked as unknown as T;
      } else if (inputType === 'number') {
        const numValue = parseFloat(this._element.value);
        return (isNaN(numValue) ? this._config.defaultValue : numValue) as unknown as T;
      } else {
        return this._element.value as unknown as T;
      }
    } else if (this._element instanceof HTMLSelectElement) {
      return this._element.value as unknown as T;
    } else if (this._element instanceof HTMLTextAreaElement) {
      return this._element.value as unknown as T;
    }

    return safeGetElementValue(this._element) as unknown as T;
  }

  private updateElement(): void {
    if (this._element instanceof HTMLInputElement) {
      const inputType = this._element.type;
      
      if (inputType === 'checkbox') {
        this._element.checked = Boolean(this._value);
      } else {
        this._element.value = String(this._value);
      }
    } else {
      safeSetElementValue(this._element, String(this._value));
    }

    // 変更イベントを発火（他のリスナーへの通知）
    this._element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private validateValue(): void {
    if (this._config.validation) {
      const errors = this._config.validation(this._value);
      this.setValidation(errors);
    }
  }

  private updateValidationDisplay(show: boolean = true): void {
    // 既存のバリデーション表示をクリア
    const existingError = this._element.parentNode?.querySelector('.validation-error');
    if (existingError) {
      existingError.remove();
    }

    this._element.classList.remove('invalid', 'valid');

    if (!show || this._validation.length === 0) {
      this._element.classList.add('valid');
      return;
    }

    // エラー表示
    this._element.classList.add('invalid');
    
    const errorElement = document.createElement('div');
    errorElement.className = 'validation-error';
    errorElement.innerHTML = this._validation.map(error => 
      `<div class="error-message">${error.message}</div>`
    ).join('');

    // スタイル設定
    errorElement.style.cssText = `
      color: #e74c3c;
      font-size: 0.875rem;
      margin-top: 4px;
      padding: 4px 8px;
      background-color: #fdf2f2;
      border: 1px solid #fca5a5;
      border-radius: 4px;
      animation: fadeIn 0.3s ease-in-out;
    `;

    // アニメーション用CSS
    if (!document.head.querySelector('#validation-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'validation-animation-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ui-control.invalid {
          border-color: #e74c3c !important;
          box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2) !important;
        }
        .ui-control.valid {
          border-color: #27ae60 !important;
        }
        .ui-control.focused {
          box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.3) !important;
        }
      `;
      document.head.appendChild(style);
    }

    this._element.parentNode?.insertBefore(errorElement, this._element.nextSibling);
  }
}

/**
 * DOM操作ベースのUIAdapter実装
 */
export class VanillaUIAdapter<TBindings = any> implements UIAdapter<TBindings> {
  private controls = new Map<string, UIControl<any>>();
  private resourceManager: ResourceManager;

  constructor(resourceManager?: ResourceManager) {
    this.resourceManager = resourceManager || new ResourceManager();
  }

  bind<T>(controlId: string, config: UIControlConfig<T>): UIControl<T> {
    const element = safeGetElementById(controlId);
    if (!element) {
      throw new Error(`Element not found: ${controlId}`);
    }

    const control = new VanillaUIControl<T>(element, config, this.resourceManager);
    this.controls.set(controlId, control);
    
    console.log(`[VanillaUIAdapter] Control bound: ${controlId}`);
    return control;
  }

  updateUI(bindings: Partial<TBindings>): void {
    Object.entries(bindings).forEach(([key, value]) => {
      const control = this.controls.get(key);
      if (control && value !== undefined) {
        control.setValue(value);
      }
    });
  }

  addEventListener<K extends keyof HTMLElementEventMap>(
    elementId: string,
    type: K,
    listener: EventListener
  ): void {
    const element = safeGetElementById(elementId);
    if (!element) {
      console.warn(`[VanillaUIAdapter] Element not found for event binding: ${elementId}`);
      return;
    }

    this.resourceManager.safeAddEventListener(element, type, listener);
  }

  /**
   * 一括バリデーション
   */
  validateAll(): { isValid: boolean; errors: Record<string, ValidationError[]> } {
    const errors: Record<string, ValidationError[]> = {};
    let isValid = true;

    this.controls.forEach((control, controlId) => {
      // コントロールの現在のバリデーション状態を取得
      // 注意: 実際のバリデーション状態は VanillaUIControl の private メンバーなので、
      // 公開メソッドを追加するか、別の方法で取得する必要があります
      // ここでは概念的な実装を示します
    });

    return { isValid, errors };
  }

  /**
   * すべてのコントロールを無効化
   */
  disableAll(): void {
    this.controls.forEach(control => control.setDisabled(true));
  }

  /**
   * すべてのコントロールを有効化
   */
  enableAll(): void {
    this.controls.forEach(control => control.setDisabled(false));
  }

  /**
   * フォーカス管理
   */
  focusFirst(): void {
    const firstControl = Array.from(this.controls.values())[0];
    if (firstControl) {
      firstControl.focus();
    }
  }

  /**
   * コントロール取得
   */
  getControl<T>(controlId: string): UIControl<T> | undefined {
    return this.controls.get(controlId);
  }

  /**
   * リソースクリーンアップ
   */
  cleanup(): void {
    console.log('[VanillaUIAdapter] Cleanup started');
    this.controls.clear();
    this.resourceManager.cleanup();
  }
}

/**
 * React移行用UIAdapter（将来の実装用）
 */
export class ReactUIAdapter<TBindings = any> implements UIAdapter<TBindings> {
  private hooks = new Map<string, any>();

  bind<T>(controlId: string, config: UIControlConfig<T>): UIControl<T> {
    // React Hooks ベースの実装（将来のPhase 3で実装）
    console.log(`[ReactUIAdapter] Control binding preparation: ${controlId}`);
    
    // モック実装（実際のReact実装時に置き換え）
    return {
      get value() { return config.defaultValue; },
      setValue: (value: T) => console.log(`[ReactUIAdapter] setValue: ${controlId} = ${value}`),
      setDisabled: (disabled: boolean) => console.log(`[ReactUIAdapter] setDisabled: ${controlId} = ${disabled}`),
      setValidation: (errors: ValidationError[]) => console.log(`[ReactUIAdapter] setValidation: ${controlId}`, errors),
      focus: () => console.log(`[ReactUIAdapter] focus: ${controlId}`)
    };
  }

  updateUI(bindings: Partial<TBindings>): void {
    console.log('[ReactUIAdapter] updateUI:', bindings);
  }

  addEventListener<K extends keyof HTMLElementEventMap>(
    elementId: string,
    type: K,
    listener: EventListener
  ): void {
    console.log(`[ReactUIAdapter] addEventListener: ${elementId} ${type}`);
  }

  cleanup(): void {
    console.log('[ReactUIAdapter] cleanup');
    this.hooks.clear();
  }
}

/**
 * UIAdapter ファクトリー
 */
export class UIAdapterFactory {
  static create<TBindings = any>(
    type: 'vanilla' | 'react' = 'vanilla',
    resourceManager?: ResourceManager
  ): UIAdapter<TBindings> {
    switch (type) {
      case 'vanilla':
        return new VanillaUIAdapter<TBindings>(resourceManager);
      case 'react':
        return new ReactUIAdapter<TBindings>();
      default:
        throw new Error(`Unknown UIAdapter type: ${type}`);
    }
  }
}

export default VanillaUIAdapter;