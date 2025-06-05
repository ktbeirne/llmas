/**
 * WindowSettingsComponent
 * 
 * ウィンドウ・表示設定を管理するコンポーネント
 * TDD準拠で既存settings-renderer.tsから分離
 */

import type {
  SettingsComponent,
  WindowSettings,
  WindowSettingsElements,
  SettingsStateManager,
  ValidationError,
  SettingsResult
} from '../interfaces/SettingsInterfaces';
import { WINDOW_SIZE_PRESETS, WINDOW_SIZE_LIMITS } from '../interfaces/SettingsInterfaces';
import { validateWindowSettings } from '../utils/SettingsValidation';
import {
  safeGetElementById,
  safeGetElementValue,
  safeSetElementValue,
  safeToggleClass,
  safeAddEventListener,
  safeRemoveEventListener,
  safeParseInt,
  safeTrim,
  showValidationErrors,
  showSuccessMessage,
  showErrorMessage,
  showConfirmDialog,
  handleSettingsResult,
  safeAsyncCall,
  checkElectronAPI,
  checkElectronAPIMethod
} from '../utils/SettingsHelpers';

/**
 * ウィンドウ設定コンポーネント
 * 
 * 責務:
 * - ウィンドウサイズ設定管理 (プリセット: small/medium/large/custom)
 * - カスタムサイズ入力とバリデーション (width: 200-1000, height: 300-1200)
 * - VRMモデルファイル選択
 * - 設定の保存・読み込み・リセット
 */
export class WindowSettingsComponent implements SettingsComponent {
  private elements: Partial<WindowSettingsElements> = {};
  private currentSettings: Partial<WindowSettings> = {};
  private eventListeners: Array<{
    element: HTMLElement;
    type: string;
    listener: EventListener;
  }> = [];

  constructor(private stateManager?: SettingsStateManager) {
    console.log('[WindowSettingsComponent] Constructor called');
  }

  /**
   * コンポーネントを初期化する
   */
  async initialize(): Promise<void> {
    console.log('[WindowSettingsComponent] Initialize started');
    
    try {
      this.initializeElements();
      this.setupEventListeners();
      await this.loadSettings();
      
      console.log('[WindowSettingsComponent] Initialize completed successfully');
    } catch (error) {
      console.error('[WindowSettingsComponent] Initialize failed:', error);
      throw error;
    }
  }

  /**
   * DOM要素を初期化する
   */
  private initializeElements(): void {
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
   * イベントリスナーを設定する
   */
  private setupEventListeners(): void {
    console.log('[WindowSettingsComponent] Setting up event listeners');

    // プリセット選択の変更
    this.addEventListenerSafely(
      this.elements.presetSelect,
      'change',
      this.handlePresetChange.bind(this)
    );

    // カスタムサイズ入力の変更
    this.addEventListenerSafely(
      this.elements.customWidthInput,
      'input',
      this.handleCustomInput.bind(this)
    );

    this.addEventListenerSafely(
      this.elements.customHeightInput,
      'input',
      this.handleCustomInput.bind(this)
    );

    // VRMモデル選択ボタン
    this.addEventListenerSafely(
      this.elements.selectVrmButton,
      'click',
      this.selectVrmModel.bind(this)
    );

    // 適用ボタン
    this.addEventListenerSafely(
      this.elements.applyButton,
      'click',
      this.applySettings.bind(this)
    );

    // リセットボタン
    this.addEventListenerSafely(
      this.elements.resetButton,
      'click',
      this.resetSettings.bind(this)
    );

    console.log('[WindowSettingsComponent] Event listeners setup completed');
  }

  /**
   * イベントリスナーを安全に追加する
   */
  private addEventListenerSafely(
    element: HTMLElement | null | undefined,
    type: string,
    listener: EventListener
  ): void {
    if (!element) {
      return;
    }

    if (safeAddEventListener(element, type as any, listener)) {
      this.eventListeners.push({ element, type, listener });
    }
  }

  /**
   * プリセット変更を処理する
   */
  private handlePresetChange(): void {
    const preset = safeGetElementValue(this.elements.presetSelect);
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
   * 現在の設定を読み込む
   */
  async loadSettings(): Promise<void> {
    console.log('[WindowSettingsComponent] Loading settings');

    try {
      if (this.stateManager) {
        // StateManager経由で読み込み
        this.currentSettings = await this.stateManager.loadSettings('window') || {};
      } else if (checkElectronAPI()) {
        // 直接ElectronAPI経由で読み込み
        const settings = await window.electronAPI.getSettings();
        this.currentSettings = {
          width: settings?.windowSize?.width || 400,
          height: settings?.windowSize?.height || 800,
          preset: settings?.windowSize?.preset || 'medium',
          vrmModelPath: settings?.vrmModelPath || ''
        };
      }

      this.applySettingsToUI();
      console.log('[WindowSettingsComponent] Settings loaded successfully');
    } catch (error) {
      console.error('[WindowSettingsComponent] Failed to load settings:', error);
      this.loadDefaultSettings();
    }
  }

  /**
   * 設定をUIに反映する
   */
  private applySettingsToUI(): void {
    // ウィンドウサイズの反映
    if (this.currentSettings.width !== undefined) {
      safeSetElementValue(this.elements.customWidthInput, this.currentSettings.width.toString());
    }
    
    if (this.currentSettings.height !== undefined) {
      safeSetElementValue(this.elements.customHeightInput, this.currentSettings.height.toString());
    }
    
    if (this.currentSettings.preset) {
      safeSetElementValue(this.elements.presetSelect, this.currentSettings.preset);
      this.handlePresetChange();
    }

    // VRMモデルパスの反映
    if (this.currentSettings.vrmModelPath) {
      safeSetElementValue(this.elements.currentVrmPath, this.currentSettings.vrmModelPath);
    }
  }

  /**
   * デフォルト設定を読み込む
   */
  private loadDefaultSettings(): void {
    console.log('[WindowSettingsComponent] Loading default settings');
    
    this.currentSettings = {
      width: WINDOW_SIZE_PRESETS.medium.width,
      height: WINDOW_SIZE_PRESETS.medium.height,
      preset: 'medium',
      vrmModelPath: ''
    };
    
    this.applySettingsToUI();
  }

  /**
   * 現在のUI状態から設定データを取得する
   */
  private getSettingsFromUI(): WindowSettings {
    return {
      width: safeParseInt(safeGetElementValue(this.elements.customWidthInput), 400),
      height: safeParseInt(safeGetElementValue(this.elements.customHeightInput), 800),
      preset: safeTrim(safeGetElementValue(this.elements.presetSelect), 'medium'),
      vrmModelPath: safeTrim(safeGetElementValue(this.elements.currentVrmPath))
    };
  }

  /**
   * 設定を適用する
   */
  async applySettings(): Promise<void> {
    console.log('[WindowSettingsComponent] Applying settings');

    const settings = this.getSettingsFromUI();
    
    // バリデーション
    const errors = this.getValidationErrors();
    if (errors.length > 0) {
      showValidationErrors(errors);
      return;
    }

    try {
      let result: SettingsResult;

      if (this.stateManager) {
        // StateManager経由で保存
        result = await this.stateManager.saveSettings('window', settings);
      } else if (checkElectronAPI() && checkElectronAPIMethod('saveSettings')) {
        // 直接ElectronAPI経由で保存
        const success = await window.electronAPI.saveSettings({
          windowSize: {
            width: settings.width,
            height: settings.height,
            preset: settings.preset
          },
          vrmModelPath: settings.vrmModelPath
        });
        result = { success: !!success };
      } else {
        throw new Error('設定保存用のAPIが利用できません');
      }

      if (handleSettingsResult(result, '設定が保存されました', '設定の保存に失敗しました', this.elements.applyButton)) {
        this.currentSettings = { ...settings };
      }
    } catch (error) {
      console.error('[WindowSettingsComponent] Apply settings failed:', error);
      showErrorMessage('設定の適用に失敗しました', error);
    }
  }

  /**
   * 設定をリセットする
   */
  async resetSettings(): Promise<void> {
    console.log('[WindowSettingsComponent] Resetting settings');

    const confirmReset = showConfirmDialog('設定をデフォルトに戻しますか？');
    if (!confirmReset) {
      return;
    }

    try {
      let result: SettingsResult;

      if (this.stateManager) {
        // StateManager経由でリセット
        result = await this.stateManager.saveSettings('window', {
          width: WINDOW_SIZE_PRESETS.medium.width,
          height: WINDOW_SIZE_PRESETS.medium.height,
          preset: 'medium',
          vrmModelPath: ''
        });
      } else if (checkElectronAPI() && checkElectronAPIMethod('resetSettings')) {
        // 直接ElectronAPI経由でリセット
        const success = await window.electronAPI.resetSettings();
        result = { success: !!success };
      } else {
        throw new Error('設定リセット用のAPIが利用できません');
      }

      if (handleSettingsResult(result, '設定がリセットされました', '設定のリセットに失敗しました', this.elements.resetButton)) {
        await this.loadSettings();
      }
    } catch (error) {
      console.error('[WindowSettingsComponent] Reset settings failed:', error);
      showErrorMessage('設定のリセットに失敗しました', error);
    }
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
        showErrorMessage('VRMファイル選択機能が利用できません');
      }
    } catch (error) {
      console.error('[WindowSettingsComponent] VRM model selection failed:', error);
      showErrorMessage('VRMファイルの選択に失敗しました', error);
    }
  }

  /**
   * バリデーションエラーを取得する
   */
  getValidationErrors(): ValidationError[] {
    const settings = this.getSettingsFromUI();
    return validateWindowSettings(settings);
  }

  /**
   * コンポーネントを破棄する
   */
  dispose(): void {
    console.log('[WindowSettingsComponent] Disposing component');

    // イベントリスナーの削除
    this.eventListeners.forEach(({ element, type, listener }) => {
      safeRemoveEventListener(element, type as any, listener);
    });

    this.eventListeners = [];
    this.elements = {};
    this.currentSettings = {};

    console.log('[WindowSettingsComponent] Component disposed');
  }
}

export default WindowSettingsComponent;