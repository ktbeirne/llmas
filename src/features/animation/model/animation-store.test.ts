/**
 * Animation Store Tests - FSD Phase 2
 * アニメーションストアのテスト（TDD: RED Phase）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import type {
  AnimationInfo,
  AnimationCategory,
  AnimationPriority,
  AnimationPlayOptions
} from '../types';

import { animationStore } from './animation-store';

describe('Animation Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    animationStore.reset();
  });

  describe('初期化', () => {
    it('初期状態が正しく設定される', () => {
      const state = animationStore.getState();
      
      expect(state.currentAnimation).toBeNull();
      expect(state.isPlaying).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.queue).toEqual([]);
      expect(state.history).toEqual([]);
      expect(state.lastActivityTime).toBeGreaterThan(0);
    });
  });

  describe('アニメーション再生', () => {
    const testAnimation: AnimationInfo = {
      name: 'test.vrma',
      category: 'gesture',
      priority: 'normal',
      isLooping: false,
      canBeInterrupted: true
    };

    it('アニメーションを再生できる', () => {
      const result = animationStore.playAnimation(testAnimation);
      
      expect(result).toBe(true);
      
      const state = animationStore.getState();
      expect(state.currentAnimation).toEqual(testAnimation);
      expect(state.isPlaying).toBe(true);
      expect(state.isPaused).toBe(false);
    });

    it('オプション付きでアニメーションを再生できる', () => {
      const options: AnimationPlayOptions = {
        speed: 1.5,
        loop: true,
        fadeInDuration: 500,
        priority: 'high'
      };

      const result = animationStore.playAnimation(testAnimation, options);
      
      expect(result).toBe(true);
      expect(animationStore.getCurrentPlayOptions()).toMatchObject(options);
    });

    it('同じアニメーションを重複再生しない', () => {
      animationStore.playAnimation(testAnimation);
      const firstState = animationStore.getState();
      
      const result = animationStore.playAnimation(testAnimation);
      
      expect(result).toBe(false);
      expect(animationStore.getState()).toEqual(firstState);
    });

    it('高優先度アニメーションが低優先度を割り込める', () => {
      const lowPriorityAnimation: AnimationInfo = {
        name: 'low.vrma',
        category: 'gesture',
        priority: 'normal',
        isLooping: false,
        canBeInterrupted: true
      };

      const highPriorityAnimation: AnimationInfo = {
        name: 'high.vrma',
        category: 'emotion',
        priority: 'high',
        isLooping: false,
        canBeInterrupted: true
      };

      animationStore.playAnimation(lowPriorityAnimation);
      const result = animationStore.playAnimation(highPriorityAnimation);

      expect(result).toBe(true);
      expect(animationStore.getState().currentAnimation).toEqual(highPriorityAnimation);
    });

    it('割り込み不可のアニメーションを保護する', () => {
      const protectedAnimation: AnimationInfo = {
        name: 'protected.vrma',
        category: 'emotion',
        priority: 'high',
        isLooping: false,
        canBeInterrupted: false
      };

      const interruptingAnimation: AnimationInfo = {
        name: 'interrupt.vrma',
        category: 'emotion',
        priority: 'critical',
        isLooping: false,
        canBeInterrupted: true
      };

      animationStore.playAnimation(protectedAnimation);
      const result = animationStore.playAnimation(interruptingAnimation);

      expect(result).toBe(false);
      expect(animationStore.getState().currentAnimation).toEqual(protectedAnimation);
    });
  });

  describe('アニメーション制御', () => {
    const testAnimation: AnimationInfo = {
      name: 'test.vrma',
      category: 'gesture',
      priority: 'normal',
      isLooping: false,
      canBeInterrupted: true
    };

    beforeEach(() => {
      animationStore.playAnimation(testAnimation);
    });

    it('アニメーションを停止できる', () => {
      animationStore.stopAnimation();
      
      const state = animationStore.getState();
      expect(state.currentAnimation).toBeNull();
      expect(state.isPlaying).toBe(false);
      expect(state.isPaused).toBe(false);
    });

    it('アニメーションを一時停止できる', () => {
      animationStore.pauseAnimation();
      
      const state = animationStore.getState();
      expect(state.currentAnimation).toEqual(testAnimation);
      expect(state.isPlaying).toBe(false);
      expect(state.isPaused).toBe(true);
    });

    it('一時停止中のアニメーションを再開できる', () => {
      animationStore.pauseAnimation();
      animationStore.resumeAnimation();
      
      const state = animationStore.getState();
      expect(state.currentAnimation).toEqual(testAnimation);
      expect(state.isPlaying).toBe(true);
      expect(state.isPaused).toBe(false);
    });

    it('再生中でないアニメーションの一時停止を無視する', () => {
      animationStore.stopAnimation();
      animationStore.pauseAnimation();
      
      const state = animationStore.getState();
      expect(state.currentAnimation).toBeNull();
      expect(state.isPlaying).toBe(false);
      expect(state.isPaused).toBe(false);
    });
  });

  describe('アニメーションキュー', () => {
    const animation1: AnimationInfo = {
      name: 'anim1.vrma',
      category: 'gesture',
      priority: 'normal',
      isLooping: false,
      canBeInterrupted: true
    };

    const animation2: AnimationInfo = {
      name: 'anim2.vrma',
      category: 'emotion',
      priority: 'normal',
      isLooping: false,
      canBeInterrupted: true
    };

    it('アニメーションをキューに追加できる', () => {
      animationStore.playAnimation(animation1);
      animationStore.queueAnimation(animation2);
      
      const state = animationStore.getState();
      expect(state.queue).toHaveLength(1);
      expect(state.queue[0]).toEqual(animation2);
    });

    it('キューの次のアニメーションを再生できる', () => {
      animationStore.playAnimation(animation1);
      animationStore.queueAnimation(animation2);
      
      animationStore.playNext();
      
      const state = animationStore.getState();
      expect(state.currentAnimation).toEqual(animation2);
      expect(state.queue).toHaveLength(0);
    });

    it('キューが空の場合は次のアニメーションなし', () => {
      animationStore.playAnimation(animation1);
      const result = animationStore.playNext();
      
      expect(result).toBe(false);
      expect(animationStore.getState().currentAnimation).toEqual(animation1);
    });

    it('キューをクリアできる', () => {
      animationStore.queueAnimation(animation1);
      animationStore.queueAnimation(animation2);
      
      animationStore.clearQueue();
      
      expect(animationStore.getState().queue).toHaveLength(0);
    });

    it('キューの最大長を制限する', () => {
      const maxQueueLength = 3;
      
      // 最大長を超えてキューに追加
      for (let i = 0; i < maxQueueLength + 2; i++) {
        const animation: AnimationInfo = {
          name: `anim${i}.vrma`,
          category: 'gesture',
          priority: 'normal',
          isLooping: false,
          canBeInterrupted: true
        };
        animationStore.queueAnimation(animation);
      }
      
      const state = animationStore.getState();
      expect(state.queue.length).toBeLessThanOrEqual(maxQueueLength);
    });
  });

  describe('アニメーション履歴', () => {
    const testAnimation: AnimationInfo = {
      name: 'test.vrma',
      category: 'gesture',
      priority: 'normal',
      isLooping: false,
      canBeInterrupted: true
    };

    it('再生したアニメーションが履歴に記録される', () => {
      animationStore.playAnimation(testAnimation);
      animationStore.stopAnimation();
      
      const state = animationStore.getState();
      expect(state.history).toHaveLength(1);
      expect(state.history[0]).toEqual(testAnimation);
    });

    it('履歴の最大長を制限する', () => {
      const maxHistoryLength = 10;
      
      // 最大長を超えて履歴に追加
      for (let i = 0; i < maxHistoryLength + 3; i++) {
        const animation: AnimationInfo = {
          name: `anim${i}.vrma`,
          category: 'gesture',
          priority: 'normal',
          isLooping: false,
          canBeInterrupted: true
        };
        animationStore.playAnimation(animation);
        animationStore.stopAnimation();
      }
      
      const state = animationStore.getState();
      expect(state.history.length).toBeLessThanOrEqual(maxHistoryLength);
    });

    it('履歴をクリアできる', () => {
      animationStore.playAnimation(testAnimation);
      animationStore.stopAnimation();
      
      animationStore.clearHistory();
      
      expect(animationStore.getState().history).toHaveLength(0);
    });
  });

  describe('アイドル状態管理', () => {
    it('アイドル状態を正しく判定する', () => {
      expect(animationStore.isIdle()).toBe(true);
      
      const testAnimation: AnimationInfo = {
        name: 'test.vrma',
        category: 'gesture',
        priority: 'normal',
        isLooping: false,
        canBeInterrupted: true
      };
      
      animationStore.playAnimation(testAnimation);
      expect(animationStore.isIdle()).toBe(false);
      
      animationStore.stopAnimation();
      expect(animationStore.isIdle()).toBe(true);
    });

    it('アイドルアニメーションはアイドル状態として扱う', () => {
      const idleAnimation: AnimationInfo = {
        name: 'idle.vrma',
        category: 'idle',
        priority: 'background',
        isLooping: true,
        canBeInterrupted: false
      };
      
      animationStore.playAnimation(idleAnimation);
      expect(animationStore.isIdle()).toBe(true);
    });

    it('アイドルタイムアウトを設定できる', () => {
      const testAnimation: AnimationInfo = {
        name: 'test.vrma',
        category: 'gesture',
        priority: 'normal',
        isLooping: false,
        canBeInterrupted: true
      };
      
      // 過去の時間を設定するために時間をモック
      const pastTime = Date.now() - 2000; // 2秒前
      vi.spyOn(Date, 'now').mockReturnValue(pastTime);
      
      animationStore.playAnimation(testAnimation);
      animationStore.stopAnimation();
      
      // アイドルタイムアウトの設定
      animationStore.setIdleTimeout(1000);
      
      // 現在時刻に戻す
      vi.spyOn(Date, 'now').mockReturnValue(pastTime + 1500); // 1.5秒後
      
      // 時間経過をシミュレート
      const state = animationStore.getState();
      const isIdleAfterTimeout = Date.now() - state.lastActivityTime > 1000;
      
      expect(isIdleAfterTimeout).toBe(true);
      
      // モックをリストア
      vi.restoreAllMocks();
    });
  });

  describe('状態の購読', () => {
    it('状態変更を購読できる', () => {
      const callback = vi.fn();
      const unsubscribe = animationStore.subscribe(callback);
      
      const testAnimation: AnimationInfo = {
        name: 'test.vrma',
        category: 'gesture',
        priority: 'normal',
        isLooping: false,
        canBeInterrupted: true
      };
      
      animationStore.playAnimation(testAnimation);
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          currentAnimation: testAnimation,
          isPlaying: true
        })
      );
      
      unsubscribe();
    });

    it('購読を解除できる', () => {
      const callback = vi.fn();
      const unsubscribe = animationStore.subscribe(callback);
      
      unsubscribe();
      
      const testAnimation: AnimationInfo = {
        name: 'test.vrma',
        category: 'gesture',
        priority: 'normal',
        isLooping: false,
        canBeInterrupted: true
      };
      
      animationStore.playAnimation(testAnimation);
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('統計情報', () => {
    it('再生統計を取得できる', () => {
      const testAnimation: AnimationInfo = {
        name: 'test.vrma',
        category: 'gesture',
        priority: 'normal',
        isLooping: false,
        canBeInterrupted: true
      };
      
      animationStore.playAnimation(testAnimation);
      const stats = animationStore.getStats();
      
      expect(stats.totalPlayed).toBe(1);
      expect(stats.byCategory.gesture).toBe(1);
      expect(stats.currentAnimation).toBe('test.vrma');
    });

    it('カテゴリ別統計を正しく計算する', () => {
      const animations: AnimationInfo[] = [
        { name: 'gesture1.vrma', category: 'gesture', priority: 'normal', isLooping: false, canBeInterrupted: true },
        { name: 'emotion1.vrma', category: 'emotion', priority: 'high', isLooping: false, canBeInterrupted: true },
        { name: 'gesture2.vrma', category: 'gesture', priority: 'normal', isLooping: false, canBeInterrupted: true }
      ];
      
      animations.forEach(anim => {
        animationStore.playAnimation(anim);
        animationStore.stopAnimation();
      });
      
      const stats = animationStore.getStats();
      expect(stats.byCategory.gesture).toBe(2);
      expect(stats.byCategory.emotion).toBe(1);
    });
  });

  describe('設定管理', () => {
    it('アニメーション設定を更新できる', () => {
      const newSettings = {
        enableAutoPlay: false,
        defaultSpeed: 1.5,
        maxQueueLength: 5
      };
      
      animationStore.updateSettings(newSettings);
      const settings = animationStore.getSettings();
      
      expect(settings.enableAutoPlay).toBe(false);
      expect(settings.defaultSpeed).toBe(1.5);
      expect(settings.maxQueueLength).toBe(5);
    });

    it('設定をデフォルトにリセットできる', () => {
      animationStore.updateSettings({ defaultSpeed: 2.0 });
      animationStore.resetSettings();
      
      const settings = animationStore.getSettings();
      expect(settings.defaultSpeed).toBe(1.0); // デフォルト値
    });
  });

  describe('リセット機能', () => {
    it('ストア全体をリセットできる', () => {
      const testAnimation: AnimationInfo = {
        name: 'test.vrma',
        category: 'gesture',
        priority: 'normal',
        isLooping: false,
        canBeInterrupted: true
      };
      
      animationStore.playAnimation(testAnimation);
      animationStore.queueAnimation(testAnimation);
      
      animationStore.reset();
      
      const state = animationStore.getState();
      expect(state.currentAnimation).toBeNull();
      expect(state.isPlaying).toBe(false);
      expect(state.queue).toHaveLength(0);
      expect(state.history).toHaveLength(0);
    });
  });
});