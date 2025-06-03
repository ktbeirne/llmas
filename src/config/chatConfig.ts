/**
 * chatConfig.ts - チャット設定管理クラス
 * 
 * TDD: GREEN Phase - テストを通すための実装
 */

// 利用可能なテーマ
export type Theme = 'default' | 'dark' | 'sakura' | 'ocean' | 'forest' | 'wonderland';

// チャット設定のインターフェース
export interface ChatConfigOptions {
  userName: string;
  mascotName: string;
  maxMessageLength: number;
  enableAutoScroll: boolean;
  enableEnterToSend: boolean;
  theme: Theme;
}

// デフォルト設定
export const DEFAULT_CHAT_CONFIG: ChatConfigOptions = {
  userName: 'User',
  mascotName: 'Mascot',
  maxMessageLength: 1000,
  enableAutoScroll: true,
  enableEnterToSend: true,
  theme: 'default'
};

// 有効なテーマのリスト
const VALID_THEMES: Theme[] = ['default', 'dark', 'sakura', 'ocean', 'forest', 'wonderland'];

/**
 * チャット設定を管理するクラス
 */
export class ChatConfig {
  private config: ChatConfigOptions;

  constructor(options?: Partial<ChatConfigOptions>) {
    this.config = {
      ...DEFAULT_CHAT_CONFIG,
      ...options
    };
  }

  // 設定の取得メソッド
  getConfig(): ChatConfigOptions {
    return { ...this.config };
  }

  getUserName(): string {
    return this.config.userName;
  }

  getMascotName(): string {
    return this.config.mascotName;
  }

  getMaxMessageLength(): number {
    return this.config.maxMessageLength;
  }

  isAutoScrollEnabled(): boolean {
    return this.config.enableAutoScroll;
  }

  isEnterToSendEnabled(): boolean {
    return this.config.enableEnterToSend;
  }

  getTheme(): Theme {
    return this.config.theme;
  }

  // 設定の更新メソッド
  setUserName(userName: string): void {
    this.validateUserName(userName);
    this.config.userName = userName;
  }

  setMascotName(mascotName: string): void {
    this.validateMascotName(mascotName);
    this.config.mascotName = mascotName;
  }

  setMaxMessageLength(length: number): void {
    this.validateMaxMessageLength(length);
    this.config.maxMessageLength = length;
  }

  setAutoScrollEnabled(enabled: boolean): void {
    this.config.enableAutoScroll = enabled;
  }

  setEnterToSendEnabled(enabled: boolean): void {
    this.config.enableEnterToSend = enabled;
  }

  setTheme(theme: Theme): void {
    this.validateTheme(theme);
    this.config.theme = theme;
  }

  updateConfig(updates: Partial<ChatConfigOptions>): void {
    // 各更新値を個別のセッターメソッドを通じて設定（バリデーション付き）
    if (updates.userName !== undefined) {
      this.setUserName(updates.userName);
    }
    if (updates.mascotName !== undefined) {
      this.setMascotName(updates.mascotName);
    }
    if (updates.maxMessageLength !== undefined) {
      this.setMaxMessageLength(updates.maxMessageLength);
    }
    if (updates.enableAutoScroll !== undefined) {
      this.setAutoScrollEnabled(updates.enableAutoScroll);
    }
    if (updates.enableEnterToSend !== undefined) {
      this.setEnterToSendEnabled(updates.enableEnterToSend);
    }
    if (updates.theme !== undefined) {
      this.setTheme(updates.theme);
    }
  }

  // デフォルトにリセット
  resetToDefaults(): void {
    this.config = { ...DEFAULT_CHAT_CONFIG };
  }

  // シリアライズ・デシリアライズ
  toJSON(): string {
    return JSON.stringify(this.config);
  }

  static fromJSON(json: string): ChatConfig {
    const config = JSON.parse(json);
    return new ChatConfig(config);
  }

  // バリデーションメソッド
  private validateUserName(userName: string): void {
    if (!userName || userName.trim().length === 0) {
      throw new Error('ユーザー名は必須です');
    }
    if (userName.length > 50) {
      throw new Error('ユーザー名は50文字以内で入力してください');
    }
  }

  private validateMascotName(mascotName: string): void {
    if (!mascotName || mascotName.trim().length === 0) {
      throw new Error('マスコット名は必須です');
    }
    if (mascotName.length > 50) {
      throw new Error('マスコット名は50文字以内で入力してください');
    }
  }

  private validateMaxMessageLength(length: number): void {
    if (length < 100 || length > 10000) {
      throw new Error('最大メッセージ長は100以上10000以下で設定してください');
    }
  }

  private validateTheme(theme: Theme): void {
    if (!VALID_THEMES.includes(theme)) {
      throw new Error('無効なテーマです');
    }
  }
}