/**
 * CameraManager Service Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CameraManager, createCameraManager, CameraSettings } from './cameraManager';

// Mock ElectronAPI
const mockElectronAPI = {
  getCameraSettings: vi.fn(),
  setCameraSettings: vi.fn()
};

const createMockCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  document.body.appendChild(canvas);
  return canvas;
};

const createMockCamera = () => {
  return new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
};

const createMockControls = (camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) => {
  const controls = new OrbitControls(camera, canvas);
  return controls;
};

describe('CameraManager', () => {
  let camera: THREE.PerspectiveCamera;
  let controls: OrbitControls;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    // Setup DOM and THREE.js objects
    document.body.innerHTML = '';
    canvas = createMockCanvas();
    camera = createMockCamera();
    controls = createMockControls(camera, canvas);

    // Mock window.electronAPI
    (global as any).window = {
      ...global.window,
      electronAPI: mockElectronAPI,
      setTimeout: vi.fn((fn, delay) => setTimeout(fn, delay)),
      clearTimeout: vi.fn((id) => clearTimeout(id))
    };

    // Reset camera to default position
    camera.position.set(0, 1.2, 5);
    camera.zoom = 1;
    controls.target.set(0, 1, 0);

    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllTimers();
  });

  describe('factory function', () => {
    it('should create CameraManager instance', () => {
      const manager = createCameraManager(camera, controls);
      expect(manager).toBeInstanceOf(CameraManager);
    });
  });

  describe('initialization', () => {
    it('should be created with correct initial state', () => {
      const manager = new CameraManager(camera, controls);
      expect(manager).toBeDefined();
    });

    it('should setup auto-save on controls change', () => {
      const addEventListenerSpy = vi.spyOn(controls, 'addEventListener');
      new CameraManager(camera, controls);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('restoreCameraSettings', () => {
    let manager: CameraManager;

    beforeEach(() => {
      manager = new CameraManager(camera, controls);
    });

    afterEach(() => {
      manager.cleanup();
    });

    it('should restore camera settings successfully', async () => {
      const mockSettings: CameraSettings = {
        position: { x: 1, y: 2, z: 3 },
        target: { x: 0.5, y: 1.5, z: 0.5 },
        zoom: 1.5
      };

      mockElectronAPI.getCameraSettings.mockResolvedValue(mockSettings);

      await manager.restoreCameraSettings();

      expect(camera.position.x).toBe(1);
      expect(camera.position.y).toBe(2);
      expect(camera.position.z).toBe(3);
      expect(controls.target.x).toBe(0.5);
      expect(controls.target.y).toBe(1.5);
      expect(controls.target.z).toBe(0.5);
      expect(camera.zoom).toBe(1.5);
    });

    it('should handle null settings gracefully', async () => {
      mockElectronAPI.getCameraSettings.mockResolvedValue(null);

      await expect(manager.restoreCameraSettings()).resolves.not.toThrow();
      
      // Camera should remain at original position
      expect(camera.position.x).toBe(0);
      expect(camera.position.y).toBe(1.2);
      expect(camera.position.z).toBe(5);
    });

    it('should handle API error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockElectronAPI.getCameraSettings.mockRejectedValue(new Error('API Error'));

      await expect(manager.restoreCameraSettings()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('カメラ設定の復元に失敗しました:', expect.any(Error));
    });

    it('should handle missing electronAPI', async () => {
      (global as any).window.electronAPI = null;

      await expect(manager.restoreCameraSettings()).resolves.not.toThrow();
    });

    it('should handle missing getCameraSettings method', async () => {
      (global as any).window.electronAPI = {};

      await expect(manager.restoreCameraSettings()).resolves.not.toThrow();
    });

    it('should update projection matrix after restoring zoom', async () => {
      const updateProjectionMatrixSpy = vi.spyOn(camera, 'updateProjectionMatrix');
      const mockSettings: CameraSettings = {
        position: { x: 0, y: 1.2, z: 5 },
        target: { x: 0, y: 1, z: 0 },
        zoom: 2.0
      };

      mockElectronAPI.getCameraSettings.mockResolvedValue(mockSettings);

      await manager.restoreCameraSettings();

      expect(updateProjectionMatrixSpy).toHaveBeenCalled();
    });

    it('should update controls after restoring settings', async () => {
      const updateSpy = vi.spyOn(controls, 'update');
      const mockSettings: CameraSettings = {
        position: { x: 1, y: 2, z: 3 },
        target: { x: 0.5, y: 1.5, z: 0.5 },
        zoom: 1.5
      };

      mockElectronAPI.getCameraSettings.mockResolvedValue(mockSettings);

      await manager.restoreCameraSettings();

      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('saveCameraSettings', () => {
    let manager: CameraManager;

    beforeEach(() => {
      manager = new CameraManager(camera, controls);
    });

    afterEach(() => {
      manager.cleanup();
    });

    it('should save camera settings successfully', async () => {
      camera.position.set(1, 2, 3);
      controls.target.set(0.5, 1.5, 0.5);
      camera.zoom = 1.5;

      mockElectronAPI.setCameraSettings.mockResolvedValue(undefined);

      await manager.saveCameraSettings();

      expect(mockElectronAPI.setCameraSettings).toHaveBeenCalledWith({
        position: { x: 1, y: 2, z: 3 },
        target: { x: 0.5, y: 1.5, z: 0.5 },
        zoom: 1.5
      });
    });

    it('should handle API error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockElectronAPI.setCameraSettings.mockRejectedValue(new Error('API Error'));

      await expect(manager.saveCameraSettings()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('カメラ設定の保存に失敗しました:', expect.any(Error));
    });

    it('should handle missing electronAPI', async () => {
      (global as any).window.electronAPI = null;

      await expect(manager.saveCameraSettings()).resolves.not.toThrow();
    });

    it('should handle missing setCameraSettings method', async () => {
      (global as any).window.electronAPI = {};

      await expect(manager.saveCameraSettings()).resolves.not.toThrow();
    });
  });

  describe('scheduled camera save', () => {
    let manager: CameraManager;

    beforeEach(() => {
      manager = new CameraManager(camera, controls);
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      manager.cleanup();
    });

    it('should schedule save after controls change', () => {
      const saveSpy = vi.spyOn(manager, 'saveCameraSettings').mockResolvedValue();

      // Trigger change event
      controls.dispatchEvent({ type: 'change' });

      // Fast-forward timers
      vi.advanceTimersByTime(1000);

      expect(saveSpy).toHaveBeenCalled();
    });

    it('should debounce multiple changes', () => {
      const saveSpy = vi.spyOn(manager, 'saveCameraSettings').mockResolvedValue();

      // Trigger multiple changes
      controls.dispatchEvent({ type: 'change' });
      controls.dispatchEvent({ type: 'change' });
      controls.dispatchEvent({ type: 'change' });

      // Fast-forward timers
      vi.advanceTimersByTime(1000);

      // Should only save once due to debouncing
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('should clear previous timeout on new change', () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

      // First change
      controls.dispatchEvent({ type: 'change' });
      
      // Second change before timeout
      controls.dispatchEvent({ type: 'change' });

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('updateWindowSize', () => {
    let manager: CameraManager;

    beforeEach(() => {
      manager = new CameraManager(camera, controls);
    });

    afterEach(() => {
      manager.cleanup();
    });

    it('should update camera aspect ratio', () => {
      const updateProjectionMatrixSpy = vi.spyOn(camera, 'updateProjectionMatrix');

      manager.updateWindowSize(1600, 900);

      expect(camera.aspect).toBeCloseTo(1600 / 900, 5);
      expect(updateProjectionMatrixSpy).toHaveBeenCalled();
    });

    it('should handle zero width gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      manager.updateWindowSize(0, 600);

      expect(consoleSpy).toHaveBeenCalledWith('Canvas dimensions are zero, skipping update.');
    });

    it('should handle zero height gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      manager.updateWindowSize(800, 0);

      expect(consoleSpy).toHaveBeenCalledWith('Canvas dimensions are zero, skipping update.');
    });

    it('should log resize information', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      manager.updateWindowSize(1600, 900);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Canvas Resized/Updated: 1600w x 900h, Aspect: 1.78'
      );
    });
  });

  describe('cleanup', () => {
    let manager: CameraManager;

    beforeEach(() => {
      manager = new CameraManager(camera, controls);
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should clear timeout on cleanup', () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

      // Trigger a change to create a timeout
      controls.dispatchEvent({ type: 'change' });

      manager.cleanup();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should handle cleanup without active timeout', () => {
      expect(() => {
        manager.cleanup();
      }).not.toThrow();
    });

    it('should not save after cleanup', () => {
      const saveSpy = vi.spyOn(manager, 'saveCameraSettings').mockResolvedValue();

      // Trigger change
      controls.dispatchEvent({ type: 'change' });
      
      // Cleanup before timeout
      manager.cleanup();
      
      // Fast-forward timers
      vi.advanceTimersByTime(1000);

      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle controls without addEventListener method', () => {
      const mockControlsWithoutEvents = {} as OrbitControls;

      expect(() => {
        new CameraManager(camera, mockControlsWithoutEvents);
      }).toThrow(); // OrbitControls should have addEventListener
    });

    it('should handle very large aspect ratios', () => {
      const manager = new CameraManager(camera, controls);

      manager.updateWindowSize(10000, 1);

      expect(camera.aspect).toBe(10000);
      expect(isFinite(camera.aspect)).toBe(true);
    });

    it('should handle very small aspect ratios', () => {
      const manager = new CameraManager(camera, controls);

      manager.updateWindowSize(1, 10000);

      expect(camera.aspect).toBe(0.0001);
      expect(isFinite(camera.aspect)).toBe(true);
    });
  });
});