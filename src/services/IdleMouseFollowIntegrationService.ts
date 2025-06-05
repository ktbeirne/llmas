import { HeadTrackerAdapter } from '../infrastructure/adapters/HeadTrackerAdapter';

import { IdleStateManager } from './idleStateManager';
import { MouseFollowIntegrationService, createMouseFollowIntegrationService } from './mouseFollowIntegrationService';

/**
 * IdleMouseFollowIntegrationService
 * 
 * Complete integration service that brings together:
 * - IdleStateManager: Manages idle state detection and behavior
 * - MouseFollowIntegrationService: Handles mouse follow functionality  
 * - HeadTrackerAdapter: Bridges the two systems
 * 
 * This service provides a unified API for controlling the entire
 * idle state + mouse follow system, handling configuration,
 * activity tracking, and error management.
 * 
 * Key Responsibilities:
 * - Unified control interface for both systems
 * - Configuration management for idle and mouse follow settings
 * - Activity recording and expression override management
 * - Comprehensive status and debug information
 * - Error handling and resource management
 * - Performance monitoring and metrics
 */
export class IdleMouseFollowIntegrationService {
  private readonly idleStateManager: IdleStateManager;
  private readonly mouseFollowService: MouseFollowIntegrationService;
  private readonly headTrackerAdapter: HeadTrackerAdapter;

  // State Management
  private isActiveState = false;
  private integrationStartTime = 0;
  private activityRecordCount = 0;
  private errorCount = 0;

  // Error Handling
  private readonly errorCallbacks: Array<(error: Error) => void> = [];

  constructor(
    vrmController: any,
    settingsStore: any
  ) {
    // Create mouse follow integration service
    this.mouseFollowService = createMouseFollowIntegrationService();

    // Create head tracker adapter
    this.headTrackerAdapter = new HeadTrackerAdapter(this.mouseFollowService);

    // Create idle state manager with the head tracker adapter
    this.idleStateManager = new IdleStateManager(
      vrmController,
      this.headTrackerAdapter,
      settingsStore
    );

    // Forward idle state manager errors to our error handlers
    this.idleStateManager.onError((error) => {
      this.errorCount++;
      this.notifyError(error);
    });
  }

  // Unified Control Interface

  /**
   * Enables both idle state monitoring and mouse follow integration
   */
  async enableIntegration(): Promise<void> {
    if (this.isActiveState) {
      return; // Already enabled
    }

    try {
      this.isActiveState = true;
      this.integrationStartTime = performance.now();

      // Start idle state monitoring
      this.idleStateManager.start();

      console.log('[IdleMouseFollowIntegration] Integration enabled successfully');
    } catch (error) {
      this.isActiveState = false;
      this.errorCount++;
      throw new Error(`Failed to enable integration: ${error}`);
    }
  }

  /**
   * Disables both idle state monitoring and mouse follow integration
   */
  async disableIntegration(): Promise<void> {
    if (!this.isActiveState) {
      return; // Already disabled
    }

    try {
      this.isActiveState = false;

      // Stop idle state monitoring
      this.idleStateManager.stop();

      // Disable mouse follow if it's currently enabled
      if (this.mouseFollowService.isEnabled()) {
        await this.mouseFollowService.disableMouseFollow();
      }

      console.log('[IdleMouseFollowIntegration] Integration disabled successfully');
    } catch (error) {
      this.errorCount++;
      throw new Error(`Failed to disable integration: ${error}`);
    }
  }

  /**
   * Checks if the integration is currently active
   */
  isIntegrationActive(): boolean {
    return this.isActiveState;
  }

  // Configuration Management

  /**
   * Updates idle state configuration
   */
  updateIdleConfiguration(config: {
    enabled: boolean;
    idleTimeoutMs: number;
    expressionChangeIntervalMs: number;
    disableMouseFollowWhenIdle: boolean;
    idleExpressions: string[];
    randomLookAroundEnabled: boolean;
  }): void {
    this.idleStateManager.updateConfiguration(config);
  }

  /**
   * Updates mouse follow configuration
   */
  updateMouseFollowConfiguration(config: {
    smoothingEnabled?: boolean;
    smoothingFactor?: number;
    constraints?: {
      maxYaw: number;
      maxPitch: number;
      maxRoll: number;
    };
  }): void {
    this.mouseFollowService.updateConfiguration(config);
  }

  // Activity Recording

  /**
   * Records chat activity and forwards to idle state manager
   */
  recordChatActivity(activity: {
    timestamp: number;
    type: 'sent' | 'received';
    message: string;
  }): void {
    this.activityRecordCount++;
    this.idleStateManager.recordChatActivity(activity);
  }

  /**
   * Records interaction activity (clicks, key presses, etc.)
   */
  recordInteractionActivity(type: string): void {
    this.activityRecordCount++;
    this.idleStateManager.recordInteractionActivity(type);
  }

  // Expression Override Management

  /**
   * Records manual expression override with priority
   */
  recordManualExpressionOverride(expression: string, intensity: number): void {
    this.idleStateManager.recordManualExpressionOverride(expression, intensity);
  }

  /**
   * Records chat response expression
   */
  recordChatResponseExpression(expression: string): void {
    this.idleStateManager.recordChatResponseExpression(expression);
  }

  // Status and Monitoring

  /**
   * Gets comprehensive integrated status
   */
  getIntegratedStatus(): {
    isIntegrationActive: boolean;
    idleStateStatus: any;
    mouseFollowStatus: any;
    canEnableMouseFollow: boolean;
    hasActiveExpression: boolean;
    lastActivityTime: number;
  } {
    const idleStatus = this.idleStateManager.getStateStatus();
    const mouseFollowStatus = this.mouseFollowService.getStatus();

    return {
      isIntegrationActive: this.isActiveState,
      idleStateStatus: idleStatus,
      mouseFollowStatus: mouseFollowStatus,
      canEnableMouseFollow: this.idleStateManager.canEnableMouseFollow(),
      hasActiveExpression: this.idleStateManager.hasActiveExpression(),
      lastActivityTime: this.idleStateManager.getLastActivityTime()
    };
  }

  /**
   * Gets debug information for troubleshooting
   */
  getDebugInfo(): {
    idleManagerStatus: any;
    mouseFollowServiceDebug: any;
    headTrackerDebug: any;
    integrationState: {
      isActive: boolean;
      startTime: number;
      uptime: number;
      activityCount: number;
      errorCount: number;
    };
  } {
    return {
      idleManagerStatus: this.idleStateManager.getStateStatus(),
      mouseFollowServiceDebug: this.mouseFollowService.getDebugInfo(),
      headTrackerDebug: this.headTrackerAdapter.getDebugInfo(),
      integrationState: {
        isActive: this.isActiveState,
        startTime: this.integrationStartTime,
        uptime: this.isActiveState ? performance.now() - this.integrationStartTime : 0,
        activityCount: this.activityRecordCount,
        errorCount: this.errorCount
      }
    };
  }

  /**
   * Checks if VRM is ready for integration
   */
  async isVRMReady(): Promise<boolean> {
    try {
      return await this.mouseFollowService.isVRMReady();
    } catch (error) {
      this.errorCount++;
      this.notifyError(error as Error);
      return false;
    }
  }

  // Performance Monitoring

  /**
   * Gets performance metrics
   */
  getPerformanceMetrics(): {
    integrationActiveTime: number;
    activityRecordCount: number;
    errorCount: number;
  } {
    return {
      integrationActiveTime: this.isActiveState ? performance.now() - this.integrationStartTime : 0,
      activityRecordCount: this.activityRecordCount,
      errorCount: this.errorCount
    };
  }

  // Component Access (for advanced use)

  /**
   * Gets the idle state manager instance
   */
  getIdleStateManager(): IdleStateManager {
    return this.idleStateManager;
  }

  /**
   * Gets the mouse follow service instance
   */
  getMouseFollowService(): MouseFollowIntegrationService {
    return this.mouseFollowService;
  }

  /**
   * Gets the head tracker adapter instance
   */
  getHeadTrackerAdapter(): HeadTrackerAdapter {
    return this.headTrackerAdapter;
  }

  // Error Handling

  /**
   * Registers an error callback
   */
  onError(callback: (error: Error) => void): () => void {
    this.errorCallbacks.push(callback);

    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  private notifyError(error: Error): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }

  // Resource Management

  /**
   * Destroys the integration service and cleans up resources
   */
  async destroy(): Promise<void> {
    try {
      await this.disableIntegration();
      
      // Clear error callbacks
      this.errorCallbacks.length = 0;
      
      console.log('[IdleMouseFollowIntegration] Integration service destroyed');
    } catch (error) {
      console.error('[IdleMouseFollowIntegration] Error during destruction:', error);
    }
  }
}

/**
 * Factory function to create a complete IdleMouseFollowIntegrationService
 */
export function createIdleMouseFollowIntegrationService(
  vrmController: any,
  settingsStore: any
): IdleMouseFollowIntegrationService {
  return new IdleMouseFollowIntegrationService(vrmController, settingsStore);
}