/**
 * LipSyncManager - FSD Phase
 * リップシンク（口パク）管理機能
 * タイプライターエフェクトと同期してVRMモデルの口を動かす
 */

import { ExpressionManager } from './expression-manager';

export class LipSyncManager {
  private expressionManager: ExpressionManager;
  private enabled = false;
  private lipSyncTimer: number | null = null;
  private currentMouthIndex = 0;
  
  // 口の形の順序（リップシンク専用）
  private readonly mouthShapes = ['aa', 'ih', 'ou', 'ee', 'oh'];
  private readonly mouthInterval = 150; // ms
  
  // 現在アクティブな非口形表情を追跡
  private currentActiveExpression: string | null = null;
  private currentActiveIntensity: number = 0;
  
  constructor(expressionManager: ExpressionManager) {
    this.expressionManager = expressionManager;
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
    // 口を閉じる（neutral表情）
    this.expressionManager.applyExpression('neutral', 0.3);
  }
  
  /**
   * リップシンクを停止
   */
  stopLipSync(): void {
    this.stopTimer();
    // すべての口の形をリセット
    this.mouthShapes.forEach(shape => {
      this.expressionManager.applyExpression(shape, 0);
    });
    // 口を完全に閉じる
    this.expressionManager.applyExpression('neutral', 0);
  }
  
  /**
   * 次の口の形を適用
   */
  private applyNextMouthShape(): void {
    const shape = this.mouthShapes[this.currentMouthIndex];
    
    // 口の形のみを適用（他の表情は保持）
    const success = this.expressionManager.applyExpression(shape, 0.8);
    
    // アクティブな非口形表情があれば再適用
    if (this.currentActiveExpression && !this.isMouthShape(this.currentActiveExpression)) {
      this.expressionManager.applyExpression(this.currentActiveExpression, this.currentActiveIntensity);
    }
    
    // 次のインデックスに進む（ループ）
    this.currentMouthIndex = (this.currentMouthIndex + 1) % this.mouthShapes.length;
  }
  
  /**
   * 指定された表情が口の形かどうかを判定
   */
  private isMouthShape(expressionName: string): boolean {
    return this.mouthShapes.includes(expressionName) || expressionName === 'neutral';
  }
  
  /**
   * 外部からアクティブな表情を設定（リップシンクと競合しないように）
   */
  setActiveExpression(expressionName: string | null, intensity: number = 1.0): void {
    if (!this.isMouthShape(expressionName || '')) {
      this.currentActiveExpression = expressionName;
      this.currentActiveIntensity = intensity;
    }
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
  }
}