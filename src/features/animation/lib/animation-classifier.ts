/**
 * Animation Classifier - FSD Phase 2
 * アニメーション分類システムの実装（TDD: GREEN Phase）
 */

import type {
  AnimationCategory,
  AnimationPriority,
  AnimationClassificationConfig,
  AnimationClassificationRule,
  AnimationClassificationResult,
  AnimationStats
} from '../types';

export class AnimationClassifier {
  private config: AnimationClassificationConfig;
  private stats: Record<AnimationCategory, number> = {
    idle: 0,
    gesture: 0,
    emotion: 0,
    interaction: 0,
    transition: 0,
    custom: 0,
    unknown: 0
  };
  private totalClassified = 0;

  constructor(config?: AnimationClassificationConfig) {
    this.config = config || this.getDefaultConfig();
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultConfig(): AnimationClassificationConfig {
    return {
      rules: [
        // 空文字・デフォルト名のアイドルアニメーション
        {
          pattern: /^(take 001|mixamo\.com|clip|)$/i,
          category: 'idle',
          priority: 'background',
          isLooping: true,
          canBeInterrupted: false
        },
        // アイドルアニメーション検出ルール
        {
          pattern: /idle/i,
          category: 'idle',
          priority: 'background',
          isLooping: true,
          canBeInterrupted: false
        },
        // 感情表現アニメーション
        {
          pattern: /^(happy|sad|angry|surprised|fear|joy)/i,
          category: 'emotion',
          priority: 'high',
          isLooping: false,
          canBeInterrupted: true
        },
        // ジェスチャーアニメーション
        {
          pattern: /^(wave|point|nod|shake|bow)/i,
          category: 'gesture',
          priority: 'normal',
          isLooping: false,
          canBeInterrupted: true
        }
      ],
      defaultCategory: 'unknown',
      defaultPriority: 'normal',
      idleDetectionPatterns: [
        /^idle/i,
        /idle/i,
        /^(take 001|mixamo\.com|clip|)$/i
      ]
    };
  }

  /**
   * アニメーション名を分類
   */
  classify(animationName: string | null | undefined): AnimationClassificationResult {
    // null/undefined/空文字のハンドリング
    const name = animationName || '';
    
    // 統計更新
    this.totalClassified++;

    // ルールベースで分類
    for (const rule of this.config.rules) {
      if (this.matchesPattern(name, rule.pattern)) {
        const result: AnimationClassificationResult = {
          category: rule.category,
          priority: rule.priority,
          isLooping: rule.isLooping ?? false,
          canBeInterrupted: rule.canBeInterrupted ?? true,
          confidence: this.calculateConfidence(name, rule.pattern),
          appliedRule: rule
        };

        // 統計更新
        this.stats[result.category]++;
        
        return result;
      }
    }

    // デフォルト分類
    const result: AnimationClassificationResult = {
      category: this.config.defaultCategory,
      priority: this.config.defaultPriority,
      isLooping: false,
      canBeInterrupted: true,
      confidence: 0.1 // 低い信頼度
    };

    // 統計更新
    this.stats[result.category]++;

    return result;
  }

  /**
   * アイドルアニメーションかどうかを判定
   */
  isIdleAnimation(animationName: string | null | undefined): boolean {
    const name = animationName || '';
    
    return this.config.idleDetectionPatterns.some(pattern => 
      this.matchesPattern(name, pattern)
    );
  }

  /**
   * バッチ分類
   */
  classifyBatch(animationNames: string[]): AnimationClassificationResult[] {
    return animationNames.map(name => this.classify(name));
  }

  /**
   * 統計情報を取得
   */
  getStats(): AnimationStats {
    const byPriority: Record<AnimationPriority, number> = {
      background: 0,
      normal: 0,
      high: 0,
      critical: 0
    };

    // 優先度別統計は簡易実装（実際の分類結果を保存する必要がある）
    // ここでは概算値を返す
    byPriority.background = this.stats.idle;
    byPriority.normal = this.stats.gesture + this.stats.interaction;
    byPriority.high = this.stats.emotion;
    byPriority.critical = this.stats.custom;

    return {
      totalAnimations: this.totalClassified,
      byCategory: { ...this.stats },
      byPriority,
      averageDuration: 0, // 実装時に追加
      mostUsedAnimation: null, // 実装時に追加
      lastPlayedAnimation: null // 実装時に追加
    };
  }

  /**
   * ルールを追加
   */
  addRule(rule: AnimationClassificationRule): void {
    this.config.rules.unshift(rule); // 先頭に追加（高優先度）
  }

  /**
   * ルールを削除
   */
  removeRule(index: number): void {
    if (index >= 0 && index < this.config.rules.length) {
      this.config.rules.splice(index, 1);
    }
  }

  /**
   * ルール数を取得
   */
  getRuleCount(): number {
    return this.config.rules.length;
  }

  /**
   * ルールをリセット
   */
  resetRules(): void {
    this.config.rules = [];
  }

  /**
   * パターンマッチング
   */
  private matchesPattern(text: string, pattern: RegExp | string): boolean {
    try {
      if (pattern instanceof RegExp) {
        return pattern.test(text);
      } else {
        return text.toLowerCase().includes(pattern.toLowerCase());
      }
    } catch (error) {
      // 不正な正規表現の場合はfalseを返す
      console.warn('[AnimationClassifier] Pattern matching error:', error);
      return false;
    }
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(text: string, pattern: RegExp | string): number {
    try {
      if (!text) return 0.95; // 空文字は意図的なマッチなので高信頼度

      if (pattern instanceof RegExp) {
        const match = text.match(pattern);
        if (!match) return 0.1;
        
        // 特別なケース：完全に含まれるパターン
        if (pattern.toString().includes(text.toLowerCase()) || 
            text.toLowerCase().includes('idle')) {
          return 0.95;
        }
        
        // マッチした部分の長さに基づいて信頼度を計算
        const matchLength = match[0].length;
        const textLength = text.length;
        
        if (matchLength === textLength) {
          return 0.95; // 完全一致
        } else if (matchLength / textLength > 0.5) {
          return 0.85; // 部分一致（高）
        } else {
          return 0.75; // 部分一致（低）
        }
      } else {
        // 文字列パターンの場合
        const lowerText = text.toLowerCase();
        const lowerPattern = pattern.toLowerCase();
        
        if (lowerText === lowerPattern) {
          return 0.95; // 完全一致
        } else if (lowerText.includes(lowerPattern)) {
          return 0.8; // 部分一致
        } else {
          return 0.1; // マッチしない
        }
      }
    } catch (error) {
      console.warn('[AnimationClassifier] Confidence calculation error:', error);
      return 0.1;
    }
  }
}