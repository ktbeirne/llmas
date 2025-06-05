/**
 * Mouse Follow Types - FSD Phase 2
 * マウス追従機能の型定義
 */

export interface MousePosition {
  x: number;
  y: number;
  timestamp: number;
}

export interface HeadOrientation {
  pitch: number;  // 上下の回転（ラジアン）
  yaw: number;    // 左右の回転（ラジアン）
  roll: number;   // 傾き（ラジアン）
}

export interface MouseFollowSettings {
  enabled: boolean;
  sensitivity: number;      // 0.0 - 1.0
  smoothing: number;        // 0.0 - 1.0
  deadZone: number;         // ピクセル
  updateFrequency: number;  // ミリ秒
}

export interface MouseFollowState extends MouseFollowSettings {
  // Runtime state
  isTracking: boolean;
  currentPosition: MousePosition | null;
  targetOrientation: HeadOrientation | null;
  smoothedOrientation: HeadOrientation | null;
  
  // Permission state
  hasPermission: boolean;
  permissionError: string | null;
}

// エラー型
export class UnsupportedPlatformError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedPlatformError';
  }
}

export class AccessibilityPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccessibilityPermissionError';
  }
}