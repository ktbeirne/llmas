/**
 * Animation Manager Tests - FSD Phase 2
 * VRMアニメーション管理機能のテスト
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { AnimationManager } from './animation-manager';
import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';

// モック
vi.mock('@pixiv/three-vrm-animation', () => ({
  createVRMAnimationClip: vi.fn()
}));

// VRMモック
const mockVRM = {
  scene: new THREE.Scene(),
  humanoid: {},
  expressionManager: {},
  lookAt: {}
} as unknown as VRM;

// VRMAnimationモック
const mockAnimation = {
  humanoidTracks: {},
  expressionTracks: {},
  lookAtTrack: null
} as unknown as VRMAnimation;

// AnimationClipモック
const mockClip = {
  name: 'test-animation',
  duration: 2.0,
  tracks: []
} as unknown as THREE.AnimationClip;

describe('AnimationManager', () => {
  let manager: AnimationManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AnimationManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('初期化', () => {
    it('should initialize animation mixer', () => {
      const result = manager.initialize(mockVRM, mockAnimation);
      
      expect(result).toBe(true);
      expect(manager.isInitialized()).toBe(true);
    });

    it('should handle initialization without animation', () => {
      const result = manager.initialize(mockVRM, null);
      
      expect(result).toBe(false);
      expect(manager.isInitialized()).toBe(false);
    });

    it('should create animation clip', () => {
      const { createVRMAnimationClip } = require('@pixiv/three-vrm-animation');
      createVRMAnimationClip.mockReturnValue(mockClip);
      
      manager.initialize(mockVRM, mockAnimation);
      
      expect(createVRMAnimationClip).toHaveBeenCalledWith(mockAnimation, mockVRM);
    });

    it('should handle clip creation failure', () => {
      const { createVRMAnimationClip } = require('@pixiv/three-vrm-animation');
      createVRMAnimationClip.mockReturnValue(null);
      
      const result = manager.initialize(mockVRM, mockAnimation);
      
      expect(result).toBe(false);
    });
  });

  describe('アニメーション再生', () => {
    beforeEach(() => {
      const { createVRMAnimationClip } = require('@pixiv/three-vrm-animation');
      createVRMAnimationClip.mockReturnValue(mockClip);
      manager.initialize(mockVRM, mockAnimation);
    });

    it('should play animation', () => {
      const result = manager.play();
      
      expect(result).toBe(true);
      expect(manager.isPlaying()).toBe(true);
    });

    it('should stop animation', () => {
      manager.play();
      manager.stop();
      
      expect(manager.isPlaying()).toBe(false);
    });

    it('should pause animation', () => {
      manager.play();
      manager.pause();
      
      expect(manager.isPlaying()).toBe(false);
      expect(manager.isPaused()).toBe(true);
    });

    it('should resume from pause', () => {
      manager.play();
      manager.pause();
      manager.resume();
      
      expect(manager.isPlaying()).toBe(true);
      expect(manager.isPaused()).toBe(false);
    });
  });

  describe('アニメーション更新', () => {
    beforeEach(() => {
      const { createVRMAnimationClip } = require('@pixiv/three-vrm-animation');
      createVRMAnimationClip.mockReturnValue(mockClip);
      manager.initialize(mockVRM, mockAnimation);
    });

    it('should update animation mixer', () => {
      const mixerUpdateSpy = vi.spyOn(manager['animationMixer']!, 'update');
      
      manager.update(0.016);
      
      expect(mixerUpdateSpy).toHaveBeenCalledWith(0.016);
    });

    it('should not update when not initialized', () => {
      const uninitializedManager = new AnimationManager();
      
      // updateを呼んでもエラーにならない
      expect(() => uninitializedManager.update(0.016)).not.toThrow();
    });
  });

  describe('アニメーション情報', () => {
    it('should detect idle animation', () => {
      const idleClip = { ...mockClip, name: 'idle' };
      const { createVRMAnimationClip } = require('@pixiv/three-vrm-animation');
      createVRMAnimationClip.mockReturnValue(idleClip);
      
      manager.initialize(mockVRM, mockAnimation);
      
      expect(manager.isIdleAnimation()).toBe(true);
    });

    it('should detect non-idle animation', () => {
      const actionClip = { ...mockClip, name: 'wave' };
      const { createVRMAnimationClip } = require('@pixiv/three-vrm-animation');
      createVRMAnimationClip.mockReturnValue(actionClip);
      
      manager.initialize(mockVRM, mockAnimation);
      
      expect(manager.isIdleAnimation()).toBe(false);
    });

    it('should get current animation name', () => {
      const { createVRMAnimationClip } = require('@pixiv/three-vrm-animation');
      createVRMAnimationClip.mockReturnValue(mockClip);
      
      manager.initialize(mockVRM, mockAnimation);
      
      expect(manager.getCurrentAnimationName()).toBe('test-animation');
    });

    it('should return null when no animation', () => {
      expect(manager.getCurrentAnimationName()).toBeNull();
    });
  });

  describe('再生速度制御', () => {
    beforeEach(() => {
      const { createVRMAnimationClip } = require('@pixiv/three-vrm-animation');
      createVRMAnimationClip.mockReturnValue(mockClip);
      manager.initialize(mockVRM, mockAnimation);
      manager.play();
    });

    it('should set playback speed', () => {
      manager.setPlaybackSpeed(2.0);
      
      expect(manager['animationAction']!.timeScale).toBe(2.0);
    });

    it('should clamp playback speed', () => {
      manager.setPlaybackSpeed(-1);
      expect(manager['animationAction']!.timeScale).toBe(0.1);
      
      manager.setPlaybackSpeed(10);
      expect(manager['animationAction']!.timeScale).toBe(5.0);
    });
  });

  describe('リソース管理', () => {
    it('should dispose resources', () => {
      const { createVRMAnimationClip } = require('@pixiv/three-vrm-animation');
      createVRMAnimationClip.mockReturnValue(mockClip);
      
      manager.initialize(mockVRM, mockAnimation);
      manager.play();
      
      const mixerSpy = vi.spyOn(manager['animationMixer']!, 'stopAllAction');
      const disposeSpy = vi.spyOn(manager['animationMixer']!, 'dispose');
      
      manager.dispose();
      
      expect(mixerSpy).toHaveBeenCalled();
      expect(disposeSpy).toHaveBeenCalled();
      expect(manager.isInitialized()).toBe(false);
    });
  });
});