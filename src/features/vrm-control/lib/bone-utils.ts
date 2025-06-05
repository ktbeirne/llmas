/**
 * Bone Utils - FSD Phase 2
 * VRMボーン操作ユーティリティ
 */

import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { VRMHumanBoneName } from '@pixiv/three-vrm';

/**
 * 頭の位置をスクリーン座標で取得
 */
export function getHeadScreenPosition(
  vrm: VRM,
  camera: THREE.PerspectiveCamera,
  rendererDomElement: HTMLCanvasElement
): { x: number; y: number; isInFront: boolean } | null {
  if (!vrm.humanoid) return null;
  
  const headNode = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
  if (!headNode) return null;

  const worldPosition = new THREE.Vector3();
  headNode.getWorldPosition(worldPosition);

  // カメラから見た時に、頭がカメラの正面にあるかチェック
  const viewZ = worldPosition.clone().project(camera).z;

  // ワールド座標をスクリーン座標 (NDC: -1 to +1) に変換
  const screenPosition = worldPosition.clone().project(camera);

  // NDCを実際のピクセル座標に変換
  const screenX = (screenPosition.x + 1) / 2 * rendererDomElement.clientWidth;
  const screenY = (-screenPosition.y + 1) / 2 * rendererDomElement.clientHeight;

  return { 
    x: screenX, 
    y: screenY, 
    isInFront: viewZ < 1 // カメラの描画範囲内かどうか
  };
}

/**
 * 特定のボーンのワールド位置を取得
 */
export function getBoneWorldPosition(
  vrm: VRM,
  boneName: VRMHumanBoneName
): THREE.Vector3 | null {
  if (!vrm.humanoid) return null;
  
  const boneNode = vrm.humanoid.getNormalizedBoneNode(boneName);
  if (!boneNode) return null;
  
  const worldPosition = new THREE.Vector3();
  boneNode.getWorldPosition(worldPosition);
  
  return worldPosition;
}

/**
 * 特定のボーンのワールド回転を取得
 */
export function getBoneWorldRotation(
  vrm: VRM,
  boneName: VRMHumanBoneName
): THREE.Quaternion | null {
  if (!vrm.humanoid) return null;
  
  const boneNode = vrm.humanoid.getNormalizedBoneNode(boneName);
  if (!boneNode) return null;
  
  const worldRotation = new THREE.Quaternion();
  boneNode.getWorldQuaternion(worldRotation);
  
  return worldRotation;
}

/**
 * ボーンの回転を設定
 */
export function setBoneRotation(
  vrm: VRM,
  boneName: VRMHumanBoneName,
  rotation: THREE.Euler | THREE.Quaternion
): boolean {
  if (!vrm.humanoid) return false;
  
  const boneNode = vrm.humanoid.getNormalizedBoneNode(boneName);
  if (!boneNode) return false;
  
  if (rotation instanceof THREE.Euler) {
    boneNode.rotation.copy(rotation);
  } else {
    boneNode.quaternion.copy(rotation);
  }
  
  return true;
}

/**
 * 頭部の向きを設定（オイラー角）
 */
export function setHeadOrientation(
  vrm: VRM,
  pitch: number,
  yaw: number,
  roll: number = 0
): boolean {
  if (!vrm.humanoid) return false;
  
  const headNode = vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
  if (!headNode) return false;
  
  // オイラー角で回転を設定
  headNode.rotation.set(pitch, yaw, roll);
  
  return true;
}

/**
 * LookAtターゲットを安全に設定
 */
export function setLookAtTarget(
  vrm: VRM,
  target: THREE.Object3D | null
): boolean {
  if (!vrm.lookAt) return false;

  try {
    // ターゲットが有効かテスト
    if (target && typeof target.getWorldPosition !== 'function') {
      console.warn('[BoneUtils] Invalid lookAt target - missing getWorldPosition method');
      return false;
    }

    vrm.lookAt.target = target;
    console.log('[BoneUtils] LookAtターゲットを設定しました:', !!target);
    return true;
  } catch (error) {
    console.error('[BoneUtils] LookAtターゲット設定エラー:', error);
    return false;
  }
}

/**
 * VRMのlookAtターゲットをリセット
 */
export function resetLookAtTarget(vrm: VRM): void {
  if (!vrm.lookAt) return;

  try {
    vrm.lookAt.target = null;
    console.log('[BoneUtils] LookAtターゲットをリセットしました');
  } catch (error) {
    console.error('[BoneUtils] LookAtターゲットリセットエラー:', error);
  }
}

/**
 * すべてのボーンをリセット
 */
export function resetAllBones(vrm: VRM): void {
  if (!vrm.humanoid) return;
  
  // 主要なボーンをリセット
  const bonesToReset = [
    VRMHumanBoneName.Head,
    VRMHumanBoneName.Neck,
    VRMHumanBoneName.Spine,
    VRMHumanBoneName.Chest,
    VRMHumanBoneName.LeftUpperArm,
    VRMHumanBoneName.LeftLowerArm,
    VRMHumanBoneName.LeftHand,
    VRMHumanBoneName.RightUpperArm,
    VRMHumanBoneName.RightLowerArm,
    VRMHumanBoneName.RightHand
  ];
  
  bonesToReset.forEach(boneName => {
    const boneNode = vrm.humanoid!.getNormalizedBoneNode(boneName);
    if (boneNode) {
      boneNode.rotation.set(0, 0, 0);
    }
  });
  
  console.log('[BoneUtils] すべてのボーンをリセットしました');
}