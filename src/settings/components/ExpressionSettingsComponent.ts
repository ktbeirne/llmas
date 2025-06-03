/**
 * ExpressionSettingsComponent (Phase 2.5 Migration)
 * 
 * VRM表情設定を管理する最も複雑なコンポーネント
 * BaseSettingsComponentを拡張して統一アーキテクチャを実現
 */

import type { SettingsStateManager } from '../interfaces/SettingsInterfaces';
import type { 
  ExpressionSettingsData,
  ExpressionSettingsBindings,
  ValidationError
} from '../core/BaseTypes';
import type { ExpressionSettingsElements } from '../types/DOMTypes';
import type { VRMExpressionInfo } from '../interfaces/SettingsInterfaces';

import { BaseSettingsComponent } from '../core/BaseSettingsComponent';
import { validateExpressionSettings } from '../utils/SettingsValidation';
import {
  safeGetElementById,
  safeGetElementValue,
  safeSetElementValue,
  safeSetDisplay,
  safeParseFloat,
  showConfirmDialog,
  checkElectronAPI,
  checkElectronAPIMethod
} from '../utils/SettingsHelpers';

/**
 * VRM表情設定コンポーネント（Phase 2.5）
 * 
 * 責務:
 * - VRM表情データの動的読み込み (リトライロジック付き)
 * - 表情リストの動的生成 (有効/無効切り替え)
 * - デフォルト重みスライダー管理
 * - 表情プレビュー機能 (強度制御付き)
 * - tools.json更新・Gemini再初期化連携
 * - 設定の保存・読み込み・リセット
 * 
 * Phase 2.5 改善点:
 * - BaseSettingsComponent拡張による統一アーキテクチャ
 * - 厳密型使用 (ExpressionSettingsData)
 * - 統一PerformanceManager使用（独自監視廃止）
 * - ResourceManager活用でメモリリーク防止強化
 * - 統一ErrorHandler使用（独自エラー処理廃止）
 * - UIAdapter統合でデバウンス処理統一管理
 */
export class ExpressionSettingsComponent extends BaseSettingsComponent<ExpressionSettingsData, ExpressionSettingsBindings> {
  private elements: Partial<ExpressionSettingsElements> = {};
  private availableExpressions: VRMExpressionInfo[] = [];
  private currentState: 'loading' | 'loaded' | 'error' = 'loading';
  
  // 動的生成要素追跡（メモリリーク防止）
  private dynamicElements: HTMLElement[] = [];
  private expressionElementMap = new WeakMap<HTMLElement, string>(); // expression name mapping
  
  // 更新処理の最適化（ResourceManager統合）
  private pendingUpdates = new Set<string>();

  constructor(stateManager?: SettingsStateManager, uiAdapterType: 'vanilla' | 'react' = 'vanilla') {
    super(stateManager, uiAdapterType);
    console.log('[ExpressionSettingsComponent] Phase 2.5 constructor completed');
  }

  /**
   * DOM要素を初期化する（BaseSettingsComponent required）
   */
  protected initializeElements(): void {
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
   * UIバインディングを初期化する（optional）
   */
  protected initializeBindings(): ExpressionSettingsBindings {
    console.log('[ExpressionSettingsComponent] Initializing UI bindings');

    return {
      // 動的表情バインディングは後で追加
    };
  }

  /**
   * イベントリスナーを設定する（BaseSettingsComponent required）
   */
  protected setupEventListeners(): void {
    console.log('[ExpressionSettingsComponent] Setting up event listeners');

    // プレビュー強度スライダー
    this.addEventListenerSafely(
      'preview-intensity',
      'input',
      this.handlePreviewIntensityChange.bind(this)
    );

    // プレビューボタン
    this.addEventListenerSafely(
      'preview-expression-btn',
      'click',
      this.previewExpression.bind(this)
    );

    // リセットボタン
    this.addEventListenerSafely(
      'reset-expression-btn',
      'click',
      this.resetExpressions.bind(this)
    );

    // 保存ボタン
    this.addEventListenerSafely(
      'save-expressions',
      'click',
      this.saveExpressionSettings.bind(this)
    );

    // 設定リセットボタン
    this.addEventListenerSafely(
      'reset-expressions',
      'click',
      this.resetExpressionSettings.bind(this)
    );

    // イベント委譲による動的要素イベント管理
    this.setupEventDelegation();

    // 適用・リセットボタンはBaseSettingsComponentで自動処理

    console.log('[ExpressionSettingsComponent] Event listeners setup completed');
  }

  /**
   * 初期化後処理（override）
   */
  protected async postInitialization(): Promise<void> {
    await super.postInitialization();
    
    // VRM表情初期化（統一パフォーマンス管理）
    await this.initializeExpressions();
  }

  /**
   * 現在の設定を読み込む（BaseSettingsComponent required）
   */
  protected async loadCurrentSettings(): Promise<void> {
    console.log('[ExpressionSettingsComponent] Loading current settings');

    try {
      if (this.stateManager) {
        // StateManager経由で読み込み
        this.currentSettings = await this.stateManager.loadSettings('expressions') || {};
      } else if (checkElectronAPI() && checkElectronAPIMethod('getExpressionSettings')) {
        // 直接ElectronAPI経由で読み込み
        this.currentSettings = await window.electronAPI.getExpressionSettings() || {};
      } else {
        console.warn('[ExpressionSettingsComponent] 表情設定の読み込みAPIが利用できません');
        this.currentSettings = this.getDefaultSettings();
      }

      console.log('[ExpressionSettingsComponent] Settings loaded successfully');
    } catch (error) {
      throw new Error(`設定読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 現在のUI状態から設定データを取得する（BaseSettingsComponent required）
   */
  protected getSettingsFromUI(): ExpressionSettingsData {
    // 現在のexpressionSettingsから取得
    return { ...this.currentSettings } as ExpressionSettingsData;
  }

  /**
   * 設定をバリデーションする（BaseSettingsComponent required）
   */
  protected validateSettings(settings: ExpressionSettingsData): ValidationError[] {
    return validateExpressionSettings(settings);
  }

  /**
   * デフォルト設定を取得する（BaseSettingsComponent required）
   */
  protected getDefaultSettings(): ExpressionSettingsData {
    return {};
  }

  /**
   * 設定をUIに反映する（BaseSettingsComponent required）
   */
  protected applySettingsToUI(settings: Partial<ExpressionSettingsData>): void {
    // UI更新はrenderExpressionList()で処理
    this.renderExpressionList();
  }

  /**
   * 設定セクション取得（BaseSettingsComponent required）
   */
  protected getSettingsSection(): string {
    return 'expressions';
  }

  /**
   * 直接設定保存（BaseSettingsComponent required）
   */
  protected async saveSettingsDirect(settings: ExpressionSettingsData): Promise<void> {
    if (checkElectronAPI() && checkElectronAPIMethod('setExpressionSettings')) {
      const result = await window.electronAPI.setExpressionSettings(settings);
      if (!result || !result.success) {
        throw new Error('表情設定の保存に失敗しました');
      }
    } else {
      throw new Error('表情設定保存用のAPIが利用できません');
    }
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
   * VRM表情を初期化する（統一パフォーマンス管理版）
   */
  private async initializeExpressions(): Promise<void> {
    this.setState('loading');
    
    const operation = 'VRM表情初期化';
    this.performanceManager.start(`ExpressionSettingsComponent:${operation}`);
    
    try {
      console.log('[ExpressionSettingsComponent] 表情データ読み込み開始');
      
      // VRMモデルの状態確認とリトライ付き読み込み（ResourceManager統合）
      this.availableExpressions = await this.loadExpressionsWithRetry();
      console.log(`[ExpressionSettingsComponent] 表情データ読み込み成功: ${this.availableExpressions.length}個`);
      
      // 現在の設定を取得
      await this.loadCurrentSettings();
      
      // UI生成
      this.renderExpressionList();
      this.populatePreviewSelect();
      
      this.setState('loaded');
      console.log('[ExpressionSettingsComponent] 表情初期化完了');
    } catch (error) {
      this.handleError(error as Error, operation);
      this.setState('error');
    } finally {
      this.performanceManager.end(`ExpressionSettingsComponent:${operation}`);
    }
  }

  /**
   * リトライロジック付きVRM表情読み込み（ResourceManager統合版）
   */
  private async loadExpressionsWithRetry(): Promise<VRMExpressionInfo[]> {
    const maxRetries = 5;
    const retryDelay = 1000; // 1秒
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[ExpressionSettingsComponent] VRM表情読み込み試行 ${attempt}/${maxRetries}`);
        
        if (!checkElectronAPI() || !checkElectronAPIMethod('getAvailableExpressions')) {
          throw new Error('ElectronAPI が利用できません');
        }
        
        const expressions = await window.electronAPI.getAvailableExpressions();
        
        if (expressions && expressions.length > 0) {
          console.log(`[ExpressionSettingsComponent] 表情読み込み成功 (試行${attempt}): ${expressions.length}個`);
          return this.deduplicateExpressions(expressions);
        }
        
        if (attempt < maxRetries) {
          console.log(`[ExpressionSettingsComponent] 空の結果、${retryDelay}ms後に再試行 (${attempt}/${maxRetries})`);
          // ResourceManagerの安全タイマー使用
          await new Promise(resolve => {
            this.resourceManager.safeSetTimeout(() => resolve(void 0), retryDelay);
          });
        }
      } catch (error) {
        console.error(`[ExpressionSettingsComponent] 読み込み失敗 (試行${attempt}):`, error);
        if (attempt < maxRetries) {
          await new Promise(resolve => {
            this.resourceManager.safeSetTimeout(() => resolve(void 0), retryDelay);
          });
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
    
    console.log(`[ExpressionSettingsComponent] 重複除去: ${expressions.length} → ${validExpressions.length}個`);
    return validExpressions;
  }

  /**
   * 表情データの妥当性を検証する
   */
  private validateExpressionData(expr: any): VRMExpressionInfo | null {
    if (!expr || typeof expr.name !== 'string' || expr.name.trim() === '') {
      console.warn('[ExpressionSettingsComponent] 無効な表情データ:', expr);
      return null;
    }
    
    return {
      name: expr.name.trim(),
      displayName: expr.displayName || expr.name.trim(),
      isPreset: Boolean(expr.isPreset)
    };
  }

  /**
   * 表情リストを動的生成する（統一パフォーマンス管理版）
   */
  private renderExpressionList(): void {
    console.log('[ExpressionSettingsComponent] 表情リスト生成開始');
    
    const operation = '表情リスト生成';
    this.performanceManager.start(`ExpressionSettingsComponent:${operation}`);
    
    try {
      // 既存動的要素のクリーンアップ
      this.cleanupDynamicElements();
      
      if (this.availableExpressions.length === 0) {
        console.log('[ExpressionSettingsComponent] 表示する表情がありません');
        return;
      }
      
      // 大量データの場合はバッチ処理
      if (this.availableExpressions.length > 50) {
        this.renderExpressionListBatched();
      } else {
        this.renderExpressionListImmediate();
      }
    } catch (error) {
      this.handleError(error as Error, operation);
    } finally {
      this.performanceManager.end(`ExpressionSettingsComponent:${operation}`);
    }
  }

  /**
   * 表情リストを即座に生成する（50個以下の場合）
   */
  private renderExpressionListImmediate(): void {
    const container = this.elements.expressionList;
    if (!container) return;

    this.availableExpressions.forEach(expression => {
      const element = this.createExpressionElement(expression);
      container.appendChild(element);
      this.dynamicElements.push(element);
    });

    console.log(`[ExpressionSettingsComponent] 即座生成完了: ${this.availableExpressions.length}個`);
  }

  /**
   * 表情リストをバッチ生成する（50個超の場合）
   */
  private renderExpressionListBatched(): void {
    const container = this.elements.expressionList;
    if (!container) return;

    const batchSize = 10;
    let index = 0;

    const renderBatch = () => {
      const endIndex = Math.min(index + batchSize, this.availableExpressions.length);
      
      for (let i = index; i < endIndex; i++) {
        const element = this.createExpressionElement(this.availableExpressions[i]);
        container.appendChild(element);
        this.dynamicElements.push(element);
      }
      
      index = endIndex;
      
      if (index < this.availableExpressions.length) {
        // ResourceManagerの安全アニメーションフレーム使用
        this.resourceManager.safeRequestAnimationFrame(renderBatch);
      } else {
        console.log(`[ExpressionSettingsComponent] バッチ生成完了: ${this.availableExpressions.length}個`);
      }
    };

    renderBatch();
  }

  /**
   * 個別表情要素を作成する
   */
  private createExpressionElement(expression: VRMExpressionInfo): HTMLElement {
    const div = document.createElement('div');
    div.className = 'expression-item';
    
    const setting = this.currentSettings[expression.name] || { enabled: true, defaultWeight: 1.0 };
    
    div.innerHTML = `
      <div class="expression-header">
        <label class="expression-label">
          <input type="checkbox" id="expr-${expression.name}" ${setting.enabled ? 'checked' : ''}>
          <span class="expression-name">${expression.displayName}</span>
          ${expression.isPreset ? '<span class="preset-badge">プリセット</span>' : ''}
        </label>
      </div>
      <div class="expression-weight">
        <label>デフォルト重み: <span class="weight-value">${setting.defaultWeight}</span></label>
        <input type="range" id="weight-${expression.name}" 
               min="0" max="1" step="0.1" value="${setting.defaultWeight}">
      </div>
    `;
    
    // WeakMapでexpression名を関連付け
    this.expressionElementMap.set(div, expression.name);
    
    return div;
  }

  /**
   * プレビュー選択肢を生成する
   */
  private populatePreviewSelect(): void {
    const select = this.elements.previewExpressionSelect;
    if (!select) return;

    select.innerHTML = '<option value="">選択してください</option>';
    
    this.availableExpressions.forEach(expression => {
      const option = document.createElement('option');
      option.value = expression.name;
      option.textContent = expression.displayName;
      select.appendChild(option);
    });

    console.log(`[ExpressionSettingsComponent] プレビュー選択肢生成: ${this.availableExpressions.length}個`);
  }

  /**
   * イベント委譲による効率的イベント管理
   */
  private setupEventDelegation(): void {
    // 表情リスト内の動的要素のイベント委譲
    this.addEventListenerSafely('expression-list', 'change', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.type === 'checkbox' && target.id.startsWith('expr-')) {
        const expressionName = target.id.replace('expr-', '');
        this.handleCheckboxChange(expressionName, target.checked);
      }
    });

    this.addEventListenerSafely('expression-list', 'input', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.type === 'range' && target.id.startsWith('weight-')) {
        const expressionName = target.id.replace('weight-', '');
        this.handleSliderChange(expressionName, safeParseFloat(target.value, 1.0));
      }
    });
  }

  /**
   * チェックボックス変更を処理する
   */
  private handleCheckboxChange(expressionName: string, enabled: boolean): void {
    if (!this.currentSettings[expressionName]) {
      this.currentSettings[expressionName] = { enabled: true, defaultWeight: 1.0 };
    }
    
    this.currentSettings[expressionName].enabled = enabled;
    this.pendingUpdates.add(expressionName);
    
    // デバウンス更新（ResourceManager統合）
    this.debouncedToolsUpdate();
    
    console.log(`[ExpressionSettingsComponent] 表情有効性変更: ${expressionName} = ${enabled}`);
  }

  /**
   * スライダー変更を処理する
   */
  private handleSliderChange(expressionName: string, weight: number): void {
    if (!this.currentSettings[expressionName]) {
      this.currentSettings[expressionName] = { enabled: true, defaultWeight: 1.0 };
    }
    
    this.currentSettings[expressionName].defaultWeight = weight;
    this.pendingUpdates.add(expressionName);
    
    // UI更新
    const weightValueSpan = document.querySelector(`#weight-${expressionName}`)?.parentElement?.querySelector('.weight-value');
    if (weightValueSpan) {
      weightValueSpan.textContent = weight.toFixed(1);
    }
    
    // デバウンス更新（ResourceManager統合）
    this.debouncedToolsUpdate();
    
    console.log(`[ExpressionSettingsComponent] 表情重み変更: ${expressionName} = ${weight}`);
  }

  /**
   * プレビュー強度変更を処理する
   */
  private handlePreviewIntensityChange(): void {
    const intensity = safeGetElementValue(this.elements.previewIntensity);
    safeSetElementValue(this.elements.previewIntensityValue, intensity);
  }

  /**
   * tools.json更新・Gemini再初期化（ResourceManager統合版）
   */
  private debouncedToolsUpdate = (() => {
    let timeoutId: number | null = null;
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = this.resourceManager.safeSetTimeout(async () => {
        await this.triggerToolsJsonUpdate();
      }, 1000) as number;
    };
  })();

  /**
   * tools.json更新実行
   */
  private async triggerToolsJsonUpdate(): Promise<void> {
    if (this.pendingUpdates.size === 0) {
      return; // 更新待ちがない場合はスキップ
    }
    
    console.log('[ExpressionSettingsComponent] tools.json更新・Gemini再初期化開始');
    
    const operation = 'tools.json更新';
    this.performanceManager.start(`ExpressionSettingsComponent:${operation}`);
    
    try {
      if (checkElectronAPI() && checkElectronAPIMethod('updateToolsAndReinitializeGemini')) {
        const result = await window.electronAPI.updateToolsAndReinitializeGemini();
        if (result && result.success) {
          console.log('[ExpressionSettingsComponent] tools.json更新・Gemini再初期化完了');
          this.pendingUpdates.clear();
        } else {
          console.error('[ExpressionSettingsComponent] tools.json更新失敗:', result?.error);
        }
      } else {
        console.warn('[ExpressionSettingsComponent] updateToolsAndReinitializeGemini API が利用できません');
      }
    } catch (error) {
      this.handleError(error as Error, operation);
    } finally {
      this.performanceManager.end(`ExpressionSettingsComponent:${operation}`);
    }
  }

  /**
   * 表情をプレビューする
   */
  private async previewExpression(): Promise<void> {
    const selectedExpression = safeGetElementValue(this.elements.previewExpressionSelect);
    if (!selectedExpression) {
      this.showErrorMessage('プレビューする表情を選択してください。');
      return;
    }

    const intensity = safeParseFloat(
      safeGetElementValue(this.elements.previewIntensity), 
      0.0
    );
    
    console.log(`[ExpressionSettingsComponent] 表情プレビュー: ${selectedExpression} intensity=${intensity}`);
    
    try {
      if (checkElectronAPI() && checkElectronAPIMethod('previewExpression')) {
        const result = await window.electronAPI.previewExpression(selectedExpression, intensity);
        if (!result || !result.success) {
          this.showErrorMessage('表情のプレビューに失敗しました。');
        }
      } else {
        this.showErrorMessage('表情プレビュー機能が利用できません。');
      }
    } catch (error) {
      this.handleError(error as Error, '表情プレビュー');
    }
  }

  /**
   * 表情をリセットする（ニュートラル状態）
   */
  private async resetExpressions(): Promise<void> {
    console.log('[ExpressionSettingsComponent] 表情リセット実行');
    
    try {
      if (checkElectronAPI() && checkElectronAPIMethod('previewExpression')) {
        // ニュートラル表情でリセット
        const result = await window.electronAPI.previewExpression('neutral', 0);
        if (!result || !result.success) {
          console.log('[ExpressionSettingsComponent] ニュートラル表情リセット失敗（続行）');
        }
      } else {
        console.warn('[ExpressionSettingsComponent] 表情リセット機能が利用できません');
      }
    } catch (error) {
      this.handleError(error as Error, '表情リセット');
    }
  }

  /**
   * 表情設定を保存する
   */
  private async saveExpressionSettings(): Promise<void> {
    console.log('[ExpressionSettingsComponent] 表情設定保存開始');
    console.log('[ExpressionSettingsComponent] 保存する設定:', Object.keys(this.currentSettings).length, '個');
    
    // バリデーション
    const errors = this.getValidationErrors();
    if (errors.length > 0) {
      this.showValidationErrors(errors);
      return;
    }
    
    try {
      await this.saveSettingsDirect(this.currentSettings);
      this.showSuccessMessage('表情設定をStoreに保存しました');
      console.log('[ExpressionSettingsComponent] 表情設定保存成功');
    } catch (error) {
      this.handleError(error as Error, '表情設定保存');
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

    console.log('[ExpressionSettingsComponent] 表情設定リセット開始');
    
    try {
      await this.saveSettingsDirect({});
      
      // 設定をリロードして再初期化
      this.currentSettings = {};
      await this.initializeExpressions();
      
      this.showSuccessMessage('表情設定をStoreからリセットしました');
      console.log('[ExpressionSettingsComponent] 表情設定リセット・再初期化完了');
    } catch (error) {
      this.handleError(error as Error, '表情設定リセット');
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
      await this.initializeExpressions();
    });
    
    this.elements.expressionError?.appendChild(retryButton);
  }

  /**
   * 動的要素のクリーンアップ（メモリリーク防止）
   */
  private cleanupDynamicElements(): void {
    this.dynamicElements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      // WeakMapから自動削除される
    });
    this.dynamicElements = [];
    console.log('[ExpressionSettingsComponent] 動的要素クリーンアップ完了');
  }

  /**
   * 設定適用後処理（optional override）
   */
  protected onSettingsApplied(settings: ExpressionSettingsData): void {
    console.log('[ExpressionSettingsComponent] Settings applied successfully:', settings);
    // tools.json更新など必要に応じて追加処理
  }

  /**
   * 設定読み込み後処理（optional override）
   */
  protected onSettingsLoaded(settings: Partial<ExpressionSettingsData>): void {
    console.log('[ExpressionSettingsComponent] Settings loaded successfully:', settings);
    // UI更新は別途実行
  }

  /**
   * エラー処理（optional override）
   */
  protected onError(error: Error, operation: string): void {
    console.error(`[ExpressionSettingsComponent] Error in ${operation}:`, error);
    // 表情データ読み込み失敗時の特別処理など
  }

  /**
   * リソース解放時の追加処理（override）
   */
  dispose(): void {
    // 動的要素のクリーンアップ
    this.cleanupDynamicElements();
    
    // pending updatesのクリア
    this.pendingUpdates.clear();
    
    // BaseSettingsComponentのdispose()呼び出し
    super.dispose();
    
    // コンポーネント固有の状態クリア
    this.availableExpressions = [];
    this.currentState = 'loading';
    
    console.log('[ExpressionSettingsComponent] Phase 2.5 disposal completed');
  }

  /**
   * React移行準備用イベントハンドラー取得
   */
  protected getEventHandlers(): Record<string, Function> {
    return {
      onCheckboxChange: this.handleCheckboxChange.bind(this),
      onSliderChange: this.handleSliderChange.bind(this),
      onPreviewIntensityChange: this.handlePreviewIntensityChange.bind(this),
      onPreviewExpression: this.previewExpression.bind(this),
      onResetExpressions: this.resetExpressions.bind(this),
      onSaveExpressionSettings: this.saveExpressionSettings.bind(this),
      onResetExpressionSettings: this.resetExpressionSettings.bind(this),
      onApplySettings: this.applySettings.bind(this),
      onResetSettings: this.resetSettings.bind(this)
    };
  }
}

export default ExpressionSettingsComponent;