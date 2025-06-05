/**
 * VRM Expression Composer Types - FSD Entities Layer
 * 表情合成システムの型定義
 */

/**
 * BlendShape分類カテゴリ
 */
export enum BlendShapeCategory {
  EMOTIONAL = 'emotional',    // happy, sad, angry, surprised
  MOUTH = 'mouth',           // aa, ih, ou, ee, oh, neutral
  EYE = 'eye',              // blink, blinkLeft, blinkRight
  GAZE = 'gaze',            // lookUp, lookDown, lookLeft, lookRight
  CUSTOM = 'custom'         // その他のカスタム表情
}

/**
 * BlendShape分類情報
 */
export interface BlendShapeClassification {
  category: BlendShapeCategory;
  canCombine: BlendShapeCategory[];  // 組み合わせ可能なカテゴリ
  priority: number;                  // 同カテゴリ内の優先度
}

/**
 * 表情合成状態
 */
export interface ExpressionComposition {
  emotional: Map<string, number>;
  mouth: Map<string, number>;
  eye: Map<string, number>;
  gaze: Map<string, number>;
  custom: Map<string, number>;
  lastComposed: number;
}

/**
 * 合成戦略インターフェース
 */
export interface CompositionStrategy {
  name: string;
  combine(
    emotional: Map<string, number>,
    mouth: Map<string, number>,
    eye: Map<string, number>,
    gaze: Map<string, number>
  ): Map<string, number>;
}

/**
 * 合成された表情の結果
 */
export interface ComposedExpression {
  blendShapes: Map<string, number>;
  categories: BlendShapeCategory[];
  timestamp: number;
}

/**
 * VRM表情合成エンジンインターフェース
 */
export interface IExpressionComposer {
  // BlendShapeカテゴリ別設定
  setEmotional(name: string, intensity: number): void;
  setMouth(shape: string, intensity: number): void;
  setEye(name: string, intensity: number): void;
  setGaze(direction: string, intensity: number): void;
  
  // 合成と適用
  compose(): ComposedExpression;
  applyToVRM(vrm: any): void;
  
  // 状態管理
  getComposition(): ExpressionComposition;
  clearCategory(category: BlendShapeCategory): void;
  reset(): void;
}