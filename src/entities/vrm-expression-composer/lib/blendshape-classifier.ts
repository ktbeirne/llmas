/**
 * BlendShape Classifier - FSD Entities Layer
 * BlendShape分類器
 */

import { BlendShapeCategory, BlendShapeClassification } from '../types';

// 表情名の分類定義
const EMOTIONAL_EXPRESSIONS = ['happy', 'sad', 'angry', 'surprised', 'relaxed'];
const MOUTH_EXPRESSIONS = ['aa', 'ih', 'ou', 'ee', 'oh', 'neutral'];
const EYE_EXPRESSIONS = ['blink', 'blinkleft', 'blinkright', 'wink'];
const GAZE_EXPRESSIONS = ['lookup', 'lookdown', 'lookleft', 'lookright'];

/**
 * 表情名からBlendShapeを分類
 */
export function classifyByName(expressionName: string): BlendShapeClassification {
  const normalizedName = expressionName.toLowerCase();
  
  if (EMOTIONAL_EXPRESSIONS.includes(normalizedName)) {
    return getDefaultClassification(BlendShapeCategory.EMOTIONAL);
  }
  
  if (MOUTH_EXPRESSIONS.includes(normalizedName)) {
    return getDefaultClassification(BlendShapeCategory.MOUTH);
  }
  
  if (EYE_EXPRESSIONS.includes(normalizedName)) {
    return getDefaultClassification(BlendShapeCategory.EYE);
  }
  
  if (GAZE_EXPRESSIONS.includes(normalizedName)) {
    return getDefaultClassification(BlendShapeCategory.GAZE);
  }
  
  return getDefaultClassification(BlendShapeCategory.CUSTOM);
}

/**
 * カテゴリのデフォルト分類情報を取得
 */
export function getDefaultClassification(category: BlendShapeCategory): BlendShapeClassification {
  switch (category) {
    case BlendShapeCategory.EMOTIONAL:
      return {
        category: BlendShapeCategory.EMOTIONAL,
        canCombine: [BlendShapeCategory.MOUTH, BlendShapeCategory.EYE, BlendShapeCategory.GAZE],
        priority: 2
      };
    case BlendShapeCategory.MOUTH:
      return {
        category: BlendShapeCategory.MOUTH,
        canCombine: [BlendShapeCategory.EMOTIONAL, BlendShapeCategory.EYE, BlendShapeCategory.GAZE],
        priority: 2
      };
    case BlendShapeCategory.EYE:
      return {
        category: BlendShapeCategory.EYE,
        canCombine: [BlendShapeCategory.EMOTIONAL, BlendShapeCategory.MOUTH, BlendShapeCategory.GAZE],
        priority: 1
      };
    case BlendShapeCategory.GAZE:
      return {
        category: BlendShapeCategory.GAZE,
        canCombine: [BlendShapeCategory.EMOTIONAL, BlendShapeCategory.MOUTH, BlendShapeCategory.EYE],
        priority: 1
      };
    case BlendShapeCategory.CUSTOM:
      return {
        category: BlendShapeCategory.CUSTOM,
        canCombine: [BlendShapeCategory.EMOTIONAL, BlendShapeCategory.MOUTH, BlendShapeCategory.EYE, BlendShapeCategory.GAZE],
        priority: 3
      };
    default:
      return {
        category: BlendShapeCategory.CUSTOM,
        canCombine: [],
        priority: 1
      };
  }
}

/**
 * カテゴリ間の組み合わせ可能性をチェック
 */
export function canCategoriesCombine(category1: BlendShapeCategory, category2: BlendShapeCategory): boolean {
  // 同じカテゴリは組み合わせ不可
  if (category1 === category2) {
    return false;
  }
  
  const classification1 = getDefaultClassification(category1);
  return classification1.canCombine.includes(category2);
}

/**
 * BlendShape分類器クラス
 */
export class BlendShapeClassifier {
  private customClassifications = new Map<string, BlendShapeClassification>();

  /**
   * 表情を分類
   */
  classify(expressionName: string): BlendShapeClassification {
    // カスタム分類が登録されている場合はそれを使用
    const customClassification = this.customClassifications.get(expressionName);
    if (customClassification) {
      return customClassification;
    }
    
    // デフォルト分類を使用
    return classifyByName(expressionName);
  }

  /**
   * カスタム分類を登録
   */
  registerCustom(expressionName: string, classification: BlendShapeClassification): void {
    this.customClassifications.set(expressionName, classification);
  }

  /**
   * カテゴリ別の表情リストを取得
   */
  getExpressionsByCategory(category: BlendShapeCategory): string[] {
    switch (category) {
      case BlendShapeCategory.EMOTIONAL:
        return [...EMOTIONAL_EXPRESSIONS];
      case BlendShapeCategory.MOUTH:
        return [...MOUTH_EXPRESSIONS];
      case BlendShapeCategory.EYE:
        return [...EYE_EXPRESSIONS];
      case BlendShapeCategory.GAZE:
        return [...GAZE_EXPRESSIONS];
      case BlendShapeCategory.CUSTOM:
        return Array.from(this.customClassifications.keys()).filter(name => 
          this.customClassifications.get(name)?.category === BlendShapeCategory.CUSTOM
        );
      default:
        return [];
    }
  }

  /**
   * カテゴリ間の組み合わせ可能性をチェック
   */
  canCombine(category1: BlendShapeCategory, category2: BlendShapeCategory): boolean {
    return canCategoriesCombine(category1, category2);
  }
}