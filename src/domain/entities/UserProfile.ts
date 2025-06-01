/**
 * ユーザープロファイルのドメインエンティティ
 * ユーザー情報、マスコット情報、システムプロンプトの管理
 */

export interface UserProfileProps {
  userName?: string;
  mascotName?: string;
  systemPromptCore?: string;
  theme?: string;
  defaultExpression?: string;
}

/**
 * ユーザープロファイルエンティティ
 */
export class UserProfile {
  private static readonly DEFAULT_USER_NAME = 'ユーザー';
  private static readonly DEFAULT_MASCOT_NAME = 'アシスタント';
  private static readonly DEFAULT_SYSTEM_PROMPT_CORE = 'あなたは親しみやすく愛らしいAIアシスタントです。ユーザーと楽しく会話してください。';
  private static readonly DEFAULT_THEME = 'default';
  private static readonly DEFAULT_EXPRESSION = 'neutral';

  private readonly _userName: string;
  private readonly _mascotName: string;
  private readonly _systemPromptCore: string;
  private readonly _theme: string;
  private readonly _defaultExpression: string;

  constructor(props: UserProfileProps = {}) {
    this.validateUserName(props.userName);
    this.validateMascotName(props.mascotName);
    this.validateSystemPromptCore(props.systemPromptCore);
    this.validateTheme(props.theme);
    this.validateDefaultExpression(props.defaultExpression);

    this._userName = props.userName?.trim() || UserProfile.DEFAULT_USER_NAME;
    this._mascotName = props.mascotName?.trim() || UserProfile.DEFAULT_MASCOT_NAME;
    this._systemPromptCore = props.systemPromptCore?.trim() || UserProfile.DEFAULT_SYSTEM_PROMPT_CORE;
    this._theme = props.theme?.trim() || UserProfile.DEFAULT_THEME;
    this._defaultExpression = props.defaultExpression?.trim() || UserProfile.DEFAULT_EXPRESSION;
  }

  /**
   * ユーザー名取得
   */
  get userName(): string {
    return this._userName;
  }

  /**
   * マスコット名取得
   */
  get mascotName(): string {
    return this._mascotName;
  }

  /**
   * システムプロンプトコア取得
   */
  get systemPromptCore(): string {
    return this._systemPromptCore;
  }

  /**
   * テーマ取得
   */
  get theme(): string {
    return this._theme;
  }

  /**
   * デフォルト表情取得
   */
  get defaultExpression(): string {
    return this._defaultExpression;
  }

  /**
   * デフォルト設定かどうか判定
   */
  get isDefault(): boolean {
    return (
      this._userName === UserProfile.DEFAULT_USER_NAME &&
      this._mascotName === UserProfile.DEFAULT_MASCOT_NAME &&
      this._systemPromptCore === UserProfile.DEFAULT_SYSTEM_PROMPT_CORE &&
      this._theme === UserProfile.DEFAULT_THEME &&
      this._defaultExpression === UserProfile.DEFAULT_EXPRESSION
    );
  }

  /**
   * カスタマイズされているかどうか判定
   */
  get isCustomized(): boolean {
    return !this.isDefault;
  }

  /**
   * 名前情報が設定されているかどうか判定
   */
  get hasCustomNames(): boolean {
    return (
      this._userName !== UserProfile.DEFAULT_USER_NAME ||
      this._mascotName !== UserProfile.DEFAULT_MASCOT_NAME
    );
  }

  /**
   * システムプロンプトがカスタマイズされているかどうか判定
   */
  get hasCustomSystemPrompt(): boolean {
    return this._systemPromptCore !== UserProfile.DEFAULT_SYSTEM_PROMPT_CORE;
  }

  /**
   * プロフィールの完成度（0-1）
   */
  get completeness(): number {
    let score = 0;
    const totalFields = 5;

    if (this._userName !== UserProfile.DEFAULT_USER_NAME) score++;
    if (this._mascotName !== UserProfile.DEFAULT_MASCOT_NAME) score++;
    if (this._systemPromptCore !== UserProfile.DEFAULT_SYSTEM_PROMPT_CORE) score++;
    if (this._theme !== UserProfile.DEFAULT_THEME) score++;
    if (this._defaultExpression !== UserProfile.DEFAULT_EXPRESSION) score++;

    return score / totalFields;
  }

  /**
   * 変数置換されたシステムプロンプトを生成
   */
  get interpolatedSystemPrompt(): string {
    return this._systemPromptCore
      .replace(/\$\{userName\}/g, this._userName)
      .replace(/\$\{mascotName\}/g, this._mascotName)
      .replace(/\$\{user\}/g, this._userName)  // 短縮版
      .replace(/\$\{mascot\}/g, this._mascotName);  // 短縮版
  }

  /**
   * 挨拶メッセージを生成
   */
  get greetingMessage(): string {
    return `こんにちは、${this._userName}さん！私は${this._mascotName}です。よろしくお願いします。`;
  }

  /**
   * プロフィール概要文を生成
   */
  get summary(): string {
    return `ユーザー: ${this._userName}, マスコット: ${this._mascotName}, テーマ: ${this._theme}`;
  }

  /**
   * ユーザー名を変更した新しいUserProfileを返す
   */
  setUserName(userName: string): UserProfile {
    return new UserProfile({
      userName,
      mascotName: this._mascotName,
      systemPromptCore: this._systemPromptCore,
      theme: this._theme,
      defaultExpression: this._defaultExpression
    });
  }

  /**
   * マスコット名を変更した新しいUserProfileを返す
   */
  setMascotName(mascotName: string): UserProfile {
    return new UserProfile({
      userName: this._userName,
      mascotName,
      systemPromptCore: this._systemPromptCore,
      theme: this._theme,
      defaultExpression: this._defaultExpression
    });
  }

  /**
   * システムプロンプトコアを変更した新しいUserProfileを返す
   */
  setSystemPromptCore(systemPromptCore: string): UserProfile {
    return new UserProfile({
      userName: this._userName,
      mascotName: this._mascotName,
      systemPromptCore,
      theme: this._theme,
      defaultExpression: this._defaultExpression
    });
  }

  /**
   * テーマを変更した新しいUserProfileを返す
   */
  setTheme(theme: string): UserProfile {
    return new UserProfile({
      userName: this._userName,
      mascotName: this._mascotName,
      systemPromptCore: this._systemPromptCore,
      theme,
      defaultExpression: this._defaultExpression
    });
  }

  /**
   * デフォルト表情を変更した新しいUserProfileを返す
   */
  setDefaultExpression(defaultExpression: string): UserProfile {
    return new UserProfile({
      userName: this._userName,
      mascotName: this._mascotName,
      systemPromptCore: this._systemPromptCore,
      theme: this._theme,
      defaultExpression
    });
  }

  /**
   * 複数の設定を一度に変更した新しいUserProfileを返す
   */
  update(updates: Partial<UserProfileProps>): UserProfile {
    return new UserProfile({
      userName: updates.userName ?? this._userName,
      mascotName: updates.mascotName ?? this._mascotName,
      systemPromptCore: updates.systemPromptCore ?? this._systemPromptCore,
      theme: updates.theme ?? this._theme,
      defaultExpression: updates.defaultExpression ?? this._defaultExpression
    });
  }

  /**
   * デフォルト設定にリセットした新しいUserProfileを返す
   */
  reset(): UserProfile {
    return UserProfile.createDefault();
  }

  /**
   * 名前情報のみリセットした新しいUserProfileを返す
   */
  resetNames(): UserProfile {
    return new UserProfile({
      userName: UserProfile.DEFAULT_USER_NAME,
      mascotName: UserProfile.DEFAULT_MASCOT_NAME,
      systemPromptCore: this._systemPromptCore,
      theme: this._theme,
      defaultExpression: this._defaultExpression
    });
  }

  /**
   * システムプロンプトのみリセットした新しいUserProfileを返す
   */
  resetSystemPrompt(): UserProfile {
    return new UserProfile({
      userName: this._userName,
      mascotName: this._mascotName,
      systemPromptCore: UserProfile.DEFAULT_SYSTEM_PROMPT_CORE,
      theme: this._theme,
      defaultExpression: this._defaultExpression
    });
  }

  /**
   * 等価性の比較
   */
  equals(other: UserProfile): boolean {
    return (
      this._userName === other._userName &&
      this._mascotName === other._mascotName &&
      this._systemPromptCore === other._systemPromptCore &&
      this._theme === other._theme &&
      this._defaultExpression === other._defaultExpression
    );
  }

  /**
   * 既存システムとの互換性のためのプレーンオブジェクト変換
   */
  toPlainObject(): UserProfileProps {
    return {
      userName: this._userName,
      mascotName: this._mascotName,
      systemPromptCore: this._systemPromptCore,
      theme: this._theme,
      defaultExpression: this._defaultExpression
    };
  }

  /**
   * プレーンオブジェクトからUserProfileを生成
   */
  static fromPlainObject(obj: UserProfileProps): UserProfile {
    return new UserProfile(obj);
  }

  /**
   * デフォルトのUserProfileを作成
   */
  static createDefault(): UserProfile {
    return new UserProfile();
  }

  /**
   * 基本的な設定でUserProfileを作成
   */
  static createBasic(userName: string, mascotName: string): UserProfile {
    return new UserProfile({
      userName,
      mascotName
    });
  }

  /**
   * 完全設定でUserProfileを作成
   */
  static createComplete(
    userName: string,
    mascotName: string,
    systemPromptCore: string,
    theme: string,
    defaultExpression: string
  ): UserProfile {
    return new UserProfile({
      userName,
      mascotName,
      systemPromptCore,
      theme,
      defaultExpression
    });
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return `UserProfile(user="${this._userName}", mascot="${this._mascotName}", theme="${this._theme}")`;
  }

  /**
   * ユーザー名の検証
   */
  private validateUserName(userName?: string): void {
    if (userName !== undefined) {
      if (typeof userName !== 'string') {
        throw new Error('ユーザー名は文字列である必要があります');
      }

      const trimmed = userName.trim();
      if (trimmed.length === 0) {
        throw new Error('ユーザー名は空文字列にできません');
      }

      if (trimmed.length > 50) {
        throw new Error('ユーザー名は50文字以下である必要があります');
      }

      // 不適切な文字のチェック
      if (!/^[a-zA-Z0-9_\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s]+$/.test(trimmed)) {
        throw new Error('ユーザー名に不正な文字が含まれています');
      }
    }
  }

  /**
   * マスコット名の検証
   */
  private validateMascotName(mascotName?: string): void {
    if (mascotName !== undefined) {
      if (typeof mascotName !== 'string') {
        throw new Error('マスコット名は文字列である必要があります');
      }

      const trimmed = mascotName.trim();
      if (trimmed.length === 0) {
        throw new Error('マスコット名は空文字列にできません');
      }

      if (trimmed.length > 50) {
        throw new Error('マスコット名は50文字以下である必要があります');
      }

      // 不適切な文字のチェック
      if (!/^[a-zA-Z0-9_\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s]+$/.test(trimmed)) {
        throw new Error('マスコット名に不正な文字が含まれています');
      }
    }
  }

  /**
   * システムプロンプトコアの検証
   */
  private validateSystemPromptCore(systemPromptCore?: string): void {
    if (systemPromptCore !== undefined) {
      if (typeof systemPromptCore !== 'string') {
        throw new Error('システムプロンプトコアは文字列である必要があります');
      }

      const trimmed = systemPromptCore.trim();
      if (trimmed.length === 0) {
        throw new Error('システムプロンプトコアは空文字列にできません');
      }

      if (trimmed.length > 2000) {
        throw new Error('システムプロンプトコアは2000文字以下である必要があります');
      }

      // 危険なスクリプトのチェック
      if (this.containsDangerousContent(trimmed)) {
        throw new Error('システムプロンプトコアに不正な内容が含まれています');
      }
    }
  }

  /**
   * テーマの検証
   */
  private validateTheme(theme?: string): void {
    if (theme !== undefined) {
      if (typeof theme !== 'string') {
        throw new Error('テーマは文字列である必要があります');
      }

      const trimmed = theme.trim();
      if (trimmed.length === 0) {
        throw new Error('テーマは空文字列にできません');
      }

      if (trimmed.length > 100) {
        throw new Error('テーマは100文字以下である必要があります');
      }

      // 基本的な文字のみ許可
      if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
        throw new Error('テーマ名に不正な文字が含まれています');
      }
    }
  }

  /**
   * デフォルト表情の検証
   */
  private validateDefaultExpression(defaultExpression?: string): void {
    if (defaultExpression !== undefined) {
      if (typeof defaultExpression !== 'string') {
        throw new Error('デフォルト表情は文字列である必要があります');
      }

      const trimmed = defaultExpression.trim();
      if (trimmed.length === 0) {
        throw new Error('デフォルト表情は空文字列にできません');
      }

      if (trimmed.length > 100) {
        throw new Error('デフォルト表情は100文字以下である必要があります');
      }

      // 表情名として適切な文字のみ許可
      if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
        throw new Error('デフォルト表情名に不正な文字が含まれています');
      }
    }
  }

  /**
   * 危険な内容のチェック
   */
  private containsDangerousContent(content: string): boolean {
    // 基本的なXSS対策
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /Function\s*\(/gi
    ];

    return dangerousPatterns.some(pattern => pattern.test(content));
  }
}