/**
 * Animation Feature - Public API
 * FSD Phase 2: アニメーション機能の公開インターフェース
 */

// Types (公開する型定義)
export type {
  AnimationCategory,
  AnimationPriority,
  AnimationInfo,
  AnimationPlayState,
  AnimationPlayOptions,
  AnimationState,
  AnimationSettings,
  AnimationChangeEvent,
  AnimationClassificationResult,
  AnimationValidationError,
  AnimationStats,
  AnimationClassificationConfig,
  AnimationClassificationRule
} from './types';

// Imports (インポート)
import { AnimationClassifier } from './lib/animation-classifier';
import { animationStore } from './model/animation-store';

// Core Services (コアサービス)
export { AnimationClassifier } from './lib/animation-classifier';
export { animationStore } from './model/animation-store';

// Feature Initialization Hook
export const useAnimation = () => {
  return {
    store: animationStore,
    classifier: new AnimationClassifier()
  };
};