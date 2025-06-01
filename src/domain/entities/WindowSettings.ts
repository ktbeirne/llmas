/**
 * ウィンドウ設定のドメインエンティティ
 * プリセットの管理とサイズ検証を含む
 */

export type WindowPresetType = 'small' | 'medium' | 'large' | 'custom';

export interface WindowSizePreset {
  readonly name: WindowPresetType;
  readonly width: number;
  readonly height: number;
  readonly displayName: string;
}

export interface WindowSettingsProps {
  width: number;
  height: number;
  preset?: WindowPresetType;
}

/**
 * ウィンドウサイズ設定エンティティ
 */
export class WindowSettings {
  private static readonly PRESETS: ReadonlyMap<WindowPresetType, WindowSizePreset> = new Map([
    ['small', { name: 'small', width: 300, height: 600, displayName: 'スモール' }],
    ['medium', { name: 'medium', width: 400, height: 800, displayName: 'ミディアム' }],
    ['large', { name: 'large', width: 500, height: 1000, displayName: 'ラージ' }],
    ['custom', { name: 'custom', width: 0, height: 0, displayName: 'カスタム' }]
  ]);

  private readonly _width: number;
  private readonly _height: number;
  private readonly _preset: WindowPresetType;

  constructor(props: WindowSettingsProps) {
    this.validateSize(props.width, props.height);
    
    this._width = Math.round(props.width);
    this._height = Math.round(props.height);
    this._preset = props.preset || this.determinePreset(this._width, this._height);
  }

  /**
   * 幅取得
   */
  get width(): number {
    return this._width;
  }

  /**
   * 高さ取得
   */
  get height(): number {
    return this._height;
  }

  /**
   * プリセット取得
   */
  get preset(): WindowPresetType {
    return this._preset;
  }

  /**
   * プリセット情報取得
   */
  get presetInfo(): WindowSizePreset | undefined {
    return WindowSettings.PRESETS.get(this._preset);
  }

  /**
   * アスペクト比取得
   */
  get aspectRatio(): number {
    return this._width / this._height;
  }

  /**
   * カスタムサイズかどうか判定
   */
  get isCustomSize(): boolean {
    return this._preset === 'custom';
  }

  /**
   * プリセットサイズと一致するかどうか判定
   */
  get matchesPreset(): boolean {
    if (this._preset === 'custom') return true;
    
    const preset = WindowSettings.PRESETS.get(this._preset);
    return preset ? preset.width === this._width && preset.height === this._height : false;
  }

  /**
   * サイズが小さいかどうか判定
   */
  get isSmallSize(): boolean {
    return this._width <= 350 && this._height <= 650;
  }

  /**
   * サイズが大きいかどうか判定
   */
  get isLargeSize(): boolean {
    return this._width >= 450 && this._height >= 900;
  }

  /**
   * サイズを変更した新しいWindowSettingsを返す
   */
  resizeTo(width: number, height: number): WindowSettings {
    return new WindowSettings({
      width,
      height,
      preset: 'custom' // サイズ変更時は自動的にカスタムになる
    });
  }

  /**
   * プリセットを適用した新しいWindowSettingsを返す
   */
  applyPreset(preset: WindowPresetType): WindowSettings {
    const presetInfo = WindowSettings.PRESETS.get(preset);
    if (!presetInfo) {
      throw new Error(`無効なプリセットです: ${preset}`);
    }

    if (preset === 'custom') {
      return new WindowSettings({
        width: this._width,
        height: this._height,
        preset: 'custom'
      });
    }

    return new WindowSettings({
      width: presetInfo.width,
      height: presetInfo.height,
      preset
    });
  }

  /**
   * 相対的にサイズを変更した新しいWindowSettingsを返す
   */
  scaleBy(factor: number): WindowSettings {
    if (factor <= 0) {
      throw new Error('スケール係数は正の数である必要があります');
    }

    return new WindowSettings({
      width: this._width * factor,
      height: this._height * factor,
      preset: 'custom'
    });
  }

  /**
   * アスペクト比を維持してサイズを調整
   */
  fitToWidth(targetWidth: number): WindowSettings {
    const scale = targetWidth / this._width;
    return this.scaleBy(scale);
  }

  /**
   * アスペクト比を維持してサイズを調整
   */
  fitToHeight(targetHeight: number): WindowSettings {
    const scale = targetHeight / this._height;
    return this.scaleBy(scale);
  }

  /**
   * 等価性の比較
   */
  equals(other: WindowSettings): boolean {
    return (
      this._width === other._width &&
      this._height === other._height &&
      this._preset === other._preset
    );
  }

  /**
   * 既存システムとの互換性のためのプレーンオブジェクト変換
   */
  toPlainObject(): {
    width: number;
    height: number;
    preset: string;
  } {
    return {
      width: this._width,
      height: this._height,
      preset: this._preset
    };
  }

  /**
   * プレーンオブジェクトからWindowSettingsを生成
   */
  static fromPlainObject(obj: {
    width: number;
    height: number;
    preset: string;
  }): WindowSettings {
    return new WindowSettings({
      width: obj.width,
      height: obj.height,
      preset: obj.preset as WindowPresetType
    });
  }

  /**
   * 全てのプリセット情報を取得
   */
  static getAllPresets(): WindowSizePreset[] {
    return Array.from(WindowSettings.PRESETS.values());
  }

  /**
   * プリセット情報を取得
   */
  static getPreset(preset: WindowPresetType): WindowSizePreset | undefined {
    return WindowSettings.PRESETS.get(preset);
  }

  /**
   * プリセットサイズからWindowSettingsを作成
   */
  static fromPreset(preset: WindowPresetType): WindowSettings {
    const presetInfo = WindowSettings.PRESETS.get(preset);
    if (!presetInfo) {
      throw new Error(`無効なプリセットです: ${preset}`);
    }

    if (preset === 'custom') {
      throw new Error('カスタムプリセットからは直接作成できません');
    }

    return new WindowSettings({
      width: presetInfo.width,
      height: presetInfo.height,
      preset
    });
  }

  /**
   * デフォルトのWindowSettingsを作成
   */
  static createDefault(): WindowSettings {
    return WindowSettings.fromPreset('medium');
  }

  /**
   * 文字列表現
   */
  toString(): string {
    const presetInfo = this.presetInfo;
    return `WindowSettings(${this._width}x${this._height}, preset=${this._preset}${presetInfo ? ` [${presetInfo.displayName}]` : ''})`;
  }

  /**
   * サイズからプリセットを判定
   */
  private determinePreset(width: number, height: number): WindowPresetType {
    for (const [presetName, preset] of WindowSettings.PRESETS) {
      if (presetName !== 'custom' && preset.width === width && preset.height === height) {
        return presetName;
      }
    }
    return 'custom';
  }

  /**
   * サイズの検証
   */
  private validateSize(width: number, height: number): void {
    // 数値チェック
    if (typeof width !== 'number' || !isFinite(width)) {
      throw new Error(`幅は有効な数値である必要があります: ${width}`);
    }
    if (typeof height !== 'number' || !isFinite(height)) {
      throw new Error(`高さは有効な数値である必要があります: ${height}`);
    }

    // 正の数チェック
    if (width <= 0) {
      throw new Error(`幅は正の数である必要があります: ${width}`);
    }
    if (height <= 0) {
      throw new Error(`高さは正の数である必要があります: ${height}`);
    }

    // サイズ制限チェック
    const MIN_WIDTH = 200;
    const MAX_WIDTH = 2000;
    const MIN_HEIGHT = 300;
    const MAX_HEIGHT = 2000;

    if (width < MIN_WIDTH || width > MAX_WIDTH) {
      throw new Error(`幅は${MIN_WIDTH}以上${MAX_WIDTH}以下である必要があります: ${width}`);
    }
    if (height < MIN_HEIGHT || height > MAX_HEIGHT) {
      throw new Error(`高さは${MIN_HEIGHT}以上${MAX_HEIGHT}以下である必要があります: ${height}`);
    }

    // アスペクト比チェック（極端に横長・縦長を防ぐ）
    const aspectRatio = width / height;
    const MIN_ASPECT_RATIO = 0.3; // 縦長制限
    const MAX_ASPECT_RATIO = 3.0; // 横長制限

    if (aspectRatio < MIN_ASPECT_RATIO || aspectRatio > MAX_ASPECT_RATIO) {
      throw new Error(`アスペクト比が不正です (${aspectRatio.toFixed(2)}). ${MIN_ASPECT_RATIO}以上${MAX_ASPECT_RATIO}以下である必要があります`);
    }
  }
}