/**
 * 🎨 Theme Manager
 * 動的テーマ切り替えとテーマ設定管理
 */

export interface Theme {
  id: string;
  name: string;
  description: string;
  preview: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
}

export const AVAILABLE_THEMES: Theme[] = [
  {
    id: 'default',
    name: 'ソフト＆ドリーミー',
    description: '明るく親しみやすい、やわらかな印象のテーマ',
    preview: {
      primary: '#5082C4',
      secondary: '#8E7CC3',
      accent: '#E91E63',
      background: '#FDFBF7'
    }
  },
  {
    id: 'dark',
    name: 'ダークモード',
    description: '目に優しく洗練された、落ち着いた印象のテーマ',
    preview: {
      primary: '#60A5FA',
      secondary: '#A78BFA',
      accent: '#FCD34D',
      background: '#0F172A'
    }
  },
  {
    id: 'sakura',
    name: 'サクラ',
    description: '桜の季節を思わせる、華やかで可愛らしいテーマ',
    preview: {
      primary: '#D1477A',
      secondary: '#C485C7',
      accent: '#FF5722',
      background: '#FDF2F8'
    }
  },
  {
    id: 'ocean',
    name: 'オーシャン',
    description: '海の爽やかさを表現した、清々しいテーマ',
    preview: {
      primary: '#0D7377',
      secondary: '#1E40AF',
      accent: '#DC7633',
      background: '#F0FDFA'
    }
  },
  {
    id: 'forest',
    name: 'フォレスト',
    description: '森の静寂をイメージした、落ち着いた自然派テーマ',
    preview: {
      primary: '#6B7280',
      secondary: '#8B7355',
      accent: '#2D8659',
      background: '#F9FAFB'
    }
  },
  {
    id: 'wonderland',
    name: 'ワンダーランド',
    description: '不思議の国のアリスの幻想世界をイメージした魔法的なテーマ',
    preview: {
      primary: '#7C3AED',
      secondary: '#EC4899',
      accent: '#10B981',
      background: '#FAF5FF'
    }
  }
];

export class ThemeManager {
  private currentTheme = 'default';
  private listeners: Array<(theme: string) => void> = [];

  constructor() {
    this.init();
  }

  /**
   * テーママネージャーを初期化
   */
  private init(): void {
    // 保存されたテーマを読み込み
    this.loadSavedTheme();
    
    // テーマを適用
    this.applyTheme(this.currentTheme);

    // システムの色設定変更を監視
    this.watchSystemColorScheme();
  }

  /**
   * 保存されたテーマを読み込み
   */
  private loadSavedTheme(): void {
    try {
      const savedTheme = localStorage.getItem('app-theme');
      if (savedTheme && this.isValidTheme(savedTheme)) {
        this.currentTheme = savedTheme;
      } else {
        // システムの設定に基づいてデフォルトテーマを決定
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          this.currentTheme = 'dark';
        }
      }
    } catch (error) {
      console.warn('テーマの読み込みに失敗しました:', error);
    }
  }

  /**
   * テーマIDが有効かチェック
   */
  private isValidTheme(themeId: string): boolean {
    return AVAILABLE_THEMES.some(theme => theme.id === themeId);
  }

  /**
   * システムの色設定変更を監視
   */
  private watchSystemColorScheme(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addEventListener('change', (e) => {
      // ユーザーが明示的にテーマを設定していない場合のみ自動切り替え
      const hasExplicitTheme = localStorage.getItem('app-theme');
      if (!hasExplicitTheme) {
        const newTheme = e.matches ? 'dark' : 'default';
        this.setTheme(newTheme);
      }
    });
  }

  /**
   * テーマを設定
   */
  public setTheme(themeId: string): void {
    if (!this.isValidTheme(themeId)) {
      console.warn(`無効なテーマID: ${themeId}`);
      return;
    }

    this.currentTheme = themeId;
    this.applyTheme(themeId);
    this.saveTheme(themeId);
    this.notifyListeners(themeId);
  }

  /**
   * テーマを実際にDOMに適用
   */
  private applyTheme(themeId: string): void {
    const root = document.documentElement;
    
    // 既存のテーマ属性をクリア
    AVAILABLE_THEMES.forEach(theme => {
      root.removeAttribute(`data-theme-${theme.id}`);
    });
    
    // 新しいテーマを適用
    if (themeId !== 'default') {
      root.setAttribute('data-theme', themeId);
    } else {
      root.removeAttribute('data-theme');
    }

    // テーマの切り替えアニメーション
    this.animateThemeTransition();

    console.log(`テーマが適用されました: ${themeId}`);
  }

  /**
   * テーマ切り替え時のアニメーション
   */
  private animateThemeTransition(): void {
    const root = document.documentElement;
    
    // 滑らかな色変化のためのトランジション追加
    root.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    
    // アニメーション完了後にトランジションを削除
    setTimeout(() => {
      root.style.transition = '';
    }, 300);
  }

  /**
   * テーマをローカルストレージに保存
   */
  private saveTheme(themeId: string): void {
    try {
      localStorage.setItem('app-theme', themeId);
    } catch (error) {
      console.warn('テーマの保存に失敗しました:', error);
    }
  }

  /**
   * 現在のテーマを取得
   */
  public getCurrentTheme(): string {
    return this.currentTheme;
  }

  /**
   * 利用可能なテーマ一覧を取得
   */
  public getAvailableThemes(): Theme[] {
    return [...AVAILABLE_THEMES];
  }

  /**
   * テーマ情報を取得
   */
  public getThemeInfo(themeId: string): Theme | undefined {
    return AVAILABLE_THEMES.find(theme => theme.id === themeId);
  }

  /**
   * テーマ変更リスナーを追加
   */
  public addThemeChangeListener(callback: (theme: string) => void): void {
    this.listeners.push(callback);
  }

  /**
   * テーマ変更リスナーを削除
   */
  public removeThemeChangeListener(callback: (theme: string) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * リスナーに通知
   */
  private notifyListeners(theme: string): void {
    this.listeners.forEach(callback => {
      try {
        callback(theme);
      } catch (error) {
        console.error('テーマ変更リスナーでエラーが発生しました:', error);
      }
    });
  }

  /**
   * CSS カスタムプロパティを取得
   */
  public getCSSCustomProperty(property: string): string {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(property)
      .trim();
  }

  /**
   * CSS カスタムプロパティを動的に設定
   */
  public setCSSCustomProperty(property: string, value: string): void {
    document.documentElement.style.setProperty(property, value);
  }

  /**
   * テーマのプレビュー色を取得
   */
  public getThemePreviewColors(themeId: string): Theme['preview'] | null {
    const theme = this.getThemeInfo(themeId);
    return theme ? theme.preview : null;
  }

  /**
   * ダークモードかどうかを判定
   */
  public isDarkMode(): boolean {
    return this.currentTheme === 'dark';
  }

  /**
   * テーマリセット
   */
  public resetTheme(): void {
    localStorage.removeItem('app-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultTheme = systemPrefersDark ? 'dark' : 'default';
    this.setTheme(defaultTheme);
  }

  /**
   * テーマをエクスポート（設定のバックアップ用）
   */
  public exportThemeSettings(): { theme: string; timestamp: number } {
    return {
      theme: this.currentTheme,
      timestamp: Date.now()
    };
  }

  /**
   * テーマをインポート（設定の復元用）
   */
  public importThemeSettings(settings: { theme: string }): boolean {
    if (this.isValidTheme(settings.theme)) {
      this.setTheme(settings.theme);
      return true;
    }
    return false;
  }
}

// シングルトンインスタンス
export const themeManager = new ThemeManager();

// グローバルに公開（デバッグ用）
if (typeof window !== 'undefined') {
  (window as any).themeManager = themeManager;
}