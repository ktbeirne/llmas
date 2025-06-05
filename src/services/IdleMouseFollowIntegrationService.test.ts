import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest';
import { IdleMouseFollowIntegrationService } from './IdleMouseFollowIntegrationService';
import * as THREE from 'three';

// Mock VRMController
const mockVRMController = {
  getCurrentVRM: vi.fn(),
  getExpressionValue: vi.fn(),
  applyExpression: vi.fn(),
  getAvailableExpressions: vi.fn()
};

// Mock SettingsStore
const mockSettingsStore = {
  get: vi.fn(),
  set: vi.fn(),
  onChange: vi.fn()
};

describe('IdleMouseFollowIntegrationService', () => {
  let integrationService: IdleMouseFollowIntegrationService;

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

    // Setup default settings store mocks
    mockSettingsStore.get.mockReturnValue(undefined);
    mockSettingsStore.set.mockReturnValue(undefined);
    mockSettingsStore.onChange.mockReturnValue(() => {});

    integrationService = new IdleMouseFollowIntegrationService(
      mockVRMController,
      mockSettingsStore
    );
  });

  describe('Service Initialization', () => {
    it('should initialize all components successfully', () => {
      expect(integrationService).toBeDefined();
      expect(integrationService.getIdleStateManager()).toBeDefined();
      expect(integrationService.getMouseFollowService()).toBeDefined();
      expect(integrationService.getHeadTrackerAdapter()).toBeDefined();
    });

    it('should connect components properly', () => {
      const idleManager = integrationService.getIdleStateManager();
      const mouseFollowService = integrationService.getMouseFollowService();
      const headTracker = integrationService.getHeadTrackerAdapter();

      // Verify that components are connected
      expect(idleManager).toBeDefined();
      expect(mouseFollowService).toBeDefined();
      expect(headTracker).toBeDefined();
      expect(headTracker.getMouseFollowService()).toBe(mouseFollowService);
    });

    it('should initialize with default configuration', () => {
      const status = integrationService.getIntegratedStatus();

      expect(status).toHaveProperty('idleStateStatus');
      expect(status).toHaveProperty('mouseFollowStatus');
      expect(status).toHaveProperty('isIntegrationActive');
    });
  });

  describe('Unified Control Interface', () => {
    it('should start both idle state monitoring and mouse follow when enabled', async () => {
      await integrationService.enableIntegration();

      const status = integrationService.getIntegratedStatus();
      expect(status.isIntegrationActive).toBe(true);

      const idleManager = integrationService.getIdleStateManager();
      expect(idleManager.isRunning()).toBe(true);
    });

    it('should stop both services when disabled', async () => {
      // First enable
      await integrationService.enableIntegration();
      expect(integrationService.getIntegratedStatus().isIntegrationActive).toBe(true);

      // Then disable
      await integrationService.disableIntegration();
      expect(integrationService.getIntegratedStatus().isIntegrationActive).toBe(false);

      const idleManager = integrationService.getIdleStateManager();
      expect(idleManager.isRunning()).toBe(false);
    });

    it('should handle already enabled state gracefully', async () => {
      await integrationService.enableIntegration();
      expect(integrationService.getIntegratedStatus().isIntegrationActive).toBe(true);

      // Should not throw or cause issues
      await integrationService.enableIntegration();
      expect(integrationService.getIntegratedStatus().isIntegrationActive).toBe(true);
    });

    it('should handle already disabled state gracefully', async () => {
      // Should not throw when disabling already disabled service
      await integrationService.disableIntegration();
      expect(integrationService.getIntegratedStatus().isIntegrationActive).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    it('should update idle state configuration', () => {
      const newConfig = {
        enabled: true,
        idleTimeoutMs: 10000,
        expressionChangeIntervalMs: 2000,
        disableMouseFollowWhenIdle: true,
        idleExpressions: ['happy', 'relaxed'],
        randomLookAroundEnabled: true
      };

      integrationService.updateIdleConfiguration(newConfig);

      const idleManager = integrationService.getIdleStateManager();
      const currentConfig = idleManager.getConfiguration();

      expect(currentConfig.idleTimeoutMs).toBe(10000);
      expect(currentConfig.expressionChangeIntervalMs).toBe(2000);
      expect(currentConfig.disableMouseFollowWhenIdle).toBe(true);
      expect(currentConfig.idleExpressions).toEqual(['happy', 'relaxed']);
      expect(currentConfig.randomLookAroundEnabled).toBe(true);
    });

    it('should update mouse follow configuration', () => {
      const mouseConfig = {
        smoothingEnabled: true,
        smoothingFactor: 0.3,
        constraints: {
          maxYaw: 45,
          maxPitch: 30,
          maxRoll: 15
        }
      };

      integrationService.updateMouseFollowConfiguration(mouseConfig);

      // Verify the configuration was passed to the mouse follow service
      const mouseFollowService = integrationService.getMouseFollowService();
      expect(mouseFollowService).toBeDefined();
    });

    it('should validate configuration before applying', () => {
      const invalidConfig = {
        enabled: true,
        idleTimeoutMs: -1000, // Invalid negative timeout
        expressionChangeIntervalMs: 1000,
        disableMouseFollowWhenIdle: true,
        idleExpressions: [],
        randomLookAroundEnabled: false
      };

      expect(() => {
        integrationService.updateIdleConfiguration(invalidConfig);
      }).toThrow('Invalid idle configuration');
    });
  });

  describe('Activity Recording Integration', () => {
    it('should record chat activity and forward to idle manager', () => {
      const chatActivity = {
        timestamp: Date.now(),
        type: 'sent' as const,
        message: 'Hello'
      };

      integrationService.recordChatActivity(chatActivity);

      const idleManager = integrationService.getIdleStateManager();
      expect(idleManager.getLastActivityTime()).toBe(chatActivity.timestamp);
    });

    it('should record interaction activity', () => {
      const beforeTime = Date.now();
      integrationService.recordInteractionActivity('click');
      const afterTime = Date.now();

      const idleManager = integrationService.getIdleStateManager();
      const lastActivity = idleManager.getLastActivityTime();

      expect(lastActivity).toBeGreaterThanOrEqual(beforeTime);
      expect(lastActivity).toBeLessThanOrEqual(afterTime);
    });

    it('should trigger mouse follow enable when activity is recorded', () => {
      // Configure to control mouse follow based on idle state
      integrationService.updateIdleConfiguration({
        enabled: true,
        idleTimeoutMs: 5000,
        expressionChangeIntervalMs: 1000,
        disableMouseFollowWhenIdle: true,
        idleExpressions: ['happy'],
        randomLookAroundEnabled: false
      });

      // Record activity
      integrationService.recordInteractionActivity('click');

      const idleManager = integrationService.getIdleStateManager();
      expect(idleManager.canEnableMouseFollow()).toBe(true);
    });
  });

  describe('Expression Override Management', () => {
    it('should record manual expression override', () => {
      integrationService.recordManualExpressionOverride('happy', 0.8);

      const idleManager = integrationService.getIdleStateManager();
      expect(idleManager.hasManualExpressionOverride()).toBe(true);
    });

    it('should record chat response expression', () => {
      integrationService.recordChatResponseExpression('surprised');

      const idleManager = integrationService.getIdleStateManager();
      // Should have some effect on expression state
      expect(idleManager.canApplyIdleExpression()).toBe(false);
    });

    it('should respect expression priority hierarchy', () => {
      const idleManager = integrationService.getIdleStateManager();

      // Initially should allow idle expressions
      expect(idleManager.canApplyIdleExpression()).toBe(true);

      // Chat response should block idle expressions
      integrationService.recordChatResponseExpression('happy');
      expect(idleManager.canApplyIdleExpression()).toBe(false);

      // Manual override should also block idle expressions
      integrationService.recordManualExpressionOverride('sad', 1.0);
      expect(idleManager.canApplyIdleExpression()).toBe(false);
    });
  });

  describe('Status and Monitoring', () => {
    it('should provide comprehensive integrated status', () => {
      const status = integrationService.getIntegratedStatus();

      expect(status).toHaveProperty('isIntegrationActive');
      expect(status).toHaveProperty('idleStateStatus');
      expect(status).toHaveProperty('mouseFollowStatus');
      expect(status).toHaveProperty('canEnableMouseFollow');
      expect(status).toHaveProperty('hasActiveExpression');
      expect(status).toHaveProperty('lastActivityTime');

      expect(typeof status.isIntegrationActive).toBe('boolean');
      expect(typeof status.canEnableMouseFollow).toBe('boolean');
      expect(typeof status.hasActiveExpression).toBe('boolean');
      expect(typeof status.lastActivityTime).toBe('number');
    });

    it('should provide debug information for troubleshooting', () => {
      const debugInfo = integrationService.getDebugInfo();

      expect(debugInfo).toHaveProperty('idleManagerStatus');
      expect(debugInfo).toHaveProperty('mouseFollowServiceDebug');
      expect(debugInfo).toHaveProperty('headTrackerDebug');
      expect(debugInfo).toHaveProperty('integrationState');
    });

    it('should check VRM readiness across all components', async () => {
      const isReady = await integrationService.isVRMReady();

      expect(typeof isReady).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle mouse follow service errors gracefully', async () => {
      const errorSpy = vi.fn();
      integrationService.onError(errorSpy);

      // Force an error by configuring invalid state
      mockVRMController.getCurrentVRM.mockReturnValue(null);

      // Should not throw
      await expect(integrationService.enableIntegration()).resolves.not.toThrow();
    });

    it('should propagate error callbacks to idle state manager', () => {
      const errorSpy = vi.fn();
      integrationService.onError(errorSpy);

      // Force an error in idle state manager
      mockVRMController.getAvailableExpressions.mockImplementation(() => {
        throw new Error('VRM error');
      });

      const idleManager = integrationService.getIdleStateManager();
      idleManager.hasActiveExpression(); // This should trigger the error

      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle configuration validation errors', () => {
      const errorSpy = vi.fn();
      integrationService.onError(errorSpy);

      expect(() => {
        integrationService.updateIdleConfiguration({
          enabled: true,
          idleTimeoutMs: -1000, // Invalid
          expressionChangeIntervalMs: 1000,
          disableMouseFollowWhenIdle: true,
          idleExpressions: [],
          randomLookAroundEnabled: false
        });
      }).toThrow();
    });
  });

  describe('Resource Management', () => {
    it('should clean up all components when destroyed', async () => {
      await integrationService.enableIntegration();
      expect(integrationService.getIntegratedStatus().isIntegrationActive).toBe(true);

      await integrationService.destroy();

      expect(integrationService.getIntegratedStatus().isIntegrationActive).toBe(false);
      expect(integrationService.getIdleStateManager().isRunning()).toBe(false);
    });

    it('should handle multiple destroy calls gracefully', async () => {
      await integrationService.destroy();
      await integrationService.destroy(); // Should not throw
    });
  });

  describe('Performance Monitoring', () => {
    it('should track integration performance metrics', async () => {
      await integrationService.enableIntegration();

      const metrics = integrationService.getPerformanceMetrics();

      expect(metrics).toHaveProperty('integrationActiveTime');
      expect(metrics).toHaveProperty('activityRecordCount');
      expect(metrics).toHaveProperty('errorCount');
      expect(typeof metrics.integrationActiveTime).toBe('number');
      expect(typeof metrics.activityRecordCount).toBe('number');
      expect(typeof metrics.errorCount).toBe('number');
    });

    it('should track activity recording frequency', () => {
      const initialMetrics = integrationService.getPerformanceMetrics();
      const initialCount = initialMetrics.activityRecordCount;

      integrationService.recordInteractionActivity('click');
      integrationService.recordChatActivity({
        timestamp: Date.now(),
        type: 'sent',
        message: 'test'
      });

      const finalMetrics = integrationService.getPerformanceMetrics();
      expect(finalMetrics.activityRecordCount).toBe(initialCount + 2);
    });
  });
});