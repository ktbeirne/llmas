/**
 * VRM Behavior Entity - Public API
 * FSD Entities Layer - 公開インターフェース
 */

// 型定義とインターフェース
export type {
  ExpressionData,
  VRMBehaviorState,
  VRMBehaviorManager
} from './types';

export { ExpressionPriority } from './types';

// 優先度計算ロジック
export {
  PriorityCalculator,
  canOverrideExpression,
  resolveExpressionConflict,
  calculateExpressionPriority
} from './lib/priority-calculator';

// VRM振る舞い管理実装
export { VRMBehaviorManagerImpl } from './model/vrm-behavior-manager';