import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest';
import { IdleStateManager } from './idleStateManager';
import { HeadTrackerAdapter } from '../infrastructure/adapters/HeadTrackerAdapter';
import * as THREE from 'three';

// Mock VRMController
const mockVRMController = {
  getCurrentVRM: vi.fn(),
  getExpressionValue: vi.fn(),
  applyExpression: vi.fn(),
  getAvailableExpressions: vi.fn()
};

// Mock HeadTrackerAdapter
const mockHeadTracker = {
  isEnabled: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  setLookAtTarget: vi.fn(),
  clearLookAtTarget: vi.fn()
};

// Mock SettingsStore
const mockSettingsStore = {
  get: vi.fn(),
  set: vi.fn(),
  onChange: vi.fn()
};

describe('IdleStateManager and MouseFollow Integration', () => {
  let idleStateManager: IdleStateManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default VRM controller mocks
    mockVRMController.getCurrentVRM.mockReturnValue({});
    mockVRMController.getAvailableExpressions.mockReturnValue([
      { name: 'happy', isBinary: false },
      { name: 'sad', isBinary: false },
      { name: 'blink', isBinary: false }
    ]);
    mockVRMController.getExpressionValue.mockReturnValue(0);
    mockVRMController.applyExpression.mockReturnValue(true);

    // Setup default head tracker mocks
    mockHeadTracker.isEnabled.mockReturnValue(false);
    mockHeadTracker.enable.mockResolvedValue(undefined);
    mockHeadTracker.disable.mockResolvedValue(undefined);
    mockHeadTracker.setLookAtTarget.mockResolvedValue(undefined);
    mockHeadTracker.clearLookAtTarget.mockResolvedValue(undefined);

    // Setup default settings store mocks
    mockSettingsStore.get.mockReturnValue(undefined);
    mockSettingsStore.set.mockReturnValue(undefined);
    mockSettingsStore.onChange.mockReturnValue(() => {});

    idleStateManager = new IdleStateManager(
      mockVRMController,
      mockHeadTracker,
      mockSettingsStore
    );
  });

  describe('Mouse Follow Control Integration', () => {
    it('should enable mouse follow when user becomes active', async () => {
      // Configure to disable mouse follow when idle
      idleStateManager.updateConfiguration({
        enabled: true,
        idleTimeoutMs: 5000,
        expressionChangeIntervalMs: 1000,
        disableMouseFollowWhenIdle: true,
        idleExpressions: ['happy'],
        randomLookAroundEnabled: false
      });

      // Start the manager
      idleStateManager.start();

      // Record activity (should enable mouse follow)
      idleStateManager.recordInteractionActivity('click');

      // Wait for the async operation to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockHeadTracker.enable).toHaveBeenCalled();
    });

    it('should disable mouse follow when user becomes idle', async () => {
      // Configure with short idle timeout
      idleStateManager.updateConfiguration({
        enabled: true,
        idleTimeoutMs: 100, // Very short for testing
        expressionChangeIntervalMs: 1000,
        disableMouseFollowWhenIdle: true,
        idleExpressions: ['happy'],
        randomLookAroundEnabled: false
      });

      // Record initial activity
      idleStateManager.recordInteractionActivity('click');
      
      // Start the manager
      idleStateManager.start();

      // Wait for idle timeout + check interval to trigger
      // Check interval is 1000ms, so we need to wait at least that long
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(mockHeadTracker.disable).toHaveBeenCalled();
    });

    it('should not control mouse follow when disableMouseFollowWhenIdle is false', async () => {
      idleStateManager.updateConfiguration({
        enabled: true,
        idleTimeoutMs: 100,
        expressionChangeIntervalMs: 1000,
        disableMouseFollowWhenIdle: false, // Don't control mouse follow
        idleExpressions: ['happy'],
        randomLookAroundEnabled: false
      });

      idleStateManager.start();
      idleStateManager.recordInteractionActivity('click');

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should not have called enable/disable
      expect(mockHeadTracker.enable).not.toHaveBeenCalled();
      expect(mockHeadTracker.disable).not.toHaveBeenCalled();
    });

    it('should report correct mouse follow capability based on idle state', () => {
      // Configure to disable mouse follow when idle
      idleStateManager.updateConfiguration({
        enabled: true,
        idleTimeoutMs: 5000,
        expressionChangeIntervalMs: 1000,
        disableMouseFollowWhenIdle: true,
        idleExpressions: ['happy'],
        randomLookAroundEnabled: false
      });

      // Initially idle (lastActivityTime = 0), should not allow mouse follow
      expect(idleStateManager.canEnableMouseFollow()).toBe(false);

      // When active, should allow mouse follow
      idleStateManager.recordInteractionActivity('click');
      expect(idleStateManager.canEnableMouseFollow()).toBe(true);
    });

    it('should allow mouse follow when configuration disables the feature', () => {
      idleStateManager.updateConfiguration({
        enabled: true,
        idleTimeoutMs: 5000,
        expressionChangeIntervalMs: 1000,
        disableMouseFollowWhenIdle: false, // Allow mouse follow always
        idleExpressions: ['happy'],
        randomLookAroundEnabled: false
      });

      // Should always allow mouse follow regardless of idle state
      expect(idleStateManager.canEnableMouseFollow()).toBe(true);
      
      idleStateManager.recordInteractionActivity('click');
      expect(idleStateManager.canEnableMouseFollow()).toBe(true);
    });
  });

  describe('Random Look Around Integration', () => {
    it('should set random look-at targets when idle and random look around is enabled', async () => {
      idleStateManager.updateConfiguration({
        enabled: true,
        idleTimeoutMs: 100,
        expressionChangeIntervalMs: 5000,
        disableMouseFollowWhenIdle: false,
        idleExpressions: [],
        randomLookAroundEnabled: true
      });

      idleStateManager.start();

      // Wait for initial random look around to trigger
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockHeadTracker.setLookAtTarget).toHaveBeenCalledWith(
        expect.any(THREE.Vector3)
      );
    });

    it('should not set look-at targets when not idle', async () => {
      idleStateManager.updateConfiguration({
        enabled: true,
        idleTimeoutMs: 5000,
        expressionChangeIntervalMs: 1000,
        disableMouseFollowWhenIdle: false,
        idleExpressions: [],
        randomLookAroundEnabled: true
      });

      // Record activity to prevent idle state
      idleStateManager.recordInteractionActivity('click');
      idleStateManager.start();

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not set look-at target when active
      expect(mockHeadTracker.setLookAtTarget).not.toHaveBeenCalled();
    });

    it('should not set look-at targets when random look around is disabled', async () => {
      idleStateManager.updateConfiguration({
        enabled: true,
        idleTimeoutMs: 100,
        expressionChangeIntervalMs: 1000,
        disableMouseFollowWhenIdle: false,
        idleExpressions: ['happy'],
        randomLookAroundEnabled: false // Disabled
      });

      idleStateManager.start();

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockHeadTracker.setLookAtTarget).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling in Integration', () => {
    it('should handle mouse follow enable errors gracefully', async () => {
      mockHeadTracker.enable.mockRejectedValue(new Error('Enable failed'));

      const errorSpy = vi.fn();
      idleStateManager.onError(errorSpy);

      idleStateManager.updateConfiguration({
        enabled: true,
        idleTimeoutMs: 5000,
        expressionChangeIntervalMs: 1000,
        disableMouseFollowWhenIdle: true,
        idleExpressions: ['happy'],
        randomLookAroundEnabled: false
      });

      idleStateManager.start();
      idleStateManager.recordInteractionActivity('click');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle mouse follow disable errors gracefully', async () => {
      mockHeadTracker.disable.mockRejectedValue(new Error('Disable failed'));

      const errorSpy = vi.fn();
      idleStateManager.onError(errorSpy);

      idleStateManager.updateConfiguration({
        enabled: true,
        idleTimeoutMs: 100,
        expressionChangeIntervalMs: 1000,
        disableMouseFollowWhenIdle: true,
        idleExpressions: ['happy'],
        randomLookAroundEnabled: false
      });

      idleStateManager.start();

      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle look-at target setting errors gracefully', async () => {
      mockHeadTracker.setLookAtTarget.mockRejectedValue(new Error('LookAt failed'));

      const errorSpy = vi.fn();
      idleStateManager.onError(errorSpy);

      idleStateManager.updateConfiguration({
        enabled: true,
        idleTimeoutMs: 100,
        expressionChangeIntervalMs: 1000,
        disableMouseFollowWhenIdle: false,
        idleExpressions: [],
        randomLookAroundEnabled: true
      });

      idleStateManager.start();

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('State Status Integration', () => {
    it('should include mouse follow capability in state status', () => {
      idleStateManager.updateConfiguration({
        enabled: true,
        idleTimeoutMs: 5000,
        expressionChangeIntervalMs: 1000,
        disableMouseFollowWhenIdle: true,
        idleExpressions: ['happy'],
        randomLookAroundEnabled: false
      });

      const status = idleStateManager.getStateStatus();

      expect(status).toHaveProperty('canEnableMouseFollow');
      expect(typeof status.canEnableMouseFollow).toBe('boolean');
    });

    it('should reflect current idle state correctly in status', () => {
      idleStateManager.updateConfiguration({
        enabled: true,
        idleTimeoutMs: 5000,
        expressionChangeIntervalMs: 1000,
        disableMouseFollowWhenIdle: true,
        idleExpressions: ['happy'],
        randomLookAroundEnabled: false
      });

      // Initially idle (no activity recorded)
      let status = idleStateManager.getStateStatus();
      expect(status.isIdle).toBe(true);
      expect(status.canEnableMouseFollow).toBe(false);

      // Record activity
      idleStateManager.recordInteractionActivity('click');
      status = idleStateManager.getStateStatus();
      expect(status.isIdle).toBe(false);
      expect(status.canEnableMouseFollow).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    it('should accept valid configuration with mouse follow integration', () => {
      expect(() => {
        idleStateManager.updateConfiguration({
          enabled: true,
          idleTimeoutMs: 5000,
          expressionChangeIntervalMs: 1000,
          disableMouseFollowWhenIdle: true,
          idleExpressions: ['happy', 'relaxed'],
          randomLookAroundEnabled: true
        });
      }).not.toThrow();
    });

    it('should allow empty expressions when random look around is enabled', () => {
      expect(() => {
        idleStateManager.updateConfiguration({
          enabled: true,
          idleTimeoutMs: 5000,
          expressionChangeIntervalMs: 1000,
          disableMouseFollowWhenIdle: true,
          idleExpressions: [], // Empty but random look around enabled
          randomLookAroundEnabled: true
        });
      }).not.toThrow();
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should stop monitoring when stopped', async () => {
      idleStateManager.updateConfiguration({
        enabled: true,
        idleTimeoutMs: 100,
        expressionChangeIntervalMs: 1000,
        disableMouseFollowWhenIdle: true,
        idleExpressions: ['happy'],
        randomLookAroundEnabled: true
      });

      idleStateManager.start();
      expect(idleStateManager.isRunning()).toBe(true);

      idleStateManager.stop();
      expect(idleStateManager.isRunning()).toBe(false);

      // Wait to ensure no further operations occur
      await new Promise(resolve => setTimeout(resolve, 200));

      // Reset the mock call counts after stop
      mockHeadTracker.enable.mockClear();
      mockHeadTracker.disable.mockClear();
      mockHeadTracker.setLookAtTarget.mockClear();

      // Wait more time to ensure operations don't continue
      await new Promise(resolve => setTimeout(resolve, 200));

      // No operations should occur after stop
      expect(mockHeadTracker.enable).not.toHaveBeenCalled();
      expect(mockHeadTracker.disable).not.toHaveBeenCalled();
      expect(mockHeadTracker.setLookAtTarget).not.toHaveBeenCalled();
    });
  });
});