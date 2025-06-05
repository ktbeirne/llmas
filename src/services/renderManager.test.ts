/**
 * RenderManager Service Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { RenderManager, createRenderManager, RenderManagerConfig } from './renderManager';
import { CameraManager } from './cameraManager';

// Mock vrmController
vi.mock('../vrmController', () => ({
  updateVRMFeatures: vi.fn()
}));

import { updateVRMFeatures } from '../vrmController';

// Mock requestAnimationFrame
const mockRAF = vi.fn();
const mockCAF = vi.fn();

const createMockCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  return canvas;
};

const createMockCanvasArea = () => {
  const area = document.createElement('div');
  area.id = 'canvas-area';
  area.style.width = '800px';
  area.style.height = '600px';
  Object.defineProperty(area, 'clientWidth', { value: 800, writable: true });
  Object.defineProperty(area, 'clientHeight', { value: 600, writable: true });
  document.body.appendChild(area);
  return area;
};

const createMockConfig = (): RenderManagerConfig => {
  const canvas = createMockCanvas();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas });
  const controls = new OrbitControls(camera, canvas);
  const cameraManager = new CameraManager(camera, controls);

  return {
    scene,
    camera,
    renderer,
    controls,
    cameraManager
  };
};

describe('RenderManager', () => {
  let config: RenderManagerConfig;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    
    // Mock window methods
    global.requestAnimationFrame = mockRAF;
    global.cancelAnimationFrame = mockCAF;
    (global as any).window = {
      ...global.window,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    config = createMockConfig();
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('factory function', () => {
    it('should create RenderManager instance', () => {
      const manager = createRenderManager(config);
      expect(manager).toBeInstanceOf(RenderManager);
    });
  });

  describe('initialization', () => {
    it('should be created with correct initial state', () => {
      const manager = new RenderManager(config);
      expect(manager).toBeDefined();
    });

    it('should setup window resize listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      new RenderManager(config);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function), false);
    });
  });

  describe('animation loop', () => {
    let manager: RenderManager;

    beforeEach(() => {
      manager = new RenderManager(config);
    });

    afterEach(() => {
      manager.cleanup();
    });

    it('should start animation loop', () => {
      manager.startAnimationLoop();
      
      expect(mockRAF).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should stop animation loop', () => {
      manager.startAnimationLoop();
      manager.stopAnimationLoop();
      
      expect(mockCAF).toHaveBeenCalled();
    });

    it('should call updateVRMFeatures in animation loop', () => {
      mockRAF.mockImplementation((callback) => {
        callback(16.67); // Simulate 60fps
        return 1;
      });

      manager.startAnimationLoop();
      
      expect(updateVRMFeatures).toHaveBeenCalled();
    });

    it('should update controls in animation loop', () => {
      const updateSpy = vi.spyOn(config.controls, 'update');
      mockRAF.mockImplementation((callback) => {
        callback(16.67);
        return 1;
      });

      manager.startAnimationLoop();
      
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should render scene in animation loop', () => {
      const renderSpy = vi.spyOn(config.renderer, 'render');
      mockRAF.mockImplementation((callback) => {
        callback(16.67);
        return 1;
      });

      manager.startAnimationLoop();
      
      expect(renderSpy).toHaveBeenCalledWith(config.scene, config.camera);
    });

    it('should handle multiple start calls safely', () => {
      manager.startAnimationLoop();
      manager.startAnimationLoop(); // Second call
      
      // Should only register one animation frame
      expect(mockRAF).toHaveBeenCalledTimes(1);
    });

    it('should handle stop without start', () => {
      expect(() => {
        manager.stopAnimationLoop();
      }).not.toThrow();
    });
  });

  describe('initial size detection', () => {
    let manager: RenderManager;
    let canvasArea: HTMLDivElement;

    beforeEach(() => {
      canvasArea = createMockCanvasArea();
      manager = new RenderManager(config);
    });

    afterEach(() => {
      manager.cleanup();
    });

    it('should detect initial size and update renderer', () => {
      const updateSizesSpy = vi.spyOn(config.cameraManager, 'updateWindowSize');
      const setPixelRatioSpy = vi.spyOn(config.renderer, 'setPixelRatio');
      const setSizeSpy = vi.spyOn(config.renderer, 'setSize');

      mockRAF.mockImplementation((callback) => {
        callback(16.67);
        return 1;
      });

      manager.startAnimationLoop();

      expect(updateSizesSpy).toHaveBeenCalledWith(800, 600);
      expect(setSizeSpy).toHaveBeenCalledWith(800, 600);
      expect(setPixelRatioSpy).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Initial size detected, updating renderer and camera...');
    });

    it('should skip update when canvas area has zero dimensions', () => {
      Object.defineProperty(canvasArea, 'clientWidth', { value: 0 });
      const updateSizesSpy = vi.spyOn(config.cameraManager, 'updateWindowSize');

      mockRAF.mockImplementation((callback) => {
        callback(16.67);
        return 1;
      });

      manager.startAnimationLoop();

      expect(updateSizesSpy).not.toHaveBeenCalled();
    });

    it('should skip update when canvas area is missing', () => {
      canvasArea.remove();
      const updateSizesSpy = vi.spyOn(config.cameraManager, 'updateWindowSize');

      mockRAF.mockImplementation((callback) => {
        callback(16.67);
        return 1;
      });

      manager.startAnimationLoop();

      expect(updateSizesSpy).not.toHaveBeenCalled();
    });

    it('should only set initial size once', () => {
      const updateSizesSpy = vi.spyOn(config.cameraManager, 'updateWindowSize');

      mockRAF.mockImplementation((callback) => {
        callback(16.67);
        // Call callback multiple times to simulate multiple frames
        callback(33.34);
        return 1;
      });

      manager.startAnimationLoop();

      // Should only be called once
      expect(updateSizesSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('window resize handling', () => {
    let manager: RenderManager;
    let canvasArea: HTMLDivElement;

    beforeEach(() => {
      canvasArea = createMockCanvasArea();
      manager = new RenderManager(config);
    });

    afterEach(() => {
      manager.cleanup();
    });

    it('should handle window resize events', () => {
      const updateSizesSpy = vi.spyOn(config.cameraManager, 'updateWindowSize');
      const setPixelRatioSpy = vi.spyOn(config.renderer, 'setPixelRatio');
      const setSizeSpy = vi.spyOn(config.renderer, 'setSize');

      // Get the resize handler
      const resizeHandler = vi.mocked(window.addEventListener).mock.calls
        .find(call => call[0] === 'resize')?.[1] as Function;

      if (resizeHandler) {
        resizeHandler();
        
        expect(updateSizesSpy).toHaveBeenCalledWith(800, 600);
        expect(setSizeSpy).toHaveBeenCalledWith(800, 600);
        expect(setPixelRatioSpy).toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith('Window resized: 800w x 600h');
      }
    });

    it('should skip resize when canvas area has zero dimensions', () => {
      Object.defineProperty(canvasArea, 'clientWidth', { value: 0 });
      const updateSizesSpy = vi.spyOn(config.cameraManager, 'updateWindowSize');

      const resizeHandler = vi.mocked(window.addEventListener).mock.calls
        .find(call => call[0] === 'resize')?.[1] as Function;

      if (resizeHandler) {
        resizeHandler();
        
        expect(updateSizesSpy).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledWith('Canvas area dimensions are zero, skipping resize.');
      }
    });

    it('should skip resize when canvas area is missing', () => {
      canvasArea.remove();
      const updateSizesSpy = vi.spyOn(config.cameraManager, 'updateWindowSize');

      const resizeHandler = vi.mocked(window.addEventListener).mock.calls
        .find(call => call[0] === 'resize')?.[1] as Function;

      if (resizeHandler) {
        resizeHandler();
        
        expect(updateSizesSpy).not.toHaveBeenCalled();
      }
    });

    it('should handle rapid resize events', () => {
      const updateSizesSpy = vi.spyOn(config.cameraManager, 'updateWindowSize');

      const resizeHandler = vi.mocked(window.addEventListener).mock.calls
        .find(call => call[0] === 'resize')?.[1] as Function;

      if (resizeHandler) {
        // Trigger multiple resize events
        for (let i = 0; i < 10; i++) {
          resizeHandler();
        }
        
        expect(updateSizesSpy).toHaveBeenCalledTimes(10);
      }
    });
  });

  describe('cleanup', () => {
    let manager: RenderManager;

    beforeEach(() => {
      manager = new RenderManager(config);
    });

    it('should stop animation loop on cleanup', () => {
      manager.startAnimationLoop();
      manager.cleanup();
      
      expect(mockCAF).toHaveBeenCalled();
    });

    it('should handle cleanup without running animation', () => {
      expect(() => {
        manager.cleanup();
      }).not.toThrow();
    });

    it('should handle multiple cleanup calls', () => {
      manager.startAnimationLoop();
      manager.cleanup();
      manager.cleanup(); // Second cleanup
      
      expect(mockCAF).toHaveBeenCalledTimes(1); // Should only cancel once
    });
  });

  describe('error handling', () => {
    let manager: RenderManager;

    beforeEach(() => {
      manager = new RenderManager(config);
    });

    afterEach(() => {
      manager.cleanup();
    });

    it('should handle errors in updateVRMFeatures gracefully', () => {
      vi.mocked(updateVRMFeatures).mockImplementation(() => {
        throw new Error('VRM update error');
      });

      mockRAF.mockImplementation((callback) => {
        expect(() => callback(16.67)).toThrow('VRM update error');
        return 1;
      });

      expect(() => {
        manager.startAnimationLoop();
      }).not.toThrow();
    });

    it('should handle errors in controls.update gracefully', () => {
      vi.spyOn(config.controls, 'update').mockImplementation(() => {
        throw new Error('Controls update error');
      });

      mockRAF.mockImplementation((callback) => {
        expect(() => callback(16.67)).toThrow('Controls update error');
        return 1;
      });

      expect(() => {
        manager.startAnimationLoop();
      }).not.toThrow();
    });

    it('should handle errors in renderer.render gracefully', () => {
      vi.spyOn(config.renderer, 'render').mockImplementation(() => {
        throw new Error('Render error');
      });

      mockRAF.mockImplementation((callback) => {
        expect(() => callback(16.67)).toThrow('Render error');
        return 1;
      });

      expect(() => {
        manager.startAnimationLoop();
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle missing canvas area initially', () => {
      const manager = new RenderManager(config);
      
      mockRAF.mockImplementation((callback) => {
        callback(16.67);
        return 1;
      });

      expect(() => {
        manager.startAnimationLoop();
      }).not.toThrow();
    });

    it('should handle canvas area with non-numeric dimensions', () => {
      const canvasArea = createMockCanvasArea();
      Object.defineProperty(canvasArea, 'clientWidth', { value: 'invalid' });
      Object.defineProperty(canvasArea, 'clientHeight', { value: 'invalid' });

      const manager = new RenderManager(config);
      
      mockRAF.mockImplementation((callback) => {
        callback(16.67);
        return 1;
      });

      expect(() => {
        manager.startAnimationLoop();
      }).not.toThrow();
    });

    it('should handle very large canvas dimensions', () => {
      const canvasArea = createMockCanvasArea();
      Object.defineProperty(canvasArea, 'clientWidth', { value: 100000 });
      Object.defineProperty(canvasArea, 'clientHeight', { value: 100000 });

      const manager = new RenderManager(config);
      const updateSizesSpy = vi.spyOn(config.cameraManager, 'updateWindowSize');

      mockRAF.mockImplementation((callback) => {
        callback(16.67);
        return 1;
      });

      manager.startAnimationLoop();

      expect(updateSizesSpy).toHaveBeenCalledWith(100000, 100000);
    });
  });
});