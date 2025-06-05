/**
 * VRMBehaviorManager Test - TDD Red Phase
 * 統一された振る舞い制御のテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { VRM } from '@pixiv/three-vrm';

import { ExpressionPriority } from '../types';

import { VRMBehaviorManagerImpl } from './vrm-behavior-manager';

// モック作成
const mockVRM: VRM = {
  expressionManager: {
    expressionMap: new Map(),
    setValue: vi.fn(),
    getValue: vi.fn().mockReturnValue(0),
    update: vi.fn()
  },
  update: vi.fn()
} as any;

const mockExpressionManager = {
  applyExpression: vi.fn().mockReturnValue(true),
  resetAllExpressions: vi.fn(),
  startAutoBlink: vi.fn(),
  stopAutoBlink: vi.fn(),
  update: vi.fn(),
  dispose: vi.fn(),
  setLipSyncManager: vi.fn()
} as any;

const mockLipSyncManager = {
  enable: vi.fn(),
  disable: vi.fn(),
  startLipSync: vi.fn(),
  pauseLipSync: vi.fn(),
  stopLipSync: vi.fn(),
  setActiveExpression: vi.fn(),
  isEnabled: vi.fn().mockReturnValue(true),
  dispose: vi.fn()
} as any;

const mockAnimationManager = {
  initialize: vi.fn().mockReturnValue(true),
  play: vi.fn(),
  stop: vi.fn(),
  update: vi.fn(),
  dispose: vi.fn()
} as any;

describe('VRMBehaviorManager', () => {
  let manager: VRMBehaviorManagerImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new VRMBehaviorManagerImpl(
      () => mockExpressionManager,
      () => mockLipSyncManager,
      () => mockAnimationManager
    );
  });

  describe('initialization', () => {
    it('should initialize with VRM model', async () => {
      await expect(manager.initialize(mockVRM)).resolves.not.toThrow();
      expect(mockExpressionManager.startAutoBlink).toHaveBeenCalled();
      expect(mockExpressionManager.setLipSyncManager).toHaveBeenCalledWith(mockLipSyncManager);
    });

    it('should throw error when VRM is null', async () => {
      await expect(manager.initialize(null as any)).rejects.toThrow('VRM model is required');
    });

    it('should enable lip sync by default', async () => {
      await manager.initialize(mockVRM);
      expect(mockLipSyncManager.enable).toHaveBeenCalled();
    });
  });

  describe('expression control', () => {
    beforeEach(async () => {
      await manager.initialize(mockVRM);
    });

    it('should set expression with priority', () => {
      const result = manager.setExpression('happy', 0.8, ExpressionPriority.HIGH);
      
      expect(result).toBe(true);
      expect(mockExpressionManager.applyExpression).toHaveBeenCalledWith('happy', 0.8);
      
      const state = manager.getCurrentState();
      expect(state.activeExpressions.has('happy')).toBe(true);
      expect(state.activeExpressions.get('happy')?.priority).toBe(ExpressionPriority.HIGH);
    });

    it('should reject lower priority expressions', () => {
      // まず高優先度の表情を設定
      manager.setExpression('angry', 1.0, ExpressionPriority.CRITICAL);
      
      // 低優先度の表情は拒否されるべき
      const result = manager.setExpression('happy', 0.8, ExpressionPriority.MEDIUM);
      
      expect(result).toBe(false);
      expect(mockExpressionManager.applyExpression).toHaveBeenCalledTimes(1); // 最初の1回のみ
    });

    it('should override with higher priority expressions', () => {
      // 中優先度の表情を設定
      manager.setExpression('sad', 0.6, ExpressionPriority.MEDIUM);
      
      // 高優先度の表情で上書き
      const result = manager.setExpression('excited', 1.0, ExpressionPriority.HIGH);
      
      expect(result).toBe(true);
      expect(mockExpressionManager.applyExpression).toHaveBeenCalledTimes(3); // 1回目: sad設定, 2回目: excited設定, 3回目: sad削除
      
      const state = manager.getCurrentState();
      expect(state.activeExpressions.has('excited')).toBe(true);
      expect(state.activeExpressions.has('sad')).toBe(false); // 上書きされて削除
    });

    it('should clear specific expression', () => {
      manager.setExpression('happy', 0.8, ExpressionPriority.HIGH);
      manager.clearExpression('happy');
      
      const state = manager.getCurrentState();
      expect(state.activeExpressions.has('happy')).toBe(false);
      expect(mockExpressionManager.applyExpression).toHaveBeenCalledWith('happy', 0);
    });

    it('should handle mouth shape expressions for lip sync coordination', () => {
      // リップシンクアクティブ時に口形表情を設定
      manager.startLipSync();
      manager.setExpression('aa', 0.8, ExpressionPriority.MEDIUM);
      
      expect(mockLipSyncManager.setActiveExpression).not.toHaveBeenCalled(); // 口形表情は通知しない
    });

    it('should notify lip sync manager of non-mouth expressions', () => {
      manager.setExpression('happy', 0.8, ExpressionPriority.HIGH);
      
      expect(mockLipSyncManager.setActiveExpression).toHaveBeenCalledWith('happy', 0.8);
    });
  });

  describe('lip sync control', () => {
    beforeEach(async () => {
      await manager.initialize(mockVRM);
    });

    it('should start lip sync', () => {
      manager.startLipSync();
      
      expect(mockLipSyncManager.startLipSync).toHaveBeenCalled();
      
      const state = manager.getCurrentState();
      expect(state.lipSyncActive).toBe(true);
    });

    it('should pause lip sync', () => {
      manager.startLipSync();
      manager.pauseLipSync();
      
      expect(mockLipSyncManager.pauseLipSync).toHaveBeenCalled();
    });

    it('should stop lip sync', () => {
      manager.startLipSync();
      manager.stopLipSync();
      
      expect(mockLipSyncManager.stopLipSync).toHaveBeenCalled();
      
      const state = manager.getCurrentState();
      expect(state.lipSyncActive).toBe(false);
    });
  });

  describe('animation control', () => {
    beforeEach(async () => {
      await manager.initialize(mockVRM);
    });

    it('should play animation', async () => {
      const result = await manager.playAnimation('test-animation.vrma');
      
      expect(result).toBe(true);
      expect(mockAnimationManager.initialize).toHaveBeenCalled();
      expect(mockAnimationManager.play).toHaveBeenCalled();
      
      const state = manager.getCurrentState();
      expect(state.currentAnimation).toBe('test-animation.vrma');
    });

    it('should handle animation load failure', async () => {
      mockAnimationManager.initialize.mockReturnValueOnce(false);
      
      const result = await manager.playAnimation('invalid-animation.vrma');
      
      expect(result).toBe(false);
      
      const state = manager.getCurrentState();
      expect(state.currentAnimation).toBe(null);
    });

    it('should stop current animation', () => {
      manager.stopAnimation();
      
      expect(mockAnimationManager.stop).toHaveBeenCalled();
      
      const state = manager.getCurrentState();
      expect(state.currentAnimation).toBe(null);
    });
  });

  describe('state management', () => {
    beforeEach(async () => {
      await manager.initialize(mockVRM);
    });

    it('should return current state', () => {
      const state = manager.getCurrentState();
      
      expect(state).toMatchObject({
        activeExpressions: expect.any(Map),
        lipSyncActive: false,
        currentAnimation: null,
        lastUpdate: expect.any(Number)
      });
    });

    it('should update last update timestamp on state changes', async () => {
      const initialState = manager.getCurrentState();
      const initialTimestamp = initialState.lastUpdate;
      
      // 少し待ってから状態変更（タイムスタンプの差を確実に作る）
      await new Promise(resolve => setTimeout(resolve, 10));
      manager.setExpression('happy', 0.8, ExpressionPriority.HIGH);
      
      const updatedState = manager.getCurrentState();
      expect(updatedState.lastUpdate).toBeGreaterThan(initialTimestamp);
    });
  });

  describe('update and disposal', () => {
    beforeEach(async () => {
      await manager.initialize(mockVRM);
    });

    it('should update all managers', () => {
      const delta = 0.016; // 60fps
      
      manager.update(delta);
      
      expect(mockExpressionManager.update).toHaveBeenCalledWith(delta);
      expect(mockAnimationManager.update).toHaveBeenCalledWith(delta);
    });

    it('should dispose all resources', () => {
      manager.dispose();
      
      expect(mockExpressionManager.dispose).toHaveBeenCalled();
      expect(mockLipSyncManager.dispose).toHaveBeenCalled();
      expect(mockAnimationManager.dispose).toHaveBeenCalled();
    });

    it('should clear state on disposal', () => {
      manager.setExpression('happy', 0.8, ExpressionPriority.HIGH);
      manager.dispose();
      
      const state = manager.getCurrentState();
      expect(state.activeExpressions.size).toBe(0);
      expect(state.lipSyncActive).toBe(false);
      expect(state.currentAnimation).toBe(null);
    });
  });

  describe('integration scenarios', () => {
    beforeEach(async () => {
      await manager.initialize(mockVRM);
    });

    it('should handle Function Call expression priority correctly', () => {
      // リップシンクを開始
      manager.startLipSync();
      
      // Function Call表情（CRITICAL優先度）を設定
      const result = manager.setExpression('function_call_happy', 1.0, ExpressionPriority.CRITICAL);
      
      expect(result).toBe(true);
      expect(mockLipSyncManager.setActiveExpression).toHaveBeenCalledWith('function_call_happy', 1.0);
      
      // その後のリップシンクは Function Call 表情を維持すべき
      const state = manager.getCurrentState();
      expect(state.activeExpressions.get('function_call_happy')?.priority).toBe(ExpressionPriority.CRITICAL);
    });

    it('should coordinate expression and lip sync timing', () => {
      // 表情設定後にリップシンク開始
      manager.setExpression('happy', 0.8, ExpressionPriority.HIGH);
      manager.startLipSync();
      
      // 既存の表情がリップシンクマネージャーに通知される
      expect(mockLipSyncManager.setActiveExpression).toHaveBeenCalledWith('happy', 0.8);
      
      const state = manager.getCurrentState();
      expect(state.lipSyncActive).toBe(true);
      expect(state.activeExpressions.get('happy')?.priority).toBe(ExpressionPriority.HIGH);
    });
  });
});