/**
 * ExpressionSettingsComponent
 * 
 * VRM表情設定を管理する最も複雑なコンポーネント
 * TDD準拠で既存settings-renderer.tsから分離
 */

import type {
  SettingsComponent,
  ExpressionSettings,
  ExpressionSettingsElements,
  SettingsStateManager,
  ValidationError,
  SettingsResult,
  VRMExpressionInfo
} from '../interfaces/SettingsInterfaces';

import { validateExpressionSettings } from '../utils/SettingsValidation';
import {
  safeGetElementById,
  safeGetElementValue,
  safeSetElementValue,
  safeSetDisplay,
  safeAddEventListener,
  safeRemoveEventListener,
  safeParseFloat,
  safeTrim,
  showValidationErrors,
  showSuccessMessage,
  showErrorMessage,
  showConfirmDialog,
  handleSettingsResult,
  safeAsyncCall,
  checkElectronAPI,
  checkElectronAPIMethod,
  debounce
} from '../utils/SettingsHelpers';

/**
 * VRM表情設定コンポーネント
 * 
 * 責務:
 * - VRM表情データの動的読み込み (リトライロジック付き)
 * - 表情リストの動的生成 (有効/無効切り替え)
 * - デフォルト重みスライダー管理
 * - 表情プレビュー機能 (強度制御付き)
 * - tools.json更新・Gemini再初期化連携
 * - 設定の保存・読み込み・リセット
 */
export class ExpressionSettingsComponent implements SettingsComponent {
  private elements: Partial<ExpressionSettingsElements> = {};
  private availableExpressions: VRMExpressionInfo[] = [];
  private expressionSettings: ExpressionSettings = {};
  private isInitialized = false;
  private currentState: 'loading' | 'loaded' | 'error' = 'loading';
  
  // イベントリスナー管理
  private eventListeners: Array<{
    element: HTMLElement;
    type: string;
    listener: EventListener;
  }> = [];
  
  // 動的生成要素追跡（メモリリーク防止）
  private dynamicElements: HTMLElement[] = [];
  private expressionElementMap = new WeakMap<HTMLElement, string>(); // expression name mapping
  
  // 更新処理の最適化
  private debouncedToolsUpdate = debounce(async () => {
    await this.triggerToolsJsonUpdate();
  }, 1000);
  
  private pendingUpdates = new Set<string>();

  // パフォーマンス監視
  private performanceMonitor = {
    startTime: 0,
    
    start(operation: string) {
      this.startTime = performance.now();
      console.log(`[Expression Perf] ${operation} 開始`);
    },
    
    end(operation: string) {
      const duration = performance.now() - this.startTime;
      console.log(`[Expression Perf] ${operation} 完了: ${duration.toFixed(2)}ms`);
      
      if (duration > 1000) {
        console.warn(`[Expression Perf] 性能警告: ${operation} が1秒超過`);
      }
    }
  };

  constructor(private stateManager?: SettingsStateManager) {
    console.log('[ExpressionSettingsComponent] Constructor called');
  }

  /**
   * コンポーネントを初期化する
   */
  async initialize(): Promise<void> {
    console.log('[ExpressionSettingsComponent] Initialize started');
    
    // 重複初期化防止
    if (this.isInitialized) {
      console.log('[Expression] 既に初期化済み、重複初期化を防止');
      return;
    }
    
    this.performanceMonitor.start('表情コンポーネント初期化');
    
    try {
      this.initializeElements();
      this.setupEventListeners();
      await this.initializeExpressions();
      
      this.isInitialized = true;
      console.log('[ExpressionSettingsComponent] Initialize completed successfully');
    } catch (error) {
      console.error('[ExpressionSettingsComponent] Initialize failed:', error);
      this.handleInitializationError(error);
      throw error;
    } finally {
      this.performanceMonitor.end('表情コンポーネント初期化');
    }
  }

  /**
   * DOM要素を初期化する
   */
  private initializeElements(): void {
    console.log('[ExpressionSettingsComponent] Initializing DOM elements');

    // 必須要素の取得
    this.elements = {
      expressionList: safeGetElementById('expression-list', 'div'),
      expressionLoading: safeGetElementById('expression-loading', 'div'),
      expressionError: safeGetElementById('expression-error', 'div'),
      previewExpressionSelect: safeGetElementById<HTMLSelectElement>('preview-expression-select', 'select'),
      previewIntensity: safeGetElementById<HTMLInputElement>('preview-intensity', 'input'),
      previewIntensityValue: safeGetElementById('preview-intensity-value', 'span'),
      previewExpressionBtn: safeGetElementById<HTMLButtonElement>('preview-expression-btn', 'button'),
      resetExpressionBtn: safeGetElementById<HTMLButtonElement>('reset-expression-btn', 'button'),
      saveExpressionsBtn: safeGetElementById<HTMLButtonElement>('save-expressions', 'button'),
      resetExpressionsBtn: safeGetElementById<HTMLButtonElement>('reset-expressions', 'button'),
      applyButton: safeGetElementById<HTMLButtonElement>('apply-expression-settings', 'button'),
      resetButton: safeGetElementById<HTMLButtonElement>('reset-expression-settings', 'button'),
    };

    // 要素の存在確認
    const missingElements = Object.entries(this.elements)
      .filter(([_, element]) => !element)
      .map(([name, _]) => name);

    if (missingElements.length > 0) {
      console.warn('[ExpressionSettingsComponent] Missing DOM elements:', missingElements);
    }

    console.log('[ExpressionSettingsComponent] DOM elements initialized');
  }

  /**
   * イベントリスナーを設定する
   */
  private setupEventListeners(): void {
    console.log('[ExpressionSettingsComponent] Setting up event listeners');

    // プレビュー強度スライダー
    this.addEventListenerSafely(
      this.elements.previewIntensity,
      'input',
      this.handlePreviewIntensityChange.bind(this)
    );

    // プレビューボタン
    this.addEventListenerSafely(
      this.elements.previewExpressionBtn,
      'click',
      this.previewExpression.bind(this)
    );

    // リセットボタン
    this.addEventListenerSafely(
      this.elements.resetExpressionBtn,
      'click',
      this.resetExpressions.bind(this)
    );

    // 保存ボタン
    this.addEventListenerSafely(
      this.elements.saveExpressionsBtn,
      'click',
      this.saveExpressionSettings.bind(this)
    );

    // 設定リセットボタン
    this.addEventListenerSafely(
      this.elements.resetExpressionsBtn,
      'click',
      this.resetExpressionSettings.bind(this)
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

    // イベント委譲による動的要素イベント管理
    this.setupEventDelegation();

    console.log('[ExpressionSettingsComponent] Event listeners setup completed');
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
   * イベント委譲による効率的イベント管理
   */
  private setupEventDelegation(): void {
    // 表情リスト内の動的要素のイベント委譲
    this.addEventListenerSafely(this.elements.expressionList, 'change', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.type === 'checkbox' && target.id.startsWith('expr-')) {
        const expressionName = target.id.replace('expr-', '');
        this.handleCheckboxChange(expressionName, target.checked);
      }
    });

    this.addEventListenerSafely(this.elements.expressionList, 'input', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.type === 'range' && target.id.startsWith('weight-')) {
        const expressionName = target.id.replace('weight-', '');
        this.handleSliderChange(expressionName, safeParseFloat(target.value, 1.0));
      }
    });
  }

  /**
   * 状態を設定してUIを更新する
   */
  private setState(newState: 'loading' | 'loaded' | 'error'): void {
    this.currentState = newState;
    this.updateUIState();
  }

  /**
   * 現在の状態に基づいてUIを更新する
   */
  private updateUIState(): void {
    const { expressionLoading, expressionList, expressionError } = this.elements;
    
    switch (this.currentState) {
      case 'loading':
        safeSetDisplay(expressionLoading, 'block');
        safeSetDisplay(expressionList, 'none');
        safeSetDisplay(expressionError, 'none');
        break;
      case 'loaded':
        safeSetDisplay(expressionLoading, 'none');
        safeSetDisplay(expressionList, 'block');
        safeSetDisplay(expressionError, 'none');
        break;
      case 'error':
        safeSetDisplay(expressionLoading, 'none');
        safeSetDisplay(expressionList, 'none');
        safeSetDisplay(expressionError, 'block');
        this.addRetryButton();
        break;
    }
  }

  /**
   * 初期化エラーを処理する
   */
  private handleInitializationError(error: any): void {
    console.error('[Expression] 初期化エラー:', error);
    this.setState('error');
    
    const errorSpan = this.elements.expressionError?.querySelector('span');
    if (errorSpan) {
      errorSpan.textContent = `表情設定の初期化に失敗しました: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * リトライボタンを追加する
   */
  private addRetryButton(): void {
    // 既存のリトライボタンがあれば削除
    const existingButton = this.elements.expressionError?.querySelector('.retry-button');
    if (existingButton) {
      existingButton.remove();
    }
    
    // 新しいリトライボタンを作成
    const retryButton = document.createElement('button');
    retryButton.className = 'retry-button secondary';
    retryButton.textContent = '再試行';
    retryButton.style.marginTop = '10px';
    
    retryButton.addEventListener('click', async () => {
      this.isInitialized = false;
      await this.initialize();
    });
    
    this.elements.expressionError?.appendChild(retryButton);
  }

  /**
   * コンポーネントの現在状態をダンプする（デバッグ用）
   */
  private dumpCurrentState(): void {
    console.log('[Expression Debug] 現在の状態ダンプ', {
      isInitialized: this.isInitialized,
      currentState: this.currentState,
      expressionCount: this.availableExpressions.length,
      settingsCount: Object.keys(this.expressionSettings).length,
      dynamicElementsCount: this.dynamicElements.length,
      pendingUpdatesCount: this.pendingUpdates.size
    });
  }

  /**
   * VRM表情を初期化する（リトライロジック付き）
   */
  private async initializeExpressions(): Promise<void> {
    this.setState('loading');
    
    try {
      console.log('[Expression] 表情データ読み込み開始');
      
      // VRMモデルの状態確認とリトライ付き読み込み
      this.availableExpressions = await this.loadExpressionsWithRetry();
      console.log(`[Expression] 表情データ読み込み成功: ${this.availableExpressions.length}個`);
      
      // 現在の設定を取得
      await this.loadCurrentSettings();
      
      // UI生成
      this.renderExpressionList();
      this.populatePreviewSelect();
      
      this.setState('loaded');
      console.log('[Expression] 表情初期化完了');
    } catch (error) {
      console.error('[Expression] 表情初期化失敗:', error);
      this.handleInitializationError(error);
      this.setState('error');
    }
  }

  /**
   * リトライロジック付きVRM表情読み込み
   */
  private async loadExpressionsWithRetry(): Promise<VRMExpressionInfo[]> {
    const maxRetries = 5;
    const retryDelay = 1000; // 1秒
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Expression] VRM表情読み込み試行 ${attempt}/${maxRetries}`);
        
        if (!checkElectronAPI() || !checkElectronAPIMethod('getAvailableExpressions')) {
          throw new Error('ElectronAPI が利用できません');
        }
        
        const expressions = await window.electronAPI.getAvailableExpressions();
        
        if (expressions && expressions.length > 0) {
          console.log(`[Expression] 表情読み込み成功 (試行${attempt}): ${expressions.length}個`);
          return this.deduplicateExpressions(expressions);
        }
        
        if (attempt < maxRetries) {
          console.log(`[Expression] 空の結果、${retryDelay}ms後に再試行 (${attempt}/${maxRetries})`);
          await this.delay(retryDelay);
        }
      } catch (error) {
        console.error(`[Expression] 読み込み失敗 (試行${attempt}):`, error);
        if (attempt < maxRetries) {
          await this.delay(retryDelay);
        } else {
          throw error;
        }
      }
    }
    
    throw new Error(`${maxRetries}回の試行後も表情データを取得できませんでした。VRMモデルが正しく読み込まれているか確認してください。`);
  }

  /**
   * 重複表情を除去する
   */
  private deduplicateExpressions(expressions: any[]): VRMExpressionInfo[] {
    const seen = new Set<string>();
    const validExpressions: VRMExpressionInfo[] = [];
    
    expressions.forEach(expr => {
      const validatedExpr = this.validateExpressionData(expr);
      if (validatedExpr && !seen.has(validatedExpr.name)) {
        seen.add(validatedExpr.name);
        validExpressions.push(validatedExpr);
      }
    });
    
    console.log(`[Expression] 重複除去: ${expressions.length} → ${validExpressions.length}個`);
    return validExpressions;
  }

  /**
   * 表情データの妥当性を検証する
   */
  private validateExpressionData(expr: any): VRMExpressionInfo | null {
    if (!expr || typeof expr.name !== 'string' || expr.name.trim() === '') {
      console.warn('[Expression] 無効な表情データ:', expr);
      return null;
    }
    
    return {
      name: expr.name.trim(),
      displayName: expr.displayName || expr.name.trim(),
      isPreset: Boolean(expr.isPreset)
    };
  }

  /**
   * 遅延処理
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 現在の表情設定を読み込む
   */
  async loadSettings(): Promise<void> {
    console.log('[ExpressionSettingsComponent] Loading settings');
    await this.loadCurrentSettings();
  }

  /**
   * 現在の表情設定を内部的に読み込む
   */
  private async loadCurrentSettings(): Promise<void> {
    try {
      if (this.stateManager) {
        // StateManager経由で読み込み
        this.expressionSettings = await this.stateManager.loadSettings('expressions') || {};
      } else if (checkElectronAPI() && checkElectronAPIMethod('getExpressionSettings')) {
        // 直接ElectronAPI経由で読み込み
        this.expressionSettings = await window.electronAPI.getExpressionSettings() || {};
      } else {
        console.warn('[Expression] 表情設定の読み込みAPIが利用できません');
        this.expressionSettings = {};
      }
      
      console.log('[Expression] 表情設定読み込み完了:', Object.keys(this.expressionSettings).length, '個');
    } catch (error) {
      console.error('[Expression] 表情設定読み込み失敗:', error);
      this.expressionSettings = {};
    }
  }

  async applySettings(): Promise<void> {
    console.log('[ExpressionSettingsComponent] applySettings - 実装予定');
  }

  async resetSettings(): Promise<void> {
    console.log('[ExpressionSettingsComponent] resetSettings - 実装予定');
  }

  getValidationErrors(): ValidationError[] {
    return validateExpressionSettings(this.expressionSettings);
  }

  dispose(): void {
    console.log('[ExpressionSettingsComponent] Disposing component');

    // イベントリスナーの削除
    this.eventListeners.forEach(({ element, type, listener }) => {
      safeRemoveEventListener(element, type as any, listener);
    });

    // 動的要素のクリーンアップ
    this.cleanupDynamicElements();

    this.eventListeners = [];
    this.elements = {};
    this.availableExpressions = [];
    this.expressionSettings = {};
    this.isInitialized = false;

    console.log('[ExpressionSettingsComponent] Component disposed');
  }

  /**
   * 表情リストを動的生成する（大量データ最適化付き）
   */
  private renderExpressionList(): void {
    console.log('[Expression] 表情リスト生成開始');
    this.performanceMonitor.start('表情リスト生成');
    
    // 既存動的要素のクリーンアップ
    this.cleanupDynamicElements();
    
    if (this.availableExpressions.length === 0) {
      console.log('[Expression] 表示する表情がありません');
      this.performanceMonitor.end('表情リスト生成');
      return;
    }
    
    // 大量データの場合はバッチ処理
    if (this.availableExpressions.length > 50) {
      this.renderExpressionListBatched();
    } else {
      this.renderExpressionListImmediate();
    }
    
    this.performanceMonitor.end('表情リスト生成');
  }

  /**
   * 表情リストを即座に生成する（50個以下の場合）
   */
  private renderExpressionListImmediate(): void {
    const fragment = document.createDocumentFragment();
    
    this.availableExpressions.forEach(expr => {
      const itemElement = this.createExpressionItem(expr);
      fragment.appendChild(itemElement);
      this.dynamicElements.push(itemElement);
    });
    
    // 一括DOM挿入
    if (this.elements.expressionList) {
      this.elements.expressionList.innerHTML = '';
      this.elements.expressionList.appendChild(fragment);
    }
    
    console.log(`[Expression] 表情リスト生成完了: ${this.availableExpressions.length}個 (即座生成)`);
  }

  /**
   * 表情リストをバッチ処理で生成する（50個超の場合）
   */
  private renderExpressionListBatched(): void {
    const BATCH_SIZE = 20;
    const BATCH_DELAY = 10; // 10msインターバル
    
    if (this.elements.expressionList) {
      this.elements.expressionList.innerHTML = '';
    }
    
    let currentIndex = 0;
    
    const renderBatch = () => {
      const endIndex = Math.min(currentIndex + BATCH_SIZE, this.availableExpressions.length);
      const fragment = document.createDocumentFragment();
      
      for (let i = currentIndex; i < endIndex; i++) {
        const expr = this.availableExpressions[i];
        const itemElement = this.createExpressionItem(expr);
        fragment.appendChild(itemElement);
        this.dynamicElements.push(itemElement);
      }
      
      if (this.elements.expressionList) {
        this.elements.expressionList.appendChild(fragment);
      }
      
      currentIndex = endIndex;
      
      if (currentIndex < this.availableExpressions.length) {
        setTimeout(renderBatch, BATCH_DELAY);
      } else {
        console.log(`[Expression] 表情リスト生成完了: ${this.availableExpressions.length}個 (バッチ生成)`);
      }
    };
    
    renderBatch();
  }

  /**
   * 個別の表情アイテムDOMを作成する
   */
  private createExpressionItem(expr: VRMExpressionInfo): HTMLElement {
    const setting = this.expressionSettings[expr.name] || { enabled: false, defaultWeight: 1.0 };
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'expression-item';
    itemDiv.dataset.expression = expr.name;
    
    itemDiv.innerHTML = `
      <div class="expression-header">
        <div class="expression-checkbox-group">
          <input type="checkbox" id="expr-${expr.name}" ${setting.enabled ? 'checked' : ''}>
          <label for="expr-${expr.name}">
            <span class="expression-name">${expr.displayName || expr.name}</span>
          </label>
        </div>
        <span class="expression-type ${expr.isPreset ? 'preset' : 'custom'}">
          ${expr.isPreset ? 'プリセット' : 'カスタム'}
        </span>
      </div>
      <div class="expression-controls">
        <div class="slider-group">
          <label for="weight-${expr.name}">デフォルト強度:</label>
          <input type="range" id="weight-${expr.name}" min="0" max="1" step="0.1" value="${setting.defaultWeight}">
          <span class="weight-value">${setting.defaultWeight.toFixed(1)}</span>
        </div>
      </div>
    `;
    
    return itemDiv;
  }

  /**
   * プレビュー選択肢を設定する
   */
  private populatePreviewSelect(): void {
    if (!this.elements.previewExpressionSelect) {
      return;
    }

    // 既存のオプションをクリア（最初のオプションは残す）
    while (this.elements.previewExpressionSelect.children.length > 1) {
      this.elements.previewExpressionSelect.removeChild(this.elements.previewExpressionSelect.lastChild!);
    }

    // 表情を追加
    this.availableExpressions.forEach(expr => {
      const option = document.createElement('option');
      option.value = expr.name;
      option.textContent = expr.displayName || expr.name;
      this.elements.previewExpressionSelect!.appendChild(option);
    });

    console.log(`[Expression] プレビュー選択肢設定完了: ${this.availableExpressions.length}個`);
  }

  /**
   * 動的要素の完全クリーンアップ（メモリリーク防止）
   */
  private cleanupDynamicElements(): void {
    console.log('[Expression] 動的要素クリーンアップ開始');
    
    // 既存動的要素のイベントリスナー削除
    this.dynamicElements.forEach(element => {
      const inputs = element.querySelectorAll('input');
      inputs.forEach(input => {
        // イベントリスナーをクローンで置換（全リスナー削除）
        const newInput = input.cloneNode(true) as HTMLElement;
        input.parentNode?.replaceChild(newInput, input);
      });
    });
    
    this.dynamicElements = [];
    this.expressionElementMap = new WeakMap();
    this.pendingUpdates.clear();
    
    console.log('[Expression] 動的要素クリーンアップ完了');
  }

  /**
   * プレビュー強度スライダー変更処理
   */
  private handlePreviewIntensityChange(): void {
    const intensity = safeParseFloat(safeGetElementValue(this.elements.previewIntensity), 0.0);
    safeSetElementValue(this.elements.previewIntensityValue, intensity.toFixed(1));
  }

  /**
   * 表情チェックボックス変更処理
   */
  private handleCheckboxChange(expressionName: string, checked: boolean): void {
    console.log(`[Expression] チェックボックス変更: ${expressionName} → ${checked}`);
    
    // 現在のスライダー値を取得
    const slider = document.getElementById(`weight-${expressionName}`) as HTMLInputElement;
    const currentWeight = slider ? safeParseFloat(slider.value, 1.0) : 1.0;
    
    // 設定更新
    this.updateExpressionSettingDebounced(expressionName, checked, currentWeight);
  }

  /**
   * 表情重みスライダー変更処理
   */
  private handleSliderChange(expressionName: string, value: number): void {
    console.log(`[Expression] スライダー変更: ${expressionName} → ${value}`);
    
    // 値表示更新
    const valueSpan = document.querySelector(`#weight-${expressionName} + .weight-value`) as HTMLElement;
    if (valueSpan) {
      valueSpan.textContent = value.toFixed(1);
    }
    
    // 現在のチェックボックス状態を取得
    const checkbox = document.getElementById(`expr-${expressionName}`) as HTMLInputElement;
    const currentEnabled = checkbox ? checkbox.checked : false;
    
    // 設定更新
    this.updateExpressionSettingDebounced(expressionName, currentEnabled, value);
  }

  /**
   * デバウンス済み表情設定更新
   */
  private updateExpressionSettingDebounced = debounce(async (
    expressionName: string, 
    enabled: boolean, 
    defaultWeight: number
  ) => {
    await this.updateExpressionSetting(expressionName, enabled, defaultWeight);
  }, 300);

  /**
   * 個別表情設定のリアルタイム更新
   */
  private async updateExpressionSetting(
    expressionName: string, 
    enabled: boolean, 
    defaultWeight: number
  ): Promise<void> {
    console.log(`[Expression] 設定更新: ${expressionName} enabled=${enabled} weight=${defaultWeight}`);
    
    // ローカル状態即座更新
    if (!this.expressionSettings[expressionName]) {
      this.expressionSettings[expressionName] = { enabled: false, defaultWeight: 0 };
    }
    this.expressionSettings[expressionName].enabled = enabled;
    this.expressionSettings[expressionName].defaultWeight = defaultWeight;
    
    // 更新予定リストに追加
    this.pendingUpdates.add(expressionName);
    
    try {
      // 個別設定更新API呼び出し
      if (checkElectronAPI() && checkElectronAPIMethod('updateExpressionSetting')) {
        const result = await window.electronAPI.updateExpressionSetting(
          expressionName, enabled, defaultWeight
        );
        
        if (result && result.success) {
          console.log(`[Expression] 設定更新成功: ${expressionName}`);
          // tools.json更新とGemini再初期化をトリガー（デバウンス済み）
          this.debouncedToolsUpdate();
        } else {
          console.error(`[Expression] 設定更新失敗: ${expressionName}`, result);
          this.handleUpdateError(expressionName, result);
        }
      } else {
        console.warn('[Expression] updateExpressionSetting API が利用できません');
      }
    } catch (error) {
      console.error(`[Expression] 設定更新エラー: ${expressionName}`, error);
      this.handleUpdateError(expressionName, { success: false, error: error.message });
    } finally {
      this.pendingUpdates.delete(expressionName);
    }
  }

  /**
   * 設定更新エラーを処理する
   */
  private handleUpdateError(expressionName: string, result: any): void {
    console.error(`[Expression] ${expressionName} 更新失敗:`, result);
    // エラー表示は控えめに（ユーザビリティ重視）
    // showErrorMessage(`表情設定の更新に失敗しました: ${expressionName}`, result.error);
  }

  /**
   * tools.json更新とGemini再初期化を実行する
   */
  private async triggerToolsJsonUpdate(): Promise<void> {
    if (this.pendingUpdates.size === 0) {
      return; // 更新待ちがない場合はスキップ
    }
    
    console.log('[Expression] tools.json更新・Gemini再初期化開始');
    this.performanceMonitor.start('tools.json更新');
    
    try {
      if (checkElectronAPI() && checkElectronAPIMethod('updateToolsAndReinitializeGemini')) {
        const result = await window.electronAPI.updateToolsAndReinitializeGemini();
        if (result && result.success) {
          console.log('[Expression] tools.json更新・Gemini再初期化完了');
        } else {
          console.error('[Expression] tools.json更新失敗:', result?.error);
        }
      } else {
        console.warn('[Expression] updateToolsAndReinitializeGemini API が利用できません');
      }
    } catch (error) {
      console.error('[Expression] tools.json更新エラー:', error);
    } finally {
      this.performanceMonitor.end('tools.json更新');
    }
  }

  /**
   * 表情をプレビューする
   */
  private async previewExpression(): Promise<void> {
    const selectedExpression = safeGetElementValue(this.elements.previewExpressionSelect);
    if (!selectedExpression) {
      showErrorMessage('プレビューする表情を選択してください。');
      return;
    }

    const intensity = safeParseFloat(
      safeGetElementValue(this.elements.previewIntensity), 
      0.0
    );
    
    console.log(`[Expression] 表情プレビュー: ${selectedExpression} intensity=${intensity}`);
    
    try {
      if (checkElectronAPI() && checkElectronAPIMethod('previewExpression')) {
        const result = await window.electronAPI.previewExpression(selectedExpression, intensity);
        if (!result || !result.success) {
          showErrorMessage('表情のプレビューに失敗しました。', result?.error);
        }
      } else {
        showErrorMessage('表情プレビュー機能が利用できません。');
      }
    } catch (error) {
      console.error('[Expression] 表情プレビューエラー:', error);
      showErrorMessage('表情のプレビューでエラーが発生しました。', error);
    }
  }

  /**
   * 表情をリセットする（ニュートラル状態）
   */
  private async resetExpressions(): Promise<void> {
    console.log('[Expression] 表情リセット実行');
    
    try {
      if (checkElectronAPI() && checkElectronAPIMethod('previewExpression')) {
        // ニュートラル表情でリセット
        const result = await window.electronAPI.previewExpression('neutral', 0);
        if (!result || !result.success) {
          console.log('[Expression] ニュートラル表情リセット失敗（続行）');
        }
      } else {
        console.warn('[Expression] 表情リセット機能が利用できません');
      }
    } catch (error) {
      console.error('[Expression] 表情リセットエラー:', error);
    }
  }

  /**
   * 表情設定を保存する
   */
  private async saveExpressionSettings(): Promise<void> {
    console.log('[Expression] 表情設定保存開始');
    console.log('[Expression] 保存する設定:', Object.keys(this.expressionSettings).length, '個');
    
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
        result = await this.stateManager.saveSettings('expressions', this.expressionSettings);
      } else if (checkElectronAPI() && checkElectronAPIMethod('setExpressionSettings')) {
        // 直接ElectronAPI経由で保存
        const apiResult = await window.electronAPI.setExpressionSettings(this.expressionSettings);
        result = apiResult || { success: false, error: 'No result returned' };
      } else {
        throw new Error('表情設定保存用のAPIが利用できません');
      }

      if (handleSettingsResult(
        result, 
        '表情設定をStoreに保存しました', 
        '表情設定の保存に失敗しました', 
        this.elements.saveExpressionsBtn
      )) {
        console.log('[Expression] 表情設定保存成功');
      }
    } catch (error) {
      console.error('[Expression] 表情設定保存エラー:', error);
      showErrorMessage('表情設定の保存でエラーが発生しました', error);
    }
  }

  /**
   * 表情設定をリセットする
   */
  private async resetExpressionSettings(): Promise<void> {
    const confirmReset = showConfirmDialog(
      '表情設定をリセットしますか？この操作は元に戻せません。'
    );
    if (!confirmReset) {
      return;
    }

    console.log('[Expression] 表情設定リセット開始');
    
    try {
      let result: SettingsResult;

      if (this.stateManager) {
        // StateManager経由でリセット
        result = await this.stateManager.saveSettings('expressions', {});
      } else if (checkElectronAPI() && checkElectronAPIMethod('resetExpressionSettings')) {
        // 直接ElectronAPI経由でリセット
        const apiResult = await window.electronAPI.resetExpressionSettings();
        result = apiResult || { success: false, error: 'No result returned' };
      } else {
        throw new Error('表情設定リセット用のAPIが利用できません');
      }

      if (handleSettingsResult(
        result, 
        '表情設定をStoreからリセットしました', 
        '表情設定のリセットに失敗しました', 
        this.elements.resetExpressionsBtn
      )) {
        // 設定をリロードして再初期化
        this.expressionSettings = {};
        this.isInitialized = false;
        await this.initializeExpressions();
        console.log('[Expression] 表情設定リセット・再初期化完了');
      }
    } catch (error) {
      console.error('[Expression] 表情設定リセットエラー:', error);
      showErrorMessage('表情設定のリセットでエラーが発生しました', error);
    }
  }
}

export default ExpressionSettingsComponent;