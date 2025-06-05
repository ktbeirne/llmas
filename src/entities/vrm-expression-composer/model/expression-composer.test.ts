/**
 * ExpressionComposer Test - TDD Red Phase
 * 表情合成エンジンのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { BlendShapeCategory } from '../types';
import { ExpressionComposer } from './expression-composer';

// Mock VRM types
interface MockVRM {
  expressionManager?: {
    setValue(expressionName: string, value: number): void;
    getExpressionTrackName(expressionName: string): string | null;
  };
}

describe('ExpressionComposer', () => {
  let composer: ExpressionComposer;
  let mockVRM: MockVRM;

  beforeEach(() => {
    composer = new ExpressionComposer();
    
    // Mock VRM setup
    mockVRM = {
      expressionManager: {
        setValue: vi.fn(),
        getExpressionTrackName: vi.fn().mockReturnValue('mock-track')
      }
    };
  });

  describe('カテゴリ別設定', () => {
    it('should set emotional expression correctly', () => {
      composer.setEmotional('happy', 0.8);
      
      const composition = composer.getComposition();
      expect(composition.emotional.get('happy')).toBe(0.8);
      expect(composition.emotional.size).toBe(1);
    });

    it('should set mouth expression correctly', () => {
      composer.setMouth('aa', 0.6);
      
      const composition = composer.getComposition();
      expect(composition.mouth.get('aa')).toBe(0.6);
      expect(composition.mouth.size).toBe(1);
    });

    it('should set eye expression correctly', () => {
      composer.setEye('blink', 0.4);
      
      const composition = composer.getComposition();
      expect(composition.eye.get('blink')).toBe(0.4);
      expect(composition.eye.size).toBe(1);
    });

    it('should set gaze expression correctly', () => {
      composer.setGaze('lookUp', 0.3);
      
      const composition = composer.getComposition();
      expect(composition.gaze.get('lookUp')).toBe(0.3);
      expect(composition.gaze.size).toBe(1);
    });

    it('should handle multiple expressions in same category', () => {
      composer.setEmotional('happy', 0.8);
      composer.setEmotional('surprised', 0.3);
      
      const composition = composer.getComposition();
      expect(composition.emotional.get('happy')).toBe(0.8);
      expect(composition.emotional.get('surprised')).toBe(0.3);
      expect(composition.emotional.size).toBe(2);
    });

    it('should override expression intensity when set again', () => {
      composer.setEmotional('happy', 0.8);
      composer.setEmotional('happy', 0.5);
      
      const composition = composer.getComposition();
      expect(composition.emotional.get('happy')).toBe(0.5);
      expect(composition.emotional.size).toBe(1);
    });

    it('should validate intensity range (0-1)', () => {
      expect(() => composer.setEmotional('happy', -0.1)).toThrow();
      expect(() => composer.setEmotional('happy', 1.1)).toThrow();
      expect(() => composer.setMouth('aa', 2.0)).toThrow();
    });

    it('should validate expression names are not empty', () => {
      expect(() => composer.setEmotional('', 0.5)).toThrow();
      expect(() => composer.setMouth('', 0.5)).toThrow();
      expect(() => composer.setEye('', 0.5)).toThrow();
      expect(() => composer.setGaze('', 0.5)).toThrow();
    });
  });

  describe('状態管理', () => {
    beforeEach(() => {
      // Setup initial state
      composer.setEmotional('happy', 0.8);
      composer.setMouth('aa', 0.6);
      composer.setEye('blink', 0.4);
      composer.setGaze('lookUp', 0.3);
    });

    it('should get current composition state', () => {
      const composition = composer.getComposition();
      
      expect(composition.emotional.get('happy')).toBe(0.8);
      expect(composition.mouth.get('aa')).toBe(0.6);
      expect(composition.eye.get('blink')).toBe(0.4);
      expect(composition.gaze.get('lookUp')).toBe(0.3);
      expect(typeof composition.lastComposed).toBe('number');
    });

    it('should clear specific category', () => {
      composer.clearCategory(BlendShapeCategory.EMOTIONAL);
      
      const composition = composer.getComposition();
      expect(composition.emotional.size).toBe(0);
      expect(composition.mouth.size).toBe(1); // Other categories unchanged
      expect(composition.eye.size).toBe(1);
      expect(composition.gaze.size).toBe(1);
    });

    it('should clear all categories on reset', () => {
      composer.reset();
      
      const composition = composer.getComposition();
      expect(composition.emotional.size).toBe(0);
      expect(composition.mouth.size).toBe(0);
      expect(composition.eye.size).toBe(0);
      expect(composition.gaze.size).toBe(0);
      expect(composition.custom.size).toBe(0);
    });

    it('should update lastComposed timestamp when state changes', () => {
      const initialComposition = composer.getComposition();
      const initialTimestamp = initialComposition.lastComposed;
      
      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        composer.setEmotional('sad', 0.7);
        const updatedComposition = composer.getComposition();
        expect(updatedComposition.lastComposed).toBeGreaterThan(initialTimestamp);
      }, 10);
    });
  });

  describe('合成機能', () => {
    beforeEach(() => {
      composer.setEmotional('happy', 0.8);
      composer.setMouth('aa', 0.6);
      composer.setEye('blink', 0.4);
      composer.setGaze('lookUp', 0.3);
    });

    it('should compose all active expressions', () => {
      const composedExpression = composer.compose();
      
      // リップシンク中でも感情表情（happy）は維持される（強度調整済み）
      expect(composedExpression.blendShapes.get('happy')).toBeCloseTo(0.72, 10); // 0.8 * 0.9
      expect(composedExpression.blendShapes.get('aa')).toBe(0.6);
      expect(composedExpression.blendShapes.get('blink')).toBe(0.4);
      expect(composedExpression.blendShapes.get('lookUp')).toBe(0.3);
      expect(composedExpression.blendShapes.size).toBe(4);
    });

    it('should include metadata in composed expression', () => {
      const composedExpression = composer.compose();
      
      expect(typeof composedExpression.timestamp).toBe('number');
      expect(composedExpression.categories).toContain(BlendShapeCategory.EMOTIONAL);
      expect(composedExpression.categories).toContain(BlendShapeCategory.MOUTH);
      expect(composedExpression.categories).toContain(BlendShapeCategory.EYE);
      expect(composedExpression.categories).toContain(BlendShapeCategory.GAZE);
      expect(composedExpression.categories.length).toBe(4);
    });

    it('should return empty composition when no expressions set', () => {
      composer.reset();
      const composedExpression = composer.compose();
      
      expect(composedExpression.blendShapes.size).toBe(0);
      expect(composedExpression.categories.length).toBe(0);
    });

    it('should filter out zero intensity expressions', () => {
      composer.setEmotional('sad', 0.0);
      const composedExpression = composer.compose();
      
      expect(composedExpression.blendShapes.has('sad')).toBe(false);
      expect(composedExpression.blendShapes.get('happy')).toBeCloseTo(0.72, 10); // リップシンク中でも感情表情は維持
    });

    it('should handle edge case intensities correctly', () => {
      composer.setEmotional('very-low', 0.001);
      composer.setEmotional('very-high', 0.999);
      
      const composedExpression = composer.compose();
      expect(composedExpression.blendShapes.get('very-low')).toBe(0.001);
      expect(composedExpression.blendShapes.get('very-high')).toBe(0.999);
    });

    it('should apply normal emotional expression intensity when no lip sync active', () => {
      // 口の形をクリアしてリップシンクを無効化
      composer.clearCategory(BlendShapeCategory.MOUTH);
      composer.setEmotional('happy', 0.8);
      
      const composedExpression = composer.compose();
      expect(composedExpression.blendShapes.get('happy')).toBeCloseTo(0.72, 10); // 0.8 * 0.9 (リップシンク無し時は90%)
    });

    it('should maintain emotional expressions during lip sync', () => {
      // consoleMockを設定
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // リップシンク中の感情表情設定
      composer.setEmotional('happy', 0.8);
      composer.setMouth('aa', 0.6);
      
      const composedExpression = composer.compose();
      
      // 感情表情は維持される
      expect(composedExpression.blendShapes.get('happy')).toBeCloseTo(0.72, 10);
      
      // ログで確認
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("リップシンク中ですが感情表情 'happy' を維持")
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('VRM適用', () => {
    beforeEach(() => {
      composer.setEmotional('happy', 0.8);
      composer.setMouth('aa', 0.6);
    });

    it('should apply composed expressions to VRM', () => {
      composer.applyToVRM(mockVRM as any);
      
      // リップシンク中でも感情表情（happy）が維持される
      expect(mockVRM.expressionManager?.setValue).toHaveBeenCalledWith('happy', expect.closeTo(0.72, 10));
      expect(mockVRM.expressionManager?.setValue).toHaveBeenCalledWith('aa', 0.6);
      expect(mockVRM.expressionManager?.setValue).toHaveBeenCalledTimes(2);
    });

    it('should handle VRM without expressionManager gracefully', () => {
      const vrmWithoutExpressionManager = {};
      
      expect(() => {
        composer.applyToVRM(vrmWithoutExpressionManager as any);
      }).not.toThrow();
    });

    it('should handle VRM with null expressionManager', () => {
      const vrmWithNullManager = { expressionManager: null };
      
      expect(() => {
        composer.applyToVRM(vrmWithNullManager as any);
      }).not.toThrow();
    });

    it('should skip expressions that do not exist in VRM model', () => {
      // Mock VRM that doesn't support 'happy' expression
      const selectiveVRM = {
        expressionManager: {
          setValue: vi.fn(),
          getExpressionTrackName: vi.fn().mockImplementation((name: string) => {
            return name === 'aa' ? 'aa-track' : null;
          })
        }
      };

      composer.applyToVRM(selectiveVRM as any);
      
      expect(selectiveVRM.expressionManager.setValue).toHaveBeenCalledWith('aa', 0.6);
      expect(selectiveVRM.expressionManager.setValue).not.toHaveBeenCalledWith('happy', 0.8);
      expect(selectiveVRM.expressionManager.setValue).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle null/undefined VRM gracefully', () => {
      expect(() => composer.applyToVRM(null as any)).not.toThrow();
      expect(() => composer.applyToVRM(undefined as any)).not.toThrow();
    });

    it('should handle invalid category in clearCategory', () => {
      expect(() => composer.clearCategory('invalid' as any)).toThrow();
    });

    it('should maintain consistency after errors', () => {
      try {
        composer.setEmotional('happy', 2.0); // Invalid intensity
      } catch (e) {
        // Error expected
      }
      
      // Verify state is unchanged
      const composition = composer.getComposition();
      expect(composition.emotional.size).toBe(0);
    });
  });

  describe('パフォーマンス', () => {
    it('should handle large number of expressions efficiently', () => {
      const startTime = performance.now();
      
      // Set many expressions
      for (let i = 0; i < 100; i++) {
        composer.setEmotional(`emotion${i}`, 0.5);
      }
      
      const composeTime = performance.now();
      composer.compose();
      const endTime = performance.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(100); // 100ms
      expect(endTime - composeTime).toBeLessThan(50); // Compose should be fast
    });

    it('should reuse composition result when state unchanged', () => {
      const firstCompose = composer.compose();
      const secondCompose = composer.compose();
      
      // Should return same timestamp if state unchanged
      expect(firstCompose.timestamp).toBe(secondCompose.timestamp);
    });
  });
});