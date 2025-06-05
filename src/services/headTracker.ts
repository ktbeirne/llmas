import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';

interface VRMController {
  getCurrentVRM(): VRM | null;
  updateFeatures(delta: number): void;
}

interface HeadTrackingConfig {
  enabled: boolean;
  sensitivity: number;
  smoothingFactor: number;
  maxRotationAngle: number;
  trackingFrequency: number;
}

/**
 * HeadTracker Service - VRM頭部追跡とLookAt制御を管理
 * 
 * 責務:
 * - VRM LookAt APIとの統合
 * - スムージング機能による自然な頭部動作
 * - 設定管理と検証
 * - エラーハンドリング
 */
export class HeadTracker {
  // デフォルト設定定数
  private static readonly DEFAULT_CONFIG: HeadTrackingConfig = {
    enabled: false,
    sensitivity: 1.0,
    smoothingFactor: 0.1,
    maxRotationAngle: 45,
    trackingFrequency: 15
  } as const;

  // 検証制限値
  private static readonly VALIDATION_LIMITS = {
    MIN_SENSITIVITY: 0,
    MAX_SENSITIVITY: Number.MAX_SAFE_INTEGER,
    MIN_SMOOTHING_FACTOR: 0,
    MAX_SMOOTHING_FACTOR: 1,
    MIN_ROTATION_ANGLE: 0,
    MAX_ROTATION_ANGLE: 180,
    MIN_TRACKING_FREQUENCY: 1,
    MAX_TRACKING_FREQUENCY: 120
  } as const;

  // 数学定数
  private static readonly MATH_CONSTANTS = {
    DEGREES_TO_RADIANS: Math.PI / 180
  } as const;

  private readonly vrmController: VRMController;
  private lookAtTarget: THREE.Object3D | null = null;
  private targetPosition: THREE.Vector3 | null = null;
  private config: HeadTrackingConfig;
  private readonly errorCallbacks: Array<(error: Error) => void> = [];

  constructor(vrmController: VRMController) {
    this.vrmController = vrmController;
    this.config = { ...HeadTracker.DEFAULT_CONFIG };
  }

  // VRM操作のヘルパーメソッド
  private getVRMSafely(): VRM | null {
    try {
      return this.vrmController.getCurrentVRM();
    } catch (error) {
      this.notifyError(error as Error);
      return null;
    }
  }

  private isVRMLookAtReady(vrm: VRM | null): vrm is VRM & { lookAt: NonNullable<VRM['lookAt']> } {
    return vrm?.lookAt !== undefined;
  }

  private createLookAtTargetIfNeeded(): void {
    if (!this.lookAtTarget) {
      this.lookAtTarget = new THREE.Object3D();
    }
  }

  private bindLookAtTargetToVRM(vrm: VRM): void {
    if (this.isVRMLookAtReady(vrm)) {
      vrm.lookAt.target = this.lookAtTarget;
    }
  }

  // VRM Integration
  isVRMLookAtAvailable(): boolean {
    const vrm = this.getVRMSafely();
    return this.isVRMLookAtReady(vrm);
  }

  // LookAt Target Management
  setLookAtTarget(position: THREE.Vector3): void {
    try {
      const vrm = this.getVRMSafely();
      if (!this.isVRMLookAtReady(vrm)) return;

      this.createLookAtTargetIfNeeded();
      
      if (this.lookAtTarget) {
        // Initialize or update position
        this.lookAtTarget.position.copy(position);
        this.bindLookAtTargetToVRM(vrm);
      }

      // Store target position for smoothing
      this.targetPosition = position.clone();
    } catch (error) {
      this.notifyError(error as Error);
    }
  }

  clearLookAtTarget(): void {
    try {
      const vrm = this.getVRMSafely();
      if (this.isVRMLookAtReady(vrm)) {
        vrm.lookAt.target = undefined;
      }
      this.lookAtTarget = null;
      this.targetPosition = null;
    } catch (error) {
      this.notifyError(error as Error);
    }
  }

  getCurrentTarget(): THREE.Vector3 | null {
    return this.lookAtTarget?.position.clone() || null;
  }

  // Smoothing Functionality
  applySmoothingToTarget(targetPosition: THREE.Vector3): THREE.Vector3 {
    if (this.config.smoothingFactor >= 1.0) {
      return targetPosition.clone();
    }

    const currentTarget = this.getCurrentTarget() || new THREE.Vector3();
    const factor = this.config.smoothingFactor;

    return currentTarget.lerp(targetPosition, factor);
  }

  setSmoothingFactor(factor: number): void {
    const limits = HeadTracker.VALIDATION_LIMITS;
    this.config.smoothingFactor = Math.max(
      limits.MIN_SMOOTHING_FACTOR, 
      Math.min(limits.MAX_SMOOTHING_FACTOR, factor)
    );
  }

  getSmoothingFactor(): number {
    return this.config.smoothingFactor;
  }

  // Configuration Management
  getConfiguration(): HeadTrackingConfig {
    return { ...this.config };
  }

  updateConfiguration(newConfig: HeadTrackingConfig): void {
    this.validateConfiguration(newConfig);
    this.config = { ...newConfig };
  }

  private validateConfiguration(config: HeadTrackingConfig): void {
    const limits = HeadTracker.VALIDATION_LIMITS;
    
    const validationErrors: string[] = [];

    if (config.sensitivity < limits.MIN_SENSITIVITY || config.sensitivity > limits.MAX_SENSITIVITY) {
      validationErrors.push(`Sensitivity must be between ${limits.MIN_SENSITIVITY} and ${limits.MAX_SENSITIVITY}`);
    }

    if (config.smoothingFactor < limits.MIN_SMOOTHING_FACTOR || config.smoothingFactor > limits.MAX_SMOOTHING_FACTOR) {
      validationErrors.push(`Smoothing factor must be between ${limits.MIN_SMOOTHING_FACTOR} and ${limits.MAX_SMOOTHING_FACTOR}`);
    }

    if (config.maxRotationAngle < limits.MIN_ROTATION_ANGLE || config.maxRotationAngle > limits.MAX_ROTATION_ANGLE) {
      validationErrors.push(`Max rotation angle must be between ${limits.MIN_ROTATION_ANGLE} and ${limits.MAX_ROTATION_ANGLE} degrees`);
    }

    if (config.trackingFrequency < limits.MIN_TRACKING_FREQUENCY || config.trackingFrequency > limits.MAX_TRACKING_FREQUENCY) {
      validationErrors.push(`Tracking frequency must be between ${limits.MIN_TRACKING_FREQUENCY} and ${limits.MAX_TRACKING_FREQUENCY} Hz`);
    }

    if (validationErrors.length > 0) {
      throw new Error(`Invalid configuration values: ${validationErrors.join(', ')}`);
    }
  }

  enable(): void {
    this.config.enabled = true;
  }

  disable(): void {
    this.config.enabled = false;
    this.clearLookAtTarget();
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  // Update and Integration
  update(delta: number): void {
    if (!this.config.enabled) return;

    try {
      const vrm = this.getVRMSafely();
      if (!this.isVRMLookAtReady(vrm)) return;

      this.updateLookAtPosition();
      this.updateVRMLookAt(vrm, delta);
    } catch (error) {
      this.notifyError(error as Error);
    }
  }

  private updateLookAtPosition(): void {
    if (this.lookAtTarget && this.targetPosition) {
      const currentPos = this.lookAtTarget.position.clone();
      const smoothedPos = currentPos.lerp(this.targetPosition, this.config.smoothingFactor);
      this.lookAtTarget.position.copy(smoothedPos);
    }
  }

  private updateVRMLookAt(vrm: VRM, delta: number): void {
    if (this.isVRMLookAtReady(vrm)) {
      vrm.lookAt.update(delta);
    }
  }

  // Rotation Limits
  applyRotationLimits(target: THREE.Vector3): THREE.Vector3 {
    const maxRadians = this.config.maxRotationAngle * HeadTracker.MATH_CONSTANTS.DEGREES_TO_RADIANS;
    const maxLength = Math.tan(maxRadians);
    const currentLength = target.length();
    
    if (currentLength > maxLength) {
      return target.clone().normalize().multiplyScalar(maxLength);
    }
    
    return target.clone();
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
}