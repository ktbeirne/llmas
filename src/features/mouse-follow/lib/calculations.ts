/**
 * Mouse Follow Calculations - FSD Phase 2
 * マウス位置から頭部の向きを計算するユーティリティ
 */

import { MousePosition, HeadOrientation } from '../types';

// 定数
const MAX_ROTATION_ANGLE = Math.PI / 4; // 45度
const COORDINATE_TRANSFORM_X_SCALE = 200;
const COORDINATE_TRANSFORM_Y_SCALE = 800;
const COORDINATE_TRANSFORM_Y_OFFSET = 0.5;

/**
 * マウス位置から頭部の向きを計算
 */
export const calculateHeadOrientation = (
  mousePos: MousePosition,
  sensitivity: number = 0.5,
  deadZone: number = 50
): HeadOrientation | null => {
  // 画面中央を基準点
  const screenCenter = {
    x: window.screen.width / 2,
    y: window.screen.height / 2
  };
  
  // 中央からの距離
  const deltaX = mousePos.x - screenCenter.x;
  const deltaY = mousePos.y - screenCenter.y;
  
  // デッドゾーン内なら null を返す
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  if (distance < deadZone) {
    return null;
  }
  
  // 座標変換（既存の計算式を維持）
  const transformedX = deltaX / COORDINATE_TRANSFORM_X_SCALE;
  const transformedY = -deltaY / COORDINATE_TRANSFORM_Y_SCALE + COORDINATE_TRANSFORM_Y_OFFSET;
  
  // 感度を適用
  const yaw = transformedX * sensitivity;
  const pitch = transformedY * sensitivity;
  
  // 角度制限
  return {
    pitch: Math.max(-MAX_ROTATION_ANGLE, Math.min(MAX_ROTATION_ANGLE, pitch)),
    yaw: Math.max(-MAX_ROTATION_ANGLE, Math.min(MAX_ROTATION_ANGLE, yaw)),
    roll: 0
  };
};

/**
 * スムージング処理
 */
export const smoothOrientation = (
  current: HeadOrientation | null,
  target: HeadOrientation | null,
  smoothing: number = 0.8
): HeadOrientation | null => {
  if (!target) return current;
  if (!current) return target;
  
  const smoothingFactor = Math.max(0, Math.min(1, smoothing));
  const lerpFactor = 1 - smoothingFactor;
  
  return {
    pitch: current.pitch + (target.pitch - current.pitch) * lerpFactor,
    yaw: current.yaw + (target.yaw - current.yaw) * lerpFactor,
    roll: 0
  };
};

/**
 * 正規化された座標を取得（-1 to 1）
 */
export const getNormalizedCoordinates = (mousePos: MousePosition): { x: number; y: number } => {
  const screenCenter = {
    x: window.screen.width / 2,
    y: window.screen.height / 2
  };
  
  return {
    x: (mousePos.x - screenCenter.x) / (window.screen.width / 2),
    y: (mousePos.y - screenCenter.y) / (window.screen.height / 2)
  };
};

/**
 * Three.js用のQuaternionに変換（将来の統合用）
 */
export const orientationToQuaternion = (orientation: HeadOrientation): {
  x: number;
  y: number;
  z: number;
  w: number;
} => {
  // 簡易的なオイラー角からクォータニオンへの変換
  const cy = Math.cos(orientation.yaw * 0.5);
  const sy = Math.sin(orientation.yaw * 0.5);
  const cp = Math.cos(orientation.pitch * 0.5);
  const sp = Math.sin(orientation.pitch * 0.5);
  const cr = Math.cos(orientation.roll * 0.5);
  const sr = Math.sin(orientation.roll * 0.5);
  
  return {
    w: cr * cp * cy + sr * sp * sy,
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy
  };
};