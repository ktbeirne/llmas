/**
 * 3Dカメラ設定のドメインエンティティ
 * カメラの位置、ターゲット、ズーム値の管理とビジネスルールを含む
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface CameraSettingsProps {
  position: Vector3D;
  target: Vector3D;
  zoom: number;
}

/**
 * 3Dカメラ設定エンティティ
 */
export class CameraSettings {
  private static readonly DEFAULT_POSITION: Vector3D = { x: 0, y: 0, z: 5 };
  private static readonly DEFAULT_TARGET: Vector3D = { x: 0, y: 0, z: 0 };
  private static readonly DEFAULT_ZOOM = 1.0;

  private readonly _position: Vector3D;
  private readonly _target: Vector3D;
  private readonly _zoom: number;

  constructor(props: CameraSettingsProps) {
    this.validateVector3D(props.position, 'position');
    this.validateVector3D(props.target, 'target');
    this.validateZoom(props.zoom);
    
    this._position = { ...props.position };
    this._target = { ...props.target };
    this._zoom = props.zoom;
  }

  /**
   * カメラ位置取得
   */
  get position(): Vector3D {
    return { ...this._position };
  }

  /**
   * カメラターゲット取得
   */
  get target(): Vector3D {
    return { ...this._target };
  }

  /**
   * ズーム値取得
   */
  get zoom(): number {
    return this._zoom;
  }

  /**
   * カメラからターゲットまでの距離を計算
   */
  get distanceToTarget(): number {
    const dx = this._position.x - this._target.x;
    const dy = this._position.y - this._target.y;
    const dz = this._position.z - this._target.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * カメラの方向ベクトルを計算（正規化済み）
   */
  get direction(): Vector3D {
    const dx = this._target.x - this._position.x;
    const dy = this._target.y - this._position.y;
    const dz = this._target.z - this._position.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (length === 0) {
      return { x: 0, y: 0, z: -1 }; // デフォルト方向
    }
    
    return {
      x: dx / length,
      y: dy / length,
      z: dz / length
    };
  }

  /**
   * カメラの仰角を計算（度単位）
   */
  get elevationAngle(): number {
    const direction = this.direction;
    return Math.asin(direction.y) * (180 / Math.PI);
  }

  /**
   * カメラの方位角を計算（度単位）
   */
  get azimuthAngle(): number {
    const direction = this.direction;
    return Math.atan2(direction.x, direction.z) * (180 / Math.PI);
  }

  /**
   * デフォルト設定かどうか判定
   */
  get isDefault(): boolean {
    return (
      this.vectorEquals(this._position, CameraSettings.DEFAULT_POSITION) &&
      this.vectorEquals(this._target, CameraSettings.DEFAULT_TARGET) &&
      Math.abs(this._zoom - CameraSettings.DEFAULT_ZOOM) < 0.001
    );
  }

  /**
   * カメラ位置を変更した新しいCameraSettingsを返す
   */
  setPosition(position: Vector3D): CameraSettings {
    return new CameraSettings({
      position,
      target: this._target,
      zoom: this._zoom
    });
  }

  /**
   * ターゲット位置を変更した新しいCameraSettingsを返す
   */
  setTarget(target: Vector3D): CameraSettings {
    return new CameraSettings({
      position: this._position,
      target,
      zoom: this._zoom
    });
  }

  /**
   * ズーム値を変更した新しいCameraSettingsを返す
   */
  setZoom(zoom: number): CameraSettings {
    return new CameraSettings({
      position: this._position,
      target: this._target,
      zoom
    });
  }

  /**
   * カメラ位置を相対的に移動した新しいCameraSettingsを返す
   */
  movePosition(delta: Vector3D): CameraSettings {
    return new CameraSettings({
      position: {
        x: this._position.x + delta.x,
        y: this._position.y + delta.y,
        z: this._position.z + delta.z
      },
      target: this._target,
      zoom: this._zoom
    });
  }

  /**
   * ターゲットを相対的に移動した新しいCameraSettingsを返す
   */
  moveTarget(delta: Vector3D): CameraSettings {
    return new CameraSettings({
      position: this._position,
      target: {
        x: this._target.x + delta.x,
        y: this._target.y + delta.y,
        z: this._target.z + delta.z
      },
      zoom: this._zoom
    });
  }

  /**
   * カメラとターゲットを一緒に移動した新しいCameraSettingsを返す
   */
  moveAll(delta: Vector3D): CameraSettings {
    return new CameraSettings({
      position: {
        x: this._position.x + delta.x,
        y: this._position.y + delta.y,
        z: this._position.z + delta.z
      },
      target: {
        x: this._target.x + delta.x,
        y: this._target.y + delta.y,
        z: this._target.z + delta.z
      },
      zoom: this._zoom
    });
  }

  /**
   * ターゲットを中心にカメラを回転させた新しいCameraSettingsを返す
   */
  rotateAroundTarget(azimuthDelta: number, elevationDelta: number): CameraSettings {
    const distance = this.distanceToTarget;
    const currentAzimuth = this.azimuthAngle * (Math.PI / 180);
    const currentElevation = this.elevationAngle * (Math.PI / 180);
    
    const newAzimuth = currentAzimuth + azimuthDelta * (Math.PI / 180);
    const newElevation = Math.max(
      -Math.PI / 2 + 0.1, 
      Math.min(Math.PI / 2 - 0.1, currentElevation + elevationDelta * (Math.PI / 180))
    );
    
    const newPosition: Vector3D = {
      x: this._target.x + distance * Math.sin(newAzimuth) * Math.cos(newElevation),
      y: this._target.y + distance * Math.sin(newElevation),
      z: this._target.z + distance * Math.cos(newAzimuth) * Math.cos(newElevation)
    };
    
    return new CameraSettings({
      position: newPosition,
      target: this._target,
      zoom: this._zoom
    });
  }

  /**
   * ズームを相対的に変更した新しいCameraSettingsを返す
   */
  adjustZoom(factor: number): CameraSettings {
    return new CameraSettings({
      position: this._position,
      target: this._target,
      zoom: this._zoom * factor
    });
  }

  /**
   * フォーカスポイントにカメラを向けた新しいCameraSettingsを返す
   */
  lookAt(target: Vector3D): CameraSettings {
    return new CameraSettings({
      position: this._position,
      target,
      zoom: this._zoom
    });
  }

  /**
   * 設定をリセットしてデフォルト値にした新しいCameraSettingsを返す
   */
  reset(): CameraSettings {
    return CameraSettings.createDefault();
  }

  /**
   * 等価性の比較
   */
  equals(other: CameraSettings): boolean {
    return (
      this.vectorEquals(this._position, other._position) &&
      this.vectorEquals(this._target, other._target) &&
      Math.abs(this._zoom - other._zoom) < 0.001
    );
  }

  /**
   * 既存システムとの互換性のためのプレーンオブジェクト変換
   */
  toPlainObject(): {
    position: Vector3D;
    target: Vector3D;
    zoom: number;
  } {
    return {
      position: { ...this._position },
      target: { ...this._target },
      zoom: this._zoom
    };
  }

  /**
   * プレーンオブジェクトからCameraSettingsを生成
   */
  static fromPlainObject(obj: {
    position: Vector3D;
    target: Vector3D;
    zoom: number;
  }): CameraSettings {
    return new CameraSettings(obj);
  }

  /**
   * デフォルトのCameraSettingsを作成
   */
  static createDefault(): CameraSettings {
    return new CameraSettings({
      position: { ...CameraSettings.DEFAULT_POSITION },
      target: { ...CameraSettings.DEFAULT_TARGET },
      zoom: CameraSettings.DEFAULT_ZOOM
    });
  }

  /**
   * 指定した距離でターゲットを見下ろすカメラ設定を作成
   */
  static createLookDown(target: Vector3D, distance: number, height: number): CameraSettings {
    return new CameraSettings({
      position: {
        x: target.x,
        y: target.y + height,
        z: target.z + distance
      },
      target,
      zoom: 1.0
    });
  }

  /**
   * 円周上の位置からターゲットを見るカメラ設定を作成
   */
  static createOrbital(
    target: Vector3D,
    distance: number,
    azimuth: number,
    elevation: number
  ): CameraSettings {
    const azimuthRad = azimuth * (Math.PI / 180);
    const elevationRad = elevation * (Math.PI / 180);
    
    const position: Vector3D = {
      x: target.x + distance * Math.sin(azimuthRad) * Math.cos(elevationRad),
      y: target.y + distance * Math.sin(elevationRad),
      z: target.z + distance * Math.cos(azimuthRad) * Math.cos(elevationRad)
    };
    
    return new CameraSettings({
      position,
      target,
      zoom: 1.0
    });
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return `CameraSettings(pos=(${this._position.x.toFixed(2)}, ${this._position.y.toFixed(2)}, ${this._position.z.toFixed(2)}), target=(${this._target.x.toFixed(2)}, ${this._target.y.toFixed(2)}, ${this._target.z.toFixed(2)}), zoom=${this._zoom.toFixed(2)})`;
  }

  /**
   * Vector3Dの検証
   */
  private validateVector3D(vector: Vector3D, name: string): void {
    if (!vector || typeof vector !== 'object') {
      throw new Error(`${name}は有効なVector3Dである必要があります`);
    }

    const values = [vector.x, vector.y, vector.z];
    const names = ['x', 'y', 'z'];
    
    values.forEach((value, index) => {
      if (typeof value !== 'number' || !isFinite(value)) {
        throw new Error(`${name}.${names[index]}は有効な数値である必要があります: ${value}`);
      }
    });

    // 極端に大きな値のチェック
    const MAX_COORDINATE = 1000;
    values.forEach((value, index) => {
      if (Math.abs(value) > MAX_COORDINATE) {
        throw new Error(`${name}.${names[index]}の値が大きすぎます: ${value}. 絶対値は${MAX_COORDINATE}以下である必要があります`);
      }
    });
  }

  /**
   * ズーム値の検証
   */
  private validateZoom(zoom: number): void {
    if (typeof zoom !== 'number' || !isFinite(zoom)) {
      throw new Error(`ズーム値は有効な数値である必要があります: ${zoom}`);
    }

    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 10.0;
    
    if (zoom < MIN_ZOOM || zoom > MAX_ZOOM) {
      throw new Error(`ズーム値は${MIN_ZOOM}以上${MAX_ZOOM}以下である必要があります: ${zoom}`);
    }
  }

  /**
   * Vector3Dの等価性比較
   */
  private vectorEquals(v1: Vector3D, v2: Vector3D): boolean {
    const epsilon = 0.001;
    return (
      Math.abs(v1.x - v2.x) < epsilon &&
      Math.abs(v1.y - v2.y) < epsilon &&
      Math.abs(v1.z - v2.z) < epsilon
    );
  }
}