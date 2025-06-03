/**
 * ThemeSettingsComponent (Phase 2.5 Migration)
 * 
 * テーマ設定を管理するコンポーネント
 * BaseSettingsComponentを拡張して統一アーキテクチャを実現
 */

import type { SettingsStateManager } from '../interfaces/SettingsInterfaces';
import type { 
  ThemeSettingsData,
  ThemeId,
  ThemeInfo,
  ThemeSettingsBindings
} from '../core/BaseTypes';
import type { ThemeSettingsElements } from '../types/DOMTypes';

import { BaseSettingsComponent } from '../core/BaseSettingsComponent';
import { validateThemeSettings } from '../utils/SettingsValidation';
import {
  safeGetElementById,
  safeToggleClass,
  showConfirmDialog,
  checkElectronAPI,
  checkElectronAPIMethod
} from '../utils/SettingsHelpers';

/**
 * テーマ設定コンポーネント（Phase 2.5）
 * 
 * 責務:
 * - テーマデータの動的読み込み（フォールバック対応）
 * - テーマカードの動的生成（カラースウォッチ、ラベル付き）
 * - テーマ選択とリアルタイムプレビュー機能
 * - 折りたたみUI制御
 * - 設定の保存・読み込み・リセット
 * 
 * Phase 2.5 改善点:
 * - BaseSettingsComponent拡張による統一アーキテクチャ
 * - 厳密型使用 (ThemeSettingsData, ThemeId)
 * - UIAdapter抽象化レイヤー対応
 * - 統一エラーハンドリング・パフォーマンス管理
 * - ResourceManager活用でメモリリーク防止
 */
export class ThemeSettingsComponent extends BaseSettingsComponent<ThemeSettingsData, ThemeSettingsBindings> {
  private elements: Partial<ThemeSettingsElements> = {};
  private availableThemes: ThemeInfo[] = [];
  private selectedTheme: ThemeId = 'default';

  // カラースウォッチラベル
  private readonly COLOR_LABELS = ['メイン', 'サブ', 'アクセント', '背景'];

  // フォールバックテーマ定義
  private readonly FALLBACK_THEMES: ThemeInfo[] = [
    {
      id: 'default' as ThemeId,
      name: 'ソフト＆ドリーミー',
      description: '明るく親しみやすい、やわらかな印象のテーマ',
      preview: ['#6B9BD2', '#A594F9', '#FF9FB2', '#FDFBF7']
    },
    {
      id: 'dark' as ThemeId,
      name: 'ダークテーマ',
      description: 'シックで落ち着いた色合いのテーマ',
      preview: ['#2C3E50', '#8E44AD', '#E74C3C', '#1A1A1A']
    },
    {
      id: 'sakura' as ThemeId,
      name: '桜テーマ',
      description: '春らしい桜色をベースにしたテーマ',
      preview: ['#FFB6C1', '#FFCCCB', '#FF69B4', '#FFF0F5']
    },
    {
      id: 'ocean' as ThemeId,
      name: 'オーシャンテーマ',
      description: '海をイメージした爽やかなブルーテーマ',
      preview: ['#0074D9', '#7FDBFF', '#39CCCC', '#F0F8FF']
    }
  ];

  constructor(stateManager?: SettingsStateManager, uiAdapterType: 'vanilla' | 'react' = 'vanilla') {
    super(stateManager, uiAdapterType);
    console.log('[ThemeSettingsComponent] Phase 2.5 constructor completed');
  }

  /**
   * DOM要素を初期化する（BaseSettingsComponent required）
   */
  protected initializeElements(): void {
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
   * UIバインディングを初期化する（optional）
   */
  protected initializeBindings(): ThemeSettingsBindings {
    console.log('[ThemeSettingsComponent] Initializing UI bindings');

    return {
      selectedTheme: this.uiAdapter.bind<ThemeId>('selected-theme', {
        defaultValue: 'default',
        onChange: this.handleThemeChange.bind(this),
        validation: (value) => {
          const validThemes: ThemeId[] = ['default', 'dark', 'sakura', 'ocean'];
          return validThemes.includes(value) ? [] : [{
            field: 'selectedTheme',
            message: '無効なテーマが選択されています。',
            value
          }];
        }
      }),
      themePreview: this.uiAdapter.bind<boolean>('theme-preview', {
        defaultValue: false,
        onChange: (value) => {
          if (value) {
            this.applyThemePreview(this.selectedTheme);
          }
        }
      })
    };
  }

  /**
   * イベントリスナーを設定する（BaseSettingsComponent required）
   */
  protected setupEventListeners(): void {
    console.log('[ThemeSettingsComponent] Setting up event listeners');

    // 折りたたみヘッダー
    this.addEventListenerSafely(
      'theme-header',
      'click',
      this.toggleCollapsed.bind(this)
    );

    // イベント委譲による動的テーマカード対応
    this.addEventListenerSafely(
      'theme-grid',
      'click',
      this.handleThemeCardClick.bind(this)
    );

    // 適用・リセットボタンはBaseSettingsComponentで自動処理

    console.log('[ThemeSettingsComponent] Event listeners setup completed');
  }

  /**
   * 初期化後処理（override）
   */
  protected async postInitialization(): Promise<void> {
    await super.postInitialization();
    
    // テーマデータ読み込みと動的UI生成
    await this.loadThemeData();
    this.setupCollapsibleHeader();
    this.renderThemeCards();
  }

  /**
   * 現在の設定を読み込む（BaseSettingsComponent required）
   */
  protected async loadCurrentSettings(): Promise<void> {
    console.log('[ThemeSettingsComponent] Loading current settings');

    try {
      if (this.stateManager) {
        // StateManager経由で読み込み
        this.currentSettings = await this.stateManager.loadSettings('theme') || {};
      } else if (checkElectronAPI() && checkElectronAPIMethod('getTheme')) {
        // 直接ElectronAPI経由で読み込み
        const currentTheme = await window.electronAPI.getTheme();
        this.currentSettings = {
          selectedTheme: currentTheme as ThemeId || 'default',
          availableThemes: this.availableThemes
        };
      } else {
        console.warn('[ThemeSettingsComponent] 設定読み込みAPIが利用できません');
        this.currentSettings = this.getDefaultSettings();
      }

      // 選択テーマの更新
      if (this.currentSettings.selectedTheme) {
        this.selectedTheme = this.currentSettings.selectedTheme;
        this.updateThemeSelection();
      }

      console.log('[ThemeSettingsComponent] Settings loaded successfully');
    } catch (error) {
      throw new Error(`設定読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 現在のUI状態から設定データを取得する（BaseSettingsComponent required）
   */
  protected getSettingsFromUI(): ThemeSettingsData {
    return {
      selectedTheme: this.selectedTheme,
      availableThemes: this.availableThemes
    };
  }

  /**
   * 設定をバリデーションする（BaseSettingsComponent required）
   */
  protected validateSettings(settings: ThemeSettingsData): import('../core/BaseTypes').ValidationError[] {
    return validateThemeSettings(settings);
  }

  /**
   * デフォルト設定を取得する（BaseSettingsComponent required）
   */
  protected getDefaultSettings(): ThemeSettingsData {
    return {
      selectedTheme: 'default',
      availableThemes: [...this.FALLBACK_THEMES]
    };
  }

  /**
   * 設定をUIに反映する（BaseSettingsComponent required）
   */
  protected applySettingsToUI(settings: Partial<ThemeSettingsData>): void {
    if (settings.selectedTheme) {
      this.selectedTheme = settings.selectedTheme;
      this.updateThemeSelection();
    }

    if (settings.availableThemes) {
      this.availableThemes = settings.availableThemes;
      this.renderThemeCards();
    }
  }

  /**
   * 設定セクション取得（BaseSettingsComponent required）
   */
  protected getSettingsSection(): string {
    return 'theme';
  }

  /**
   * 直接設定保存（BaseSettingsComponent required）
   */
  protected async saveSettingsDirect(settings: ThemeSettingsData): Promise<void> {
    if (checkElectronAPI() && checkElectronAPIMethod('setTheme')) {
      const result = await window.electronAPI.setTheme(settings.selectedTheme);
      if (!result || !result.success) {
        throw new Error('テーマ設定の保存に失敗しました');
      }
    } else {
      throw new Error('テーマ設定保存用のAPIが利用できません');
    }
  }

  /**
   * テーマデータを読み込む（フォールバック対応）
   */
  private async loadThemeData(): Promise<void> {
    console.log('[ThemeSettingsComponent] テーマデータ読み込み開始');
    
    try {
      if (checkElectronAPI() && checkElectronAPIMethod('getAvailableThemes')) {
        this.availableThemes = await window.electronAPI.getAvailableThemes();
        console.log(`[ThemeSettingsComponent] API経由でテーマ読み込み成功: ${this.availableThemes.length}個`);
      } else {
        console.warn('[ThemeSettingsComponent] ElectronAPI利用不可、フォールバックテーマを使用');
        this.availableThemes = [...this.FALLBACK_THEMES];
      }

      // テーマデータの妥当性検証
      this.availableThemes = this.validateAndCleanThemes(this.availableThemes);
      
      if (this.availableThemes.length === 0) {
        console.warn('[ThemeSettingsComponent] 有効なテーマが見つからない、フォールバックテーマを使用');
        this.availableThemes = [...this.FALLBACK_THEMES];
      }

      console.log(`[ThemeSettingsComponent] テーマデータ読み込み完了: ${this.availableThemes.length}個`);
    } catch (error) {
      this.handleError(error as Error, 'テーマデータ読み込み');
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
            id: theme.id.trim() as ThemeId,
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
        console.warn('[ThemeSettingsComponent] 無効なテーマをスキップ:', theme, error);
      }
    });
    
    return validThemes;
  }

  /**
   * テーマカードを動的生成する
   */
  private renderThemeCards(): void {
    if (!this.elements.themeGrid) {
      console.warn('[ThemeSettingsComponent] themeGrid要素が見つかりません');
      return;
    }

    // パフォーマンス監視開始
    this.performanceManager.start('ThemeSettingsComponent:テーマカード生成');

    try {
      // 既存コンテンツをクリア
      this.elements.themeGrid.innerHTML = '';

      // 各テーマのカードを生成
      this.availableThemes.forEach(theme => {
        const cardElement = this.createThemeCard(theme);
        this.elements.themeGrid!.appendChild(cardElement);
      });

      console.log(`[ThemeSettingsComponent] テーマカード生成完了: ${this.availableThemes.length}個`);
    } catch (error) {
      this.handleError(error as Error, 'テーマカード生成');
    } finally {
      this.performanceManager.end('ThemeSettingsComponent:テーマカード生成');
    }
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

    console.log('[ThemeSettingsComponent] 折りたたみ機能設定完了');
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

    console.log(`[ThemeSettingsComponent] 折りたたみ状態変更: ${!isExpanded ? 'expanded' : 'collapsed'}`);
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

    const themeId = themeCard.dataset.themeId as ThemeId;
    console.log(`[ThemeSettingsComponent] テーマカードクリック: ${themeId}`);
    
    this.selectTheme(themeId);
  }

  /**
   * テーマを選択して即座にプレビューを適用する
   */
  private selectTheme(themeId: ThemeId): void {
    console.log(`[ThemeSettingsComponent] テーマ選択: ${themeId}`);
    
    this.selectedTheme = themeId;
    this.updateThemeSelection();
    this.applyThemePreview(themeId);
  }

  /**
   * テーマ変更を処理する
   */
  private handleThemeChange(themeId: ThemeId): void {
    this.selectTheme(themeId);
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
      console.log(`[ThemeSettingsComponent] 選択状態更新: ${this.selectedTheme}`);
    } else {
      console.warn(`[ThemeSettingsComponent] 選択カードが見つかりません: ${this.selectedTheme}`);
    }
  }

  /**
   * テーマプレビューを即座に適用する
   */
  private applyThemePreview(themeId: ThemeId): void {
    try {
      if (window.themeManager && typeof window.themeManager.setTheme === 'function') {
        window.themeManager.setTheme(themeId);
        console.log(`[ThemeSettingsComponent] プレビュー適用: ${themeId}`);
      } else {
        console.warn('[ThemeSettingsComponent] themeManager が利用できません');
      }
    } catch (error) {
      this.handleError(error as Error, 'テーマプレビュー適用');
    }
  }

  /**
   * 設定適用後処理（optional override）
   */
  protected onSettingsApplied(settings: ThemeSettingsData): void {
    console.log('[ThemeSettingsComponent] Settings applied successfully:', settings);
    // テーマ変更の最終確定
    this.applyThemePreview(settings.selectedTheme);
  }

  /**
   * 設定読み込み後処理（optional override）
   */
  protected onSettingsLoaded(settings: Partial<ThemeSettingsData>): void {
    console.log('[ThemeSettingsComponent] Settings loaded successfully:', settings);
    if (settings.selectedTheme) {
      this.updateThemeSelection();
    }
  }

  /**
   * エラー処理（optional override）
   */
  protected onError(error: Error, operation: string): void {
    console.error(`[ThemeSettingsComponent] Error in ${operation}:`, error);
    // テーマデータ読み込み失敗時のフォールバック処理など
  }

  /**
   * React移行準備用イベントハンドラー取得
   */
  protected getEventHandlers(): Record<string, Function> {
    return {
      onThemeChange: this.handleThemeChange.bind(this),
      onThemeCardClick: this.handleThemeCardClick.bind(this),
      onToggleCollapsed: this.toggleCollapsed.bind(this),
      onApplySettings: this.applySettings.bind(this),
      onResetSettings: this.resetSettings.bind(this)
    };
  }
}

export default ThemeSettingsComponent;