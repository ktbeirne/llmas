/**
 * LipSyncManager Test - TDD First
 * リップシンク管理機能のテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { LipSyncManager } from './lip-sync-manager';
import { ExpressionManager } from './expression-manager';

// ExpressionManagerのモック
vi.mock('./expression-manager');

describe('LipSyncManager', () => {
  let lipSyncManager: LipSyncManager;
  let mockExpressionManager: ExpressionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    mockExpressionManager = {
      applyExpression: vi.fn().mockReturnValue(true),
      resetAllExpressions: vi.fn(),
      getExpressionValue: vi.fn().mockReturnValue(0),
    } as any;
    
    lipSyncManager = new LipSyncManager(mockExpressionManager);
  });

  afterEach(() => {
    vi.useRealTimers();
    lipSyncManager.dispose();
  });

  describe('基本機能', () => {
    it('インスタンスが正しく作成される', () => {
      expect(lipSyncManager).toBeDefined();
      expect(lipSyncManager).toBeInstanceOf(LipSyncManager);
    });

    it('初期状態では無効化されている', () => {
      expect(lipSyncManager.isEnabled()).toBe(false);
    });

    it('有効化・無効化が正しく動作する', () => {
      expect(lipSyncManager.isEnabled()).toBe(false);
      
      lipSyncManager.enable();
      expect(lipSyncManager.isEnabled()).toBe(true);
      
      lipSyncManager.disable();
      expect(lipSyncManager.isEnabled()).toBe(false);
    });
  });

  describe('リップシンク動作', () => {
    beforeEach(() => {
      lipSyncManager.enable();
    });

    it('文字表示開始時に口パクが開始される', () => {
      lipSyncManager.startLipSync();
      
      // 最初の口の形が適用される
      expect(mockExpressionManager.applyExpression).toHaveBeenCalled();
      const firstCall = (mockExpressionManager.applyExpression as any).mock.calls[0];
      expect(['aa', 'ih', 'ou', 'ee', 'oh']).toContain(firstCall[0]);
    });

    it('文字表示中は口の形が切り替わる', () => {
      lipSyncManager.startLipSync();
      
      // 最初の口の形
      expect(mockExpressionManager.applyExpression).toHaveBeenCalledTimes(1);
      
      // 150ms後に次の口の形
      vi.advanceTimersByTime(150);
      expect(mockExpressionManager.applyExpression).toHaveBeenCalledTimes(2);
      
      // さらに150ms後
      vi.advanceTimersByTime(150);
      expect(mockExpressionManager.applyExpression).toHaveBeenCalledTimes(3);
    });

    it('句読点で口が閉じる', () => {
      lipSyncManager.startLipSync();
      vi.clearAllMocks();
      
      lipSyncManager.pauseLipSync();
      
      // 口を閉じる（neutralまたはリセット）
      expect(mockExpressionManager.applyExpression).toHaveBeenCalledWith('neutral', expect.any(Number));
    });

    it('文字表示完了で口パクが停止される', () => {
      lipSyncManager.startLipSync();
      vi.clearAllMocks();
      
      lipSyncManager.stopLipSync();
      
      // 口を閉じる
      expect(mockExpressionManager.applyExpression).toHaveBeenCalledWith('neutral', 0);
      
      // タイマーが停止されている（これ以上口が動かない）
      vi.advanceTimersByTime(300);
      expect(mockExpressionManager.applyExpression).toHaveBeenCalledTimes(1);
    });

    it('無効化されている時は口パクしない', () => {
      lipSyncManager.disable();
      vi.clearAllMocks();
      
      lipSyncManager.startLipSync();
      
      expect(mockExpressionManager.applyExpression).not.toHaveBeenCalled();
    });
  });

  describe('口の形のパターン', () => {
    it('口の形が順番に切り替わる', () => {
      const expectedSequence = ['aa', 'ih', 'ou', 'ee', 'oh'];
      const actualSequence: string[] = [];
      
      // applyExpressionの呼び出しを記録
      (mockExpressionManager.applyExpression as any).mockImplementation((expr: string) => {
        if (expectedSequence.includes(expr)) {
          actualSequence.push(expr);
        }
        return true;
      });
      
      lipSyncManager.startLipSync();
      
      // 5回分の切り替えを実行
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(150);
      }
      
      // 期待される順序で口の形が変わっているか
      expect(actualSequence.slice(0, 5)).toEqual(expectedSequence);
    });
  });

  describe('IPC連携', () => {
    it('lip-sync:startイベントで口パクが開始される', () => {
      // IPCイベントを受信した時の動作
      lipSyncManager.handleLipSyncStart();
      
      expect(mockExpressionManager.applyExpression).toHaveBeenCalled();
    });

    it('lip-sync:pauseイベントで口が閉じる', () => {
      lipSyncManager.startLipSync();
      vi.clearAllMocks();
      
      lipSyncManager.handleLipSyncPause();
      
      expect(mockExpressionManager.applyExpression).toHaveBeenCalledWith('neutral', expect.any(Number));
    });

    it('lip-sync:stopイベントで口パクが停止する', () => {
      lipSyncManager.startLipSync();
      vi.clearAllMocks();
      
      lipSyncManager.handleLipSyncStop();
      
      expect(mockExpressionManager.applyExpression).toHaveBeenCalledWith('neutral', 0);
    });
  });

  describe('パフォーマンス', () => {
    it('口パクの切り替え間隔が適切（100-150ms）', () => {
      lipSyncManager.startLipSync();
      
      // 100ms未満では切り替わらない
      vi.advanceTimersByTime(99);
      expect(mockExpressionManager.applyExpression).toHaveBeenCalledTimes(1);
      
      // 100-150msで切り替わる
      vi.advanceTimersByTime(51);
      expect(mockExpressionManager.applyExpression).toHaveBeenCalledTimes(2);
    });
  });

  describe('リソース管理', () => {
    it('disposeで正しくクリーンアップされる', () => {
      lipSyncManager.startLipSync();
      
      lipSyncManager.dispose();
      
      // タイマーが停止されている
      vi.clearAllMocks();
      vi.advanceTimersByTime(300);
      expect(mockExpressionManager.applyExpression).not.toHaveBeenCalled();
    });
  });
});