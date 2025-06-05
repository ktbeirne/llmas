/**
 * Expression Manager V2 - FSD Phase 3 Integration
 * VRM表情管理機能 - 表情合成システム統合版
 */

import type { VRM } from '@pixiv/three-vrm';

import { ExpressionComposer } from '../../../entities/vrm-expression-composer/model/expression-composer';
import { BlendShapeClassifier } from '../../../entities/vrm-expression-composer/lib/blendshape-classifier';
import { BlendShapeCategory } from '../../../entities/vrm-expression-composer/types';
import { VRMExpressionInfo } from '../types';

export class ExpressionManagerV2 {
  private vrm: VRM;
  private composer: ExpressionComposer;
  private classifier: BlendShapeClassifier;
  private blinkTimer = 0;
  private nextBlinkTime = 0;
  private blinkTimeoutId: number | null = null;
  private isAutoBlinking = false;
  private blinkIntervalMin = 7; // 秒（頻度を下げてより自然に）
  private blinkIntervalMax = 10; // 秒（頻度を下げてより自然に）
  
  // LipSyncManagerとの連携用
  private lipSyncManager: any = null; // 循環参照を避けるためanyを使用

  constructor(vrm: VRM) {
    this.vrm = vrm;
    this.composer = new ExpressionComposer();
    this.classifier = new BlendShapeClassifier();
    this.resetBlinkTimer();
  }
  
  /**
   * LipSyncManagerの参照を設定
   */
  setLipSyncManager(lipSyncManager: any): void {
    this.lipSyncManager = lipSyncManager;
  }

  /**
   * 表情を適用（合成システム経由）
   */
  applyExpression(expressionName: string, intensity?: number): boolean {
    if (!this.vrm.expressionManager) {
      console.error('[ExpressionManagerV2] ExpressionManagerが利用できません');
      return false;
    }

    const expression = this.vrm.expressionManager.getExpression(expressionName);
    if (!expression) {
      console.error(`[ExpressionManagerV2] 表情 '${expressionName}' が見つかりません`);
      return false;
    }

    // デフォルト強度は1.0
    const weight = intensity !== undefined ? Math.max(0, Math.min(1, intensity)) : 1.0;
    
    try {
      // 表情を分類して適切なカテゴリに設定
      const classification = this.classifier.classify(expressionName);
      
      switch (classification.category) {
        case BlendShapeCategory.EMOTIONAL:
          this.composer.setEmotional(expressionName, weight);
          break;
        case BlendShapeCategory.MOUTH:
          this.composer.setMouth(expressionName, weight);
          break;
        case BlendShapeCategory.EYE:
          this.composer.setEye(expressionName, weight);
          break;
        case BlendShapeCategory.GAZE:
          this.composer.setGaze(expressionName, weight);
          break;
        case BlendShapeCategory.CUSTOM:
        default:
          // カスタム表情は感情カテゴリとして扱う
          this.composer.setEmotional(expressionName, weight);
          break;
      }
      
      // VRMに合成結果を適用
      this.composer.applyToVRM(this.vrm);
      
      console.log(`[ExpressionManagerV2] 表情 '${expressionName}' を強度 ${weight} で適用しました（カテゴリ: ${classification.category}）`);
      return true;
    } catch (error) {
      console.error(`[ExpressionManagerV2] 表情適用エラー:`, error);
      return false;
    }
  }

  /**
   * 指定カテゴリの表情をクリア
   */
  clearCategory(category: BlendShapeCategory): void {
    try {
      this.composer.clearCategory(category);
      this.composer.applyToVRM(this.vrm);
      console.log(`[ExpressionManagerV2] カテゴリ '${category}' をクリアしました`);
    } catch (error) {
      console.error(`[ExpressionManagerV2] カテゴリクリアエラー:`, error);
    }
  }

  /**
   * すべての表情をリセット（まばたきを除く）
   */
  resetAllExpressions(): void {
    try {
      // まばたき以外のカテゴリをクリア
      this.composer.clearCategory(BlendShapeCategory.EMOTIONAL);
      this.composer.clearCategory(BlendShapeCategory.MOUTH);
      this.composer.clearCategory(BlendShapeCategory.GAZE);
      // 注意: EYEカテゴリはまばたきが含まれるため保持
      
      this.composer.applyToVRM(this.vrm);
      console.log('[ExpressionManagerV2] すべての表情をリセットしました（まばたきを除く）');
    } catch (error) {
      console.error(`[ExpressionManagerV2] 表情リセットエラー:`, error);
    }
  }

  /**
   * 特定の表情を直接削除
   */
  removeExpression(expressionName: string): void {
    try {
      const classification = this.classifier.classify(expressionName);
      
      // 該当する表情を0に設定
      switch (classification.category) {
        case BlendShapeCategory.EMOTIONAL:
          this.composer.setEmotional(expressionName, 0);
          break;
        case BlendShapeCategory.MOUTH:
          this.composer.setMouth(expressionName, 0);
          break;
        case BlendShapeCategory.EYE:
          this.composer.setEye(expressionName, 0);
          break;
        case BlendShapeCategory.GAZE:
          this.composer.setGaze(expressionName, 0);
          break;
        case BlendShapeCategory.CUSTOM:
        default:
          this.composer.setEmotional(expressionName, 0);
          break;
      }
      
      this.composer.applyToVRM(this.vrm);
      console.log(`[ExpressionManagerV2] 表情 '${expressionName}' を削除しました`);
    } catch (error) {
      console.error(`[ExpressionManagerV2] 表情削除エラー:`, error);
    }
  }

  /**
   * 利用可能な表情リストを取得
   */
  getAvailableExpressions(): VRMExpressionInfo[] {
    if (!this.vrm.expressionManager) {
      console.warn('[ExpressionManagerV2] ExpressionManagerが利用できません');
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

    console.log(`[ExpressionManagerV2] 利用可能な表情: ${expressions.length}個`);
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
      console.error(`[ExpressionManagerV2] 表情値取得エラー:`, error);
      return null;
    }
  }

  /**
   * 現在の合成状態を取得
   */
  getCompositionState() {
    return this.composer.getComposition();
  }

  /**
   * ExpressionComposerへの直接アクセス（統合用）
   */
  getComposer(): ExpressionComposer {
    return this.composer;
  }

  /**
   * 自動まばたきを開始
   */
  startAutoBlink(): void {
    this.isAutoBlinking = true;
    this.resetBlinkTimer();
    console.log('[ExpressionManagerV2] 自動まばたきを開始しました');
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
    console.log('[ExpressionManagerV2] 自動まばたきを停止しました');
  }

  /**
   * まばたき間隔を設定
   */
  setBlinkInterval(minSeconds: number, maxSeconds: number): void {
    this.blinkIntervalMin = Math.max(0.5, minSeconds);
    this.blinkIntervalMax = Math.max(this.blinkIntervalMin, maxSeconds);
    console.log(`[ExpressionManagerV2] まばたき間隔を ${this.blinkIntervalMin}〜${this.blinkIntervalMax}秒に設定`);
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
      // まばたきを実行（合成システム経由）
      this.composer.setEye('blink', 0.9); // 強度を0.9に制限（自然なまばたき）
      this.composer.applyToVRM(this.vrm);
      
      // 既存のタイマーをクリア
      if (this.blinkTimeoutId !== null) {
        clearTimeout(this.blinkTimeoutId);
      }
      
      // 150ms後に目を開く（より自然な持続時間）
      this.blinkTimeoutId = window.setTimeout(() => {
        // 明示的に0の強度でblinkを削除してからVRMに適用
        this.composer.setEye('blink', 0.0);
        this.vrm.expressionManager?.setValue('blink', 0.0); // 直接VRMにも0を設定
        this.blinkTimeoutId = null;
      }, 150);
      
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
    this.composer.reset();
  }
}