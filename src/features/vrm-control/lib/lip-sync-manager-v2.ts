/**
 * LipSyncManager V2 - FSD Phase 3 Integration
 * リップシンク（口パク）管理機能 - 表情合成システム統合版
 * タイプライターエフェクトと同期してVRMモデルの口を動かす
 */

import type { VRM } from '@pixiv/three-vrm';

import { ExpressionComposer } from '../../../entities/vrm-expression-composer/model/expression-composer';
import { BlendShapeCategory } from '../../../entities/vrm-expression-composer/types';

export class LipSyncManagerV2 {
  private vrm: VRM;
  private composer: ExpressionComposer;
  private enabled = false;
  private lipSyncTimer: number | null = null;
  private currentMouthIndex = 0;
  private applyCallCount = 0; // デバッグ用カウンター
  
  // 口の形の順序（リップシンク専用）
  private readonly mouthShapes = ['aa', 'ih', 'ou', 'ee', 'oh'];
  private readonly mouthInterval = 150; // ms
  
  constructor(vrm: VRM, composer: ExpressionComposer) {
    this.vrm = vrm;
    this.composer = composer;
  }
  
  /**
   * リップシンクの有効化
   */
  enable(): void {
    this.enabled = true;
  }
  
  /**
   * リップシンクの無効化
   */
  disable(): void {
    console.log('[LipSyncManagerV2] Disabling LipSync');
    this.enabled = false;
    this.stopLipSync();
  }
  
  /**
   * リップシンクが有効かどうか
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * リップシンクを開始
   */
  startLipSync(): void {
    if (!this.enabled) {
      return;
    }
    
    // 既存のタイマーをクリア
    this.stopTimer();
    
    // 最初の口の形を適用
    this.applyNextMouthShape();
    
    // 定期的に口の形を変更
    this.lipSyncTimer = window.setInterval(() => {
      this.applyNextMouthShape();
    }, this.mouthInterval);
  }
  
  /**
   * リップシンクを一時停止（句読点）
   */
  pauseLipSync(): void {
    this.stopTimer();
    
    // VRM側のすべてのリップシンク用BlendShapeを明示的にリセット
    if (this.vrm.expressionManager) {
      for (const mouthShape of this.mouthShapes) {
        this.vrm.expressionManager.setValue(mouthShape, 0);
      }
    }
    
    // 前の口の形をクリアしてから口を閉じる（neutral表情）
    this.composer.clearCategory(BlendShapeCategory.MOUTH);
    this.composer.setMouth('neutral', 0.3);
    this.composer.applyToVRM(this.vrm);
  }
  
  /**
   * リップシンクを停止
   */
  stopLipSync(): void {
    this.stopTimer();
    
    // VRM側のすべてのリップシンク用BlendShapeを明示的にリセット
    if (this.vrm.expressionManager) {
      for (const mouthShape of this.mouthShapes) {
        this.vrm.expressionManager.setValue(mouthShape, 0);
      }
    }
    
    // 口カテゴリをクリア（他のカテゴリは保持）
    this.composer.clearCategory(BlendShapeCategory.MOUTH);
    this.composer.applyToVRM(this.vrm);
    
  }
  
  /**
   * 次の口の形を適用
   */
  private applyNextMouthShape(): void {
    const shape = this.mouthShapes[this.currentMouthIndex];
    const callCount = this.applyCallCount || 0;
    this.applyCallCount = callCount + 1;
    
    
    try {
      // 重要：VRM側のすべてのリップシンク用BlendShapeを明示的にリセット
      if (this.vrm.expressionManager) {
        for (const mouthShape of this.mouthShapes) {
          this.vrm.expressionManager.setValue(mouthShape, 0);
        }
        }
      
      // 新しい口の形を適用
      if (this.vrm.expressionManager) {
        this.vrm.expressionManager.setValue(shape, 0.8);
      }
      
      // Composer側も更新（使用されていないかもしれないが一応）
      this.composer.clearCategory(BlendShapeCategory.MOUTH);
      this.composer.setMouth(shape, 0.8);
      
      // 次のインデックスに進む（ループ）
      this.currentMouthIndex = (this.currentMouthIndex + 1) % this.mouthShapes.length;
    } catch (error) {
      console.error('[LipSyncManagerV2] Error applying mouth shape:', error);
    }
  }
  
  /**
   * 現在の合成状態を取得
   */
  getCompositionState() {
    return this.composer.getComposition();
  }

  /**
   * タイマーを停止
   */
  private stopTimer(): void {
    if (this.lipSyncTimer !== null) {
      clearInterval(this.lipSyncTimer);
      this.lipSyncTimer = null;
    }
    // インデックスをリセット
    this.currentMouthIndex = 0;
  }
  
  /**
   * IPC経由でリップシンク開始
   */
  handleLipSyncStart(): void {
    if (!this.enabled) {
      this.enable();
    }
    this.startLipSync();
  }
  
  /**
   * IPC経由でリップシンク一時停止
   */
  handleLipSyncPause(): void {
    this.pauseLipSync();
  }
  
  /**
   * IPC経由でリップシンク停止
   */
  handleLipSyncStop(): void {
    this.stopLipSync();
  }
  
  /**
   * リソースのクリーンアップ
   */
  dispose(): void {
    this.stopTimer();
    // ExpressionComposerは外部で管理されるため、dispose不要
  }
}