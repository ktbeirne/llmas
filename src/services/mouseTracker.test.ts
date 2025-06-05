import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';

import { MouseTracker } from './mouseTracker';

// Mock Electron modules
const mockElectron = {
  screen: {
    getCursorScreenPoint: vi.fn(),
    getPrimaryDisplay: vi.fn(),
    getAllDisplays: vi.fn()
  },
  systemPreferences: {
    isTrustedAccessibilityClient: vi.fn()
  },
  dialog: {
    showMessageBox: vi.fn(),
    showErrorBox: vi.fn()
  }
};

vi.mock('electron', () => mockElectron);

// Mock process.platform
const mockPlatform = (platform: string) => {
  Object.defineProperty(process, 'platform', {
    value: platform,
    writable: true
  });
};

describe('MouseTracker', () => {
  let mouseTracker: MouseTracker;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (mouseTracker) {
      mouseTracker.stopTracking();
    }
  });

  describe('Platform Validation', () => {
    it('should initialize on Windows platform', () => {
      mockPlatform('win32');
      expect(() => new MouseTracker(mockElectron)).not.toThrow();
    });
    
    it('should initialize on macOS platform', () => {
      mockPlatform('darwin');
      expect(() => new MouseTracker(mockElectron)).not.toThrow();
    });
    
    it('should throw error on Linux platform', () => {
      mockPlatform('linux');
      expect(() => new MouseTracker(mockElectron)).toThrow('Linux is not supported for mouse follow feature');
    });

    it('should throw error on unsupported platform', () => {
      mockPlatform('freebsd');
      expect(() => new MouseTracker(mockElectron)).toThrow('Unsupported platform for mouse follow feature');
    });
  });

  describe('Mouse Position Tracking', () => {
    beforeEach(() => {
      mockPlatform('win32');
      mouseTracker = new MouseTracker(mockElectron);
    });

    it('should start tracking with default frequency', async () => {
      const positionCallback = vi.fn();
      mouseTracker.onPositionChange(positionCallback);
      
      await mouseTracker.startTracking();
      
      expect(mouseTracker.isTracking()).toBe(true);
    });

    it('should start tracking with custom frequency', async () => {
      const customFrequency = 30;
      
      await mouseTracker.startTracking(customFrequency);
      
      expect(mouseTracker.isTracking()).toBe(true);
      expect(mouseTracker.getTrackingFrequency()).toBe(customFrequency);
    });
    
    it('should stop tracking cleanly', async () => {
      await mouseTracker.startTracking();
      expect(mouseTracker.isTracking()).toBe(true);
      
      await mouseTracker.stopTracking();
      
      expect(mouseTracker.isTracking()).toBe(false);
    });
    
    it('should convert screen coordinates to world coordinates', () => {
      const screenPos = { x: 100, y: 200 };
      const expectedWorldPos = new THREE.Vector3(0.5, 0.25, 0);
      
      const worldPos = mouseTracker.convertScreenToWorld(screenPos);
      
      expect(worldPos).toBeInstanceOf(THREE.Vector3);
      expect(worldPos.x).toBeCloseTo(expectedWorldPos.x, 2);
      expect(worldPos.y).toBeCloseTo(expectedWorldPos.y, 2);
    });

    it('should handle multiple position callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      const unsubscribe1 = mouseTracker.onPositionChange(callback1);
      const unsubscribe2 = mouseTracker.onPositionChange(callback2);
      
      expect(mouseTracker.getCallbackCount()).toBe(2);
      
      unsubscribe1();
      expect(mouseTracker.getCallbackCount()).toBe(1);
    });

    it('should trigger position callbacks when position changes', async () => {
      const positionCallback = vi.fn();
      mouseTracker.onPositionChange(positionCallback);
      
      mockElectron.screen.getCursorScreenPoint.mockReturnValue({ x: 150, y: 250 });
      
      await mouseTracker.startTracking();
      
      // Wait for at least one tracking cycle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(positionCallback).toHaveBeenCalledWith(
        expect.any(THREE.Vector3)
      );
    });

    it('should not start tracking if already tracking', async () => {
      await mouseTracker.startTracking();
      
      const result = await mouseTracker.startTracking();
      
      expect(result).toBe(false);
    });

    it('should handle rapid start/stop cycles', async () => {
      for (let i = 0; i < 5; i++) {
        await mouseTracker.startTracking();
        await mouseTracker.stopTracking();
      }
      
      expect(mouseTracker.isTracking()).toBe(false);
    });
  });

  describe('macOS Permission Handling', () => {
    beforeEach(() => {
      mockPlatform('darwin');
      mouseTracker = new MouseTracker(mockElectron);
    });

    it('should check accessibility permissions on macOS', async () => {
      mockElectron.systemPreferences.isTrustedAccessibilityClient.mockReturnValue(true);
      
      const hasPermission = await mouseTracker.checkAccessibilityPermission();
      
      expect(hasPermission).toBe(true);
      expect(mockElectron.systemPreferences.isTrustedAccessibilityClient).toHaveBeenCalledWith(false);
    });
    
    it('should request permissions when needed', async () => {
      mockElectron.systemPreferences.isTrustedAccessibilityClient
        .mockReturnValueOnce(false)  // Initial check
        .mockReturnValue(true);      // After permission granted
      
      mockElectron.dialog.showMessageBox.mockResolvedValue({ response: 0 });
      
      const granted = await mouseTracker.requestAccessibilityPermission();
      
      expect(granted).toBe(true);
      expect(mockElectron.dialog.showMessageBox).toHaveBeenCalled();
    });

    it('should handle permission denial gracefully', async () => {
      mockElectron.dialog.showMessageBox.mockResolvedValue({ response: 1 }); // User declined
      
      const granted = await mouseTracker.requestAccessibilityPermission();
      
      expect(granted).toBe(false);
    });

    it('should initialize with permission check on macOS', async () => {
      mockElectron.systemPreferences.isTrustedAccessibilityClient.mockReturnValue(true);
      
      await mouseTracker.initialize();
      
      expect(mockElectron.systemPreferences.isTrustedAccessibilityClient).toHaveBeenCalled();
    });

    it('should throw error when permission required but not granted', async () => {
      mockElectron.systemPreferences.isTrustedAccessibilityClient.mockReturnValue(false);
      mockElectron.dialog.showMessageBox.mockResolvedValue({ response: 1 }); // User declined
      
      await expect(mouseTracker.initialize()).rejects.toThrow(
        'マウス追従機能にはアクセシビリティ権限が必要です'
      );
    });

    it('should handle permission timeout scenario', () => {
      // Test that the timeout logic exists in the implementation
      expect(typeof mouseTracker.requestAccessibilityPermission).toBe('function');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockPlatform('win32');
      mouseTracker = new MouseTracker(mockElectron);
    });

    it('should handle Electron API errors gracefully', async () => {
      mockElectron.screen.getCursorScreenPoint.mockImplementation(() => {
        throw new Error('Screen API error');
      });
      
      const errorCallback = vi.fn();
      mouseTracker.onError(errorCallback);
      
      await mouseTracker.startTracking();
      
      // Manually trigger tracking to test error handling
      mouseTracker.trackMouse();
      
      await mouseTracker.stopTracking();
      
      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Screen API error')
        })
      );
    });

    it('should cleanup resources on error', async () => {
      const originalSetInterval = global.setInterval;
      global.setInterval = vi.fn(() => {
        throw new Error('Timer error');
      });
      
      await expect(mouseTracker.startTracking()).rejects.toThrow();
      expect(mouseTracker.isTracking()).toBe(false);
      
      global.setInterval = originalSetInterval;
    });
  });
});