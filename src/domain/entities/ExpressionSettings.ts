/**
 * VRM表情設定のドメインエンティティ
 * 表情の有効/無効状態とデフォルト重みの管理
 */

export interface ExpressionConfig {
  enabled: boolean;
  defaultWeight: number;
}

export interface ExpressionSettingsProps {
  expressions: Map<string, ExpressionConfig>;
}

/**
 * VRM表情設定エンティティ
 */
export class ExpressionSettings {
  private readonly _expressions: ReadonlyMap<string, ExpressionConfig>;

  constructor(props: ExpressionSettingsProps) {
    this.validateExpressions(props.expressions);
    
    // 不変なMapを作成
    this._expressions = new Map(
      Array.from(props.expressions.entries()).map(([name, config]) => [
        name,
        { ...config } // 設定をコピーして不変性を保証
      ])
    );
  }

  /**
   * 全表情設定を取得
   */
  get expressions(): ReadonlyMap<string, ExpressionConfig> {
    return this._expressions;
  }

  /**
   * 有効な表情のリストを取得
   */
  get enabledExpressions(): string[] {
    return Array.from(this._expressions.entries())
      .filter(([, config]) => config.enabled)
      .map(([name]) => name)
      .sort();
  }

  /**
   * 無効な表情のリストを取得
   */
  get disabledExpressions(): string[] {
    return Array.from(this._expressions.entries())
      .filter(([, config]) => !config.enabled)
      .map(([name]) => name)
      .sort();
  }

  /**
   * 表情数を取得
   */
  get expressionCount(): number {
    return this._expressions.size;
  }

  /**
   * 有効な表情数を取得
   */
  get enabledCount(): number {
    return this.enabledExpressions.length;
  }

  /**
   * 無効な表情数を取得
   */
  get disabledCount(): number {
    return this.disabledExpressions.length;
  }

  /**
   * 全ての表情が有効かどうか判定
   */
  get allEnabled(): boolean {
    return Array.from(this._expressions.values()).every(config => config.enabled);
  }

  /**
   * 全ての表情が無効かどうか判定
   */
  get allDisabled(): boolean {
    return Array.from(this._expressions.values()).every(config => !config.enabled);
  }

  /**
   * 表情設定が空かどうか判定
   */
  get isEmpty(): boolean {
    return this._expressions.size === 0;
  }

  /**
   * 指定した表情が存在するかチェック
   */
  hasExpression(expressionName: string): boolean {
    return this._expressions.has(expressionName);
  }

  /**
   * 指定した表情が有効かチェック
   */
  isEnabled(expressionName: string): boolean {
    const config = this._expressions.get(expressionName);
    return config ? config.enabled : false;
  }

  /**
   * 指定した表情が無効かチェック
   */
  isDisabled(expressionName: string): boolean {
    return !this.isEnabled(expressionName);
  }

  /**
   * 指定した表情の設定を取得
   */
  getExpressionConfig(expressionName: string): ExpressionConfig | undefined {
    const config = this._expressions.get(expressionName);
    return config ? { ...config } : undefined;
  }

  /**
   * 指定した表情のデフォルト重みを取得
   */
  getDefaultWeight(expressionName: string): number {
    const config = this._expressions.get(expressionName);
    return config ? config.defaultWeight : 0;
  }

  /**
   * 表情を有効化した新しいExpressionSettingsを返す
   */
  enableExpression(expressionName: string): ExpressionSettings {
    const currentConfig = this._expressions.get(expressionName);
    if (!currentConfig) {
      throw new Error(`表情が見つかりません: ${expressionName}`);
    }

    const newExpressions = new Map(this._expressions);
    newExpressions.set(expressionName, {
      ...currentConfig,
      enabled: true
    });

    return new ExpressionSettings({ expressions: newExpressions });
  }

  /**
   * 表情を無効化した新しいExpressionSettingsを返す
   */
  disableExpression(expressionName: string): ExpressionSettings {
    const currentConfig = this._expressions.get(expressionName);
    if (!currentConfig) {
      throw new Error(`表情が見つかりません: ${expressionName}`);
    }

    const newExpressions = new Map(this._expressions);
    newExpressions.set(expressionName, {
      ...currentConfig,
      enabled: false
    });

    return new ExpressionSettings({ expressions: newExpressions });
  }

  /**
   * 表情の有効/無効を切り替えた新しいExpressionSettingsを返す
   */
  toggleExpression(expressionName: string): ExpressionSettings {
    if (this.isEnabled(expressionName)) {
      return this.disableExpression(expressionName);
    } else {
      return this.enableExpression(expressionName);
    }
  }

  /**
   * 表情のデフォルト重みを設定した新しいExpressionSettingsを返す
   */
  setDefaultWeight(expressionName: string, weight: number): ExpressionSettings {
    const currentConfig = this._expressions.get(expressionName);
    if (!currentConfig) {
      throw new Error(`表情が見つかりません: ${expressionName}`);
    }

    this.validateWeight(weight);

    const newExpressions = new Map(this._expressions);
    newExpressions.set(expressionName, {
      ...currentConfig,
      defaultWeight: weight
    });

    return new ExpressionSettings({ expressions: newExpressions });
  }

  /**
   * 表情設定を更新した新しいExpressionSettingsを返す
   */
  updateExpression(expressionName: string, config: ExpressionConfig): ExpressionSettings {
    this.validateExpressionConfig(config);

    const newExpressions = new Map(this._expressions);
    newExpressions.set(expressionName, { ...config });

    return new ExpressionSettings({ expressions: newExpressions });
  }

  /**
   * 表情を追加した新しいExpressionSettingsを返す
   */
  addExpression(expressionName: string, config: ExpressionConfig): ExpressionSettings {
    if (this._expressions.has(expressionName)) {
      throw new Error(`表情は既に存在します: ${expressionName}`);
    }

    this.validateExpressionName(expressionName);
    this.validateExpressionConfig(config);

    const newExpressions = new Map(this._expressions);
    newExpressions.set(expressionName, { ...config });

    return new ExpressionSettings({ expressions: newExpressions });
  }

  /**
   * 表情を削除した新しいExpressionSettingsを返す
   */
  removeExpression(expressionName: string): ExpressionSettings {
    if (!this._expressions.has(expressionName)) {
      throw new Error(`表情が見つかりません: ${expressionName}`);
    }

    const newExpressions = new Map(this._expressions);
    newExpressions.delete(expressionName);

    return new ExpressionSettings({ expressions: newExpressions });
  }

  /**
   * 全ての表情を有効化した新しいExpressionSettingsを返す
   */
  enableAll(): ExpressionSettings {
    const newExpressions = new Map();
    for (const [name, config] of this._expressions) {
      newExpressions.set(name, {
        ...config,
        enabled: true
      });
    }

    return new ExpressionSettings({ expressions: newExpressions });
  }

  /**
   * 全ての表情を無効化した新しいExpressionSettingsを返す
   */
  disableAll(): ExpressionSettings {
    const newExpressions = new Map();
    for (const [name, config] of this._expressions) {
      newExpressions.set(name, {
        ...config,
        enabled: false
      });
    }

    return new ExpressionSettings({ expressions: newExpressions });
  }

  /**
   * 指定した表情のみを有効化し他を無効化した新しいExpressionSettingsを返す
   */
  enableOnly(expressionNames: string[]): ExpressionSettings {
    const targetSet = new Set(expressionNames);
    const newExpressions = new Map();

    for (const [name, config] of this._expressions) {
      newExpressions.set(name, {
        ...config,
        enabled: targetSet.has(name)
      });
    }

    return new ExpressionSettings({ expressions: newExpressions });
  }

  /**
   * 指定したパターンに一致する表情をフィルタした新しいExpressionSettingsを返す
   */
  filterByPattern(pattern: RegExp): ExpressionSettings {
    const newExpressions = new Map();
    for (const [name, config] of this._expressions) {
      if (pattern.test(name)) {
        newExpressions.set(name, { ...config });
      }
    }

    return new ExpressionSettings({ expressions: newExpressions });
  }

  /**
   * 等価性の比較
   */
  equals(other: ExpressionSettings): boolean {
    if (this._expressions.size !== other._expressions.size) {
      return false;
    }

    for (const [name, config] of this._expressions) {
      const otherConfig = other._expressions.get(name);
      if (!otherConfig ||
          config.enabled !== otherConfig.enabled ||
          Math.abs(config.defaultWeight - otherConfig.defaultWeight) > 0.001) {
        return false;
      }
    }

    return true;
  }

  /**
   * 既存システムとの互換性のためのプレーンオブジェクト変換
   */
  toPlainObject(): { [expressionName: string]: ExpressionConfig } {
    const result: { [expressionName: string]: ExpressionConfig } = {};
    for (const [name, config] of this._expressions) {
      result[name] = { ...config };
    }
    return result;
  }

  /**
   * プレーンオブジェクトからExpressionSettingsを生成
   */
  static fromPlainObject(obj: { [expressionName: string]: ExpressionConfig }): ExpressionSettings {
    const expressions = new Map<string, ExpressionConfig>();
    for (const [name, config] of Object.entries(obj)) {
      expressions.set(name, { ...config });
    }
    return new ExpressionSettings({ expressions });
  }

  /**
   * 空のExpressionSettingsを作成
   */
  static createEmpty(): ExpressionSettings {
    return new ExpressionSettings({ expressions: new Map() });
  }

  /**
   * デフォルトの表情設定を作成
   */
  static createWithDefaults(expressionNames: string[]): ExpressionSettings {
    const expressions = new Map<string, ExpressionConfig>();
    for (const name of expressionNames) {
      expressions.set(name, {
        enabled: true,
        defaultWeight: 1.0
      });
    }
    return new ExpressionSettings({ expressions });
  }

  /**
   * 文字列表現
   */
  toString(): string {
    const enabled = this.enabledCount;
    const total = this.expressionCount;
    return `ExpressionSettings(${enabled}/${total} enabled)`;
  }

  /**
   * 表情マップの検証
   */
  private validateExpressions(expressions: Map<string, ExpressionConfig>): void {
    if (!expressions || !(expressions instanceof Map)) {
      throw new Error('表情設定は有効なMapである必要があります');
    }

    for (const [name, config] of expressions) {
      this.validateExpressionName(name);
      this.validateExpressionConfig(config);
    }
  }

  /**
   * 表情名の検証
   */
  private validateExpressionName(name: string): void {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('表情名は空でない文字列である必要があります');
    }

    if (name.length > 100) {
      throw new Error('表情名は100文字以下である必要があります');
    }

    // 不正な文字のチェック
    if (!/^[a-zA-Z0-9_\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/.test(name)) {
      throw new Error('表情名に不正な文字が含まれています');
    }
  }

  /**
   * 表情設定の検証
   */
  private validateExpressionConfig(config: ExpressionConfig): void {
    if (!config || typeof config !== 'object') {
      throw new Error('表情設定は有効なオブジェクトである必要があります');
    }

    if (typeof config.enabled !== 'boolean') {
      throw new Error('enabled は boolean である必要があります');
    }

    this.validateWeight(config.defaultWeight);
  }

  /**
   * 重み値の検証
   */
  private validateWeight(weight: number): void {
    if (typeof weight !== 'number' || !isFinite(weight)) {
      throw new Error(`重み値は有効な数値である必要があります: ${weight}`);
    }

    if (weight < 0 || weight > 1) {
      throw new Error(`重み値は0以上1以下である必要があります: ${weight}`);
    }
  }
}