/**
 * Expression Manager - FSD Phase 2
 * VRM表情管理機能
 */

import type { VRM } from '@pixiv/three-vrm';
import { VRMExpressionInfo } from '../types';

export class ExpressionManager {
  private vrm: VRM;
  private blinkTimer = 0;
  private nextBlinkTime = 0;
  private blinkTimeoutId: number | null = null;
  private isAutoBlinking = false;
  private blinkIntervalMin = 2; // 秒
  private blinkIntervalMax = 7; // 秒
  
  // LipSyncManagerとの連携用
  private lipSyncManager: any = null; // 循環参照を避けるためanyを使用

  constructor(vrm: VRM) {
    this.vrm = vrm;
    this.resetBlinkTimer();
  }
  
  /**
   * LipSyncManagerの参照を設定
   */
  setLipSyncManager(lipSyncManager: any): void {
    this.lipSyncManager = lipSyncManager;
  }

  /**
   * 表情を適用
   */
  applyExpression(expressionName: string, intensity?: number): boolean {
    if (!this.vrm.expressionManager) {
      console.error('[ExpressionManager] ExpressionManagerが利用できません');
      return false;
    }

    const expression = this.vrm.expressionManager.getExpression(expressionName);
    if (!expression) {
      console.error(`[ExpressionManager] 表情 '${expressionName}' が見つかりません`);
      return false;
    }

    // デフォルト強度は1.0
    const weight = intensity !== undefined ? Math.max(0, Math.min(1, intensity)) : 1.0;
    
    // 口の形の判定
    const mouthShapes = ['aa', 'ih', 'ou', 'ee', 'oh', 'neutral'];
    const isMouthShape = mouthShapes.includes(expressionName);

    try {
      // 他の表情をリセット（blinkとlook系、および口の形以外）
      if (!expressionName.startsWith('blink') && !expressionName.startsWith('look') && !isMouthShape) {
        this.resetNonBasicExpressions();
      }

      // 指定された表情を適用
      this.vrm.expressionManager.setValue(expressionName, weight);
      
      console.log(`[ExpressionManager] 表情 '${expressionName}' を強度 ${weight} で適用しました`);
      return true;
    } catch (error) {
      console.error(`[ExpressionManager] 表情適用エラー:`, error);
      return false;
    }
  }

  /**
   * 基本的でない表情（happy, sad, angry等）をリセット
   */
  private resetNonBasicExpressions(): void {
    if (!this.vrm.expressionManager) return;
    
    const basicExpressions = ['blink', 'blinkLeft', 'blinkRight', 'lookUp', 'lookDown', 'lookLeft', 'lookRight'];
    const allExpressions = this.vrm.expressionManager.expressionMap;
    
    Object.keys(allExpressions).forEach(name => {
      if (!basicExpressions.includes(name)) {
        this.vrm.expressionManager!.setValue(name, 0.0);
      }
    });
  }

  /**
   * すべての表情をリセット（まばたきを除く）
   */
  resetAllExpressions(): void {
    if (!this.vrm.expressionManager) return;

    const allExpressions = this.vrm.expressionManager.expressionMap;
    Object.keys(allExpressions).forEach(name => {
      if (!name.startsWith('blink')) {
        this.vrm.expressionManager!.setValue(name, 0.0);
      }
    });
    
    console.log('[ExpressionManager] すべての表情をリセットしました（まばたきを除く）');
  }

  /**
   * 利用可能な表情リストを取得
   */
  getAvailableExpressions(): VRMExpressionInfo[] {
    if (!this.vrm.expressionManager) {
      console.warn('[ExpressionManager] ExpressionManagerが利用できません');
      return [];
    }

    const expressions: VRMExpressionInfo[] = [];
    
    // すべての表情（プリセット + カスタム）を取得
    const allExpressions = this.vrm.expressionManager.expressionMap;
    const customExpressions = this.vrm.expressionManager.customExpressionMap || {};
    
    Object.keys(allExpressions).forEach(name => {
      const isPreset = !Object.prototype.hasOwnProperty.call(customExpressions, name);
      expressions.push({
        name,
        displayName: this.getExpressionDisplayName(name),
        isPreset
      });
    });

    console.log(`[ExpressionManager] 利用可能な表情: ${expressions.length}個`);
    return expressions;
  }

  /**
   * 表情の表示名を取得（日本語名があれば使用）
   */
  private getExpressionDisplayName(name: string): string {
    const displayNames: { [key: string]: string } = {
      'happy': '喜び',
      'sad': '悲しみ',
      'angry': '怒り',
      'surprised': '驚き',
      'relaxed': 'リラックス',
      'neutral': 'ニュートラル',
      'blink': 'まばたき',
      'blinkLeft': '左まばたき',
      'blinkRight': '右まばたき',
      'lookUp': '上を見る',
      'lookDown': '下を見る',
      'lookLeft': '左を見る',
      'lookRight': '右を見る'
    };
    
    return displayNames[name] || name;
  }

  /**
   * 現在の表情の値を取得
   */
  getExpressionValue(expressionName: string): number | null {
    if (!this.vrm.expressionManager) {
      return null;
    }
    
    try {
      return this.vrm.expressionManager.getValue(expressionName);
    } catch (error) {
      console.error(`[ExpressionManager] 表情値取得エラー:`, error);
      return null;
    }
  }

  /**
   * 自動まばたきを開始
   */
  startAutoBlink(): void {
    this.isAutoBlinking = true;
    this.resetBlinkTimer();
    console.log('[ExpressionManager] 自動まばたきを開始しました');
  }

  /**
   * 自動まばたきを停止
   */
  stopAutoBlink(): void {
    this.isAutoBlinking = false;
    if (this.blinkTimeoutId !== null) {
      clearTimeout(this.blinkTimeoutId);
      this.blinkTimeoutId = null;
    }
    console.log('[ExpressionManager] 自動まばたきを停止しました');
  }

  /**
   * まばたき間隔を設定
   */
  setBlinkInterval(minSeconds: number, maxSeconds: number): void {
    this.blinkIntervalMin = Math.max(0.5, minSeconds);
    this.blinkIntervalMax = Math.max(this.blinkIntervalMin, maxSeconds);
    console.log(`[ExpressionManager] まばたき間隔を ${this.blinkIntervalMin}〜${this.blinkIntervalMax}秒に設定`);
  }

  /**
   * まばたきタイマーをリセット
   */
  private resetBlinkTimer(): void {
    this.blinkTimer = 0;
    // ランダムな間隔でまばたき
    const range = this.blinkIntervalMax - this.blinkIntervalMin;
    this.nextBlinkTime = this.blinkIntervalMin + Math.random() * range;
  }

  /**
   * 自動まばたきの処理
   */
  private handleAutoBlink(delta: number): void {
    if (!this.isAutoBlinking || !this.vrm.expressionManager) return;

    this.blinkTimer += delta;
    
    if (this.blinkTimer >= this.nextBlinkTime) {
      // まばたきを実行
      this.vrm.expressionManager.setValue('blink', 1.0);
      
      // 既存のタイマーをクリア
      if (this.blinkTimeoutId !== null) {
        clearTimeout(this.blinkTimeoutId);
      }
      
      // 100ms後に目を開く
      this.blinkTimeoutId = window.setTimeout(() => {
        if (this.vrm.expressionManager) {
          this.vrm.expressionManager.setValue('blink', 0.0);
        }
        this.blinkTimeoutId = null;
      }, 100);
      
      // 次のまばたきタイミングを設定
      this.resetBlinkTimer();
    }
  }

  /**
   * 毎フレーム更新
   */
  update(delta: number): void {
    this.handleAutoBlink(delta);
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    this.stopAutoBlink();
  }
}