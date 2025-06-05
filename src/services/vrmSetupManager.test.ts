/**
 * VRMSetupManager Service Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { VRMSetupManager, createVRMSetupManager } from './vrmSetupManager';
import { CameraManager } from './cameraManager';

// Mock vrmController
vi.mock('../vrmController', () => ({
  loadVRM: vi.fn(),
  loadAnimation: vi.fn()
}));

import { loadVRM, loadAnimation } from '../vrmController';

const createMockCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  return canvas;
};

const createMockVRM = (): VRM => {
  const mockScene = new THREE.Group();
  const mockBoneNode = new THREE.Object3D();
  mockBoneNode.position.set(0, 1.5, 0);

  const mockVRM = {
    scene: mockScene,
    humanoid: {
      getBoneNode: vi.fn().mockReturnValue(mockBoneNode)
    },
    lookAt: {
      target: null
    }
  } as unknown as VRM;

  return mockVRM;
};

describe('VRMSetupManager', () => {
  let scene: THREE.Scene;
  let controls: OrbitControls;
  let cameraManager: CameraManager;
  let camera: THREE.PerspectiveCamera;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    // Setup THREE.js objects
    scene = new THREE.Scene();
    canvas = createMockCanvas();
    camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
    controls = new OrbitControls(camera, canvas);
    cameraManager = new CameraManager(camera, controls);

    // Mock window methods
    (global as any).window = {
      ...global.window,
      addEventListener: vi.fn(),
      innerWidth: 800,
      innerHeight: 600
    };

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('factory function', () => {
    it('should create VRMSetupManager instance', () => {
      const manager = createVRMSetupManager(scene, controls, cameraManager);
      expect(manager).toBeInstanceOf(VRMSetupManager);
    });
  });

  describe('initialization', () => {
    it('should be created with correct initial state', () => {
      const manager = new VRMSetupManager(scene, controls, cameraManager);
      expect(manager).toBeDefined();
    });

    it('should create and add lookAtTarget to scene', () => {
      const addSpy = vi.spyOn(scene, 'add');
      new VRMSetupManager(scene, controls, cameraManager);
      
      expect(addSpy).toHaveBeenCalledWith(expect.any(THREE.Object3D));
    });

    it('should setup mouse look-at listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      new VRMSetupManager(scene, controls, cameraManager);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    });

    it('should set initial lookAtTarget position', () => {
      const manager = new VRMSetupManager(scene, controls, cameraManager);
      
      // Check that lookAtTarget was added to scene with correct position
      expect(scene.children).toHaveLength(1);
      const lookAtTarget = scene.children[0];
      expect(lookAtTarget.position.x).toBe(0);
      expect(lookAtTarget.position.y).toBe(1.3);
      expect(lookAtTarget.position.z).toBe(0.5);
    });
  });

  describe('VRM initialization', () => {
    let manager: VRMSetupManager;

    beforeEach(() => {
      manager = new VRMSetupManager(scene, controls, cameraManager);
    });

    it('should call loadVRM with correct parameters', async () => {
      vi.mocked(loadVRM).mockImplementation((path, scene, callback) => {
        if (callback) callback(createMockVRM());
      });

      await manager.initializeVRM();

      expect(loadVRM).toHaveBeenCalledWith('/avatar.vrm', scene, expect.any(Function));
    });

    it('should call loadAnimation after VRM is loaded', async () => {
      vi.mocked(loadVRM).mockImplementation((path, scene, callback) => {
        if (callback) callback(createMockVRM());
      });
      vi.mocked(loadAnimation).mockImplementation((path, callback) => {
        if (callback) callback();
      });

      await manager.initializeVRM();

      expect(loadAnimation).toHaveBeenCalledWith('/idle.vrma', expect.any(Function));
    });

    it('should handle VRM loading failure gracefully', async () => {
      vi.mocked(loadVRM).mockImplementation((path, scene, callback) => {
        if (callback) callback(null);
      });

      await expect(manager.initializeVRM()).resolves.not.toThrow();
      expect(console.error).toHaveBeenCalledWith('VRMSetupManager: VRMモデルのロードに失敗しました。');
    });

    it('should setup VRM after all assets are ready', async () => {
      const mockVRM = createMockVRM();
      const restoreCameraSettingsSpy = vi.spyOn(cameraManager, 'restoreCameraSettings').mockResolvedValue();
      
      vi.mocked(loadVRM).mockImplementation((path, scene, callback) => {
        if (callback) callback(mockVRM);
      });
      vi.mocked(loadAnimation).mockImplementation((path, callback) => {
        if (callback) callback();
      });

      await manager.initializeVRM();

      expect(restoreCameraSettingsSpy).toHaveBeenCalled();
    });

    it('should return loaded VRM instance', async () => {
      const mockVRM = createMockVRM();
      
      vi.mocked(loadVRM).mockImplementation((path, scene, callback) => {
        if (callback) callback(mockVRM);
      });
      vi.mocked(loadAnimation).mockImplementation((path, callback) => {
        if (callback) callback();
      });

      await manager.initializeVRM();

      expect(manager.getLoadedVRM()).toBe(mockVRM);
    });

    it('should return null when no VRM is loaded', () => {
      expect(manager.getLoadedVRM()).toBe(null);
    });
  });

  describe('onAllAssetsReady functionality', () => {
    let manager: VRMSetupManager;
    let mockVRM: VRM;

    beforeEach(() => {
      manager = new VRMSetupManager(scene, controls, cameraManager);
      mockVRM = createMockVRM();
    });

    it('should setup OrbitControls target when VRM has hips bone', async () => {
      const targetCopySpy = vi.spyOn(controls.target, 'copy');
      const controlsUpdateSpy = vi.spyOn(controls, 'update');

      vi.mocked(loadVRM).mockImplementation((path, scene, callback) => {
        if (callback) callback(mockVRM);
      });
      vi.mocked(loadAnimation).mockImplementation((path, callback) => {
        if (callback) callback();
      });

      await manager.initializeVRM();

      expect(mockVRM.humanoid.getBoneNode).toHaveBeenCalledWith(VRMHumanBoneName.Hips);
      expect(targetCopySpy).toHaveBeenCalled();
      expect(controlsUpdateSpy).toHaveBeenCalled();
    });

    it('should setup lookAt target when VRM has head bone', async () => {
      const headNode = new THREE.Object3D();
      headNode.position.set(0, 1.7, 0);
      
      vi.mocked(mockVRM.humanoid.getBoneNode)
        .mockReturnValueWhen(VRMHumanBoneName.Hips, new THREE.Object3D())
        .mockReturnValueWhen(VRMHumanBoneName.Head, headNode);

      vi.mocked(loadVRM).mockImplementation((path, scene, callback) => {
        if (callback) callback(mockVRM);
      });
      vi.mocked(loadAnimation).mockImplementation((path, callback) => {
        if (callback) callback();
      });

      await manager.initializeVRM();

      expect(mockVRM.humanoid.getBoneNode).toHaveBeenCalledWith(VRMHumanBoneName.Head);
      
      // Check that lookAtTarget Y position was updated
      const lookAtTarget = scene.children[0];
      expect(lookAtTarget.position.y).toBe(1.7);
    });

    it('should setup VRM lookAt target reference', async () => {
      vi.mocked(loadVRM).mockImplementation((path, scene, callback) => {
        if (callback) callback(mockVRM);
      });
      vi.mocked(loadAnimation).mockImplementation((path, callback) => {
        if (callback) callback();
      });

      await manager.initializeVRM();

      const lookAtTarget = scene.children[0];
      expect(mockVRM.lookAt.target).toBe(lookAtTarget);
    });

    it('should handle VRM without hips bone gracefully', async () => {
      vi.mocked(mockVRM.humanoid.getBoneNode).mockReturnValue(null);

      vi.mocked(loadVRM).mockImplementation((path, scene, callback) => {
        if (callback) callback(mockVRM);
      });
      vi.mocked(loadAnimation).mockImplementation((path, callback) => {
        if (callback) callback();
      });

      await expect(manager.initializeVRM()).resolves.not.toThrow();
    });

    it('should handle VRM without head bone gracefully', async () => {
      const hipsNode = new THREE.Object3D();
      vi.mocked(mockVRM.humanoid.getBoneNode)
        .mockReturnValueWhen(VRMHumanBoneName.Hips, hipsNode)
        .mockReturnValueWhen(VRMHumanBoneName.Head, null);

      vi.mocked(loadVRM).mockImplementation((path, scene, callback) => {
        if (callback) callback(mockVRM);
      });
      vi.mocked(loadAnimation).mockImplementation((path, callback) => {
        if (callback) callback();
      });

      await expect(manager.initializeVRM()).resolves.not.toThrow();
    });

    it('should handle VRM without humanoid gracefully', async () => {
      const vrmWithoutHumanoid = { ...mockVRM, humanoid: null };

      vi.mocked(loadVRM).mockImplementation((path, scene, callback) => {
        if (callback) callback(vrmWithoutHumanoid as VRM);
      });
      vi.mocked(loadAnimation).mockImplementation((path, callback) => {
        if (callback) callback();
      });

      await expect(manager.initializeVRM()).resolves.not.toThrow();
    });
  });

  describe('mouse look-at functionality', () => {
    let manager: VRMSetupManager;
    let mockVRM: VRM;

    beforeEach(() => {
      manager = new VRMSetupManager(scene, controls, cameraManager);
      mockVRM = createMockVRM();
    });

    it('should update lookAtTarget position on mouse move', () => {
      const mouseMoveHandler = vi.mocked(window.addEventListener).mock.calls
        .find(call => call[0] === 'mousemove')?.[1] as Function;

      if (mouseMoveHandler) {
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: 400, // Center of 800px window
          clientY: 300  // Center of 600px window
        });

        mouseMoveHandler(mouseEvent);

        const lookAtTarget = scene.children[0];
        expect(lookAtTarget.position.x).toBeCloseTo(0, 1); // Center X should be ~0
        expect(lookAtTarget.position.y).toBeCloseTo(1.3, 1); // Y should be around head height
        expect(lookAtTarget.position.z).toBeCloseTo(2.3, 1); // Z should be head Z + 2.0
      }
    });

    it('should use VRM head position when available', async () => {
      const headNode = new THREE.Object3D();
      headNode.position.set(0, 1.8, 0.5);
      
      vi.mocked(mockVRM.humanoid.getBoneNode)
        .mockReturnValue(headNode);

      // First initialize VRM
      vi.mocked(loadVRM).mockImplementation((path, scene, callback) => {
        if (callback) callback(mockVRM);
      });
      vi.mocked(loadAnimation).mockImplementation((path, callback) => {
        if (callback) callback();
      });

      await manager.initializeVRM();

      // Then test mouse move
      const mouseMoveHandler = vi.mocked(window.addEventListener).mock.calls
        .find(call => call[0] === 'mousemove')?.[1] as Function;

      if (mouseMoveHandler) {
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: 400,
          clientY: 300
        });

        mouseMoveHandler(mouseEvent);

        const lookAtTarget = scene.children[0];
        expect(lookAtTarget.position.z).toBeCloseTo(2.5, 1); // head Z (0.5) + 2.0
      }
    });

    it('should use fallback position when VRM head not available', () => {
      const mouseMoveHandler = vi.mocked(window.addEventListener).mock.calls
        .find(call => call[0] === 'mousemove')?.[1] as Function;

      if (mouseMoveHandler) {
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: 400,
          clientY: 300
        });

        mouseMoveHandler(mouseEvent);

        const lookAtTarget = scene.children[0];
        expect(lookAtTarget.position.y).toBeCloseTo(1.3, 1); // Fallback Y position
        expect(lookAtTarget.position.z).toBeCloseTo(2.3, 1); // Fallback Z (1.3) + 2.0
      }
    });

    it('should handle edge mouse positions correctly', () => {
      const mouseMoveHandler = vi.mocked(window.addEventListener).mock.calls
        .find(call => call[0] === 'mousemove')?.[1] as Function;

      if (mouseMoveHandler) {
        // Test left edge
        const leftEdgeEvent = new MouseEvent('mousemove', {
          clientX: 0,
          clientY: 300
        });

        mouseMoveHandler(leftEdgeEvent);

        const lookAtTarget = scene.children[0];
        expect(lookAtTarget.position.x).toBeCloseTo(-2, 1); // Left edge should be -2

        // Test right edge
        const rightEdgeEvent = new MouseEvent('mousemove', {
          clientX: 800,
          clientY: 300
        });

        mouseMoveHandler(rightEdgeEvent);

        expect(lookAtTarget.position.x).toBeCloseTo(2, 1); // Right edge should be 2
      }
    });

    it('should handle vertical mouse movement correctly', () => {
      const mouseMoveHandler = vi.mocked(window.addEventListener).mock.calls
        .find(call => call[0] === 'mousemove')?.[1] as Function;

      if (mouseMoveHandler) {
        // Test top edge
        const topEvent = new MouseEvent('mousemove', {
          clientX: 400,
          clientY: 0
        });

        mouseMoveHandler(topEvent);

        const lookAtTarget = scene.children[0];
        expect(lookAtTarget.position.y).toBeCloseTo(2.3, 1); // Top should be higher

        // Test bottom edge
        const bottomEvent = new MouseEvent('mousemove', {
          clientX: 400,
          clientY: 600
        });

        mouseMoveHandler(bottomEvent);

        expect(lookAtTarget.position.y).toBeCloseTo(0.3, 1); // Bottom should be lower
      }
    });
  });

  describe('edge cases', () => {
    it('should handle missing window dimensions', () => {
      (global as any).window.innerWidth = undefined;
      (global as any).window.innerHeight = undefined;

      const manager = new VRMSetupManager(scene, controls, cameraManager);

      const mouseMoveHandler = vi.mocked(window.addEventListener).mock.calls
        .find(call => call[0] === 'mousemove')?.[1] as Function;

      if (mouseMoveHandler) {
        expect(() => {
          const mouseEvent = new MouseEvent('mousemove', {
            clientX: 400,
            clientY: 300
          });
          mouseMoveHandler(mouseEvent);
        }).toThrow(); // Should throw because of division by undefined
      }
    });

    it('should handle null scene gracefully', () => {
      expect(() => {
        new VRMSetupManager(null as any, controls, cameraManager);
      }).toThrow(); // Should throw because scene.add will fail
    });

    it('should handle missing controls gracefully', () => {
      expect(() => {
        new VRMSetupManager(scene, null as any, cameraManager);
      }).not.toThrow(); // Should not throw immediately
    });

    it('should handle missing cameraManager gracefully', () => {
      expect(() => {
        new VRMSetupManager(scene, controls, null as any);
      }).not.toThrow(); // Should not throw immediately
    });
  });
});