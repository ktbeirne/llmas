/**
 * Mouse Follow Feature - Public API
 * FSD Phase 2
 * 
 * マウス追従機能のパブリックAPI
 * このファイルを通してのみ外部からアクセス可能
 */

// Types
export type {
  MousePosition,
  HeadOrientation,
  MouseFollowSettings,
  MouseFollowState
} from './types';

// Errors
export {
  UnsupportedPlatformError,
  AccessibilityPermissionError
} from './types';

// Store (Zustand hook)
export { useMouseFollowStore } from './model/mouse-follow-store';

// Service
export { MouseFollowService } from './api/mouse-follow-service';

// Utility functions
export {
  calculateHeadOrientation,
  smoothOrientation,
  getNormalizedCoordinates,
  orientationToQuaternion
} from './lib/calculations';

/**
 * Feature initialization helper
 * widgetやappレイヤーから使用される初期化ヘルパー
 */
export async function initializeMouseFollow(): Promise<import('./api/mouse-follow-service').MouseFollowService> {
  // 動的インポートで循環参照を回避
  const { MouseFollowService } = await import('./api/mouse-follow-service');
  const service = new MouseFollowService();
  await service.initialize();
  return service;
}