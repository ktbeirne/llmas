/**
 * Expression Composer Integration Test - Phase 3
 * 表情合成システムの統合テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ExpressionComposer } from '../../../entities/vrm-expression-composer/model/expression-composer';
import { BlendShapeCategory } from '../../../entities/vrm-expression-composer/types';
import { ExpressionManagerV2 } from './expression-manager-v2';
import { LipSyncManagerV2 } from './lip-sync-manager-v2';

// Mock VRM types
interface MockVRM {
  expressionManager?: {
    setValue(expressionName: string, value: number): void;
    getValue(expressionName: string): number;
    getExpression(expressionName: string): any;
    getExpressionTrackName(expressionName: string): string | null;
    expressionMap: Record<string, any>;
    customExpressionMap?: Record<string, any>;
  };
}

describe('Expression Composer Integration V2', () => {
  let mockVRM: MockVRM;
  let expressionManagerV2: ExpressionManagerV2;
  let lipSyncManagerV2: LipSyncManagerV2;
  let composer: ExpressionComposer;

  beforeEach(() => {
    // Mock VRM setup
    mockVRM = {
      expressionManager: {
        setValue: vi.fn(),
        getValue: vi.fn().mockReturnValue(0.0),
        getExpression: vi.fn().mockReturnValue({ name: 'mock-expression' }),
        getExpressionTrackName: vi.fn().mockReturnValue('mock-track'),
        expressionMap: {
          'happy': { name: 'happy' },
          'sad': { name: 'sad' },
          'aa': { name: 'aa' },
          'ih': { name: 'ih' },
          'blink': { name: 'blink' }
        },
        customExpressionMap: {}
      }
    };

    // Initialize managers
    expressionManagerV2 = new ExpressionManagerV2(mockVRM as any);
    composer = expressionManagerV2.getComposer();
    lipSyncManagerV2 = new LipSyncManagerV2(mockVRM as any, composer);
    
    // Setup cross-references
    expressionManagerV2.setLipSyncManager(lipSyncManagerV2);
  });

  describe('統合された表情管理', () => {
    it('should allow simultaneous emotional expression and lip sync', () => {
      // 感情表情を設定
      const emotionalSuccess = expressionManagerV2.applyExpression('happy', 0.8);
      expect(emotionalSuccess).toBe(true);
      
      // リップシンクを開始
      lipSyncManagerV2.enable();
      lipSyncManagerV2.startLipSync();
      
      // 合成状態を確認
      const composition = expressionManagerV2.getCompositionState();
      expect(composition.emotional.get('happy')).toBe(0.8);
      expect(composition.mouth.size).toBeGreaterThan(0); // リップシンクが口の形を設定
      
      // VRMに感情表情とリップシンクが同時に適用されることを確認
      // 感情表情は維持される
      expect(mockVRM.expressionManager?.setValue).toHaveBeenCalledWith('happy', expect.closeTo(0.72, 10));
      // リップシンク用BlendShapeをリセット
      expect(mockVRM.expressionManager?.setValue).toHaveBeenCalledWith('aa', 0);
      expect(mockVRM.expressionManager?.setValue).toHaveBeenCalledWith('ih', 0);
      expect(mockVRM.expressionManager?.setValue).toHaveBeenCalledWith('ou', 0);
      expect(mockVRM.expressionManager?.setValue).toHaveBeenCalledWith('ee', 0);
      expect(mockVRM.expressionManager?.setValue).toHaveBeenCalledWith('oh', 0);
      // 新しいリップシンクの口の形を適用
      expect(mockVRM.expressionManager?.setValue).toHaveBeenCalledWith('aa', 0.8);
    });

    it('should preserve emotional expressions during lip sync operations', () => {
      // 複数の感情表情を設定
      expressionManagerV2.applyExpression('happy', 0.6);
      expressionManagerV2.applyExpression('surprised', 0.4);
      
      const initialComposition = expressionManagerV2.getCompositionState();
      expect(initialComposition.emotional.get('happy')).toBe(0.6);
      expect(initialComposition.emotional.get('surprised')).toBe(0.4);
      
      // リップシンクを開始・停止
      lipSyncManagerV2.enable();
      lipSyncManagerV2.startLipSync();
      lipSyncManagerV2.stopLipSync();
      
      // 感情表情が保持されていることを確認
      const finalComposition = expressionManagerV2.getCompositionState();
      expect(finalComposition.emotional.get('happy')).toBe(0.6);
      expect(finalComposition.emotional.get('surprised')).toBe(0.4);
      expect(finalComposition.mouth.size).toBe(0); // 口の形はクリアされている
    });

    it('should handle eye expressions independently', () => {
      // 感情表情と目の表情を設定
      expressionManagerV2.applyExpression('happy', 0.8);
      expressionManagerV2.applyExpression('blink', 1.0);
      
      // リップシンクを開始
      lipSyncManagerV2.enable();
      lipSyncManagerV2.startLipSync();
      
      const composition = expressionManagerV2.getCompositionState();
      expect(composition.emotional.get('happy')).toBe(0.8);
      expect(composition.eye.get('blink')).toBe(1.0);
      expect(composition.mouth.size).toBeGreaterThan(0);
      
      // 目の表情とリップシンクが独立して機能していることを確認
      expect(mockVRM.expressionManager?.setValue).toHaveBeenCalledWith('blink', 0.9); // まばたき強度調整
      // 感情表情は維持される
      expect(mockVRM.expressionManager?.setValue).toHaveBeenCalledWith('happy', expect.closeTo(0.72, 10));
      // リップシンク用BlendShapeをリセット
      expect(mockVRM.expressionManager?.setValue).toHaveBeenCalledWith('aa', 0);
      // 新しいリップシンクの口の形を適用
      expect(mockVRM.expressionManager?.setValue).toHaveBeenCalledWith('aa', 0.8);
    });
  });

  describe('カテゴリ別管理', () => {
    it('should clear specific categories without affecting others', () => {
      // 各カテゴリに表情を設定
      expressionManagerV2.applyExpression('happy', 0.8);
      composer.setMouth('aa', 0.6);
      composer.setEye('blink', 0.4);
      composer.setGaze('lookUp', 0.3);
      composer.applyToVRM(mockVRM as any);
      
      // 感情カテゴリのみをクリア
      expressionManagerV2.clearCategory(BlendShapeCategory.EMOTIONAL);
      
      const composition = expressionManagerV2.getCompositionState();
      expect(composition.emotional.size).toBe(0);
      expect(composition.mouth.get('aa')).toBe(0.6);
      expect(composition.eye.get('blink')).toBe(0.4);
      expect(composition.gaze.get('lookUp')).toBe(0.3);
    });

    it('should reset all expressions except blinking', () => {
      // 各カテゴリに表情を設定
      expressionManagerV2.applyExpression('happy', 0.8);
      composer.setMouth('aa', 0.6);
      composer.setEye('blink', 0.4);
      composer.setGaze('lookUp', 0.3);
      composer.applyToVRM(mockVRM as any);
      
      // すべての表情をリセット（まばたきを除く）
      expressionManagerV2.resetAllExpressions();
      
      const composition = expressionManagerV2.getCompositionState();
      expect(composition.emotional.size).toBe(0);
      expect(composition.mouth.size).toBe(0);
      expect(composition.gaze.size).toBe(0);
      // EYEカテゴリは保持されているはず
      expect(composition.eye.get('blink')).toBe(0.4);
    });
  });

  describe('リップシンク独立性', () => {
    it('should not interfere with other expressions during lip sync', () => {
      // 感情表情を設定
      expressionManagerV2.applyExpression('happy', 0.8);
      expressionManagerV2.applyExpression('surprised', 0.3);
      
      // リップシンクを開始
      lipSyncManagerV2.enable();
      lipSyncManagerV2.startLipSync();
      
      // 口パク中に感情表情を変更
      expressionManagerV2.applyExpression('sad', 0.7);
      
      const composition = expressionManagerV2.getCompositionState();
      expect(composition.emotional.get('sad')).toBe(0.7);
      expect(composition.mouth.size).toBeGreaterThan(0); // リップシンクは継続
      
      // リップシンクを停止
      lipSyncManagerV2.stopLipSync();
      
      const finalComposition = expressionManagerV2.getCompositionState();
      expect(finalComposition.emotional.get('sad')).toBe(0.7); // 感情表情は保持
      expect(finalComposition.mouth.size).toBe(0); // 口の形はクリア
    });

    it('should pause and resume lip sync correctly', () => {
      lipSyncManagerV2.enable();
      lipSyncManagerV2.startLipSync();
      
      // 一時停止
      lipSyncManagerV2.pauseLipSync();
      
      const pausedComposition = expressionManagerV2.getCompositionState();
      expect(pausedComposition.mouth.get('neutral')).toBe(0.3);
      
      // 再開
      lipSyncManagerV2.startLipSync();
      
      const resumedComposition = expressionManagerV2.getCompositionState();
      expect(resumedComposition.mouth.size).toBeGreaterThan(0);
      // neutralは上書きされているはず
    });
  });

  describe('自動まばたき統合', () => {
    it('should handle auto blink through expression composer', () => {
      expressionManagerV2.startAutoBlink();
      
      // まばたきをシミュレート（通常はtimer経由）
      composer.setEye('blink', 1.0);
      composer.applyToVRM(mockVRM as any);
      
      expect(mockVRM.expressionManager?.setValue).toHaveBeenCalledWith('blink', 0.9); // まばたき強度調整
      
      // モック呼び出しをリセット
      vi.mocked(mockVRM.expressionManager!.setValue).mockClear();
      
      // まばたきを終了（0は送信されないため、別の方法で確認）
      composer.setEye('blink', 0.0);
      composer.applyToVRM(mockVRM as any);
      
      // 0の値は明示的にブリンクをクリアするために送信される
      expect(mockVRM.expressionManager?.setValue).toHaveBeenCalledWith('blink', 0);
    });

    it('should not interfere with manual eye expressions', () => {
      // 手動で目の表情を設定
      expressionManagerV2.applyExpression('wink', 0.7);
      
      // 自動まばたきを開始
      expressionManagerV2.startAutoBlink();
      
      const composition = expressionManagerV2.getCompositionState();
      expect(composition.eye.get('wink')).toBe(0.7);
      
      // まばたきが追加されても既存の目の表情は保持
      composer.setEye('blink', 1.0);
      composer.applyToVRM(mockVRM as any);
      
      const updatedComposition = expressionManagerV2.getCompositionState();
      expect(updatedComposition.eye.get('wink')).toBe(0.7);
      expect(updatedComposition.eye.get('blink')).toBe(1.0);
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle VRM without expression manager gracefully', () => {
      const invalidVRM = {} as any;
      
      expect(() => {
        const invalidManager = new ExpressionManagerV2(invalidVRM);
        invalidManager.applyExpression('happy', 0.8);
      }).not.toThrow();
    });

    it('should handle invalid expression names gracefully', () => {
      // Mock invalid expression
      mockVRM.expressionManager!.getExpression = vi.fn().mockImplementation((name: string) => {
        return name === 'nonexistent' ? null : { name };
      });
      
      const success = expressionManagerV2.applyExpression('nonexistent', 0.8);
      expect(success).toBe(false);
    });

    it('should handle composer errors gracefully', () => {
      expect(() => {
        expressionManagerV2.applyExpression('happy', -0.1); // Invalid intensity
      }).not.toThrow();
    });
  });

  describe('パフォーマンス', () => {
    it('should handle multiple rapid expression changes efficiently', () => {
      const startTime = performance.now();
      
      // 多数の表情変更を高速実行
      for (let i = 0; i < 100; i++) {
        expressionManagerV2.applyExpression('happy', Math.random());
        if (i % 10 === 0) {
          lipSyncManagerV2.enable();
          lipSyncManagerV2.startLipSync();
          lipSyncManagerV2.stopLipSync();
        }
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should cache composition results appropriately', () => {
      // 同じ状態で複数回compose()を呼び出し
      const first = composer.compose();
      const second = composer.compose();
      
      // タイムスタンプが同じなら同じ結果オブジェクトが返されるはず
      expect(first.timestamp).toBe(second.timestamp);
    });
  });
});