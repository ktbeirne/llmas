/**
 * VRM Store Tests - FSD Phase 2
 * TDDアプローチでVRM状態管理をテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useVRMStore } from './vrm-store';
import type { VRM } from '@pixiv/three-vrm';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';

// モック
vi.mock('@shared/lib/app-event-bus', () => ({
  eventBus: {
    emit: vi.fn()
  }
}));

// VRMモックオブジェクト
const mockVRM = {
  scene: {
    name: 'test-vrm'
  },
  humanoid: {
    getNormalizedBoneNode: vi.fn()
  },
  expressionManager: {
    expressionMap: {
      happy: {},
      sad: {},
      angry: {}
    },
    customExpressionMap: {},
    setValue: vi.fn(),
    getValue: vi.fn().mockReturnValue(0),
    getExpression: vi.fn().mockReturnValue({}),
    destroy: vi.fn()
  },
  lookAt: {
    target: null,
    destroy: vi.fn()
  },
  update: vi.fn()
} as unknown as VRM;

// VRMAnimationモックオブジェクト
const mockAnimation = {
  humanoidTracks: {},
  expressionTracks: {},
  lookAtTrack: null
} as unknown as VRMAnimation;

describe('VRMStore', () => {
  beforeEach(() => {
    // ストアをリセット
    useVRMStore.setState({
      vrm: null,
      modelUrl: null,
      isLoading: false,
      loadError: null,
      currentAnimation: null,
      animationUrl: null,
      animationClip: null,
      animationMixer: null,
      isAnimationPlaying: false,
      currentExpression: null,
      expressionIntensity: 1.0,
      lookAtEnabled: true,
      lookAtTarget: null,
      blinkEnabled: true,
      blinkInterval: 3000
    });
    vi.clearAllMocks();
  });

  describe('モデル管理', () => {
    it('should set VRM model', () => {
      const { setVRM } = useVRMStore.getState();
      
      setVRM(mockVRM, 'test-model.vrm');
      
      const state = useVRMStore.getState();
      expect(state.vrm).toBe(mockVRM);
      expect(state.modelUrl).toBe('test-model.vrm');
    });

    it('should set loading state', () => {
      const { setLoading } = useVRMStore.getState();
      
      setLoading(true);
      expect(useVRMStore.getState().isLoading).toBe(true);
      
      setLoading(false);
      expect(useVRMStore.getState().isLoading).toBe(false);
    });

    it('should set load error', () => {
      const { setLoadError } = useVRMStore.getState();
      
      setLoadError('Failed to load model');
      
      const state = useVRMStore.getState();
      expect(state.loadError).toBe('Failed to load model');
      expect(state.isLoading).toBe(false);
    });

    it('should emit model loaded event', () => {
      const { eventBus } = require('@shared/lib/app-event-bus');
      const { setVRM } = useVRMStore.getState();
      
      setVRM(mockVRM, 'test-model.vrm');
      
      expect(eventBus.emit).toHaveBeenCalledWith('vrm:model-loaded', {
        modelPath: 'test-model.vrm'
      });
    });
  });

  describe('アニメーション管理', () => {
    it('should set animation', () => {
      const { setAnimation } = useVRMStore.getState();
      
      setAnimation(mockAnimation, 'test-animation.vrma');
      
      const state = useVRMStore.getState();
      expect(state.currentAnimation).toBe(mockAnimation);
      expect(state.animationUrl).toBe('test-animation.vrma');
    });

    it('should set animation playing state', () => {
      const { setAnimationPlaying } = useVRMStore.getState();
      
      setAnimationPlaying(true);
      expect(useVRMStore.getState().isAnimationPlaying).toBe(true);
      
      setAnimationPlaying(false);
      expect(useVRMStore.getState().isAnimationPlaying).toBe(false);
    });

    it('should emit animation events', () => {
      const { eventBus } = require('@shared/lib/app-event-bus');
      const { setAnimationPlaying } = useVRMStore.getState();
      
      setAnimationPlaying(true);
      expect(eventBus.emit).toHaveBeenCalledWith('vrm:animation-started', {
        name: '',
        isIdle: false
      });
      
      setAnimationPlaying(false);
      expect(eventBus.emit).toHaveBeenCalledWith('vrm:animation-ended', {
        name: ''
      });
    });
  });

  describe('表情管理', () => {
    beforeEach(() => {
      useVRMStore.setState({ vrm: mockVRM });
    });

    it('should apply expression', () => {
      const { applyExpression } = useVRMStore.getState();
      
      const result = applyExpression('happy', 0.8);
      
      expect(result).toBe(true);
      expect(useVRMStore.getState().currentExpression).toBe('happy');
      expect(useVRMStore.getState().expressionIntensity).toBe(0.8);
    });

    it('should return false when VRM is not loaded', () => {
      useVRMStore.setState({ vrm: null });
      const { applyExpression } = useVRMStore.getState();
      
      const result = applyExpression('happy');
      
      expect(result).toBe(false);
    });

    it('should reset all expressions', () => {
      const { resetAllExpressions } = useVRMStore.getState();
      useVRMStore.setState({ currentExpression: 'happy' });
      
      resetAllExpressions();
      
      expect(useVRMStore.getState().currentExpression).toBeNull();
    });

    it('should get available expressions', () => {
      const { getAvailableExpressions } = useVRMStore.getState();
      
      const expressions = getAvailableExpressions();
      
      expect(expressions).toHaveLength(3);
      expect(expressions.map(e => e.name)).toContain('happy');
      expect(expressions.map(e => e.name)).toContain('sad');
      expect(expressions.map(e => e.name)).toContain('angry');
    });

    it('should emit expression change event', () => {
      const { eventBus } = require('@shared/lib/app-event-bus');
      const { applyExpression } = useVRMStore.getState();
      
      applyExpression('happy');
      
      expect(eventBus.emit).toHaveBeenCalledWith('vrm:expression-changed', {
        expression: 'happy',
        intensity: 1
      });
    });
  });

  describe('LookAt管理', () => {
    it('should toggle lookAt', () => {
      const { toggleLookAt } = useVRMStore.getState();
      
      toggleLookAt();
      expect(useVRMStore.getState().lookAtEnabled).toBe(false);
      
      toggleLookAt();
      expect(useVRMStore.getState().lookAtEnabled).toBe(true);
    });

    it('should set lookAt target', () => {
      const mockTarget = { name: 'target' } as any;
      const { setLookAtTarget } = useVRMStore.getState();
      
      setLookAtTarget(mockTarget);
      
      expect(useVRMStore.getState().lookAtTarget).toBe(mockTarget);
    });
  });

  describe('まばたき管理', () => {
    it('should toggle blink', () => {
      const { toggleBlink } = useVRMStore.getState();
      
      toggleBlink();
      expect(useVRMStore.getState().blinkEnabled).toBe(false);
      
      toggleBlink();
      expect(useVRMStore.getState().blinkEnabled).toBe(true);
    });

    it('should set blink interval', () => {
      const { setBlinkInterval } = useVRMStore.getState();
      
      setBlinkInterval(5000);
      
      expect(useVRMStore.getState().blinkInterval).toBe(5000);
    });
  });

  describe('リセット処理', () => {
    it('should reset store', () => {
      const { reset } = useVRMStore.getState();
      
      // 状態を変更
      useVRMStore.setState({
        vrm: mockVRM,
        modelUrl: 'test.vrm',
        currentExpression: 'happy',
        isAnimationPlaying: true
      });
      
      reset();
      
      const state = useVRMStore.getState();
      expect(state.vrm).toBeNull();
      expect(state.modelUrl).toBeNull();
      expect(state.currentExpression).toBeNull();
      expect(state.isAnimationPlaying).toBe(false);
    });
  });
});