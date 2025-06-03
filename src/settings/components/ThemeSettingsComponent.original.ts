/**
 * ThemeSettingsComponent
 * 
 * テーマ設定を管理するコンポーネント
 * TDD準拠で既存settings-renderer.tsから分離
 */

import type {
  SettingsComponent,
  ThemeSettings,
  ThemeSettingsElements,
  ThemeInfo,
  SettingsStateManager,
  ValidationError,
  SettingsResult
} from '../interfaces/SettingsInterfaces';

import { validateThemeSettings } from '../utils/SettingsValidation';
import {
  safeGetElementById,
  safeGetElementValue,
  safeSetElementValue,
  safeToggleClass,
  safeAddEventListener,
  safeRemoveEventListener,
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
 * テーマ設定コンポーネント
 * 
 * 責務:
 * - テーマデータの動的読み込み（フォールバック対応）
 * - テーマカードの動的生成（カラースウォッチ、ラベル付き）
 * - テーマ選択とリアルタイムプレビュー機能
 * - 折りたたみUI制御
 * - 設定の保存・読み込み・リセット
 */
export class ThemeSettingsComponent implements SettingsComponent {
  private elements: Partial<ThemeSettingsElements> = {};
  private currentSettings: Partial<ThemeSettings> = {};
  private availableThemes: ThemeInfo[] = [];
  private selectedTheme: string = 'default';
  private isInitialized = false;
  
  // イベントリスナー管理
  private eventListeners: Array<{
    element: HTMLElement;
    type: string;
    listener: EventListener;
  }> = [];

  // カラースウォッチラベル
  private readonly COLOR_LABELS = ['メイン', 'サブ', 'アクセント', '背景'];

  // フォールバックテーマ定義
  private readonly FALLBACK_THEMES: ThemeInfo[] = [
    {
      id: 'default',
      name: 'ソフト＆ドリーミー',
      description: '明るく親しみやすい、やわらかな印象のテーマ',
      preview: ['#6B9BD2', '#A594F9', '#FF9FB2', '#FDFBF7']
    }
  ];

  constructor(private stateManager?: SettingsStateManager) {
    console.log('[ThemeSettingsComponent] Constructor called');
  }

  /**
   * コンポーネントを初期化する
   */
  async initialize(): Promise<void> {
    console.log('[ThemeSettingsComponent] Initialize started');
    
    // 重複初期化防止
    if (this.isInitialized) {
      console.log('[Theme] 既に初期化済み、重複初期化を防止');
      return;
    }
    
    try {
      this.initializeElements();
      this.setupEventListeners();
      await this.loadThemeData();
      this.setupCollapsibleHeader();
      this.setupStaticThemeCards();
      await this.loadSettings();
      
      this.isInitialized = true;
      console.log('[ThemeSettingsComponent] Initialize completed successfully');
    } catch (error) {
      console.error('[ThemeSettingsComponent] Initialize failed:', error);
      throw error;
    }
  }

  /**
   * DOM要素を初期化する
   */
  private initializeElements(): void {
    console.log('[ThemeSettingsComponent] Initializing DOM elements');

    // 必須要素の取得
    this.elements = {
      themeGrid: safeGetElementById('theme-grid', 'div'),
      themeHeader: safeGetElementById('theme-header', 'div'),
      themeContent: safeGetElementById('theme-content', 'div'),
    };

    // 要素の存在確認
    const missingElements = Object.entries(this.elements)
      .filter(([_, element]) => !element)
      .map(([name, _]) => name);

    if (missingElements.length > 0) {
      console.warn('[ThemeSettingsComponent] Missing DOM elements:', missingElements);
    }

    console.log('[ThemeSettingsComponent] DOM elements initialized');
  }

  /**
   * イベントリスナーを設定する
   */
  private setupEventListeners(): void {
    console.log('[ThemeSettingsComponent] Setting up event listeners');

    // イベント委譲による動的テーマカード対応
    this.addEventListenerSafely(
      this.elements.themeGrid,
      'click',
      this.handleThemeCardClick.bind(this)
    );

    console.log('[ThemeSettingsComponent] Event listeners setup completed');
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
   * テーマデータを読み込む（フォールバック対応）
   */
  private async loadThemeData(): Promise<void> {
    console.log('[Theme] テーマデータ読み込み開始');
    
    try {
      if (checkElectronAPI() && checkElectronAPIMethod('getAvailableThemes')) {
        this.availableThemes = await window.electronAPI.getAvailableThemes();
        console.log(`[Theme] API経由でテーマ読み込み成功: ${this.availableThemes.length}個`);
      } else {
        console.warn('[Theme] ElectronAPI利用不可、フォールバックテーマを使用');
        this.availableThemes = [...this.FALLBACK_THEMES];
      }

      // テーマデータの妥当性検証
      this.availableThemes = this.validateAndCleanThemes(this.availableThemes);
      
      if (this.availableThemes.length === 0) {
        console.warn('[Theme] 有効なテーマが見つからない、フォールバックテーマを使用');
        this.availableThemes = [...this.FALLBACK_THEMES];
      }

      console.log(`[Theme] テーマデータ読み込み完了: ${this.availableThemes.length}個`);
    } catch (error) {
      console.error('[Theme] テーマデータ読み込み失敗:', error);
      this.availableThemes = [...this.FALLBACK_THEMES];
    }
  }

  /**
   * テーマデータの妥当性を検証・クリーンアップする
   */
  private validateAndCleanThemes(themes: any[]): ThemeInfo[] {
    const validThemes: ThemeInfo[] = [];
    
    themes.forEach(theme => {
      try {
        if (theme && typeof theme.id === 'string' && typeof theme.name === 'string') {
          const cleanTheme: ThemeInfo = {
            id: theme.id.trim(),
            name: theme.name.trim(),
            description: theme.description || '',
            preview: Array.isArray(theme.preview) ? theme.preview : []
          };
          
          // プレビューカラーの検証
          cleanTheme.preview = cleanTheme.preview.filter(color => 
            typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color)
          );
          
          validThemes.push(cleanTheme);
        }
      } catch (error) {
        console.warn('[Theme] 無効なテーマをスキップ:', theme, error);
      }
    });
    
    return validThemes;
  }

  /**
   * テーマカードを動的生成する
   */
  private renderThemeCards(): void {
    if (!this.elements.themeGrid) {
      console.warn('[Theme] themeGrid要素が見つかりません');
      return;
    }

    // 既存コンテンツをクリア
    this.elements.themeGrid.innerHTML = '';

    // 各テーマのカードを生成
    this.availableThemes.forEach(theme => {
      const cardElement = this.createThemeCard(theme);
      this.elements.themeGrid!.appendChild(cardElement);
    });

    console.log(`[Theme] テーマカード生成完了: ${this.availableThemes.length}個`);
  }

  /**
   * 個別テーマカードのHTML要素を作成する
   */
  private createThemeCard(theme: ThemeInfo): HTMLElement {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'theme-card';
    cardDiv.dataset.themeId = theme.id;

    // テーマヘッダー
    const headerDiv = document.createElement('div');
    headerDiv.className = 'theme-header';
    headerDiv.textContent = theme.name;

    // テーマ説明
    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'theme-description';
    descriptionDiv.textContent = theme.description || '';

    // プレビューカラーコンテナ
    const previewDiv = document.createElement('div');
    previewDiv.className = 'theme-preview';

    // カラースウォッチの生成
    theme.preview.forEach((color, index) => {
      const swatchDiv = document.createElement('div');
      swatchDiv.className = 'color-swatch';
      swatchDiv.style.backgroundColor = color;
      swatchDiv.title = `${this.COLOR_LABELS[index] || `カラー${index + 1}`}: ${color}`;
      previewDiv.appendChild(swatchDiv);
    });

    // ラベルコンテナ
    const labelsDiv = document.createElement('div');
    labelsDiv.className = 'theme-labels';
    this.COLOR_LABELS.slice(0, theme.preview.length).forEach(label => {
      const labelSpan = document.createElement('span');
      labelSpan.className = 'color-label';
      labelSpan.textContent = label;
      labelsDiv.appendChild(labelSpan);
    });

    // 要素を組み立て
    cardDiv.appendChild(headerDiv);
    cardDiv.appendChild(descriptionDiv);
    cardDiv.appendChild(previewDiv);
    cardDiv.appendChild(labelsDiv);

    return cardDiv;
  }

  /**
   * 折りたたみヘッダーを設定する
   */
  private setupCollapsibleHeader(): void {
    if (!this.elements.themeHeader || !this.elements.themeContent) {
      return;
    }

    this.addEventListenerSafely(
      this.elements.themeHeader,
      'click',
      this.toggleCollapsed.bind(this)
    );

    console.log('[Theme] 折りたたみ機能設定完了');
  }

  /**
   * 折りたたみ状態を切り替える
   */
  private toggleCollapsed(): void {
    if (!this.elements.themeHeader || !this.elements.themeContent) {
      return;
    }

    const isExpanded = this.elements.themeHeader.classList.contains('expanded');
    
    safeToggleClass(this.elements.themeHeader, 'expanded', !isExpanded);
    safeToggleClass(this.elements.themeContent, 'expanded', !isExpanded);

    console.log(`[Theme] 折りたたみ状態変更: ${!isExpanded ? 'expanded' : 'collapsed'}`);
  }

  /**
   * 静的テーマカードのイベントリスナーを設定する
   */
  private setupStaticThemeCards(): void {
    const existingCards = document.querySelectorAll('.theme-card');
    existingCards.forEach(card => {
      if (card instanceof HTMLElement && card.dataset.themeId) {
        // 既に動的なイベント委譲で処理されるため、追加設定は不要
        console.log(`[Theme] 静的カード検出: ${card.dataset.themeId}`);
      }
    });

    // テーマカードを動的生成
    this.renderThemeCards();
  }

  /**
   * テーマカードクリックイベントを処理する
   */
  private handleThemeCardClick(event: Event): void {
    const target = event.target as HTMLElement;
    const themeCard = target.closest('.theme-card') as HTMLElement;
    
    if (!themeCard || !themeCard.dataset.themeId) {
      return;
    }

    const themeId = themeCard.dataset.themeId;
    console.log(`[Theme] テーマカードクリック: ${themeId}`);
    
    this.selectTheme(themeId);
  }

  /**
   * テーマを選択して即座にプレビューを適用する
   */
  private selectTheme(themeId: string): void {
    console.log(`[Theme] テーマ選択: ${themeId}`);
    
    this.selectedTheme = themeId;
    this.updateThemeSelection();
    this.applyThemePreview(themeId);
  }

  /**
   * テーマ選択状態をUIに反映する
   */
  private updateThemeSelection(): void {
    // 全カードから選択状態を削除
    const allCards = document.querySelectorAll('.theme-card');
    allCards.forEach(card => {
      card.classList.remove('selected');
    });

    // 選択されたカードに選択状態を追加
    const selectedCard = document.querySelector(`[data-theme-id="${this.selectedTheme}"]`);
    if (selectedCard) {
      selectedCard.classList.add('selected');
      console.log(`[Theme] 選択状態更新: ${this.selectedTheme}`);
    } else {
      console.warn(`[Theme] 選択カードが見つかりません: ${this.selectedTheme}`);
    }
  }

  /**
   * テーマプレビューを即座に適用する
   */
  private applyThemePreview(themeId: string): void {
    try {
      if (window.themeManager && typeof window.themeManager.setTheme === 'function') {
        window.themeManager.setTheme(themeId);
        console.log(`[Theme] プレビュー適用: ${themeId}`);
      } else {
        console.warn('[Theme] themeManager が利用できません');
      }
    } catch (error) {
      console.error('[Theme] プレビュー適用エラー:', error);
    }
  }

  /**
   * 現在の設定を読み込む
   */
  async loadSettings(): Promise<void> {
    console.log('[ThemeSettingsComponent] Loading settings');

    try {
      if (this.stateManager) {
        // StateManager経由で読み込み
        this.currentSettings = await this.stateManager.loadSettings('theme') || {};
      } else if (checkElectronAPI() && checkElectronAPIMethod('getTheme')) {
        // 直接ElectronAPI経由で読み込み
        const currentTheme = await window.electronAPI.getTheme();
        this.currentSettings = {
          selectedTheme: currentTheme || 'default',
          availableThemes: this.availableThemes
        };
      } else {
        console.warn('[Theme] 設定読み込みAPIが利用できません');
        this.currentSettings = {
          selectedTheme: 'default',
          availableThemes: this.availableThemes
        };
      }

      // UIに設定を反映
      if (this.currentSettings.selectedTheme) {
        this.selectedTheme = this.currentSettings.selectedTheme;
        this.updateThemeSelection();
      }

      console.log('[ThemeSettingsComponent] Settings loaded successfully');
    } catch (error) {
      console.error('[ThemeSettingsComponent] Failed to load settings:', error);
      this.currentSettings = {
        selectedTheme: 'default',
        availableThemes: this.availableThemes
      };
    }
  }

  /**
   * 設定を適用する
   */
  async applySettings(): Promise<void> {
    console.log('[ThemeSettingsComponent] Applying settings');

    const settings: ThemeSettings = {
      selectedTheme: this.selectedTheme,
      availableThemes: this.availableThemes
    };
    
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
        result = await this.stateManager.saveSettings('theme', settings);
      } else if (checkElectronAPI() && checkElectronAPIMethod('setTheme')) {
        // 直接ElectronAPI経由で保存
        const apiResult = await window.electronAPI.setTheme(this.selectedTheme);
        result = apiResult || { success: false, error: 'No result returned' };
      } else {
        throw new Error('テーマ設定保存用のAPIが利用できません');
      }

      if (result.success) {
        this.currentSettings = { ...settings };
        showSuccessMessage(null, 'テーマ設定が保存されました');
        console.log('[ThemeSettingsComponent] Settings applied successfully');
      } else {
        showErrorMessage('テーマ設定の保存に失敗しました', result.error);
      }
    } catch (error) {
      console.error('[ThemeSettingsComponent] Apply settings failed:', error);
      showErrorMessage('設定の適用に失敗しました', error);
    }
  }

  /**
   * 設定をリセットする
   */
  async resetSettings(): Promise<void> {
    console.log('[ThemeSettingsComponent] Resetting settings');

    const confirmReset = showConfirmDialog('テーマ設定をデフォルトに戻しますか？');
    if (!confirmReset) {
      return;
    }

    try {
      let result: SettingsResult;

      if (this.stateManager) {
        // StateManager経由でリセット
        result = await this.stateManager.saveSettings('theme', {
          selectedTheme: 'default',
          availableThemes: this.availableThemes
        });
      } else if (checkElectronAPI() && checkElectronAPIMethod('setTheme')) {
        // 直接ElectronAPI経由でリセット
        const apiResult = await window.electronAPI.setTheme('default');
        result = apiResult || { success: false, error: 'No result returned' };
      } else {
        throw new Error('テーマ設定リセット用のAPIが利用できません');
      }

      if (result.success) {
        this.selectedTheme = 'default';
        this.updateThemeSelection();
        this.applyThemePreview('default');
        await this.loadSettings();
        showSuccessMessage(null, 'テーマ設定がリセットされました');
        console.log('[ThemeSettingsComponent] Settings reset successfully');
      } else {
        showErrorMessage('テーマ設定のリセットに失敗しました', result.error);
      }
    } catch (error) {
      console.error('[ThemeSettingsComponent] Reset settings failed:', error);
      showErrorMessage('設定のリセットに失敗しました', error);
    }
  }

  /**
   * バリデーションエラーを取得する
   */
  getValidationErrors(): ValidationError[] {
    const settings: ThemeSettings = {
      selectedTheme: this.selectedTheme,
      availableThemes: this.availableThemes
    };
    
    return validateThemeSettings(settings);
  }

  /**
   * コンポーネントを破棄する
   */
  dispose(): void {
    console.log('[ThemeSettingsComponent] Disposing component');

    // イベントリスナーの削除
    this.eventListeners.forEach(({ element, type, listener }) => {
      safeRemoveEventListener(element, type as any, listener);
    });

    this.eventListeners = [];
    this.elements = {};
    this.currentSettings = {};
    this.availableThemes = [];
    this.isInitialized = false;

    console.log('[ThemeSettingsComponent] Component disposed');
  }
}

export default ThemeSettingsComponent;