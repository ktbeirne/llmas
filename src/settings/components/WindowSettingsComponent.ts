/**
 * WindowSettingsComponent (Phase 2.5 Migration)
 * 
 * ウィンドウ・表示設定を管理するコンポーネント
 * BaseSettingsComponentを拡張して統一アーキテクチャを実現
 */

import type { SettingsStateManager } from '../interfaces/SettingsInterfaces';
import type { 
  WindowSettingsData,
  WindowSizePreset,
  WindowSettingsBindings
} from '../core/BaseTypes';
import type { WindowSettingsElements } from '../types/DOMTypes';
import { BaseSettingsComponent } from '../core/BaseSettingsComponent';
import { WINDOW_SIZE_PRESETS, WINDOW_SIZE_LIMITS } from '../interfaces/SettingsInterfaces';
import { validateWindowSettings } from '../utils/SettingsValidation';
import {
  safeGetElementById,
  safeGetElementValue,
  safeSetElementValue,
  safeToggleClass,
  safeParseInt,
  safeTrim,
  checkElectronAPI,
  checkElectronAPIMethod
} from '../utils/SettingsHelpers';

/**
 * ウィンドウ設定コンポーネント（Phase 2.5）
 * 
 * 責務:
 * - ウィンドウサイズ設定管理 (プリセット: small/medium/large/custom)
 * - カスタムサイズ入力とバリデーション (width: 200-1000, height: 300-1200)
 * - VRMモデルファイル選択
 * - 設定の保存・読み込み・リセット
 * 
 * Phase 2.5 改善点:
 * - BaseSettingsComponent拡張による統一アーキテクチャ
 * - 厳密型使用 (WindowSettingsData, WindowSizePreset)
 * - UIAdapter抽象化レイヤー対応
 * - 統一エラーハンドリング・パフォーマンス管理
 */
export class WindowSettingsComponent extends BaseSettingsComponent<WindowSettingsData, WindowSettingsBindings> {
  private elements: Partial<WindowSettingsElements> = {};

  constructor(stateManager?: SettingsStateManager, uiAdapterType: 'vanilla' | 'react' = 'vanilla') {
    super(stateManager, uiAdapterType);
    console.log('[WindowSettingsComponent] Phase 2.5 constructor completed');
  }

  /**
   * DOM要素を初期化する（BaseSettingsComponent required）
   */
  protected initializeElements(): void {
    console.log('[WindowSettingsComponent] Initializing DOM elements');

    // 必須要素の取得
    this.elements = {
      presetSelect: safeGetElementById<HTMLSelectElement>('window-size-preset', 'select'),
      customWidthInput: safeGetElementById<HTMLInputElement>('custom-width', 'input'),
      customHeightInput: safeGetElementById<HTMLInputElement>('custom-height', 'input'),
      customSizeInputs: safeGetElementById('custom-size-inputs', 'div'),
      currentVrmPath: safeGetElementById<HTMLInputElement>('current-vrm-path', 'input'),
      selectVrmButton: safeGetElementById<HTMLButtonElement>('select-vrm-model', 'button'),
      applyButton: safeGetElementById<HTMLButtonElement>('apply-display-settings', 'button'),
      resetButton: safeGetElementById<HTMLButtonElement>('reset-display-settings', 'button'),
    };

    // 要素の存在確認
    const missingElements = Object.entries(this.elements)
      .filter(([_, element]) => !element)
      .map(([name, _]) => name);

    if (missingElements.length > 0) {
      console.warn('[WindowSettingsComponent] Missing DOM elements:', missingElements);
    }

    console.log('[WindowSettingsComponent] DOM elements initialized');
  }

  /**
   * UIバインディングを初期化する（optional）
   */
  protected initializeBindings(): WindowSettingsBindings {
    console.log('[WindowSettingsComponent] Initializing UI bindings');

    return {
      preset: this.uiAdapter.bind<WindowSizePreset>('window-size-preset', {
        defaultValue: 'medium',
        onChange: this.handlePresetChange.bind(this),
        validation: (value) => {
          const validPresets: WindowSizePreset[] = ['small', 'medium', 'large', 'custom'];
          return validPresets.includes(value) ? [] : [{
            field: 'preset',
            message: '無効なプリセットが選択されています。',
            value
          }];
        }
      }),
      customWidth: this.uiAdapter.bind<number>('custom-width', {
        defaultValue: WINDOW_SIZE_PRESETS.medium.width,
        onChange: this.handleCustomInput.bind(this),
        validation: (value) => {
          if (value < WINDOW_SIZE_LIMITS.width.min || value > WINDOW_SIZE_LIMITS.width.max) {
            return [{
              field: 'width',
              message: `幅は${WINDOW_SIZE_LIMITS.width.min}〜${WINDOW_SIZE_LIMITS.width.max}の範囲で入力してください。`,
              value
            }];
          }
          return [];
        }
      }),
      customHeight: this.uiAdapter.bind<number>('custom-height', {
        defaultValue: WINDOW_SIZE_PRESETS.medium.height,
        onChange: this.handleCustomInput.bind(this),
        validation: (value) => {
          if (value < WINDOW_SIZE_LIMITS.height.min || value > WINDOW_SIZE_LIMITS.height.max) {
            return [{
              field: 'height',
              message: `高さは${WINDOW_SIZE_LIMITS.height.min}〜${WINDOW_SIZE_LIMITS.height.max}の範囲で入力してください。`,
              value
            }];
          }
          return [];
        }
      }),
      vrmModelPath: this.uiAdapter.bind<string>('current-vrm-path', {
        defaultValue: '',
        onChange: (value) => console.log('[WindowSettingsComponent] VRM path changed:', value)
      })
    };
  }

  /**
   * イベントリスナーを設定する（BaseSettingsComponent required）
   */
  protected setupEventListeners(): void {
    console.log('[WindowSettingsComponent] Setting up event listeners');

    // プリセット選択の変更
    this.addEventListenerSafely(
      'window-size-preset',
      'change',
      this.handlePresetChange.bind(this)
    );

    // カスタムサイズ入力の変更
    this.addEventListenerSafely(
      'custom-width',
      'input',
      this.handleCustomInput.bind(this)
    );

    this.addEventListenerSafely(
      'custom-height',
      'input',
      this.handleCustomInput.bind(this)
    );

    // VRMモデル選択ボタン
    this.addEventListenerSafely(
      'select-vrm-model',
      'click',
      this.selectVrmModel.bind(this)
    );

    // 適用・リセットボタンはBaseSettingsComponentで自動処理

    console.log('[WindowSettingsComponent] Event listeners setup completed');
  }

  /**
   * 現在の設定を読み込む（BaseSettingsComponent required）
   */
  protected async loadCurrentSettings(): Promise<void> {
    console.log('[WindowSettingsComponent] Loading current settings');

    try {
      if (this.stateManager) {
        // StateManager経由で読み込み
        this.currentSettings = await this.stateManager.loadSettings('window') || {};
      } else if (checkElectronAPI()) {
        // 直接ElectronAPI経由で読み込み
        const settings = await window.electronAPI.getSettings();
        this.currentSettings = {
          width: settings?.windowSize?.width || WINDOW_SIZE_PRESETS.medium.width,
          height: settings?.windowSize?.height || WINDOW_SIZE_PRESETS.medium.height,
          preset: settings?.windowSize?.preset as WindowSizePreset || 'medium',
          vrmModelPath: settings?.vrmModelPath || ''
        };
      }

      this.applySettingsToUI(this.currentSettings);
      console.log('[WindowSettingsComponent] Settings loaded successfully');
    } catch (error) {
      throw new Error(`設定読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 現在のUI状態から設定データを取得する（BaseSettingsComponent required）
   */
  protected getSettingsFromUI(): WindowSettingsData {
    return {
      width: safeParseInt(safeGetElementValue(this.elements.customWidthInput), WINDOW_SIZE_PRESETS.medium.width),
      height: safeParseInt(safeGetElementValue(this.elements.customHeightInput), WINDOW_SIZE_PRESETS.medium.height),
      preset: safeTrim(safeGetElementValue(this.elements.presetSelect), 'medium') as WindowSizePreset,
      vrmModelPath: safeTrim(safeGetElementValue(this.elements.currentVrmPath)) || ''
    };
  }

  /**
   * 設定をバリデーションする（BaseSettingsComponent required）
   */
  protected validateSettings(settings: WindowSettingsData): import('../core/BaseTypes').ValidationError[] {
    return validateWindowSettings(settings);
  }

  /**
   * デフォルト設定を取得する（BaseSettingsComponent required）
   */
  protected getDefaultSettings(): WindowSettingsData {
    return {
      width: WINDOW_SIZE_PRESETS.medium.width,
      height: WINDOW_SIZE_PRESETS.medium.height,
      preset: 'medium',
      vrmModelPath: ''
    };
  }

  /**
   * 設定をUIに反映する（BaseSettingsComponent required）
   */
  protected applySettingsToUI(settings: Partial<WindowSettingsData>): void {
    // ウィンドウサイズの反映
    if (settings.width !== undefined) {
      safeSetElementValue(this.elements.customWidthInput, settings.width.toString());
    }
    
    if (settings.height !== undefined) {
      safeSetElementValue(this.elements.customHeightInput, settings.height.toString());
    }
    
    if (settings.preset) {
      safeSetElementValue(this.elements.presetSelect, settings.preset);
      this.handlePresetChange();
    }

    // VRMモデルパスの反映
    if (settings.vrmModelPath !== undefined) {
      safeSetElementValue(this.elements.currentVrmPath, settings.vrmModelPath);
    }
  }

  /**
   * 設定セクション取得（BaseSettingsComponent required）
   */
  protected getSettingsSection(): string {
    return 'window';
  }

  /**
   * 直接設定保存（BaseSettingsComponent required）
   */
  protected async saveSettingsDirect(settings: WindowSettingsData): Promise<void> {
    if (checkElectronAPI() && checkElectronAPIMethod('saveSettings')) {
      const success = await window.electronAPI.saveSettings({
        windowSize: {
          width: settings.width,
          height: settings.height,
          preset: settings.preset
        },
        vrmModelPath: settings.vrmModelPath
      });
      if (!success) {
        throw new Error('設定保存に失敗しました');
      }
    } else {
      throw new Error('設定保存用のAPIが利用できません');
    }
  }

  /**
   * プリセット変更を処理する
   */
  private handlePresetChange(): void {
    const preset = safeGetElementValue(this.elements.presetSelect) as WindowSizePreset;
    console.log('[WindowSettingsComponent] Preset changed to:', preset);

    switch (preset) {
      case 'small':
        this.applyPresetSize(WINDOW_SIZE_PRESETS.small);
        this.toggleCustomInputs(false);
        break;
      case 'medium':
        this.applyPresetSize(WINDOW_SIZE_PRESETS.medium);
        this.toggleCustomInputs(false);
        break;
      case 'large':
        this.applyPresetSize(WINDOW_SIZE_PRESETS.large);
        this.toggleCustomInputs(false);
        break;
      case 'custom':
        this.toggleCustomInputs(true);
        break;
      default:
        console.warn('[WindowSettingsComponent] Unknown preset:', preset);
    }
  }

  /**
   * プリセットサイズを適用する
   */
  private applyPresetSize(size: { width: number; height: number }): void {
    safeSetElementValue(this.elements.customWidthInput, size.width.toString());
    safeSetElementValue(this.elements.customHeightInput, size.height.toString());
  }

  /**
   * カスタム入力の表示を切り替える
   */
  private toggleCustomInputs(enabled: boolean): void {
    safeToggleClass(this.elements.customSizeInputs, 'active', enabled);
  }

  /**
   * カスタム入力変更を処理する
   */
  private handleCustomInput(): void {
    // カスタム入力があった場合、プリセットを'custom'に変更
    safeSetElementValue(this.elements.presetSelect, 'custom');
    this.toggleCustomInputs(true);
  }

  /**
   * VRMモデルファイルを選択する
   */
  private async selectVrmModel(): Promise<void> {
    console.log('[WindowSettingsComponent] Selecting VRM model');

    try {
      if (checkElectronAPI() && checkElectronAPIMethod('selectVrmFile')) {
        const filePath = await window.electronAPI.selectVrmFile();
        if (filePath) {
          safeSetElementValue(this.elements.currentVrmPath, filePath);
          console.log('[WindowSettingsComponent] VRM model selected:', filePath);
        }
      } else {
        this.showErrorMessage('VRMファイル選択機能が利用できません');
      }
    } catch (error) {
      this.handleError(error as Error, 'VRMモデル選択');
    }
  }

  /**
   * 設定適用後処理（optional override）
   */
  protected onSettingsApplied(settings: WindowSettingsData): void {
    console.log('[WindowSettingsComponent] Settings applied successfully:', settings);
    // ウィンドウサイズ変更の通知など、必要に応じて追加処理
  }

  /**
   * 設定読み込み後処理（optional override）
   */
  protected onSettingsLoaded(settings: Partial<WindowSettingsData>): void {
    console.log('[WindowSettingsComponent] Settings loaded successfully:', settings);
  }

  /**
   * エラー処理（optional override）
   */
  protected onError(error: Error, operation: string): void {
    console.error(`[WindowSettingsComponent] Error in ${operation}:`, error);
    // コンポーネント固有のエラー処理があれば追加
  }

  /**
   * React移行準備用イベントハンドラー取得
   */
  protected getEventHandlers(): Record<string, Function> {
    return {
      onPresetChange: this.handlePresetChange.bind(this),
      onCustomInput: this.handleCustomInput.bind(this),
      onSelectVrmModel: this.selectVrmModel.bind(this),
      onApplySettings: this.applySettings.bind(this),
      onResetSettings: this.resetSettings.bind(this)
    };
  }
}

export default WindowSettingsComponent;