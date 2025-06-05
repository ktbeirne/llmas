import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { IdleMouseFollowIntegrationService, createIdleMouseFollowIntegrationService } from './IdleMouseFollowIntegrationService';
import { VRMController } from '../vrmController';
import * as THREE from 'three';

/**
 * End-to-End Integration Tests for Mouse Follow System
 * 
 * These tests verify that the complete mouse follow system works correctly
 * when integrated with real or near-real components, simulating actual
 * application usage scenarios.
 */

// Mock Electron APIs that would be available in the real app
const mockElectronAPI = {
  screen: {
    getCursorScreenPoint: vi.fn(),
    getPrimaryDisplay: vi.fn(),
    getAllDisplays: vi.fn()
  }
};

// Mock settings store that simulates the real settings persistence
class MockSettingsStore {
  private storage = new Map<string, any>();

  get<T>(key: string): T | undefined {
    return this.storage.get(key) as T;
  }

  set<T>(key: string, value: T): void {
    this.storage.set(key, value);
  }

  onChange(callback: (key: string, value: any) => void): () => void {
    // Simple mock - in real app this would listen to file changes
    return () => {};
  }

  // Helper method for testing
  clear(): void {
    this.storage.clear();
  }
}

// Mock VRM Controller with realistic behavior
class MockVRMController {
  private currentVRM: any = null;
  private expressions = new Map<string, number>();
  
  getCurrentVRM(): any {
    return this.currentVRM;
  }

  setCurrentVRM(vrm: any): void {
    this.currentVRM = vrm;
  }

  getExpressionValue(name: string): number | null {
    return this.expressions.get(name) ?? 0;
  }

  applyExpression(name: string, intensity?: number): boolean {
    if (!this.currentVRM) return false;
    this.expressions.set(name, intensity ?? 1.0);
    return true;
  }

  getAvailableExpressions(): Array<{ name: string; isBinary: boolean }> {
    return [
      { name: 'happy', isBinary: false },
      { name: 'sad', isBinary: false },
      { name: 'surprised', isBinary: false },
      { name: 'angry', isBinary: false },
      { name: 'blink', isBinary: false },
      { name: 'blinkLeft', isBinary: false },
      { name: 'blinkRight', isBinary: false },
    ];
  }

  // Helper methods for testing
  clearExpressions(): void {
    this.expressions.clear();
  }

  getActiveExpressions(): { [key: string]: number } {
    return Object.fromEntries(this.expressions);
  }
}

describe('Mouse Follow System E2E Integration', () => {
  let integrationService: IdleMouseFollowIntegrationService;
  let vrmController: MockVRMController;
  let settingsStore: MockSettingsStore;

  beforeEach(() => {
    // Set up mock environment
    vi.clearAllMocks();
    
    // Mock Electron APIs
    (global as any).electron = mockElectronAPI;

    // Create mock components
    vrmController = new MockVRMController();
    settingsStore = new MockSettingsStore();

    // Create a mock VRM with basic structure
    const mockVRM = {
      scene: new THREE.Group(),
      lookAt: {
        target: null,
        update: vi.fn()
      },
      expressionManager: {
        setValue: vi.fn(),
        getValue: vi.fn(),
        expressionMap: new Map(),
        customExpressionMap: new Map()
      }
    };

    vrmController.setCurrentVRM(mockVRM);

    // Set up realistic Electron API responses
    mockElectronAPI.screen.getCursorScreenPoint.mockReturnValue({ x: 640, y: 360 });
    mockElectronAPI.screen.getPrimaryDisplay.mockReturnValue({
      bounds: { x: 0, y: 0, width: 1280, height: 720 },
      workArea: { x: 0, y: 0, width: 1280, height: 720 }
    });
    mockElectronAPI.screen.getAllDisplays.mockReturnValue([
      { bounds: { x: 0, y: 0, width: 1280, height: 720 } }
    ]);

    // Create the integration service
    integrationService = createIdleMouseFollowIntegrationService(
      vrmController,
      settingsStore
    );
  });

  afterEach(async () => {
    // Clean up resources
    if (integrationService) {
      await integrationService.destroy();
    }
    settingsStore.clear();
    vrmController.clearExpressions();
  });

  describe('Complete System Initialization', () => {
    it('should initialize all components without errors', () => {
      expect(integrationService).toBeDefined();
      expect(integrationService.getIdleStateManager()).toBeDefined();
      expect(integrationService.getMouseFollowService()).toBeDefined();
      expect(integrationService.getHeadTrackerAdapter()).toBeDefined();
    });

    it('should start with proper default configuration', () => {
      const status = integrationService.getIntegratedStatus();
      
      expect(status.isIntegrationActive).toBe(false);
      expect(status.lastActivityTime).toBe(0); // Initially no activity
      expect(typeof status.canEnableMouseFollow).toBe('boolean');
      expect(typeof status.hasActiveExpression).toBe('boolean');
    });

    it('should check VRM readiness correctly', async () => {
      const isReady = await integrationService.isVRMReady();
      expect(typeof isReady).toBe('boolean');
    });
  });

  describe('Real-World Usage Scenarios', () => {
    it('should handle typical user interaction flow', async () => {
      // Configure the system for realistic operation
      integrationService.updateIdleConfiguration({
        enabled: true,
        idleTimeoutMs: 10000, // 10 seconds
        expressionChangeIntervalMs: 3000, // 3 seconds
        disableMouseFollowWhenIdle: true,
        idleExpressions: ['happy', 'relaxed'],
        randomLookAroundEnabled: true
      });

      // Enable the integration
      await integrationService.enableIntegration();
      expect(integrationService.isIntegrationActive()).toBe(true);

      // Simulate user activity
      integrationService.recordInteractionActivity('click');
      expect(integrationService.getIntegratedStatus().canEnableMouseFollow).toBe(true);

      // Simulate chat activity  
      integrationService.recordChatActivity({
        timestamp: Date.now(),
        type: 'sent',
        message: 'Hello, mascot!'
      });

      // Check that activity was recorded
      const status = integrationService.getIntegratedStatus();
      expect(status.lastActivityTime).toBeGreaterThan(0);

      // Simulate manual expression override
      integrationService.recordManualExpressionOverride('happy', 0.8);
      expect(integrationService.getIdleStateManager().hasManualExpressionOverride()).toBe(true);

      // Clean shutdown
      await integrationService.disableIntegration();
      expect(integrationService.isIntegrationActive()).toBe(false);
    });

    it('should handle expression priority system correctly', async () => {
      const idleManager = integrationService.getIdleStateManager();

      // Initially should allow idle expressions
      expect(idleManager.canApplyIdleExpression()).toBe(true);

      // Chat response should take priority over idle
      integrationService.recordChatResponseExpression('surprised');
      expect(idleManager.canApplyIdleExpression()).toBe(false);

      // Manual expression should take priority over chat
      integrationService.recordManualExpressionOverride('happy', 1.0);
      expect(idleManager.hasManualExpressionOverride()).toBe(true);
      expect(idleManager.canApplyIdleExpression()).toBe(false);

      // Wait for overrides to expire (chat response timeout is 3000ms + buffer)
      await new Promise(resolve => setTimeout(resolve, 3200));
      
      // Should return to allowing idle expressions
      expect(idleManager.canApplyIdleExpression()).toBe(true);
    });

    it('should handle mouse follow control based on idle state', async () => {
      // Configure to disable mouse follow when idle
      integrationService.updateIdleConfiguration({
        enabled: true,
        idleTimeoutMs: 1000, // Short timeout for testing
        expressionChangeIntervalMs: 2000,
        disableMouseFollowWhenIdle: true,
        idleExpressions: ['happy'],
        randomLookAroundEnabled: false
      });

      await integrationService.enableIntegration();

      // Initially idle - mouse follow should be disabled
      expect(integrationService.getIntegratedStatus().canEnableMouseFollow).toBe(false);

      // Record activity - should enable mouse follow
      integrationService.recordInteractionActivity('keypress');
      expect(integrationService.getIntegratedStatus().canEnableMouseFollow).toBe(true);

      // Note: We don't wait for idle timeout in this test as it would make it too slow
      // The logic is tested in the integration tests
    });

    it('should persist configuration correctly', () => {
      const customConfig = {
        enabled: true,
        idleTimeoutMs: 15000,
        expressionChangeIntervalMs: 4000,
        disableMouseFollowWhenIdle: false,
        idleExpressions: ['happy', 'relaxed', 'thinking'],
        randomLookAroundEnabled: true
      };

      integrationService.updateIdleConfiguration(customConfig);

      // Verify configuration was saved to settings store
      const savedConfig = settingsStore.get('idleStateConfig');
      expect(savedConfig).toBeDefined();
      expect(savedConfig.idleTimeoutMs).toBe(15000);
      expect(savedConfig.disableMouseFollowWhenIdle).toBe(false);
      expect(savedConfig.idleExpressions).toEqual(['happy', 'relaxed', 'thinking']);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle VRM not being loaded gracefully', async () => {
      // Remove VRM
      vrmController.setCurrentVRM(null);

      // Should not throw errors
      await expect(integrationService.enableIntegration()).resolves.not.toThrow();
      
      const isReady = await integrationService.isVRMReady();
      expect(isReady).toBe(false);
    });

    it('should handle invalid configuration gracefully', () => {
      const errorCallback = vi.fn();
      integrationService.onError(errorCallback);

      expect(() => {
        integrationService.updateIdleConfiguration({
          enabled: true,
          idleTimeoutMs: -5000, // Invalid negative timeout
          expressionChangeIntervalMs: 1000,
          disableMouseFollowWhenIdle: true,
          idleExpressions: [],
          randomLookAroundEnabled: false
        });
      }).toThrow('Invalid idle configuration');
    });

    it('should recover from temporary VRM errors', async () => {
      const errorCallback = vi.fn();
      integrationService.onError(errorCallback);

      await integrationService.enableIntegration();

      // Simulate VRM error by making expressions throw
      vrmController.applyExpression = vi.fn().mockImplementation(() => {
        throw new Error('VRM expression error');
      });

      // Should handle the error gracefully
      integrationService.recordManualExpressionOverride('happy', 1.0);

      // Errors should be captured but not crash the system
      expect(integrationService.isIntegrationActive()).toBe(true);
    });
  });

  describe('Performance and Resource Management', () => {
    it('should track performance metrics accurately', async () => {
      await integrationService.enableIntegration();

      const initialMetrics = integrationService.getPerformanceMetrics();
      expect(initialMetrics.activityRecordCount).toBe(0);
      expect(initialMetrics.errorCount).toBe(0);

      // Simulate some activity
      integrationService.recordInteractionActivity('click');
      integrationService.recordChatActivity({
        timestamp: Date.now(),
        type: 'received',
        message: 'Response'
      });

      const updatedMetrics = integrationService.getPerformanceMetrics();
      expect(updatedMetrics.activityRecordCount).toBe(2);
      expect(updatedMetrics.integrationActiveTime).toBeGreaterThan(0);
    });

    it('should clean up resources properly on destruction', async () => {
      await integrationService.enableIntegration();
      expect(integrationService.isIntegrationActive()).toBe(true);

      await integrationService.destroy();
      expect(integrationService.isIntegrationActive()).toBe(false);

      // Should be safe to call multiple times
      await integrationService.destroy();
    });

    it('should handle rapid configuration changes', () => {
      // Simulate rapid configuration updates
      for (let i = 0; i < 10; i++) {
        integrationService.updateIdleConfiguration({
          enabled: true,
          idleTimeoutMs: 5000 + i * 1000,
          expressionChangeIntervalMs: 2000,
          disableMouseFollowWhenIdle: i % 2 === 0,
          idleExpressions: i % 2 === 0 ? ['happy'] : ['sad'],
          randomLookAroundEnabled: i % 3 === 0
        });
      }

      // Should still be functional
      const finalConfig = integrationService.getIdleStateManager().getConfiguration();
      expect(finalConfig.idleTimeoutMs).toBe(14000); // Last value
      expect(finalConfig.disableMouseFollowWhenIdle).toBe(false); // i=9, 9%2=1, so false
    });
  });

  describe('Debug and Monitoring', () => {
    it('should provide comprehensive debug information', async () => {
      await integrationService.enableIntegration();

      const debugInfo = integrationService.getDebugInfo();

      expect(debugInfo).toHaveProperty('idleManagerStatus');
      expect(debugInfo).toHaveProperty('mouseFollowServiceDebug');
      expect(debugInfo).toHaveProperty('headTrackerDebug');
      expect(debugInfo).toHaveProperty('integrationState');

      expect(debugInfo.integrationState.isActive).toBe(true);
      expect(debugInfo.integrationState.uptime).toBeGreaterThan(0);
    });

    it('should provide real-time status updates', () => {
      const status1 = integrationService.getIntegratedStatus();
      expect(status1.lastActivityTime).toBe(0);

      integrationService.recordInteractionActivity('mouse_move');
      
      const status2 = integrationService.getIntegratedStatus();
      expect(status2.lastActivityTime).toBeGreaterThan(status1.lastActivityTime);
    });
  });
});