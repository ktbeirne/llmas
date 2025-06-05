/**
 * VRM Control Feature - Public API
 * FSD Phase 2
 * 
 * VRM制御機能のパブリックAPI
 * このファイルを通してのみ外部からアクセス可能
 */

// Types
export type {
  VRMExpressionInfo,
  VRMModelState,
  VRMSettings,
  VRMLoadEvent,
  VRMAnimationLoadEvent,
  VRMExpressionChangeEvent
} from './types';

// Errors
export {
  VRMLoadError,
  VRMAnimationError,
  VRMExpressionError,
  VRMBoneDisplayNames
} from './types';

// Store (Zustand hook)
export { useVRMStore } from './model/vrm-store';

// Classes
export { VRMLoader } from './api/vrm-loader';
export { ExpressionManager } from './lib/expression-manager';
export { AnimationManager } from './lib/animation-manager';

// Utility functions
export {
  getHeadScreenPosition,
  getBoneWorldPosition,
  getBoneWorldRotation,
  setBoneRotation,
  setHeadOrientation,
  setLookAtTarget,
  resetLookAtTarget,
  resetAllBones
} from './lib/bone-utils';

// Re-export VRM types for convenience
export type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
export type { VRMAnimation } from '@pixiv/three-vrm-animation';