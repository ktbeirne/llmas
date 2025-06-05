import * as THREE from 'three';

interface VRMController {
  getCurrentVRM(): object | null;
  getExpressionValue(name: string): number | null;
  applyExpression(name: string, intensity?: number): boolean;
  getAvailableExpressions(): Array<{ name: string; isBinary: boolean }>;
}

interface HeadTracker {
  isEnabled(): boolean;
  enable(): Promise<void>;
  disable(): Promise<void>;
  setLookAtTarget(position: THREE.Vector3): Promise<void>;
  clearLookAtTarget(): Promise<void>;
}

interface SettingsStore {
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

interface StateStatus {
  isIdle: boolean;
  isRunning: boolean;
  hasActiveExpression: boolean;
  hasManualOverride: boolean;
  canEnableMouseFollow: boolean;
  lastActivityTime: number;
  currentIdleExpression: string | null;
}

/**
 * IdleStateManager
 * 
 * Manages idle state detection and behavior for the desktop mascot.
 * 
 * Key Responsibilities:
 * - Detects user idle state based on activity tracking
 * - Manages expression priority hierarchy (manual > chat > idle > blink)
 * - Controls mouse follow functionality during idle periods
 * - Applies idle expressions and random look-around behavior
 * - Provides comprehensive error handling and state monitoring
 * 
 * Integration Points:
 * - VRMController: For VRM model and expression management
 * - HeadTracker: For head movement and mouse follow control
 * - SettingsStore: For configuration persistence
 */
export class IdleStateManager {
  private static readonly DEFAULT_CONFIG: IdleConfig = {
    enabled: false,
    idleTimeoutMs: 30000, // 30 seconds
    expressionChangeIntervalMs: 5000, // 5 seconds
    disableMouseFollowWhenIdle: true,
    idleExpressions: ['happy', 'relaxed', 'thinking'],
    randomLookAroundEnabled: true
  };

  // Expression Detection Constants
  private static readonly EXPRESSION_THRESHOLD = 0.1;
  
  // Timeout Constants
  private static readonly MANUAL_OVERRIDE_TIMEOUT = 500; // 500ms for testing
  private static readonly CHAT_RESPONSE_TIMEOUT = 3000; // 3 seconds
  private static readonly IDLE_CHECK_INTERVAL = 1000; // 1 second
  
  // Expression Intensity Constants
  private static readonly MIN_EXPRESSION_INTENSITY = 0.3;
  private static readonly MAX_EXPRESSION_INTENSITY = 0.7;
  
  // Random Look Around Constants
  private static readonly MIN_LOOK_AROUND_INTERVAL = 3000; // 3 seconds
  private static readonly MAX_LOOK_AROUND_INTERVAL = 7000; // 7 seconds
  private static readonly RANDOM_POSITION_RANGE_X = 2.0; // -1 to 1
  private static readonly RANDOM_POSITION_RANGE_Y = 1.0; // -0.5 to 0.5
  private static readonly RANDOM_POSITION_RANGE_Z = 1.0; // -0.5 to 0.5

  private readonly vrmController: VRMController;
  private readonly headTracker: HeadTracker;
  private readonly settingsStore: SettingsStore;
  
  // Configuration and State
  private config: IdleConfig;
  private lastActivityTime = 0; // Start with 0 to be initially idle
  private isRunningState = false;
  
  // Timer Management
  private idleTimer: NodeJS.Timer | null = null;
  private expressionTimer: NodeJS.Timer | null = null;
  private lookAroundTimer: NodeJS.Timer | null = null;
  
  // Expression Override Management
  private manualExpressionOverride: { expression: string; timestamp: number } | null = null;
  private chatResponseExpression: { expression: string; timestamp: number } | null = null;
  private currentIdleExpression: string | null = null;
  
  // Error Handling
  private readonly errorCallbacks: Array<(error: Error) => void> = [];

  constructor(
    vrmController: VRMController,
    headTracker: HeadTracker,
    settingsStore: SettingsStore
  ) {
    this.vrmController = vrmController;
    this.headTracker = headTracker;
    this.settingsStore = settingsStore;
    
    // Load configuration
    const savedConfig = this.settingsStore.get<IdleConfig>('idleStateConfig');
    this.config = savedConfig ? { ...savedConfig } : { ...IdleStateManager.DEFAULT_CONFIG };
  }

  // Configuration Management
  getConfiguration(): IdleConfig {
    return { ...this.config };
  }

  updateConfiguration(newConfig: IdleConfig): void {
    this.validateConfiguration(newConfig);
    this.config = { ...newConfig };
    this.settingsStore.set('idleStateConfig', this.config);
    
    // Restart if running with new config
    if (this.isRunningState) {
      this.stop();
      this.start();
    }
  }

  private validateConfiguration(config: IdleConfig): void {
    const errors: string[] = [];
    
    if (config.idleTimeoutMs <= 0) {
      errors.push('Idle timeout must be positive');
    }
    
    if (config.expressionChangeIntervalMs <= 0) {
      errors.push('Expression change interval must be positive');
    }
    
    // Allow empty expressions if only random look around is enabled
    if (config.idleExpressions.length === 0 && config.enabled && !config.randomLookAroundEnabled) {
      errors.push('At least one idle expression must be specified when enabled');
    }
    
    if (errors.length > 0) {
      throw new Error(`Invalid idle configuration: ${errors.join(', ')}`);
    }
  }

  // Idle State Detection
  isIdle(): boolean {
    // If no activity has been recorded (lastActivityTime = 0), consider idle
    if (this.lastActivityTime === 0) return true;
    
    // If feature is disabled, base decision on activity timing only
    if (!this.config.enabled) {
      // If activity was recorded, not idle
      return false;
    }
    
    const timeSinceActivity = Date.now() - this.lastActivityTime;
    return timeSinceActivity >= this.config.idleTimeoutMs;
  }

  recordChatActivity(activity: ChatActivity): void {
    this.lastActivityTime = activity.timestamp;
    this.onActivityRecorded();
  }

  recordInteractionActivity(type: string): void {
    this.lastActivityTime = Date.now();
    this.onActivityRecorded();
  }

  private onActivityRecorded(): void {
    if (this.config.disableMouseFollowWhenIdle && this.headTracker) {
      this.headTracker.enable().catch(error => {
        this.notifyError(error as Error);
      });
    }
  }

  getLastActivityTime(): number {
    return this.lastActivityTime;
  }

  // Expression State Monitoring
  hasActiveExpression(): boolean {
    try {
      const availableExpressions = this.vrmController.getAvailableExpressions();
      
      for (const expr of availableExpressions) {
        if (expr.name === 'blink') continue; // Ignore blink
        
        const value = this.vrmController.getExpressionValue(expr.name);
        if (value !== null && value > IdleStateManager.EXPRESSION_THRESHOLD) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.notifyError(error as Error);
      return false;
    }
  }

  getActiveExpressions(): string[] {
    try {
      const active: string[] = [];
      const availableExpressions = this.vrmController.getAvailableExpressions();
      
      for (const expr of availableExpressions) {
        if (expr.name === 'blink') continue; // Ignore blink
        
        const value = this.vrmController.getExpressionValue(expr.name);
        if (value !== null && value > IdleStateManager.EXPRESSION_THRESHOLD) {
          active.push(expr.name);
        }
      }
      
      return active;
    } catch (error) {
      this.notifyError(error as Error);
      return [];
    }
  }

  // VRM Integration
  isVRMAvailable(): boolean {
    try {
      return this.vrmController.getCurrentVRM() !== null;
    } catch (error) {
      this.notifyError(error as Error);
      return false;
    }
  }

  areExpressionsAvailable(): boolean {
    try {
      const expressions = this.vrmController.getAvailableExpressions();
      return expressions.length > 0;
    } catch (error) {
      this.notifyError(error as Error);
      return false;
    }
  }

  // Manual Expression Override Management
  recordManualExpressionOverride(expression: string, intensity: number): void {
    this.manualExpressionOverride = {
      expression,
      timestamp: Date.now()
    };
  }

  hasManualExpressionOverride(): boolean {
    return this.isOverrideActive(
      this.manualExpressionOverride,
      IdleStateManager.MANUAL_OVERRIDE_TIMEOUT,
      () => { this.manualExpressionOverride = null; }
    );
  }

  recordChatResponseExpression(expression: string): void {
    this.chatResponseExpression = {
      expression,
      timestamp: Date.now()
    };
  }

  private hasChatResponseExpression(): boolean {
    return this.isOverrideActive(
      this.chatResponseExpression,
      IdleStateManager.CHAT_RESPONSE_TIMEOUT,
      () => { this.chatResponseExpression = null; }
    );
  }

  canApplyIdleExpression(): boolean {
    return !this.hasManualExpressionOverride() && !this.hasChatResponseExpression();
  }

  canEnableIdleExpressions(): boolean {
    return this.canApplyIdleExpression();
  }

  // Mouse Follow Integration
  canEnableMouseFollow(): boolean {
    if (!this.config.disableMouseFollowWhenIdle) return true;
    return !this.isIdle();
  }

  // Idle Behavior Management
  start(): void {
    if (this.isRunningState) return;
    
    this.isRunningState = true;
    
    // Immediately check and set initial state
    if (this.config.disableMouseFollowWhenIdle && this.isIdle()) {
      this.headTracker.disable().catch(error => {
        this.notifyError(error as Error);
      });
    }
    
    this.startIdleMonitoring();
  }

  stop(): void {
    this.isRunningState = false;
    this.clearAllTimers();
  }

  isRunning(): boolean {
    return this.isRunningState;
  }

  private startIdleMonitoring(): void {
    this.idleTimer = setInterval(() => {
      this.checkIdleState();
    }, IdleStateManager.IDLE_CHECK_INTERVAL);

    if (this.config.enabled) {
      this.startExpressionManagement();
      
      if (this.config.randomLookAroundEnabled) {
        this.startRandomLookAround();
      }
    }
  }

  private checkIdleState(): void {
    const wasIdle = this.isIdle();
    
    if (this.config.disableMouseFollowWhenIdle) {
      if (wasIdle) {
        this.headTracker.disable().catch(error => {
          this.notifyError(error as Error);
        });
      } else {
        this.headTracker.enable().catch(error => {
          this.notifyError(error as Error);
        });
      }
    }
  }

  private startExpressionManagement(): void {
    // Apply immediately for testing
    this.applyIdleExpression();
    
    this.expressionTimer = setInterval(() => {
      this.applyIdleExpression();
    }, this.config.expressionChangeIntervalMs);
  }

  private applyIdleExpression(): void {
    if (!this.isIdle() || !this.canApplyIdleExpression()) return;
    if (this.config.idleExpressions.length === 0) return;
    
    try {
      const randomExpression = this.config.idleExpressions[
        Math.floor(Math.random() * this.config.idleExpressions.length)
      ];
      
      const intensity = this.generateRandomExpressionIntensity();
      
      if (this.vrmController.applyExpression(randomExpression, intensity)) {
        this.currentIdleExpression = randomExpression;
      }
    } catch (error) {
      this.notifyError(error as Error);
    }
  }

  private startRandomLookAround(): void {
    // Immediately perform random look around for testing
    this.performRandomLookAround();
    
    const interval = this.generateRandomLookAroundInterval();
    this.lookAroundTimer = setInterval(() => {
      this.performRandomLookAround();
    }, interval);
  }

  private performRandomLookAround(): void {
    if (!this.isIdle() || !this.config.randomLookAroundEnabled) return;
    
    const position = this.generateRandomLookAtPosition();
    this.headTracker.setLookAtTarget(position).catch(error => {
      this.notifyError(error as Error);
    });
  }

  private clearAllTimers(): void {
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
    
    if (this.expressionTimer) {
      clearInterval(this.expressionTimer);
      this.expressionTimer = null;
    }
    
    if (this.lookAroundTimer) {
      clearInterval(this.lookAroundTimer);
      this.lookAroundTimer = null;
    }
  }

  // State Management
  getStateStatus(): StateStatus {
    return {
      isIdle: this.isIdle(),
      isRunning: this.isRunning(),
      hasActiveExpression: this.hasActiveExpression(),
      hasManualOverride: this.hasManualExpressionOverride(),
      canEnableMouseFollow: this.canEnableMouseFollow(),
      lastActivityTime: this.lastActivityTime,
      currentIdleExpression: this.currentIdleExpression || 'none'
    };
  }

  // Error Handling
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
    this.errorCallbacks.forEach(callback => callback(error));
  }

  // Helper Methods for Common Operations

  /**
   * Checks if an expression override is still active based on timestamp and timeout
   * @param override The override object with timestamp
   * @param timeoutMs Timeout in milliseconds
   * @param clearCallback Callback to clear the override when expired
   * @returns true if override is still active, false otherwise
   */
  private isOverrideActive(
    override: { timestamp: number } | null,
    timeoutMs: number,
    clearCallback: () => void
  ): boolean {
    if (!override) return false;
    
    const elapsed = Date.now() - override.timestamp;
    if (elapsed > timeoutMs) {
      clearCallback();
      return false;
    }
    
    return true;
  }

  // Helper Methods for Random Generation
  private generateRandomExpressionIntensity(): number {
    const range = IdleStateManager.MAX_EXPRESSION_INTENSITY - IdleStateManager.MIN_EXPRESSION_INTENSITY;
    return IdleStateManager.MIN_EXPRESSION_INTENSITY + Math.random() * range;
  }

  private generateRandomLookAroundInterval(): number {
    const range = IdleStateManager.MAX_LOOK_AROUND_INTERVAL - IdleStateManager.MIN_LOOK_AROUND_INTERVAL;
    return IdleStateManager.MIN_LOOK_AROUND_INTERVAL + Math.random() * range;
  }

  private generateRandomLookAtPosition(): THREE.Vector3 {
    const x = (Math.random() - 0.5) * IdleStateManager.RANDOM_POSITION_RANGE_X;
    const y = (Math.random() - 0.5) * IdleStateManager.RANDOM_POSITION_RANGE_Y;
    const z = (Math.random() - 0.5) * IdleStateManager.RANDOM_POSITION_RANGE_Z;
    
    return new THREE.Vector3(x, y, z);
  }
}