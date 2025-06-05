/**
 * Expression Composer - VRM表情合成エンジン
 * FSD Entities Layer
 */

import { 
  BlendShapeCategory, 
  ExpressionComposition, 
  ComposedExpression,
  IExpressionComposer
} from '../types';

/**
 * VRM表情合成エンジン実装
 */
export class ExpressionComposer implements IExpressionComposer {
  private composition: ExpressionComposition;
  private lastComposedResult: ComposedExpression | null = null;

  constructor() {
    this.composition = {
      emotional: new Map<string, number>(),
      mouth: new Map<string, number>(),
      eye: new Map<string, number>(),
      gaze: new Map<string, number>(),
      custom: new Map<string, number>(),
      lastComposed: Date.now()
    };
  }

  /**
   * 入力値の検証
   */
  private validateInput(name: string, intensity: number): void {
    if (!name || name.trim() === '') {
      throw new Error('Expression name cannot be empty');
    }
    if (intensity < 0 || intensity > 1) {
      throw new Error('Intensity must be between 0 and 1');
    }
  }

  /**
   * 状態変更時のタイムスタンプ更新
   */
  private updateTimestamp(): void {
    this.composition.lastComposed = Date.now();
    this.lastComposedResult = null; // キャッシュをクリア
  }

  /**
   * 感情表情を設定
   */
  setEmotional(name: string, intensity: number): void {
    this.validateInput(name, intensity);
    this.composition.emotional.set(name, intensity);
    this.updateTimestamp();
  }

  /**
   * 口の表情を設定
   */
  setMouth(shape: string, intensity: number): void {
    this.validateInput(shape, intensity);
    this.composition.mouth.set(shape, intensity);
    this.updateTimestamp();
  }

  /**
   * 目の表情を設定
   */
  setEye(name: string, intensity: number): void {
    this.validateInput(name, intensity);
    this.composition.eye.set(name, intensity);
    this.updateTimestamp();
  }

  /**
   * 視線の表情を設定
   */
  setGaze(direction: string, intensity: number): void {
    this.validateInput(direction, intensity);
    this.composition.gaze.set(direction, intensity);
    this.updateTimestamp();
  }

  /**
   * 表情を合成
   */
  compose(): ComposedExpression {
    // キャッシュされた結果を返す（状態が変更されていない場合）
    if (this.lastComposedResult && 
        this.lastComposedResult.timestamp === this.composition.lastComposed) {
      return this.lastComposedResult;
    }

    const blendShapes = new Map<string, number>();
    const categories: BlendShapeCategory[] = [];

    // 感情表情を処理（リップシンク中でも維持）
    if (this.composition.emotional.size > 0) {
      this.composition.emotional.forEach((intensity, name) => {
        if (intensity > 0) {
          const filteredIntensity = this.filterEmotionalExpression(name, intensity);
          if (filteredIntensity > 0) {
            blendShapes.set(name, filteredIntensity);
          }
        }
      });
      categories.push(BlendShapeCategory.EMOTIONAL);
    }

    // 口の形を処理（リップシンク優先）
    if (this.composition.mouth.size > 0) {
      this.composition.mouth.forEach((intensity, name) => {
        if (intensity > 0) {
          blendShapes.set(name, intensity);
        }
      });
      categories.push(BlendShapeCategory.MOUTH);
    }

    // 目の表情を処理（まばたき制御考慮）
    if (this.composition.eye.size > 0) {
      this.composition.eye.forEach((intensity, name) => {
        if (intensity > 0) {
          const adjustedIntensity = this.adjustEyeExpression(name, intensity);
          if (adjustedIntensity > 0) {
            blendShapes.set(name, adjustedIntensity);
          }
        }
      });
      categories.push(BlendShapeCategory.EYE);
    }

    // 視線を処理
    if (this.composition.gaze.size > 0) {
      this.composition.gaze.forEach((intensity, name) => {
        if (intensity > 0) {
          blendShapes.set(name, intensity);
        }
      });
      categories.push(BlendShapeCategory.GAZE);
    }

    // カスタム表情を処理
    if (this.composition.custom.size > 0) {
      this.composition.custom.forEach((intensity, name) => {
        if (intensity > 0) {
          blendShapes.set(name, intensity);
        }
      });
      categories.push(BlendShapeCategory.CUSTOM);
    }

    const result: ComposedExpression = {
      blendShapes,
      categories,
      timestamp: this.composition.lastComposed
    };

    this.lastComposedResult = result;
    return result;
  }

  /**
   * 感情表情のフィルタリング
   */
  private filterEmotionalExpression(name: string, intensity: number): number {
    // 感情表情は常に90%の強度で適用（自然な表現のため）
    return intensity * 0.9;
  }

  /**
   * 目の表情の調整（まばたき制御）
   */
  private adjustEyeExpression(name: string, intensity: number): number {
    if (name.toLowerCase() === 'blink') {
      // まばたきの強度を調整（自然な範囲に制限）
      return Math.min(intensity, 0.9);
    }
    
    return intensity;
  }

  /**
   * VRMに表情を適用
   */
  applyToVRM(vrm: any): void {
    if (!vrm || !vrm.expressionManager) {
      return; // VRMまたはexpressionManagerが無効な場合は何もしない
    }

    const composedExpression = this.compose();
    
    composedExpression.blendShapes.forEach((intensity, expressionName) => {
      // VRMモデルに対応する表情が存在するかチェック
      const trackName = vrm.expressionManager.getExpressionTrackName(expressionName);
      if (trackName) {
        vrm.expressionManager.setValue(expressionName, intensity);
      }
    });
    
    // 0の値も明示的に設定が必要な場合の対応
    // 特に目の表情（blink等）をクリアするために必要
    if (this.composition.eye.has('blink') && this.composition.eye.get('blink') === 0) {
      const trackName = vrm.expressionManager.getExpressionTrackName('blink');
      if (trackName) {
        vrm.expressionManager.setValue('blink', 0.0);
      }
    }
  }

  /**
   * 現在の合成状態を取得
   */
  getComposition(): ExpressionComposition {
    return {
      emotional: new Map(this.composition.emotional),
      mouth: new Map(this.composition.mouth),
      eye: new Map(this.composition.eye),
      gaze: new Map(this.composition.gaze),
      custom: new Map(this.composition.custom),
      lastComposed: this.composition.lastComposed
    };
  }

  /**
   * 指定カテゴリをクリア
   */
  clearCategory(category: BlendShapeCategory): void {
    if (!Object.values(BlendShapeCategory).includes(category)) {
      throw new Error(`Invalid category: ${category}`);
    }

    switch (category) {
      case BlendShapeCategory.EMOTIONAL:
        this.composition.emotional.clear();
        break;
      case BlendShapeCategory.MOUTH:
        this.composition.mouth.clear();
        break;
      case BlendShapeCategory.EYE:
        this.composition.eye.clear();
        break;
      case BlendShapeCategory.GAZE:
        this.composition.gaze.clear();
        break;
      case BlendShapeCategory.CUSTOM:
        this.composition.custom.clear();
        break;
    }
    
    this.updateTimestamp();
  }

  /**
   * 全ての表情をリセット
   */
  reset(): void {
    this.composition.emotional.clear();
    this.composition.mouth.clear();
    this.composition.eye.clear();
    this.composition.gaze.clear();
    this.composition.custom.clear();
    this.updateTimestamp();
  }
}