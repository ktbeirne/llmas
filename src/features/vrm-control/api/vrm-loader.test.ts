/**
 * VRM Loader Tests - FSD Phase 2
 * VRMモデルとアニメーションのロード機能をテスト
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { VRMLoader } from './vrm-loader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
import * as THREE from 'three';

// モック
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: vi.fn().mockImplementation(() => ({
    register: vi.fn(),
    load: vi.fn()
  }))
}));

vi.mock('@pixiv/three-vrm', () => ({
  VRMLoaderPlugin: vi.fn(),
  VRMUtils: {
    rotateVRM0: vi.fn(),
    deepDispose: vi.fn()
  }
}));

vi.mock('@pixiv/three-vrm-animation', () => ({
  VRMAnimationLoaderPlugin: vi.fn(),
  createVRMAnimationClip: vi.fn()
}));

// VRMモック
const mockVRM = {
  scene: new THREE.Scene(),
  humanoid: {},
  expressionManager: {},
  lookAt: {},
  update: vi.fn()
};

// VRMAnimationモック
const mockAnimation = {
  humanoidTracks: {},
  expressionTracks: {},
  lookAtTrack: null
};

describe('VRMLoader', () => {
  let loader: VRMLoader;
  let mockGLTFLoader: any;
  let mockScene: THREE.Scene;

  beforeEach(() => {
    vi.clearAllMocks();
    mockScene = new THREE.Scene();
    loader = new VRMLoader();
    mockGLTFLoader = (GLTFLoader as Mock).mock.results[0].value;
  });

  describe('初期化', () => {
    it('should register VRM plugins', () => {
      expect(mockGLTFLoader.register).toHaveBeenCalledTimes(2);
      expect(VRMLoaderPlugin).toHaveBeenCalled();
      expect(VRMAnimationLoaderPlugin).toHaveBeenCalled();
    });
  });

  describe('VRMモデルロード', () => {
    it('should load VRM model successfully', async () => {
      const mockGLTF = {
        userData: { vrm: mockVRM }
      };
      
      mockGLTFLoader.load.mockImplementation((url: string, onLoad: Function) => {
        onLoad(mockGLTF);
      });
      
      const result = await loader.loadVRMModel('test-model.vrm', mockScene);
      
      expect(result).toBe(mockVRM);
      expect(mockScene.add).toHaveBeenCalledWith(mockVRM.scene);
      expect(VRMUtils.rotateVRM0).toHaveBeenCalledWith(mockVRM);
    });

    it('should handle loading error', async () => {
      const mockError = new Error('Load failed');
      
      mockGLTFLoader.load.mockImplementation((url: string, onLoad: Function, onProgress: Function, onError: Function) => {
        onError(mockError);
      });
      
      await expect(loader.loadVRMModel('test-model.vrm', mockScene))
        .rejects.toThrow('Load failed');
    });

    it('should report loading progress', async () => {
      const progressCallback = vi.fn();
      
      mockGLTFLoader.load.mockImplementation((url: string, onLoad: Function, onProgress: Function) => {
        onProgress({ loaded: 50, total: 100 });
        onLoad({ userData: { vrm: mockVRM } });
      });
      
      await loader.loadVRMModel('test-model.vrm', mockScene, progressCallback);
      
      expect(progressCallback).toHaveBeenCalledWith(50);
    });

    it('should dispose previous model', async () => {
      const previousVRM = {
        scene: {
          parent: mockScene,
          traverse: vi.fn()
        }
      };
      
      mockGLTFLoader.load.mockImplementation((url: string, onLoad: Function) => {
        onLoad({ userData: { vrm: mockVRM } });
      });
      
      // 最初のモデルをロード
      await loader.loadVRMModel('first-model.vrm', mockScene);
      
      // 2番目のモデルをロード（前のモデルは破棄される）
      const result = await loader.loadVRMModel('second-model.vrm', mockScene);
      
      expect(result).toBe(mockVRM);
    });

    it('should throw error when VRM data not found', async () => {
      const mockGLTF = {
        userData: {} // vrmプロパティなし
      };
      
      mockGLTFLoader.load.mockImplementation((url: string, onLoad: Function) => {
        onLoad(mockGLTF);
      });
      
      await expect(loader.loadVRMModel('test-model.vrm', mockScene))
        .rejects.toThrow('VRM data not found');
    });
  });

  describe('VRMアニメーションロード', () => {
    it('should load VRM animation successfully', async () => {
      const mockGLTF = {
        userData: { vrmAnimations: [mockAnimation] }
      };
      
      mockGLTFLoader.load.mockImplementation((url: string, onLoad: Function) => {
        onLoad(mockGLTF);
      });
      
      const result = await loader.loadVRMAnimation('test-animation.vrma');
      
      expect(result).toBe(mockAnimation);
    });

    it('should handle empty animation data', async () => {
      const mockGLTF = {
        userData: { vrmAnimations: [] }
      };
      
      mockGLTFLoader.load.mockImplementation((url: string, onLoad: Function) => {
        onLoad(mockGLTF);
      });
      
      const result = await loader.loadVRMAnimation('test-animation.vrma');
      
      expect(result).toBeNull();
    });

    it('should report animation loading progress', async () => {
      const progressCallback = vi.fn();
      
      mockGLTFLoader.load.mockImplementation((url: string, onLoad: Function, onProgress: Function) => {
        onProgress({ loaded: 30, total: 60 });
        onLoad({ userData: { vrmAnimations: [mockAnimation] } });
      });
      
      await loader.loadVRMAnimation('test-animation.vrma', progressCallback);
      
      expect(progressCallback).toHaveBeenCalledWith(50); // 30/60 = 50%
    });
  });

  describe('アニメーションクリップ作成', () => {
    it('should create animation clip', () => {
      const mockClip = new THREE.AnimationClip('test-clip', 1, []);
      const { createVRMAnimationClip } = require('@pixiv/three-vrm-animation');
      createVRMAnimationClip.mockReturnValue(mockClip);
      
      const clip = loader.createAnimationClip(mockAnimation as any, mockVRM as any);
      
      expect(clip).toBe(mockClip);
      expect(createVRMAnimationClip).toHaveBeenCalledWith(mockAnimation, mockVRM);
    });

    it('should return null when creation fails', () => {
      const { createVRMAnimationClip } = require('@pixiv/three-vrm-animation');
      createVRMAnimationClip.mockReturnValue(null);
      
      const clip = loader.createAnimationClip(mockAnimation as any, mockVRM as any);
      
      expect(clip).toBeNull();
    });
  });

  describe('リソース管理', () => {
    it('should get current model', async () => {
      mockGLTFLoader.load.mockImplementation((url: string, onLoad: Function) => {
        onLoad({ userData: { vrm: mockVRM } });
      });
      
      await loader.loadVRMModel('test-model.vrm', mockScene);
      
      expect(loader.getCurrentVRM()).toBe(mockVRM);
    });

    it('should dispose all resources', async () => {
      mockGLTFLoader.load.mockImplementation((url: string, onLoad: Function) => {
        onLoad({ userData: { vrm: mockVRM } });
      });
      
      await loader.loadVRMModel('test-model.vrm', mockScene);
      loader.dispose();
      
      expect(loader.getCurrentVRM()).toBeNull();
    });
  });
});