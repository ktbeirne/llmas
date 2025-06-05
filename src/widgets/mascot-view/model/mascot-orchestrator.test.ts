/**
 * MascotOrchestrator Tests - FSD Phase 3  
 * MascotOrchestratorのテスト（TDD: RED Phase）
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MascotOrchestrator } from './mascot-orchestrator';

// 各機能をモック
vi.mock('@features/mouse-follow', () => ({
  mouseFollowStore: {
    getState: vi.fn(() => ({
      isEnabled: true,
      disable: vi.fn(),
      enable: vi.fn()
    })),
    subscribe: vi.fn(() => vi.fn())
  }
}));

vi.mock('@features/vrm-control', () => ({
  vrmControlStore: {
    getState: vi.fn(() => ({
      vrm: { scene: {} },
      setExpression: vi.fn(),
      setHeadOrientation: vi.fn()
    })),
    subscribe: vi.fn(() => vi.fn())
  }
}));

vi.mock('@features/animation', () => ({
  animationStore: {
    getState: vi.fn(() => ({
      currentAnimation: null,
      isPlaying: false,
      playAnimation: vi.fn()
    })),
    subscribe: vi.fn(() => vi.fn())
  }
}));

vi.mock('@features/chat', () => ({
  chatStore: {
    getState: vi.fn(() => ({
      isLoading: false,
      isTyping: false,
      error: null
    })),
    subscribe: vi.fn(() => vi.fn())
  }
}));

vi.mock('@shared/lib/event-bus', () => ({
  eventBus: {
    subscribe: vi.fn(() => vi.fn()),
    emit: vi.fn()
  }
}));

describe('MascotOrchestrator', () => {
  let orchestrator: MascotOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new MascotOrchestrator();
  });

  afterEach(() => {
    orchestrator.destroy();
  });

  describe('初期化', () => {
    it('正常に初期化される', () => {
      expect(orchestrator).toBeInstanceOf(MascotOrchestrator);
    });

    it('統計情報を取得できる', () => {
      const stats = orchestrator.getStats();
      
      expect(stats).toHaveProperty('mouseFollow');
      expect(stats).toHaveProperty('vrm');
      expect(stats).toHaveProperty('animation');
      expect(stats).toHaveProperty('chat');
      expect(stats.vrm.isLoaded).toBe(true);
    });
  });

  describe('マニュアル制御', () => {
    it('表情を手動で制御できる', () => {
      expect(() => orchestrator.playExpression('happy', 0.8)).not.toThrow();
    });

    it('アニメーションを手動で制御できる', () => {
      expect(() => orchestrator.playAnimation('wave.vrma')).not.toThrow();
    });

    it('強制同期を実行できる', () => {
      expect(() => orchestrator.forceSynchronization()).not.toThrow();
    });
  });

  describe('クリーンアップ', () => {
    it('destroyで正常にクリーンアップされる', () => {
      expect(() => orchestrator.destroy()).not.toThrow();
    });

    it('複数回destroyを呼んでもエラーが発生しない', () => {
      orchestrator.destroy();
      expect(() => orchestrator.destroy()).not.toThrow();
    });
  });
});