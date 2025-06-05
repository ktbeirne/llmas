import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';

import { HeadTracker } from './headTracker';

// Mock VRM and related interfaces
interface MockVRMLookAt {
  target?: THREE.Object3D;
  update: vi.MockedFunction<(delta: number) => void>;
}

interface MockVRM extends Partial<VRM> {
  lookAt?: MockVRMLookAt;
}

interface MockVRMController {
  getCurrentVRM(): MockVRM | null;
  updateFeatures(delta: number): void;
}

// Mock configuration interfaces
interface HeadTrackingConfig {
  enabled: boolean;
  sensitivity: number;
  smoothingFactor: number;
  maxRotationAngle: number;
  trackingFrequency: number;
}

describe('HeadTracker', () => {
  let headTracker: HeadTracker;
  let mockVRMController: MockVRMController;
  let mockVRM: MockVRM;
  let mockLookAt: MockVRMLookAt;

  beforeEach(() => {
    // Mock VRM LookAt
    mockLookAt = {
      target: undefined,
      update: vi.fn()
    };

    // Mock VRM instance
    mockVRM = {
      lookAt: mockLookAt
    };

    // Mock VRMController
    mockVRMController = {
      getCurrentVRM: vi.fn().mockReturnValue(mockVRM),
      updateFeatures: vi.fn()
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    if (headTracker) {
      headTracker.disable();
    }
  });

  describe('VRM Integration', () => {
    it('should bind to VRM instance successfully', () => {
      expect(() => new HeadTracker(mockVRMController)).not.toThrow();
    });

    it('should handle null VRM instance gracefully', () => {
      mockVRMController.getCurrentVRM = vi.fn().mockReturnValue(null);
      expect(() => new HeadTracker(mockVRMController)).not.toThrow();
    });

    it('should handle VRM without lookAt feature', () => {
      const vrmWithoutLookAt = {} as MockVRM;
      mockVRMController.getCurrentVRM = vi.fn().mockReturnValue(vrmWithoutLookAt);
      expect(() => new HeadTracker(mockVRMController)).not.toThrow();
    });

    it('should verify VRM lookAt availability', () => {
      headTracker = new HeadTracker(mockVRMController);
      
      expect(headTracker.isVRMLookAtAvailable()).toBe(true);
    });

    it('should return false when VRM lookAt is not available', () => {
      mockVRM.lookAt = undefined;
      headTracker = new HeadTracker(mockVRMController);
      
      expect(headTracker.isVRMLookAtAvailable()).toBe(false);
    });
  });

  describe('LookAt Target Management', () => {
    beforeEach(() => {
      headTracker = new HeadTracker(mockVRMController);
    });

    it('should set lookAt target successfully', () => {
      const targetPosition = new THREE.Vector3(1, 0, 0);
      
      headTracker.setLookAtTarget(targetPosition);
      
      expect(mockLookAt.target).toBeDefined();
      expect(mockLookAt.target?.position).toEqual(targetPosition);
    });

    it('should update lookAt target position', () => {
      const initialPosition = new THREE.Vector3(0, 0, 0);
      const newPosition = new THREE.Vector3(1, 1, 0);
      
      headTracker.setLookAtTarget(initialPosition);
      headTracker.setLookAtTarget(newPosition);
      
      expect(mockLookAt.target?.position).toEqual(newPosition);
    });

    it('should handle target setting when VRM is not available', () => {
      mockVRMController.getCurrentVRM = vi.fn().mockReturnValue(null);
      headTracker = new HeadTracker(mockVRMController);
      
      expect(() => {
        headTracker.setLookAtTarget(new THREE.Vector3(1, 0, 0));
      }).not.toThrow();
    });

    it('should clear lookAt target', () => {
      headTracker.setLookAtTarget(new THREE.Vector3(1, 0, 0));
      expect(mockLookAt.target).toBeDefined();
      
      headTracker.clearLookAtTarget();
      
      expect(mockLookAt.target).toBeUndefined();
    });

    it('should get current lookAt target position', () => {
      const targetPosition = new THREE.Vector3(2, 1, 0);
      headTracker.setLookAtTarget(targetPosition);
      
      const currentTarget = headTracker.getCurrentTarget();
      
      expect(currentTarget).toEqual(targetPosition);
    });
  });

  describe('Smoothing Functionality', () => {
    beforeEach(() => {
      headTracker = new HeadTracker(mockVRMController);
    });

    it('should apply smoothing to target position', () => {
      const currentPos = new THREE.Vector3(0, 0, 0);
      const targetPos = new THREE.Vector3(2, 2, 0);
      const smoothingFactor = 0.1;
      
      headTracker.setLookAtTarget(currentPos);
      headTracker.setSmoothingFactor(smoothingFactor);
      
      const smoothedPos = headTracker.applySmoothingToTarget(targetPos);
      
      // Smoothed position should be between current and target
      expect(smoothedPos.x).toBeGreaterThan(0);
      expect(smoothedPos.x).toBeLessThan(2);
      expect(smoothedPos.y).toBeGreaterThan(0);
      expect(smoothedPos.y).toBeLessThan(2);
    });

    it('should use default smoothing factor', () => {
      expect(headTracker.getSmoothingFactor()).toBe(0.1); // Default value
    });

    it('should update smoothing factor', () => {
      const newFactor = 0.3;
      
      headTracker.setSmoothingFactor(newFactor);
      
      expect(headTracker.getSmoothingFactor()).toBe(newFactor);
    });

    it('should clamp smoothing factor between 0 and 1', () => {
      headTracker.setSmoothingFactor(-0.5);
      expect(headTracker.getSmoothingFactor()).toBe(0);
      
      headTracker.setSmoothingFactor(1.5);
      expect(headTracker.getSmoothingFactor()).toBe(1);
    });

    it('should disable smoothing when factor is 1', () => {
      const targetPos = new THREE.Vector3(5, 5, 0);
      headTracker.setSmoothingFactor(1.0);
      
      const result = headTracker.applySmoothingToTarget(targetPos);
      
      expect(result).toEqual(targetPos);
    });
  });

  describe('Configuration Management', () => {
    beforeEach(() => {
      headTracker = new HeadTracker(mockVRMController);
    });

    it('should use default configuration', () => {
      const config = headTracker.getConfiguration();
      
      expect(config.enabled).toBe(false);
      expect(config.sensitivity).toBe(1.0);
      expect(config.smoothingFactor).toBe(0.1);
      expect(config.maxRotationAngle).toBe(45);
      expect(config.trackingFrequency).toBe(15);
    });

    it('should update configuration', () => {
      const newConfig: HeadTrackingConfig = {
        enabled: true,
        sensitivity: 1.5,
        smoothingFactor: 0.2,
        maxRotationAngle: 60,
        trackingFrequency: 30
      };
      
      headTracker.updateConfiguration(newConfig);
      
      const updatedConfig = headTracker.getConfiguration();
      expect(updatedConfig).toEqual(newConfig);
    });

    it('should validate configuration values', () => {
      const invalidConfig: HeadTrackingConfig = {
        enabled: true,
        sensitivity: -1, // Invalid
        smoothingFactor: 2, // Invalid
        maxRotationAngle: 200, // Invalid
        trackingFrequency: 0 // Invalid
      };
      
      expect(() => {
        headTracker.updateConfiguration(invalidConfig);
      }).toThrow('Invalid configuration values');
    });

    it('should enable and disable head tracking', () => {
      expect(headTracker.isEnabled()).toBe(false);
      
      headTracker.enable();
      expect(headTracker.isEnabled()).toBe(true);
      
      headTracker.disable();
      expect(headTracker.isEnabled()).toBe(false);
    });
  });

  describe('Update and Integration', () => {
    beforeEach(() => {
      headTracker = new HeadTracker(mockVRMController);
      headTracker.enable();
    });

    it('should update VRM lookAt during update cycle', () => {
      const delta = 0.016; // ~60fps
      headTracker.setLookAtTarget(new THREE.Vector3(1, 0, 0));
      
      headTracker.update(delta);
      
      expect(mockLookAt.update).toHaveBeenCalledWith(delta);
    });

    it('should not update when disabled', () => {
      headTracker.disable();
      const delta = 0.016;
      
      headTracker.update(delta);
      
      expect(mockLookAt.update).not.toHaveBeenCalled();
    });

    it('should handle update with no VRM gracefully', () => {
      mockVRMController.getCurrentVRM = vi.fn().mockReturnValue(null);
      headTracker = new HeadTracker(mockVRMController);
      headTracker.enable();
      
      expect(() => {
        headTracker.update(0.016);
      }).not.toThrow();
    });

    it('should apply smoothing during update', () => {
      const initialTarget = new THREE.Vector3(0, 0, 0);
      const newTarget = new THREE.Vector3(2, 2, 0);
      
      headTracker.setLookAtTarget(initialTarget);
      headTracker.setSmoothingFactor(0.5);
      
      // Verify smoothing functionality exists
      const smoothedResult = headTracker.applySmoothingToTarget(newTarget);
      expect(smoothedResult).toBeDefined();
      expect(smoothedResult instanceof THREE.Vector3).toBe(true);
    });

    it('should respect rotation angle limits', () => {
      headTracker.updateConfiguration({
        enabled: true,
        sensitivity: 1.0,
        smoothingFactor: 0.1,
        maxRotationAngle: 30,
        trackingFrequency: 15
      });
      
      const extremeTarget = new THREE.Vector3(10, 10, 0);
      headTracker.setLookAtTarget(extremeTarget);
      
      const limitedTarget = headTracker.applyRotationLimits(extremeTarget);
      const angle = limitedTarget.length();
      
      expect(angle).toBeLessThanOrEqual(1); // Normalized within limits
    });
  });

  describe('Performance and Resource Management', () => {
    beforeEach(() => {
      headTracker = new HeadTracker(mockVRMController);
    });

    it('should measure update performance', () => {
      headTracker.enable();
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        headTracker.update(0.016);
      }
      
      const endTime = performance.now();
      const avgUpdateTime = (endTime - startTime) / 100;
      
      expect(avgUpdateTime).toBeLessThan(1); // Should be under 1ms per update
    });

    it('should cleanup resources on disable', () => {
      headTracker.enable();
      headTracker.setLookAtTarget(new THREE.Vector3(1, 0, 0));
      
      headTracker.disable();
      
      expect(headTracker.getCurrentTarget()).toBeNull();
    });

    it('should handle rapid enable/disable cycles', () => {
      for (let i = 0; i < 10; i++) {
        headTracker.enable();
        headTracker.disable();
      }
      
      expect(headTracker.isEnabled()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      headTracker = new HeadTracker(mockVRMController);
    });

    it('should handle VRM controller errors gracefully', () => {
      mockVRMController.getCurrentVRM = vi.fn().mockImplementation(() => {
        throw new Error('VRM Controller error');
      });
      
      expect(() => {
        headTracker.update(0.016);
      }).not.toThrow();
    });

    it('should handle lookAt update errors', () => {
      mockLookAt.update = vi.fn().mockImplementation(() => {
        throw new Error('LookAt update error');
      });
      
      headTracker.enable();
      
      expect(() => {
        headTracker.update(0.016);
      }).not.toThrow();
    });

    it('should provide error callback mechanism', () => {
      const errorCallback = vi.fn();
      headTracker.onError(errorCallback);
      
      mockLookAt.update = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      headTracker.enable();
      headTracker.update(0.016);
      
      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Test error')
        })
      );
    });
  });
});