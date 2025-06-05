/**
 * VRM Control Types - FSD Phase 2
 * VRM制御機能の型定義
 */

import type { VRM, VRMExpressionPresetName } from '@pixiv/three-vrm';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';
import * as THREE from 'three';

/**
 * 表情情報
 */
export interface VRMExpressionInfo {
  name: string;
  displayName: string;
  isPreset: boolean;
}

/**
 * VRMモデルの状態
 */
export interface VRMModelState {
  // モデル
  vrm: VRM | null;
  modelUrl: string | null;
  isLoading: boolean;
  loadError: string | null;
  
  // アニメーション
  currentAnimation: VRMAnimation | null;
  animationUrl: string | null;
  animationClip: THREE.AnimationClip | null;
  animationMixer: THREE.AnimationMixer | null;
  isAnimationPlaying: boolean;
  
  // 表情
  currentExpression: string | null;
  expressionIntensity: number;
  
  // LookAt
  lookAtEnabled: boolean;
  lookAtTarget: THREE.Object3D | null;
  
  // まばたき
  blinkEnabled: boolean;
  blinkInterval: number; // ミリ秒
}

/**
 * VRM設定
 */
export interface VRMSettings {
  autoLoadModel: boolean;
  defaultModelUrl: string | null;
  defaultAnimationUrl: string | null;
  blinkEnabled: boolean;
  blinkIntervalMin: number; // 秒
  blinkIntervalMax: number; // 秒
  lookAtEnabled: boolean;
  expressionTransitionDuration: number; // ミリ秒
}

/**
 * VRMロードイベント
 */
export interface VRMLoadEvent {
  url: string;
  vrm?: VRM;
  error?: Error;
}

/**
 * アニメーションロードイベント
 */
export interface VRMAnimationLoadEvent {
  url: string;
  animation?: VRMAnimation;
  error?: Error;
}

/**
 * 表情変更イベント
 */
export interface VRMExpressionChangeEvent {
  expression: string;
  intensity: number;
  previous: string | null;
}

/**
 * ボーン名（日本語表示用）
 */
export const VRMBoneDisplayNames: Record<string, string> = {
  'head': '頭',
  'neck': '首',
  'chest': '胸',
  'spine': '背骨',
  'hips': '腰',
  'leftUpperArm': '左上腕',
  'leftLowerArm': '左前腕',
  'leftHand': '左手',
  'rightUpperArm': '右上腕',
  'rightLowerArm': '右前腕',
  'rightHand': '右手',
  'leftUpperLeg': '左太もも',
  'leftLowerLeg': '左すね',
  'leftFoot': '左足',
  'rightUpperLeg': '右太もも',
  'rightLowerLeg': '右すね',
  'rightFoot': '右足'
};

/**
 * エラー型
 */
export class VRMLoadError extends Error {
  constructor(message: string, public url: string) {
    super(message);
    this.name = 'VRMLoadError';
  }
}

export class VRMAnimationError extends Error {
  constructor(message: string, public url: string) {
    super(message);
    this.name = 'VRMAnimationError';
  }
}

export class VRMExpressionError extends Error {
  constructor(message: string, public expressionName: string) {
    super(message);
    this.name = 'VRMExpressionError';
  }
}