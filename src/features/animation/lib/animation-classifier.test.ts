/**
 * Animation Classifier Tests - FSD Phase 2
 * アニメーション分類システムのテスト（TDD: RED Phase）
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnimationClassifier } from './animation-classifier';
import type {
  AnimationCategory,
  AnimationPriority,
  AnimationClassificationConfig,
  AnimationClassificationRule
} from '../types';

describe('AnimationClassifier', () => {
  let classifier: AnimationClassifier;
  let defaultConfig: AnimationClassificationConfig;

  beforeEach(() => {
    defaultConfig = {
      rules: [
        // アイドルアニメーション検出ルール
        {
          pattern: /^idle/i,
          category: 'idle',
          priority: 'background',
          isLooping: true,
          canBeInterrupted: false
        },
        {
          pattern: /idle\.vrma/i,
          category: 'idle',
          priority: 'background',
          isLooping: true,
          canBeInterrupted: false
        },
        {
          pattern: /^(take 001|mixamo\.com|clip|)$/i,
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

    classifier = new AnimationClassifier(defaultConfig);
  });

  describe('初期化', () => {
    it('デフォルト設定で初期化できる', () => {
      const classifier = new AnimationClassifier();
      
      const result = classifier.classify('unknown_animation');
      expect(result.category).toBe('unknown');
      expect(result.priority).toBe('normal');
    });

    it('カスタム設定で初期化できる', () => {
      const customConfig: AnimationClassificationConfig = {
        rules: [],
        defaultCategory: 'custom',
        defaultPriority: 'high',
        idleDetectionPatterns: []
      };
      
      const classifier = new AnimationClassifier(customConfig);
      const result = classifier.classify('test');
      
      expect(result.category).toBe('custom');
      expect(result.priority).toBe('high');
    });
  });

  describe('アイドルアニメーション検出', () => {
    it('idle.vrmaをアイドルアニメーションとして検出する', () => {
      const result = classifier.classify('idle.vrma');
      
      expect(result.category).toBe('idle');
      expect(result.priority).toBe('background');
      expect(result.isLooping).toBe(true);
      expect(result.canBeInterrupted).toBe(false);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('Idle_Animation.vrmaをアイドルアニメーションとして検出する', () => {
      const result = classifier.classify('Idle_Animation.vrma');
      
      expect(result.category).toBe('idle');
      expect(result.priority).toBe('background');
    });

    it('デフォルトアニメーション名をアイドルとして検出する', () => {
      const testCases = ['Take 001', 'mixamo.com', 'Clip', ''];
      
      testCases.forEach(name => {
        const result = classifier.classify(name);
        expect(result.category).toBe('idle');
        expect(result.priority).toBe('background');
      });
    });

    it('アイドル判定メソッドが正確に動作する', () => {
      expect(classifier.isIdleAnimation('idle.vrma')).toBe(true);
      expect(classifier.isIdleAnimation('Idle_Rest.vrma')).toBe(true);
      expect(classifier.isIdleAnimation('Take 001')).toBe(true);
      expect(classifier.isIdleAnimation('')).toBe(true);
      expect(classifier.isIdleAnimation('wave.vrma')).toBe(false);
      expect(classifier.isIdleAnimation('happy.vrma')).toBe(false);
    });
  });

  describe('感情表現アニメーション検出', () => {
    it('感情表現アニメーションを正しく分類する', () => {
      const emotionTests = [
        { name: 'happy.vrma', category: 'emotion' as AnimationCategory },
        { name: 'sad_expression.vrma', category: 'emotion' as AnimationCategory },
        { name: 'Angry_Gesture.vrma', category: 'emotion' as AnimationCategory },
        { name: 'surprised.vrma', category: 'emotion' as AnimationCategory }
      ];

      emotionTests.forEach(({ name, category }) => {
        const result = classifier.classify(name);
        expect(result.category).toBe(category);
        expect(result.priority).toBe('high');
        expect(result.canBeInterrupted).toBe(true);
      });
    });
  });

  describe('ジェスチャーアニメーション検出', () => {
    it('ジェスチャーアニメーションを正しく分類する', () => {
      const gestureTests = [
        'wave.vrma',
        'pointing_gesture.vrma',
        'nod.vrma',
        'shake_head.vrma',
        'bow.vrma'
      ];

      gestureTests.forEach(name => {
        const result = classifier.classify(name);
        expect(result.category).toBe('gesture');
        expect(result.priority).toBe('normal');
        expect(result.canBeInterrupted).toBe(true);
      });
    });
  });

  describe('優先度による分類', () => {
    it('ルールの順序に基づいて最初にマッチしたものを適用する', () => {
      // 複数のルールにマッチする場合、最初のルールが適用される
      const config: AnimationClassificationConfig = {
        rules: [
          {
            pattern: /happy/i,
            category: 'emotion',
            priority: 'high',
            isLooping: false,
            canBeInterrupted: true
          },
          {
            pattern: /happy/i,
            category: 'gesture',
            priority: 'normal',
            isLooping: true,
            canBeInterrupted: false
          }
        ],
        defaultCategory: 'unknown',
        defaultPriority: 'normal',
        idleDetectionPatterns: []
      };

      const classifier = new AnimationClassifier(config);
      const result = classifier.classify('happy.vrma');

      expect(result.category).toBe('emotion');
      expect(result.priority).toBe('high');
      expect(result.isLooping).toBe(false);
    });
  });

  describe('信頼度計算', () => {
    it('完全一致の場合は高い信頼度を返す', () => {
      const result = classifier.classify('idle.vrma');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('部分一致の場合は中程度の信頼度を返す', () => {
      const result = classifier.classify('wave_gesture_long.vrma');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.confidence).toBeLessThan(0.9);
    });

    it('デフォルト分類の場合は低い信頼度を返す', () => {
      const result = classifier.classify('completely_unknown_animation.vrma');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('バッチ分類', () => {
    it('複数のアニメーションを一度に分類できる', () => {
      const animations = [
        'idle.vrma',
        'wave.vrma',
        'happy.vrma',
        'unknown.vrma'
      ];

      const results = classifier.classifyBatch(animations);

      expect(results).toHaveLength(4);
      expect(results[0].category).toBe('idle');
      expect(results[1].category).toBe('gesture');
      expect(results[2].category).toBe('emotion');
      expect(results[3].category).toBe('unknown');
    });

    it('空の配列でも正常に動作する', () => {
      const results = classifier.classifyBatch([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('カテゴリ統計', () => {
    it('分類されたアニメーションの統計を取得できる', () => {
      const animations = [
        'idle.vrma',
        'idle2.vrma',
        'wave.vrma',
        'happy.vrma',
        'sad.vrma',
        'unknown.vrma'
      ];

      classifier.classifyBatch(animations);
      const stats = classifier.getStats();

      expect(stats.totalAnimations).toBe(6);
      expect(stats.byCategory.idle).toBe(2);
      expect(stats.byCategory.gesture).toBe(1);
      expect(stats.byCategory.emotion).toBe(2);
      expect(stats.byCategory.unknown).toBe(1);
    });
  });

  describe('設定の更新', () => {
    it('分類ルールを動的に更新できる', () => {
      const newRule: AnimationClassificationRule = {
        pattern: /test/i,
        category: 'custom',
        priority: 'critical',
        isLooping: true,
        canBeInterrupted: false
      };

      classifier.addRule(newRule);
      const result = classifier.classify('test_animation.vrma');

      expect(result.category).toBe('custom');
      expect(result.priority).toBe('critical');
    });

    it('ルールを削除できる', () => {
      const initialRuleCount = classifier.getRuleCount();
      
      classifier.removeRule(0); // 最初のルールを削除
      
      expect(classifier.getRuleCount()).toBe(initialRuleCount - 1);
    });

    it('設定をリセットできる', () => {
      classifier.addRule({
        pattern: /test/i,
        category: 'custom',
        priority: 'critical',
        isLooping: true,
        canBeInterrupted: false
      });

      classifier.resetRules();
      
      const result = classifier.classify('test.vrma');
      expect(result.category).toBe('unknown'); // デフォルトカテゴリ
    });
  });

  describe('エラーハンドリング', () => {
    it('nullまたはundefinedを安全に処理する', () => {
      expect(() => classifier.classify(null as any)).not.toThrow();
      expect(() => classifier.classify(undefined as any)).not.toThrow();
      
      // 空文字はアイドルとして分類される設定になっているため
      const result = classifier.classify(null as any);
      expect(result.category).toBe('idle');
    });

    it('不正な正規表現パターンを処理する', () => {
      const invalidConfig: AnimationClassificationConfig = {
        rules: [
          {
            pattern: '[invalid regex',
            category: 'gesture',
            priority: 'normal',
            isLooping: false,
            canBeInterrupted: true
          }
        ],
        defaultCategory: 'unknown',
        defaultPriority: 'normal',
        idleDetectionPatterns: []
      };

      expect(() => new AnimationClassifier(invalidConfig)).not.toThrow();
    });
  });
});