/**
 * ウィンドウ境界のValue Object
 * 不変性とビジネスルールの検証を保証
 */

export interface WindowBoundsProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * ウィンドウの位置とサイズを表すValue Object
 */
export class WindowBounds {
  private readonly _x: number;
  private readonly _y: number;
  private readonly _width: number;
  private readonly _height: number;

  constructor(props: WindowBoundsProps) {
    this.validateBounds(props);
    
    this._x = Math.round(props.x);
    this._y = Math.round(props.y);
    this._width = Math.round(props.width);
    this._height = Math.round(props.height);
  }

  /**
   * X座標取得
   */
  get x(): number {
    return this._x;
  }

  /**
   * Y座標取得
   */
  get y(): number {
    return this._y;
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
   * アスペクト比取得
   */
  get aspectRatio(): number {
    return this._width / this._height;
  }

  /**
   * 面積取得
   */
  get area(): number {
    return this._width * this._height;
  }

  /**
   * 中央座標取得
   */
  get center(): { x: number; y: number } {
    return {
      x: this._x + this._width / 2,
      y: this._y + this._height / 2
    };
  }

  /**
   * 右下座標取得
   */
  get bottomRight(): { x: number; y: number } {
    return {
      x: this._x + this._width,
      y: this._y + this._height
    };
  }

  /**
   * 位置を移動した新しいWindowBoundsを返す
   */
  moveTo(x: number, y: number): WindowBounds {
    return new WindowBounds({
      x,
      y,
      width: this._width,
      height: this._height
    });
  }

  /**
   * サイズを変更した新しいWindowBoundsを返す
   */
  resizeTo(width: number, height: number): WindowBounds {
    return new WindowBounds({
      x: this._x,
      y: this._y,
      width,
      height
    });
  }

  /**
   * 位置を相対的に移動した新しいWindowBoundsを返す
   */
  moveBy(deltaX: number, deltaY: number): WindowBounds {
    return new WindowBounds({
      x: this._x + deltaX,
      y: this._y + deltaY,
      width: this._width,
      height: this._height
    });
  }

  /**
   * サイズを相対的に変更した新しいWindowBoundsを返す
   */
  resizeBy(deltaWidth: number, deltaHeight: number): WindowBounds {
    return new WindowBounds({
      x: this._x,
      y: this._y,
      width: this._width + deltaWidth,
      height: this._height + deltaHeight
    });
  }

  /**
   * 別のWindowBoundsと重複しているかチェック
   */
  intersects(other: WindowBounds): boolean {
    return !(
      this._x + this._width <= other._x ||
      other._x + other._width <= this._x ||
      this._y + this._height <= other._y ||
      other._y + other._height <= this._y
    );
  }

  /**
   * 指定した点が境界内にあるかチェック
   */
  contains(x: number, y: number): boolean {
    return (
      x >= this._x &&
      x <= this._x + this._width &&
      y >= this._y &&
      y <= this._y + this._height
    );
  }

  /**
   * 画面境界内に収まるように調整した新しいWindowBoundsを返す
   */
  constrainToScreen(screenWidth: number, screenHeight: number): WindowBounds {
    let newX = this._x;
    let newY = this._y;
    let newWidth = this._width;
    let newHeight = this._height;

    // 画面からはみ出さないように調整
    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX + newWidth > screenWidth) {
      newX = screenWidth - newWidth;
      if (newX < 0) {
        newX = 0;
        newWidth = screenWidth;
      }
    }
    if (newY + newHeight > screenHeight) {
      newY = screenHeight - newHeight;
      if (newY < 0) {
        newY = 0;
        newHeight = screenHeight;
      }
    }

    return new WindowBounds({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight
    });
  }

  /**
   * 等価性の比較
   */
  equals(other: WindowBounds): boolean {
    return (
      this._x === other._x &&
      this._y === other._y &&
      this._width === other._width &&
      this._height === other._height
    );
  }

  /**
   * 既存システムとの互換性のためのプレーンオブジェクト変換
   */
  toPlainObject(): WindowBoundsProps {
    return {
      x: this._x,
      y: this._y,
      width: this._width,
      height: this._height
    };
  }

  /**
   * プレーンオブジェクトからWindowBoundsを生成
   */
  static fromPlainObject(obj: WindowBoundsProps): WindowBounds {
    return new WindowBounds(obj);
  }

  /**
   * デフォルトのウィンドウ境界を作成
   */
  static createDefault(): WindowBounds {
    return new WindowBounds({
      x: 100,
      y: 100,
      width: 800,
      height: 600
    });
  }

  /**
   * 中央に配置されたウィンドウ境界を作成
   */
  static createCentered(
    width: number,
    height: number,
    screenWidth: number,
    screenHeight: number
  ): WindowBounds {
    return new WindowBounds({
      x: (screenWidth - width) / 2,
      y: (screenHeight - height) / 2,
      width,
      height
    });
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return `WindowBounds(x=${this._x}, y=${this._y}, width=${this._width}, height=${this._height})`;
  }

  /**
   * 境界値の検証
   */
  private validateBounds(props: WindowBoundsProps): void {
    // 数値チェック
    const values = [props.x, props.y, props.width, props.height];
    values.forEach((value, index) => {
      if (typeof value !== 'number' || !isFinite(value)) {
        const names = ['x', 'y', 'width', 'height'];
        throw new Error(`${names[index]}は有効な数値である必要があります: ${value}`);
      }
    });

    // サイズの妥当性チェック
    if (props.width <= 0) {
      throw new Error(`幅は正の数である必要があります: ${props.width}`);
    }
    if (props.height <= 0) {
      throw new Error(`高さは正の数である必要があります: ${props.height}`);
    }

    // 最小・最大サイズ制限
    const MIN_SIZE = 100;
    const MAX_SIZE = 10000;
    
    if (props.width < MIN_SIZE || props.width > MAX_SIZE) {
      throw new Error(`幅は${MIN_SIZE}以上${MAX_SIZE}以下である必要があります: ${props.width}`);
    }
    if (props.height < MIN_SIZE || props.height > MAX_SIZE) {
      throw new Error(`高さは${MIN_SIZE}以上${MAX_SIZE}以下である必要があります: ${props.height}`);
    }

    // 位置の妥当性チェック（極端に大きな負の値は無効）
    const MIN_POSITION = -5000;
    const MAX_POSITION = 50000;
    
    if (props.x < MIN_POSITION || props.x > MAX_POSITION) {
      throw new Error(`X座標は${MIN_POSITION}以上${MAX_POSITION}以下である必要があります: ${props.x}`);
    }
    if (props.y < MIN_POSITION || props.y > MAX_POSITION) {
      throw new Error(`Y座標は${MIN_POSITION}以上${MAX_POSITION}以下である必要があります: ${props.y}`);
    }
  }
}