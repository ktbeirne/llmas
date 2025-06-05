/**
 * FSD Feature Integration Tests - Phase 4
 * Feature層の統合テスト：複数のfeatureが正しく連携することを確認
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Feature modules for integration testing
import { useAnimation } from '@features/animation';
import { useVrmControl } from '@features/vrm-control';
import { useMouseFollow } from '@features/mouse-follow';
import { useChat } from '@features/chat';
import { useSettings } from '@features/settings';

describe('FSD Feature Integration Tests', () => {
  describe('Animation + VRM Control Integration', () => {
    it('アニメーション変更がVRM制御に正しく伝播される', async () => {
      const animation = useAnimation();
      const vrmControl = useVrmControl();

      // アニメーション開始
      const mockAnimationClip = {
        name: 'wave',
        duration: 2.0,
        priority: 'high' as const,
        canBeInterrupted: true
      };

      animation.store.getState().startAnimation(mockAnimationClip, {
        loop: false,
        crossFadeDuration: 0.3
      });

      // VRM storeが影響を受けることを確認
      const vrmState = vrmControl.store.getState();
      expect(vrmState.isAnimating).toBe(true);
    });

    it('VRMの状態変更がアニメーション管理に反映される', async () => {
      const animation = useAnimation();
      const vrmControl = useVrmControl();

      // VRMモデル読み込み
      vrmControl.store.getState().setLoadingState('loading');
      vrmControl.store.getState().setLoadingState('loaded');

      // アニメーションが利用可能になることを確認
      const animationState = animation.store.getState();
      expect(animationState.isInitialized).toBe(true);
    });
  });

  describe('Mouse Follow + VRM Control Integration', () => {
    it('マウス位置変更がVRMの頭部向きに反映される', async () => {
      const mouseFollow = useMouseFollow();
      const vrmControl = useVrmControl();

      // マウス位置を更新
      const mousePosition = { x: 100, y: 200 };
      mouseFollow.store.getState().updateMousePosition(mousePosition);

      // VRMの頭部向きが計算される
      const vrmState = vrmControl.store.getState();
      expect(vrmState.headOrientation).toBeDefined();
      expect(vrmState.headOrientation.yaw).toBeGreaterThan(-Math.PI);
      expect(vrmState.headOrientation.pitch).toBeGreaterThan(-Math.PI / 2);
    });

    it('VRMの状態がマウス追従の有効性に影響する', async () => {
      const mouseFollow = useMouseFollow();
      const vrmControl = useVrmControl();

      // VRMが読み込まれていない状態
      vrmControl.store.getState().setLoadingState('error');

      // マウス追従が無効化される
      const mouseState = mouseFollow.store.getState();
      expect(mouseState.isEnabled).toBe(false);
    });
  });

  describe('Chat + Animation Integration', () => {
    it('チャット感情分析結果がアニメーション選択に影響する', async () => {
      const chat = useChat();
      const animation = useAnimation();

      // 感情的なメッセージを送信
      const emotionalMessage = {
        role: 'user' as const,
        content: 'I am so happy today! 😊',
        timestamp: new Date().toISOString()
      };

      await chat.store.getState().addMessage(emotionalMessage);

      // 感情に応じたアニメーションが選択される
      const animationState = animation.store.getState();
      expect(animationState.suggestedAnimations).toContain('happy');
    });

    it('アニメーション中のチャット機能制限', async () => {
      const chat = useChat();
      const animation = useAnimation();

      // 重要なアニメーション開始
      const importantAnimation = {
        name: 'presentation',
        duration: 5.0,
        priority: 'critical' as const,
        canBeInterrupted: false
      };

      animation.store.getState().startAnimation(importantAnimation);

      // チャット応答が遅延される
      const chatState = chat.store.getState();
      expect(chatState.responseDelay).toBeGreaterThan(0);
    });
  });

  describe('Settings + All Features Integration', () => {
    it('設定変更が全てのfeatureに適切に反映される', async () => {
      const settings = useSettings();
      const animation = useAnimation();
      const vrmControl = useVrmControl();
      const mouseFollow = useMouseFollow();
      const chat = useChat();

      // 設定を更新
      const newSettings = {
        animation: {
          speed: 1.5,
          enabled: true
        },
        mouseFollow: {
          sensitivity: 0.8,
          enabled: true
        },
        chat: {
          responseSpeed: 'fast' as const
        }
      };

      await settings.store.updateSettings(newSettings);

      // 各featureが設定を反映
      expect(animation.store.getState().globalSpeed).toBe(1.5);
      expect(mouseFollow.store.getState().sensitivity).toBe(0.8);
      expect(chat.store.getState().settings.responseSpeed).toBe('fast');
    });

    it('設定の依存関係チェック', async () => {
      const settings = useSettings();

      // 矛盾する設定を試行
      const conflictingSettings = {
        animation: {
          enabled: false
        },
        mouseFollow: {
          enabled: true // アニメーション無効時はマウス追従も制限される
        }
      };

      await settings.store.updateSettings(conflictingSettings);

      // 依存関係が解決される
      const finalSettings = settings.store.getState();
      expect(finalSettings.mouseFollow.enabled).toBe(false);
    });
  });

  describe('Cross-Feature Event Communication', () => {
    it('イベントバスを通じたfeature間通信', async () => {
      const animation = useAnimation();
      const vrmControl = useVrmControl();
      const mockCallback = vi.fn();

      // イベント購読
      const unsubscribe = animation.store.subscribe(mockCallback);

      // 他のfeatureからのイベント発生
      vrmControl.store.getState().triggerExpression('surprised');

      // アニメーションfeatureが反応
      expect(mockCallback).toHaveBeenCalled();
      
      unsubscribe();
    });

    it('エラー伝播とリカバリー', async () => {
      const chat = useChat();
      const animation = useAnimation();
      const vrmControl = useVrmControl();

      // チャットエラーが発生
      const error = new Error('API connection failed');
      chat.store.getState().setError(error);

      // 他のfeatureがフォールバック動作
      const animationState = animation.store.getState();
      expect(animationState.fallbackMode).toBe(true);

      const vrmState = vrmControl.store.getState();
      expect(vrmState.offlineMode).toBe(true);
    });
  });

  describe('Performance Integration', () => {
    it('複数feature同時動作時のパフォーマンス', async () => {
      const startTime = performance.now();

      // 複数featureを同時に動作
      const promises = [
        useAnimation().store.getState().startAnimation({
          name: 'idle',
          duration: 1.0,
          priority: 'low',
          canBeInterrupted: true
        }),
        useMouseFollow().store.getState().updateMousePosition({ x: 50, y: 50 }),
        useChat().store.getState().addMessage({
          role: 'user',
          content: 'Hello',
          timestamp: new Date().toISOString()
        }),
        useVrmControl().store.getState().updateExpression('neutral'),
      ];

      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // パフォーマンス要件チェック（16ms = 60fps）
      expect(duration).toBeLessThan(16);
    });

    it('メモリリーク防止確認', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // 大量の操作を実行
      for (let i = 0; i < 1000; i++) {
        const animation = useAnimation();
        animation.store.getState().startAnimation({
          name: `test-${i}`,
          duration: 0.1,
          priority: 'low',
          canBeInterrupted: true
        });
      }

      // ガベージコレクション待機
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // メモリ増加が許容範囲内（10MB）
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Data Flow Integration', () => {
    it('Feature間のデータ整合性', async () => {
      const settings = useSettings();
      const mouseFollow = useMouseFollow();
      const vrmControl = useVrmControl();

      // 設定でマウス追従を無効化
      await settings.store.updateSettings({
        mouseFollow: { enabled: false }
      });

      // マウス位置を更新しても無効
      mouseFollow.store.getState().updateMousePosition({ x: 100, y: 100 });

      // VRMの頭部向きが変更されない
      const vrmState = vrmControl.store.getState();
      expect(vrmState.headOrientation.yaw).toBe(0);
      expect(vrmState.headOrientation.pitch).toBe(0);
    });

    it('競合状態の解決', async () => {
      const animation = useAnimation();

      // 同時に複数のアニメーション開始を試行
      const promises = [
        animation.store.getState().startAnimation({
          name: 'animation1',
          duration: 2.0,
          priority: 'high',
          canBeInterrupted: false
        }),
        animation.store.getState().startAnimation({
          name: 'animation2', 
          duration: 1.0,
          priority: 'medium',
          canBeInterrupted: true
        }),
        animation.store.getState().startAnimation({
          name: 'animation3',
          duration: 3.0,
          priority: 'critical',
          canBeInterrupted: false
        }),
      ];

      await Promise.allSettled(promises);

      // 優先度に基づいて正しく解決
      const state = animation.store.getState();
      expect(state.currentAnimation?.name).toBe('animation3'); // 最高優先度
    });
  });
});