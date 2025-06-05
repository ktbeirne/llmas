/**
 * VRMBehaviorManager Implementation - FSD Entities Layer
 * VRM振る舞い管理の実装
 */

import type { VRM } from '@pixiv/three-vrm';

import type { 
  VRMBehaviorManager, 
  VRMBehaviorState, 
  ExpressionData
} from '../types';
import { ExpressionPriority } from '../types';
import { 
  canOverrideExpression
} from '../lib/priority-calculator';

// 依存関係の型定義（実際のimportは統合時に行う）
interface ExpressionManager {
  applyExpression(name: string, intensity: number): boolean;
  resetAllExpressions(): void;
  startAutoBlink(): void;
  stopAutoBlink(): void;
  setLipSyncManager(lipSyncManager: LipSyncManager): void;
  update(delta: number): void;
  dispose(): void;
}

interface LipSyncManager {
  enable(): void;
  disable(): void;
  startLipSync(): void;
  pauseLipSync(): void;
  stopLipSync(): void;
  setActiveExpression(name: string, intensity: number): void;
  isEnabled(): boolean;
  dispose(): void;
}

interface AnimationManager {
  initialize(vrm: VRM, animation: unknown | null): boolean;
  play(): void;
  stop(): void;
  update(delta: number): void;
  dispose(): void;
}

/**
 * VRM振る舞い管理の実装クラス
 */
export class VRMBehaviorManagerImpl implements VRMBehaviorManager {
  private vrm: VRM | null = null;
  private expressionManager: ExpressionManager | null = null;
  private lipSyncManager: LipSyncManager | null = null;
  private animationManager: AnimationManager | null = null;
  
  private state: VRMBehaviorState = {
    activeExpressions: new Map(),
    lipSyncActive: false,
    currentAnimation: null,
    lastUpdate: Date.now()
  };

  constructor(
    private createExpressionManager: (vrm: VRM) => ExpressionManager,
    private createLipSyncManager: (expressionManager: ExpressionManager) => LipSyncManager,
    private createAnimationManager: () => AnimationManager
  ) {}

  async initialize(vrm: VRM): Promise<void> {
    if (!vrm) {
      throw new Error('VRM model is required for VRMBehaviorManager initialization');
    }

    try {
      this.vrm = vrm;
      
      // ExpressionManagerを作成
      this.expressionManager = this.createExpressionManager(vrm);
      if (!this.expressionManager) {
        throw new Error('Failed to create ExpressionManager - VRM may not support expressions');
      }
      this.expressionManager.startAutoBlink();
      
      // LipSyncManagerを作成
      this.lipSyncManager = this.createLipSyncManager(this.expressionManager);
      if (!this.lipSyncManager) {
        throw new Error('Failed to create LipSyncManager - ExpressionManager may be invalid');
      }
      this.lipSyncManager.enable(); // デフォルトで有効
      
      // 相互参照を設定（循環依存解決）
      this.expressionManager.setLipSyncManager(this.lipSyncManager);
      
      // AnimationManagerを作成
      this.animationManager = this.createAnimationManager();
      if (!this.animationManager) {
        throw new Error('Failed to create AnimationManager - factory function may be invalid');
      }
      
      // 状態を更新
      this.updateState();
      
      console.log('[VRMBehaviorManager] Successfully initialized with VRM model');
    } catch (error) {
      // 部分的に初期化されたリソースをクリーンアップ
      this.dispose();
      throw new Error(`VRMBehaviorManager initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  setExpression(name: string, intensity: number, priority: ExpressionPriority): boolean {
    if (!this.expressionManager) {
      return false;
    }

    const timestamp = Date.now();

    // 優先度チェック
    if (!this.canSetExpression(name, priority, timestamp)) {
      return false;
    }

    // 表情を適用
    const success = this.expressionManager.applyExpression(name, intensity);
    if (!success) {
      return false;
    }

    // 低優先度表情を削除と状態更新
    this.removeConflictingExpressions(name, priority, timestamp);
    this.addExpressionToState(name, intensity, priority, timestamp);

    this.updateState();
    return true;
  }

  /**
   * 表情設定が可能かチェック
   */
  private canSetExpression(name: string, priority: ExpressionPriority, timestamp: number): boolean {
    // 同名表情の優先度チェック
    const existing = this.state.activeExpressions.get(name);
    if (existing && !canOverrideExpression(existing, priority, timestamp)) {
      return false;
    }

    // 他表情との競合チェック
    for (const [existingName, existingExpression] of this.state.activeExpressions) {
      if (existingName !== name && !canOverrideExpression(existingExpression, priority, timestamp)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 競合する低優先度表情を削除
   */
  private removeConflictingExpressions(name: string, priority: ExpressionPriority, timestamp: number): void {
    for (const [existingName, existingExpression] of Array.from(this.state.activeExpressions)) {
      if (existingName !== name && canOverrideExpression(existingExpression, priority, timestamp)) {
        this.state.activeExpressions.delete(existingName);
        this.expressionManager?.applyExpression(existingName, 0);
      }
    }
  }

  /**
   * 表情を状態に追加
   */
  private addExpressionToState(name: string, intensity: number, priority: ExpressionPriority, timestamp: number): void {
    const expressionData: ExpressionData = {
      name,
      intensity,
      priority,
      timestamp,
      source: this.determineSource(priority)
    };

    this.state.activeExpressions.set(name, expressionData);

    // LipSyncManagerに通知（口の形以外）
    if (!this.isMouthShape(name) && this.lipSyncManager) {
      this.lipSyncManager.setActiveExpression(name, intensity);
    }
  }

  clearExpression(name: string): void {
    if (!this.expressionManager) {
      return;
    }

    // 表情を0にリセット
    this.expressionManager.applyExpression(name, 0);
    
    // 状態から削除
    this.state.activeExpressions.delete(name);
    
    this.updateState();
  }

  startLipSync(): void {
    if (!this.lipSyncManager) {
      return;
    }

    this.lipSyncManager.startLipSync();
    this.state.lipSyncActive = true;
    this.updateState();
  }

  pauseLipSync(): void {
    if (!this.lipSyncManager) {
      return;
    }

    this.lipSyncManager.pauseLipSync();
    this.updateState();
  }

  stopLipSync(): void {
    if (!this.lipSyncManager) {
      return;
    }

    this.lipSyncManager.stopLipSync();
    this.state.lipSyncActive = false;
    this.updateState();
  }

  async playAnimation(animationUrl: string): Promise<boolean> {
    if (!this.animationManager || !this.vrm) {
      return false;
    }

    try {
      // アニメーションを初期化（実際のアニメーションデータは必要に応じて取得）
      const success = this.animationManager.initialize(this.vrm, null);
      if (!success) {
        return false;
      }

      this.animationManager.play();
      this.state.currentAnimation = animationUrl;
      this.updateState();
      return true;
    } catch (error) {
      console.error('[VRMBehaviorManager] Animation play error:', error);
      return false;
    }
  }

  stopAnimation(): void {
    if (!this.animationManager) {
      return;
    }

    this.animationManager.stop();
    this.state.currentAnimation = null;
    this.updateState();
  }

  getCurrentState(): VRMBehaviorState {
    // 状態のコピーを返す（イミュータブル）
    return {
      activeExpressions: new Map(this.state.activeExpressions),
      lipSyncActive: this.state.lipSyncActive,
      currentAnimation: this.state.currentAnimation,
      lastUpdate: this.state.lastUpdate
    };
  }

  update(delta: number): void {
    if (this.expressionManager) {
      this.expressionManager.update(delta);
    }

    if (this.animationManager) {
      this.animationManager.update(delta);
    }
  }

  dispose(): void {
    // 状態をクリア
    this.state.activeExpressions.clear();
    this.state.lipSyncActive = false;
    this.state.currentAnimation = null;

    // マネージャーを破棄
    if (this.expressionManager) {
      this.expressionManager.dispose();
      this.expressionManager = null;
    }

    if (this.lipSyncManager) {
      this.lipSyncManager.dispose();
      this.lipSyncManager = null;
    }

    if (this.animationManager) {
      this.animationManager.dispose();
      this.animationManager = null;
    }

    this.vrm = null;
    this.updateState();
  }

  /**
   * 口の形の表情かどうかを判定
   */
  private isMouthShape(expressionName: string): boolean {
    const mouthShapes = ['aa', 'ih', 'ou', 'ee', 'oh', 'neutral'];
    return mouthShapes.includes(expressionName);
  }

  /**
   * 優先度から適切なソースを決定
   */
  private determineSource(priority: ExpressionPriority): ExpressionData['source'] {
    switch (priority) {
      case ExpressionPriority.LOW:
        return 'animation';
      case ExpressionPriority.MEDIUM:
        return 'lipsync';
      case ExpressionPriority.HIGH:
        return 'user';
      case ExpressionPriority.CRITICAL:
        return 'system';
      default:
        return 'user';
    }
  }

  /**
   * 状態を更新
   */
  private updateState(): void {
    this.state.lastUpdate = Date.now();
  }
}