import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IdleStateManager } from './idleStateManager';
import type { VRM } from '@pixiv/three-vrm';

// Mock interfaces based on existing architecture
interface MockVRMController {
  getCurrentVRM(): VRM | null;
  getExpressionValue(name: string): number | null;
  applyExpression(name: string, intensity?: number): boolean;
  getAvailableExpressions(): Array<{ name: string; isBinary: boolean }>;
}

interface MockHeadTracker {
  isEnabled(): boolean;
  enable(): void;
  disable(): void;
  setLookAtTarget(position: any): void;
  clearLookAtTarget(): void;
}

interface MockSettingsStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  onChange(callback: (key: string, value: any) => void): () => void;
}

interface ChatActivity {
  timestamp: number;
  type: 'sent' | 'received';
  message: string;
}

interface IdleConfig {
  enabled: boolean;
  idleTimeoutMs: number;
  expressionChangeIntervalMs: number;
  disableMouseFollowWhenIdle: boolean;
  idleExpressions: string[];
  randomLookAroundEnabled: boolean;
}

describe('IdleStateManager', () => {
  let idleStateManager: IdleStateManager;
  let mockVRMController: MockVRMController;
  let mockHeadTracker: MockHeadTracker;
  let mockSettingsStore: MockSettingsStore;
  let mockVRM: Partial<VRM>;

  beforeEach(() => {
    // Mock VRM instance
    mockVRM = {
      expressionManager: {
        getValue: vi.fn(),
        setValue: vi.fn(),
        expressionMap: new Map()
      }
    };

    // Mock VRMController
    mockVRMController = {
      getCurrentVRM: vi.fn().mockReturnValue(mockVRM),
      getExpressionValue: vi.fn(),
      applyExpression: vi.fn().mockReturnValue(true),
      getAvailableExpressions: vi.fn().mockReturnValue([
        { name: 'happy', isBinary: false },
        { name: 'sad', isBinary: false },
        { name: 'surprised', isBinary: false }
      ])
    };

    // Mock HeadTracker
    mockHeadTracker = {
      isEnabled: vi.fn().mockReturnValue(false),
      enable: vi.fn(),
      disable: vi.fn(),
      setLookAtTarget: vi.fn(),
      clearLookAtTarget: vi.fn()
    };

    // Mock SettingsStore
    mockSettingsStore = {
      get: vi.fn(),
      set: vi.fn(),
      onChange: vi.fn().mockReturnValue(() => {})
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    if (idleStateManager) {
      idleStateManager.stop();
    }
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with dependencies', () => {
      expect(() => {
        idleStateManager = new IdleStateManager(
          mockVRMController,
          mockHeadTracker,
          mockSettingsStore
        );
      }).not.toThrow();
    });

    it('should load default configuration', () => {
      idleStateManager = new IdleStateManager(
        mockVRMController,
        mockHeadTracker,
        mockSettingsStore
      );

      const config = idleStateManager.getConfiguration();
      
      expect(config.enabled).toBe(false);
      expect(config.idleTimeoutMs).toBe(30000); // 30 seconds default
      expect(config.expressionChangeIntervalMs).toBe(5000); // 5 seconds default
      expect(config.disableMouseFollowWhenIdle).toBe(true);
      expect(config.idleExpressions).toEqual(['happy', 'relaxed', 'thinking']);
      expect(config.randomLookAroundEnabled).toBe(true);
    });

    it('should load configuration from settings store', () => {
      const savedConfig: IdleConfig = {
        enabled: true,
        idleTimeoutMs: 60000,
        expressionChangeIntervalMs: 10000,
        disableMouseFollowWhenIdle: false,
        idleExpressions: ['custom1', 'custom2'],
        randomLookAroundEnabled: false
      };

      mockSettingsStore.get.mockReturnValue(savedConfig);

      idleStateManager = new IdleStateManager(
        mockVRMController,
        mockHeadTracker,
        mockSettingsStore
      );

      const config = idleStateManager.getConfiguration();
      expect(config).toEqual(savedConfig);
    });

    it('should update configuration', () => {
      idleStateManager = new IdleStateManager(
        mockVRMController,
        mockHeadTracker,
        mockSettingsStore
      );

      const newConfig: IdleConfig = {
        enabled: true,
        idleTimeoutMs: 45000,
        expressionChangeIntervalMs: 8000,
        disableMouseFollowWhenIdle: true,
        idleExpressions: ['happy', 'sad'],
        randomLookAroundEnabled: true
      };

      idleStateManager.updateConfiguration(newConfig);

      expect(mockSettingsStore.set).toHaveBeenCalledWith('idleStateConfig', newConfig);
      expect(idleStateManager.getConfiguration()).toEqual(newConfig);
    });

    it('should validate configuration values', () => {
      idleStateManager = new IdleStateManager(
        mockVRMController,
        mockHeadTracker,
        mockSettingsStore
      );

      const invalidConfig: IdleConfig = {
        enabled: true,
        idleTimeoutMs: -1000, // Invalid negative value
        expressionChangeIntervalMs: 0, // Invalid zero value
        disableMouseFollowWhenIdle: true,
        idleExpressions: [], // Empty expressions array
        randomLookAroundEnabled: true
      };

      expect(() => {
        idleStateManager.updateConfiguration(invalidConfig);
      }).toThrow('Invalid idle configuration');
    });
  });

  describe('Idle State Detection', () => {
    beforeEach(() => {
      idleStateManager = new IdleStateManager(
        mockVRMController,
        mockHeadTracker,
        mockSettingsStore
      );
    });

    it('should detect initial idle state', () => {
      expect(idleStateManager.isIdle()).toBe(true); // No activity recorded yet
    });

    it('should track chat activity', () => {
      const activity: ChatActivity = {
        timestamp: Date.now(),
        type: 'sent',
        message: 'Hello'
      };

      idleStateManager.recordChatActivity(activity);

      expect(idleStateManager.isIdle()).toBe(false);
      expect(idleStateManager.getLastActivityTime()).toBe(activity.timestamp);
    });

    it('should become idle after timeout', async () => {
      const config: IdleConfig = {
        enabled: true,
        idleTimeoutMs: 100, // Very short timeout for testing
        expressionChangeIntervalMs: 5000,
        disableMouseFollowWhenIdle: true,
        idleExpressions: ['happy'],
        randomLookAroundEnabled: false
      };

      idleStateManager.updateConfiguration(config);
      idleStateManager.start();

      // Record activity
      idleStateManager.recordChatActivity({
        timestamp: Date.now(),
        type: 'sent',
        message: 'Test'
      });

      expect(idleStateManager.isIdle()).toBe(false);

      // Wait for idle timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(idleStateManager.isIdle()).toBe(true);
    });

    it('should track interaction activity', () => {
      idleStateManager.recordInteractionActivity('mouse_move');
      expect(idleStateManager.isIdle()).toBe(false);

      idleStateManager.recordInteractionActivity('window_focus');
      expect(idleStateManager.isIdle()).toBe(false);
    });

    it('should ignore activity when disabled', () => {
      const config = idleStateManager.getConfiguration();
      config.enabled = false;
      idleStateManager.updateConfiguration(config);

      idleStateManager.recordChatActivity({
        timestamp: Date.now(),
        type: 'sent',
        message: 'Test'
      });

      expect(idleStateManager.isIdle()).toBe(false); // Should not change idle state when disabled
    });
  });

  describe('Expression State Monitoring', () => {
    beforeEach(() => {
      idleStateManager = new IdleStateManager(
        mockVRMController,
        mockHeadTracker,
        mockSettingsStore
      );
    });

    it('should detect active expressions', () => {
      mockVRMController.getExpressionValue.mockImplementation((name: string) => {
        if (name === 'happy') return 0.8;
        if (name === 'sad') return 0.0;
        return 0.0;
      });

      expect(idleStateManager.hasActiveExpression()).toBe(true);
      expect(idleStateManager.getActiveExpressions()).toEqual(['happy']);
    });

    it('should detect no active expressions', () => {
      mockVRMController.getExpressionValue.mockReturnValue(0.0);

      expect(idleStateManager.hasActiveExpression()).toBe(false);
      expect(idleStateManager.getActiveExpressions()).toEqual([]);
    });

    it('should ignore blink expression in activity detection', () => {
      mockVRMController.getExpressionValue.mockImplementation((name: string) => {
        if (name === 'blink') return 1.0; // Blink should be ignored
        return 0.0;
      });

      expect(idleStateManager.hasActiveExpression()).toBe(false);
    });

    it('should detect multiple active expressions', () => {
      mockVRMController.getExpressionValue.mockImplementation((name: string) => {
        if (name === 'happy') return 0.5;
        if (name === 'surprised') return 0.3;
        return 0.0;
      });

      expect(idleStateManager.hasActiveExpression()).toBe(true);
      expect(idleStateManager.getActiveExpressions()).toContain('happy');
      expect(idleStateManager.getActiveExpressions()).toContain('surprised');
    });
  });

  describe('Animation State Monitoring', () => {
    beforeEach(() => {
      idleStateManager = new IdleStateManager(
        mockVRMController,
        mockHeadTracker,
        mockSettingsStore
      );
    });

    it('should detect VRM availability', () => {
      expect(idleStateManager.isVRMAvailable()).toBe(true);

      mockVRMController.getCurrentVRM.mockReturnValue(null);
      expect(idleStateManager.isVRMAvailable()).toBe(false);
    });

    it('should check if expressions are available', () => {
      expect(idleStateManager.areExpressionsAvailable()).toBe(true);

      mockVRMController.getAvailableExpressions.mockReturnValue([]);
      expect(idleStateManager.areExpressionsAvailable()).toBe(false);
    });

    it('should detect manual expression override', () => {
      // Simulate manual expression being applied
      idleStateManager.recordManualExpressionOverride('angry', 0.8);

      expect(idleStateManager.hasManualExpressionOverride()).toBe(true);
      expect(idleStateManager.canEnableIdleExpressions()).toBe(false);
    });

    it('should clear manual expression override after timeout', async () => {
      idleStateManager.recordManualExpressionOverride('angry', 0.8);
      expect(idleStateManager.hasManualExpressionOverride()).toBe(true);

      // Wait for override timeout (500ms + buffer)
      await new Promise(resolve => setTimeout(resolve, 600));
      
      expect(idleStateManager.hasManualExpressionOverride()).toBe(false);
    });
  });

  describe('Mouse Follow Integration', () => {
    beforeEach(() => {
      idleStateManager = new IdleStateManager(
        mockVRMController,
        mockHeadTracker,
        mockSettingsStore
      );
    });

    it('should check if mouse follow can be enabled', () => {
      // When not idle, mouse follow should be possible
      idleStateManager.recordChatActivity({
        timestamp: Date.now(),
        type: 'sent',
        message: 'Test'
      });

      expect(idleStateManager.canEnableMouseFollow()).toBe(true);
    });

    it('should disable mouse follow when idle if configured', () => {
      const config = idleStateManager.getConfiguration();
      config.enabled = true;
      config.disableMouseFollowWhenIdle = true;
      config.idleTimeoutMs = 50;
      idleStateManager.updateConfiguration(config);

      idleStateManager.start();

      // Become idle
      expect(idleStateManager.isIdle()).toBe(true);
      expect(idleStateManager.canEnableMouseFollow()).toBe(false);
    });

    it('should allow mouse follow when idle if configured', () => {
      const config = idleStateManager.getConfiguration();
      config.enabled = true;
      config.disableMouseFollowWhenIdle = false;
      idleStateManager.updateConfiguration(config);

      expect(idleStateManager.canEnableMouseFollow()).toBe(true);
    });

    it('should control head tracker based on idle state', () => {
      const config = idleStateManager.getConfiguration();
      config.enabled = true;
      config.disableMouseFollowWhenIdle = true;
      idleStateManager.updateConfiguration(config);

      idleStateManager.start();

      // Should disable head tracker when idle
      expect(mockHeadTracker.disable).toHaveBeenCalled();

      // Record activity to exit idle state
      idleStateManager.recordChatActivity({
        timestamp: Date.now(),
        type: 'sent',
        message: 'Test'
      });

      expect(mockHeadTracker.enable).toHaveBeenCalled();
    });
  });

  describe('Idle Behavior Management', () => {
    beforeEach(() => {
      idleStateManager = new IdleStateManager(
        mockVRMController,
        mockHeadTracker,
        mockSettingsStore
      );
    });

    it('should start idle expression management', () => {
      const config: IdleConfig = {
        enabled: true,
        idleTimeoutMs: 1000,
        expressionChangeIntervalMs: 200,
        disableMouseFollowWhenIdle: false,
        idleExpressions: ['happy', 'relaxed'],
        randomLookAroundEnabled: false
      };

      idleStateManager.updateConfiguration(config);
      idleStateManager.start();

      expect(idleStateManager.isRunning()).toBe(true);
    });

    it('should apply idle expressions periodically', async () => {
      const config: IdleConfig = {
        enabled: true,
        idleTimeoutMs: 50,
        expressionChangeIntervalMs: 100,
        disableMouseFollowWhenIdle: false,
        idleExpressions: ['happy', 'relaxed'],
        randomLookAroundEnabled: false
      };

      idleStateManager.updateConfiguration(config);
      idleStateManager.start();

      // Wait for idle timeout and expression change
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockVRMController.applyExpression).toHaveBeenCalledWith(
        expect.stringMatching(/happy|relaxed/),
        expect.any(Number)
      );
    });

    it('should not apply expressions when manual override is active', async () => {
      const config: IdleConfig = {
        enabled: true,
        idleTimeoutMs: 50,
        expressionChangeIntervalMs: 100,
        disableMouseFollowWhenIdle: false,
        idleExpressions: ['happy'],
        randomLookAroundEnabled: false
      };

      idleStateManager.updateConfiguration(config);
      idleStateManager.recordManualExpressionOverride('angry', 1.0);
      idleStateManager.start();

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should not apply idle expressions when manual override is active
      expect(mockVRMController.applyExpression).not.toHaveBeenCalledWith('happy', expect.any(Number));
    });

    it('should implement random look around behavior', async () => {
      const config: IdleConfig = {
        enabled: true,
        idleTimeoutMs: 50,
        expressionChangeIntervalMs: 200,
        disableMouseFollowWhenIdle: false,
        idleExpressions: [],
        randomLookAroundEnabled: true
      };

      idleStateManager.updateConfiguration(config);
      idleStateManager.start();

      await new Promise(resolve => setTimeout(resolve, 150));

      // Should set random look-at targets
      expect(mockHeadTracker.setLookAtTarget).toHaveBeenCalled();
    });

    it('should stop idle behavior management', () => {
      idleStateManager.start();
      expect(idleStateManager.isRunning()).toBe(true);

      idleStateManager.stop();
      expect(idleStateManager.isRunning()).toBe(false);
    });
  });

  describe('Priority and State Management', () => {
    beforeEach(() => {
      idleStateManager = new IdleStateManager(
        mockVRMController,
        mockHeadTracker,
        mockSettingsStore
      );
    });

    it('should respect expression priority hierarchy', () => {
      // Manual expression should have highest priority
      idleStateManager.recordManualExpressionOverride('angry', 1.0);
      expect(idleStateManager.canApplyIdleExpression()).toBe(false);

      // Chat response expressions should override idle
      idleStateManager.recordChatResponseExpression('surprised');
      expect(idleStateManager.canApplyIdleExpression()).toBe(false);

      // When no higher priority expressions, idle should be allowed
      // (after timeouts expire)
      expect(idleStateManager.canApplyIdleExpression()).toBe(false); // Still blocked by manual override
    });

    it('should get current state summary', () => {
      const state = idleStateManager.getStateStatus();

      expect(state).toEqual({
        isIdle: expect.any(Boolean),
        isRunning: expect.any(Boolean),
        hasActiveExpression: expect.any(Boolean),
        hasManualOverride: expect.any(Boolean),
        canEnableMouseFollow: expect.any(Boolean),
        lastActivityTime: expect.any(Number),
        currentIdleExpression: expect.any(String)
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      idleStateManager = new IdleStateManager(
        mockVRMController,
        mockHeadTracker,
        mockSettingsStore
      );
    });

    it('should handle VRM controller errors gracefully', () => {
      mockVRMController.getCurrentVRM.mockImplementation(() => {
        throw new Error('VRM Controller error');
      });

      expect(() => {
        idleStateManager.isVRMAvailable();
      }).not.toThrow();

      expect(idleStateManager.isVRMAvailable()).toBe(false);
    });

    it('should handle head tracker errors gracefully', () => {
      mockHeadTracker.enable.mockImplementation(() => {
        throw new Error('HeadTracker error');
      });

      expect(() => {
        idleStateManager.start();
      }).not.toThrow();
    });

    it('should provide error callback mechanism', () => {
      const errorCallback = vi.fn();
      idleStateManager.onError(errorCallback);

      // Configure to enable idle expressions
      const config: IdleConfig = {
        enabled: true,
        idleTimeoutMs: 50,
        expressionChangeIntervalMs: 100,
        disableMouseFollowWhenIdle: false,
        idleExpressions: ['happy'],
        randomLookAroundEnabled: false
      };
      idleStateManager.updateConfiguration(config);

      mockVRMController.applyExpression.mockImplementation(() => {
        throw new Error('Expression error');
      });

      idleStateManager.start();

      // Trigger an error scenario
      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Expression error')
        })
      );
    });
  });
});