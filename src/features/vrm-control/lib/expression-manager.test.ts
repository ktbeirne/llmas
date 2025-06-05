/**
 * Expression Manager Tests - FSD Phase 2
 * VRM表情管理機能のテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { VRM } from '@pixiv/three-vrm';

import { ExpressionManager } from './expression-manager';

// VRMモック
const mockVRM = {
  expressionManager: {
    expressionMap: {
      happy: {},
      sad: {},
      angry: {},
      blink: {}
    },
    customExpressionMap: {
      custom1: {}
    },
    setValue: vi.fn(),
    getValue: vi.fn().mockReturnValue(0),
    getExpression: vi.fn().mockImplementation(name => {
      const allExpressions = { ...mockVRM.expressionManager.expressionMap, ...mockVRM.expressionManager.customExpressionMap };
      return allExpressions[name] || null;
    }),
    update: vi.fn()
  }
} as unknown as VRM;

describe('ExpressionManager', () => {
  let manager: ExpressionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    manager = new ExpressionManager(mockVRM);
  });

  afterEach(() => {
    manager.dispose();
    vi.useRealTimers();
  });

  describe('表情適用', () => {
    it('should apply expression', () => {
      const result = manager.applyExpression('happy', 0.8);
      
      expect(result).toBe(true);
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith('happy', 0.8);
    });

    it('should clamp intensity between 0 and 1', () => {
      manager.applyExpression('happy', 1.5);
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith('happy', 1.0);
      
      manager.applyExpression('happy', -0.5);
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith('happy', 0.0);
    });

    it('should reset other expressions when applying non-basic expression', () => {
      manager.applyExpression('happy');
      
      // happy以外の表情系（blink, look系を除く）がリセットされることを確認
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith('sad', 0.0);
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith('angry', 0.0);
      expect(mockVRM.expressionManager.setValue).not.toHaveBeenCalledWith('blink', 0.0);
    });

    it('should return false for non-existent expression', () => {
      mockVRM.expressionManager.getExpression = vi.fn().mockReturnValue(null);
      
      const result = manager.applyExpression('nonexistent');
      
      expect(result).toBe(false);
    });
  });

  describe('表情リセット', () => {
    it('should reset all expressions except blink', () => {
      manager.resetAllExpressions();
      
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith('happy', 0.0);
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith('sad', 0.0);
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith('angry', 0.0);
      expect(mockVRM.expressionManager.setValue).not.toHaveBeenCalledWith('blink', 0.0);
    });
  });

  describe('利用可能な表情取得', () => {
    it('should get available expressions', () => {
      const expressions = manager.getAvailableExpressions();
      
      expect(expressions).toHaveLength(5); // 4 preset + 1 custom
      expect(expressions.map(e => e.name)).toContain('happy');
      expect(expressions.map(e => e.name)).toContain('custom1');
      
      const happyExpression = expressions.find(e => e.name === 'happy');
      expect(happyExpression?.isPreset).toBe(true);
      expect(happyExpression?.displayName).toBe('喜び');
      
      const customExpression = expressions.find(e => e.name === 'custom1');
      expect(customExpression?.isPreset).toBe(false);
    });
  });

  describe('まばたき管理', () => {
    it('should start auto blink', () => {
      manager.startAutoBlink();
      
      // 初回のまばたきまで時間を進める
      vi.advanceTimersByTime(3000);
      
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith('blink', 1.0);
      
      // まばたき終了（100ms後）
      vi.advanceTimersByTime(100);
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith('blink', 0.0);
    });

    it('should stop auto blink', () => {
      manager.startAutoBlink();
      manager.stopAutoBlink();
      
      vi.advanceTimersByTime(10000);
      
      // まばたきが実行されないことを確認
      expect(mockVRM.expressionManager.setValue).not.toHaveBeenCalled();
    });

    it('should set custom blink interval', () => {
      manager.setBlinkInterval(1000, 2000); // 1-2秒
      manager.startAutoBlink();
      
      // 最小間隔（1秒）で必ずまばたきが発生
      vi.advanceTimersByTime(2100);
      
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith('blink', 1.0);
    });

    it('should handle update calls for blink timing', () => {
      manager.startAutoBlink();
      
      // updateを呼び出してまばたきタイミングを進める
      for (let i = 0; i < 300; i++) {
        manager.update(0.01); // 10ms * 300 = 3秒
      }
      
      expect(mockVRM.expressionManager.setValue).toHaveBeenCalledWith('blink', 1.0);
    });
  });

  describe('表情値取得', () => {
    it('should get expression value', () => {
      mockVRM.expressionManager.getValue = vi.fn().mockReturnValue(0.7);
      
      const value = manager.getExpressionValue('happy');
      
      expect(value).toBe(0.7);
      expect(mockVRM.expressionManager.getValue).toHaveBeenCalledWith('happy');
    });

    it('should return null for invalid expression', () => {
      mockVRM.expressionManager.getValue = vi.fn().mockImplementation(() => {
        throw new Error('Expression not found');
      });
      
      const value = manager.getExpressionValue('invalid');
      
      expect(value).toBeNull();
    });
  });

  describe('リソース管理', () => {
    it('should dispose resources', () => {
      manager.startAutoBlink();
      manager.dispose();
      
      // disposeの後はまばたきが実行されない
      vi.advanceTimersByTime(10000);
      expect(mockVRM.expressionManager.setValue).not.toHaveBeenCalled();
    });
  });
});