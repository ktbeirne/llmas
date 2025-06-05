/**
 * VRM Behavior Types - FSD Entities Layer
 * 型定義とインターフェース
 */

import type { VRM } from '@pixiv/three-vrm';

/**
 * 表情の優先度レベル
 */
export enum ExpressionPriority {
  LOW = 1,        // アイドル表情、自動まばたき
  MEDIUM = 2,     // リップシンク、通常の表情変化
  HIGH = 3,       // ユーザー指定表情、設定変更
  CRITICAL = 4    // Function Call表情、システム重要表情
}

/**
 * 表情データ
 */
export interface ExpressionData {
  name: string;
  intensity: number;
  priority: ExpressionPriority;
  timestamp: number;
  source: 'user' | 'system' | 'lipsync' | 'animation';
}

/**
 * VRM振る舞い状態
 */
export interface VRMBehaviorState {
  activeExpressions: Map<string, ExpressionData>;
  lipSyncActive: boolean;
  currentAnimation: string | null;
  lastUpdate: number;
}

/**
 * VRM振る舞い管理インターフェース
 */
export interface VRMBehaviorManager {
  // 初期化
  initialize(vrm: VRM): Promise<void>;
  
  // 表情制御
  setExpression(name: string, intensity: number, priority: ExpressionPriority): boolean;
  clearExpression(name: string): void;
  
  // リップシンク制御
  startLipSync(): void;
  pauseLipSync(): void;
  stopLipSync(): void;
  
  // アニメーション制御
  playAnimation(animationUrl: string): Promise<boolean>;
  stopAnimation(): void;
  
  // 状態管理
  getCurrentState(): VRMBehaviorState;
  
  // 更新・破棄
  update(delta: number): void;
  dispose(): void;
}