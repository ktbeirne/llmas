import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest';
import * as THREE from 'three';

import { DebugManagerService } from './DebugManagerService';

// Mock dependencies
const mockVRMSetupManager = {
  getLoadedVRM: vi.fn()
};

const mockMouseHandler = {
  // Mock methods as needed
};

const mockCamera = new THREE.PerspectiveCamera();
const mockScene = new THREE.Scene();

const mockMouseFollowIntegration = {
  getMouseFollowIntegrationService: vi.fn(),
  getIdleMouseFollowIntegrationService: vi.fn()
};

const mockMouseFollowService = {
  getDebugInfo: vi.fn(),
  getStatus: vi.fn(),
  getOrchestrator: vi.fn(),
  getVRMAdapter: vi.fn()
};

const mockIdleMouseFollowService = {
  getDebugInfo: vi.fn(),
  getIntegratedStatus: vi.fn(),
  getPerformanceMetrics: vi.fn(),
  isIntegrationActive: vi.fn(),
  getIdleStateManager: vi.fn(),
  getMouseFollowService: vi.fn(),
  enableIntegration: vi.fn(),
  disableIntegration: vi.fn()
};

// Mock VRM
const mockVRM = {
  scene: new THREE.Group(),
  humanoid: {}
};

describe('DebugManagerService', () => {
  let debugManager: DebugManagerService;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Clear any existing debug functions
    const debugFunctions = [
      'debugVRM',
      'debugMouseHandler', 
      'testRaycast',
      'debugSpeechBubble',
      'debugCanvasTransparency',
      'debugMouseFollow',
      'debugIdleMouseFollow',
      'enableMouseFollow',
      'disableMouseFollow'
    ];

    debugFunctions.forEach(funcName => {
      delete (window as any)[funcName];
    });

    // Setup default mocks
    mockVRMSetupManager.getLoadedVRM.mockReturnValue(mockVRM);
    mockMouseFollowIntegration.getMouseFollowIntegrationService.mockReturnValue(mockMouseFollowService);
    mockMouseFollowIntegration.getIdleMouseFollowIntegrationService.mockReturnValue(mockIdleMouseFollowService);

    debugManager = new DebugManagerService();
  });

  describe('Service Initialization', () => {
    it('should initialize without dependencies', () => {
      expect(debugManager).toBeDefined();
    });

    it('should set dependencies correctly', () => {
      expect(() => {
        debugManager.setDependencies({
          vrmSetupManager: mockVRMSetupManager,
          mouseHandler: mockMouseHandler,
          camera: mockCamera,
          scene: mockScene,
          mouseFollowIntegration: mockMouseFollowIntegration
        });
      }).not.toThrow();
    });

    it('should set dependencies without optional mouse follow integration', () => {
      expect(() => {
        debugManager.setDependencies({
          vrmSetupManager: mockVRMSetupManager,
          mouseHandler: mockMouseHandler,
          camera: mockCamera,
          scene: mockScene
        });
      }).not.toThrow();
    });
  });

  describe('Debug Function Setup', () => {
    beforeEach(() => {
      debugManager.setDependencies({
        vrmSetupManager: mockVRMSetupManager,
        mouseHandler: mockMouseHandler,
        camera: mockCamera,
        scene: mockScene,
        mouseFollowIntegration: mockMouseFollowIntegration
      });
    });

    it('should set up all debug functions', () => {
      debugManager.setupDebugFunctions();

      expect((window as any).debugVRM).toBeDefined();
      expect((window as any).debugMouseHandler).toBeDefined();
      expect((window as any).testRaycast).toBeDefined();
      expect((window as any).debugSpeechBubble).toBeDefined();
      expect((window as any).debugCanvasTransparency).toBeDefined();
      expect((window as any).debugMouseFollow).toBeDefined();
      expect((window as any).debugIdleMouseFollow).toBeDefined();
      expect((window as any).enableMouseFollow).toBeDefined();
      expect((window as any).disableMouseFollow).toBeDefined();
    });

    it('should make debug functions callable', () => {
      debugManager.setupDebugFunctions();

      expect(typeof (window as any).debugVRM).toBe('function');
      expect(typeof (window as any).debugMouseHandler).toBe('function');
      expect(typeof (window as any).testRaycast).toBe('function');
    });
  });

  describe('VRM Debug Function', () => {
    beforeEach(() => {
      debugManager.setDependencies({
        vrmSetupManager: mockVRMSetupManager,
        mouseHandler: mockMouseHandler,
        camera: mockCamera,
        scene: mockScene,
        mouseFollowIntegration: mockMouseFollowIntegration
      });
      debugManager.setupDebugFunctions();
    });

    it('should return VRM debug information when VRM is loaded', () => {
      mockScene.children = [new THREE.Mesh()]; // Add some children
      
      const result = (window as any).debugVRM();

      expect(result).toHaveProperty('vrmLoaded', true);
      expect(result).toHaveProperty('cameraReady', true);
      expect(result).toHaveProperty('sceneChildren');
      expect(result).toHaveProperty('vrmChildren');
    });

    it('should handle case when VRM is not loaded', () => {
      mockVRMSetupManager.getLoadedVRM.mockReturnValue(null);

      const result = (window as any).debugVRM();

      expect(result.vrmLoaded).toBe(false);
      expect(result.vrmChildren).toBe(0);
    });

    it('should handle missing dependencies', () => {
      const managerWithoutDeps = new DebugManagerService();
      managerWithoutDeps.setupDebugFunctions();

      const result = (window as any).debugVRM();

      expect(result).toHaveProperty('error');
    });
  });

  describe('Mouse Handler Debug Function', () => {
    beforeEach(() => {
      debugManager.setDependencies({
        vrmSetupManager: mockVRMSetupManager,
        mouseHandler: mockMouseHandler,
        camera: mockCamera,
        scene: mockScene,
        mouseFollowIntegration: mockMouseFollowIntegration
      });
      debugManager.setupDebugFunctions();

      // Mock DOM elements
      const mockCanvas = document.createElement('canvas');
      mockCanvas.id = 'vrm-canvas';
      mockCanvas.offsetWidth = 800;
      mockCanvas.offsetHeight = 600;
      document.body.appendChild(mockCanvas);
    });

    afterEach(() => {
      // Clean up DOM
      const canvas = document.getElementById('vrm-canvas');
      if (canvas) {
        canvas.remove();
      }
    });

    it('should return mouse handler debug information', () => {
      const result = (window as any).debugMouseHandler();

      expect(result).toHaveProperty('canvasFound', true);
      expect(result).toHaveProperty('canvasBounds');
    });

    it('should handle missing canvas element', () => {
      const canvas = document.getElementById('vrm-canvas');
      if (canvas) canvas.remove();

      const result = (window as any).debugMouseHandler();

      expect(result.canvasFound).toBe(false);
    });
  });

  describe('Raycast Test Function', () => {
    beforeEach(() => {
      debugManager.setDependencies({
        vrmSetupManager: mockVRMSetupManager,
        mouseHandler: mockMouseHandler,
        camera: mockCamera,
        scene: mockScene,
        mouseFollowIntegration: mockMouseFollowIntegration
      });
      debugManager.setupDebugFunctions();
    });

    it('should perform raycast test with VRM loaded', () => {
      const result = (window as any).testRaycast(0, 0);

      expect(typeof result).toBe('boolean');
    });

    it('should handle case when VRM is not loaded', () => {
      mockVRMSetupManager.getLoadedVRM.mockReturnValue(null);

      const result = (window as any).testRaycast(0, 0);

      expect(result).toBe(false);
    });

    it('should handle missing dependencies', () => {
      const managerWithoutDeps = new DebugManagerService();
      managerWithoutDeps.setupDebugFunctions();

      const result = (window as any).testRaycast(0, 0);

      expect(result).toBe(false);
    });
  });

  describe('Mouse Follow Debug Functions', () => {
    beforeEach(() => {
      debugManager.setDependencies({
        vrmSetupManager: mockVRMSetupManager,
        mouseHandler: mockMouseHandler,
        camera: mockCamera,
        scene: mockScene,
        mouseFollowIntegration: mockMouseFollowIntegration
      });
      debugManager.setupDebugFunctions();
    });

    it('should debug basic mouse follow service', () => {
      mockMouseFollowService.getDebugInfo.mockReturnValue({ test: 'debug' });
      mockMouseFollowService.getStatus.mockReturnValue({ enabled: true });

      const result = (window as any).debugMouseFollow();

      expect(result.available).toBe(true);
      expect(result).toHaveProperty('debugInfo');
      expect(result).toHaveProperty('status');
    });

    it('should debug complete mouse follow integration', () => {
      mockIdleMouseFollowService.getDebugInfo.mockReturnValue({ integration: 'debug' });
      mockIdleMouseFollowService.getIntegratedStatus.mockReturnValue({ active: true });
      mockIdleMouseFollowService.getPerformanceMetrics.mockReturnValue({ uptime: 1000 });
      mockIdleMouseFollowService.isIntegrationActive.mockReturnValue(true);

      const result = (window as any).debugIdleMouseFollow();

      expect(result.available).toBe(true);
      expect(result).toHaveProperty('debugInfo');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('metrics');
      expect(result.isActive).toBe(true);
    });

    it('should handle enable mouse follow', async () => {
      mockIdleMouseFollowService.enableIntegration.mockResolvedValue(undefined);

      const result = await (window as any).enableMouseFollow();

      expect(result).toBe(true);
      expect(mockIdleMouseFollowService.enableIntegration).toHaveBeenCalled();
    });

    it('should handle disable mouse follow', async () => {
      mockIdleMouseFollowService.disableIntegration.mockResolvedValue(undefined);

      const result = await (window as any).disableMouseFollow();

      expect(result).toBe(true);
      expect(mockIdleMouseFollowService.disableIntegration).toHaveBeenCalled();
    });

    it('should handle mouse follow functions when service is not available', () => {
      mockMouseFollowIntegration.getMouseFollowIntegrationService.mockReturnValue(null);
      mockMouseFollowIntegration.getIdleMouseFollowIntegrationService.mockReturnValue(null);

      const basicResult = (window as any).debugMouseFollow();
      const completeResult = (window as any).debugIdleMouseFollow();

      expect(basicResult.available).toBe(false);
      expect(completeResult.available).toBe(false);
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      debugManager.setDependencies({
        vrmSetupManager: mockVRMSetupManager,
        mouseHandler: mockMouseHandler,
        camera: mockCamera,
        scene: mockScene,
        mouseFollowIntegration: mockMouseFollowIntegration
      });
      debugManager.setupDebugFunctions();
    });

    it('should remove all debug functions from global scope', () => {
      // Verify functions exist
      expect((window as any).debugVRM).toBeDefined();
      expect((window as any).debugMouseHandler).toBeDefined();

      debugManager.cleanup();

      // Verify functions are removed
      expect((window as any).debugVRM).toBeUndefined();
      expect((window as any).debugMouseHandler).toBeUndefined();
      expect((window as any).testRaycast).toBeUndefined();
      expect((window as any).debugSpeechBubble).toBeUndefined();
      expect((window as any).debugCanvasTransparency).toBeUndefined();
      expect((window as any).debugMouseFollow).toBeUndefined();
      expect((window as any).debugIdleMouseFollow).toBeUndefined();
      expect((window as any).enableMouseFollow).toBeUndefined();
      expect((window as any).disableMouseFollow).toBeUndefined();
    });

    it('should handle multiple cleanup calls safely', () => {
      debugManager.cleanup();
      expect(() => debugManager.cleanup()).not.toThrow();
    });
  });

  describe('Speech Bubble and Canvas Transparency Debug', () => {
    beforeEach(() => {
      debugManager.setDependencies({
        vrmSetupManager: mockVRMSetupManager,
        mouseHandler: mockMouseHandler,
        camera: mockCamera,
        scene: mockScene,
        mouseFollowIntegration: mockMouseFollowIntegration
      });
      debugManager.setupDebugFunctions();
    });

    it('should debug speech bubble functionality', () => {
      const result = (window as any).debugSpeechBubble();

      expect(result).toHaveProperty('electronAPI');
      expect(result).toHaveProperty('domElements');
    });

    it('should debug canvas transparency', () => {
      const result = (window as any).debugCanvasTransparency();

      expect(result).toHaveProperty('canvasArea');
      expect(result).toHaveProperty('vrmCanvas');
      expect(result).toHaveProperty('body');
    });
  });
});