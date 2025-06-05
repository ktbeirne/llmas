/**
 * VRMSetupManager Service
 * VRM初期化とセットアップ処理
 */
import * as THREE from 'three';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useVRMStore } from '@features/vrm-control';

import { loadVRM, loadAnimation } from '../vrmController';

import { CameraManager } from './cameraManager';
import { MascotStateManager } from './MascotStateManager';

export class VRMSetupManager {
    private scene: THREE.Scene;
    private controls: OrbitControls;
    private cameraManager: CameraManager;
    private lookAtTarget: THREE.Object3D;
    private loadedVRMInstance: VRM | null = null;
    
    // 頭部・首の追従用
    private headBone: THREE.Object3D | null = null;
    private neckBone: THREE.Object3D | null = null;
    private initialHeadRotation = new THREE.Quaternion();
    private initialNeckRotation = new THREE.Quaternion();
    private currentHeadRotation = new THREE.Quaternion();
    private currentNeckRotation = new THREE.Quaternion();
    private targetHeadRotation = new THREE.Quaternion();
    private targetNeckRotation = new THREE.Quaternion();
    private smoothingFactor = 0.1; // スムージング係数
    
    // グローバルマウストラッキング用
    private globalMouseTrackingInterval: NodeJS.Timer | null = null;
    private isTrackingGlobalMouse = false;
    
    // 状態管理
    private mascotStateManager: MascotStateManager;
    private hasLoggedMissingBones = false;
    private hasLoggedMousePosition = false;

    constructor(scene: THREE.Scene, controls: OrbitControls, cameraManager: CameraManager) {
        this.scene = scene;
        this.controls = controls;
        this.cameraManager = cameraManager;
        
        // 状態管理の初期化
        this.mascotStateManager = MascotStateManager.getInstance();
        
        // lookAtTarget の初期化
        this.lookAtTarget = new THREE.Object3D();
        this.scene.add(this.lookAtTarget);
        this.lookAtTarget.position.set(0, 1.3, 0.5);
        
        // VRMロード完了後にマウストラッキングを開始するように変更
        console.log('[VRMSetupManager] コンストラクタ完了、VRMロード待機中');
    }

    async initializeVRM(): Promise<void> {
        console.log('[VRMSetupManager] initializeVRM開始');
        
        return new Promise((resolve, reject) => {
            // まずVRMモデルをロード
            const vrmPath = window.location.protocol === 'file:' 
                ? './public/avatar.vrm'  // Electronのfile:プロトコルの場合
                : '/avatar.vrm';         // Vite開発サーバーの場合
            console.log('[VRMSetupManager] loadVRM呼び出し:', vrmPath, 'protocol:', window.location.protocol);
            loadVRM(vrmPath, this.scene, (vrm) => {
                console.log('[VRMSetupManager] loadVRMコールバック呼ばれた, vrm:', !!vrm);
                if (vrm) {
                    // vrmControllerのインスタンスを使用する
                    const vrmControllerInstance = window.vrmController?.getCurrentVRM();
                    this.loadedVRMInstance = vrmControllerInstance ?? vrm;
                    
                    // VRMStoreに反映（FSD統合のため）
                    useVRMStore.getState().setVRM(this.loadedVRMInstance, '/avatar.vrm');
                    
                    // 次にアニメーションをロード
                    try {
                        const animationPath = window.location.protocol === 'file:' 
                            ? './public/idle.vrma'  // Electronのfile:プロトコルの場合
                            : '/idle.vrma';         // Vite開発サーバーの場合
                        console.log('[VRMSetupManager] loadAnimation呼び出し:', animationPath);
                        loadAnimation(animationPath, () => {
                            this.onAllAssetsReady();
                            
                            // VRMモデルロード完了後にカメラ設定を復元
                            this.cameraManager.restoreCameraSettings();
                            
                            // Promise を resolve して MainRenderer に通知
                            resolve();
                        });
                    } catch (animationError) {
                        console.warn('[VRMSetupManager] Animation load failed, but VRM is ready:', animationError);
                        // アニメーションに失敗してもVRMは使える
                        this.onAllAssetsReady();
                        this.cameraManager.restoreCameraSettings();
                        resolve();
                    }
                } else {
                    console.error('[VRMSetupManager] VRM model load failed - vrm is null');
                    reject(new Error('VRM model load failed'));
                }
            });
        });
    }

    getLoadedVRM(): VRM | null {
        return this.loadedVRMInstance;
    }

    private onAllAssetsReady() {
        console.log('モデルとアニメーションの準備ができました！');
        
        if (this.loadedVRMInstance && this.loadedVRMInstance.humanoid) {
            const hipsNode = this.loadedVRMInstance.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Hips);
            if (hipsNode) {
                const hipsWorldPosition = new THREE.Vector3();
                hipsNode.getWorldPosition(hipsWorldPosition);
                const targetFocusPosition = hipsWorldPosition.clone();
                targetFocusPosition.y -= 0;
                this.controls.target.copy(targetFocusPosition);
                this.controls.update();
                if (this.loadedVRMInstance.lookAt) {
                    this.loadedVRMInstance.lookAt.target = this.lookAtTarget;
                } else {
                    console.warn('[VRMSetupManager] VRMのlookAtが利用できません');
                }
                console.log('OrbitControlsのターゲットをVRMの腰に設定しました。');
            }
            
            // lookAtTargetのY座標調整と頭部・首ボーンの取得
            const headNode = this.loadedVRMInstance.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
            const neckNode = this.loadedVRMInstance.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Neck);
            
            if (headNode) {
                this.headBone = headNode;
                const headWorldPosition = new THREE.Vector3();
                headNode.getWorldPosition(headWorldPosition);
                this.lookAtTarget.position.y = headWorldPosition.y; // Y座標だけを頭の高さに合わせる
                console.log(`lookAtTargetのY座標をヘッドポジション: ${headWorldPosition.y} に設定しました。`);
                
                // 初期回転を保存
                this.initialHeadRotation.copy(headNode.quaternion);
                console.log('頭部ボーンを取得しました。');
            }
            
            if (neckNode) {
                this.neckBone = neckNode;
                // 初期回転を保存
                this.initialNeckRotation.copy(neckNode.quaternion);
                console.log('首ボーンを取得しました。');
            }
            
            // VRMロード完了後にマウストラッキングを開始
            this.setupMouseLookAt();
        }
    }

    private setupMouseLookAt() {
        // グローバルマウストラッキングを使用
        console.log('[VRMSetupManager] setupMouseLookAt開始');
        this.startGlobalMouseTracking();
    }
    
    private async startGlobalMouseTracking() {
        if (this.isTrackingGlobalMouse) {
            console.log('[VRMSetupManager] 既にグローバルマウストラッキング中');
            return;
        }
        
        console.log('[VRMSetupManager] グローバルマウストラッキング開始');
        this.isTrackingGlobalMouse = true;
        
        // グローバルマウス位置を定期的に取得
        this.globalMouseTrackingInterval = setInterval(async () => {
            try {
                // マスコットがアイドル状態でない場合はスキップ
                const isIdle = this.mascotStateManager.isIdleForMouseFollow();
                const state = this.mascotStateManager.getState();
                // console.log('[VRMSetupManager] マウス追従状態チェック:', {
                //     isIdle,
                //     isExpressionActive: state.isExpressionActive,
                //     activeExpression: state.activeExpression,
                //     isSpeechBubbleActive: state.isSpeechBubbleActive,
                //     isAnimationActive: state.isAnimationActive
                // });
                
                if (!isIdle) {
                    return;
                }
                // Electron APIでスクリーン上のマウス位置を取得
                const cursorPos = await window.electronAPI.getCursorScreenPoint();
                const screenBounds = await window.electronAPI.getScreenBounds();
                
                const headPosition = new THREE.Vector3();
                if (this.loadedVRMInstance && this.loadedVRMInstance.humanoid) {
                    const headNode = this.loadedVRMInstance.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
                    if (headNode) {
                        headNode.getWorldPosition(headPosition);
                    } else {
                        headPosition.set(0, 1.3, 0); // フォールバック
                    }
                } else {
                    headPosition.set(0, 1.3, 0); // フォールバック
                }
                
                // スクリーン座標を正規化座標に変換
                const normalizedX = cursorPos.x / screenBounds.width;
                const normalizedY = cursorPos.y / screenBounds.height;
                
                // マウスXでターゲットのX座標、マウスYでターゲットのY座標を動かす
                const targetX = (normalizedX - 0.5) * 4; // -2 から 2 の範囲くらい
                const targetY = -(normalizedY - 0.5) * 2 + headPosition.y; // 頭の高さ中心に -1 から 1 の範囲くらい
                this.lookAtTarget.position.set(targetX, targetY, headPosition.z + 2.0); // Zは頭の位置より少し手前
                
                // 頭部と首の回転を計算
                this.calculateHeadNeckRotation(targetX, targetY, headPosition.z + 2.0);
                
                // デバッグ: マウス位置が取得できているか確認（初回のみ）
                if (!this.hasLoggedMousePosition) {
                    console.log('[VRMSetupManager] マウス位置取得成功:', { cursorPos, normalizedX, normalizedY, targetX, targetY });
                    this.hasLoggedMousePosition = true;
                }
            } catch (error) {
                console.error('[VRMSetupManager] グローバルマウストラッキングエラー:', error);
            }
        }, 50); // 50ms間隔（20FPS）で更新
    }
    
    private stopGlobalMouseTracking() {
        if (this.globalMouseTrackingInterval) {
            clearInterval(this.globalMouseTrackingInterval);
            this.globalMouseTrackingInterval = null;
        }
        this.isTrackingGlobalMouse = false;
    }
    
    private calculateHeadNeckRotation(targetX: number, targetY: number, targetZ: number) {
        if (!this.headBone || !this.neckBone || !this.loadedVRMInstance) return;
        
        // 首の位置を取得
        const neckWorldPos = new THREE.Vector3();
        this.neckBone.getWorldPosition(neckWorldPos);
        
        // ターゲットへの方向ベクトルを計算
        const targetPos = new THREE.Vector3(targetX, targetY, targetZ);
        const direction = new THREE.Vector3().subVectors(targetPos, neckWorldPos).normalize();
        
        // 方向から回転角度を計算
        const yaw = Math.atan2(direction.x, direction.z); // 左右回転
        const pitch = Math.atan2(direction.y, Math.sqrt(direction.x * direction.x + direction.z * direction.z)); // 上下回転（Y軸反転を削除）
        
        // 回転制限（自然な範囲内に）
        const maxYaw = Math.PI / 3; // 60度
        const maxPitch = Math.PI / 4; // 45度
        
        const clampedYaw = Math.max(-maxYaw, Math.min(maxYaw, yaw));
        const clampedPitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));
        
        // 回転を首と頭に分配（首70%、頭30%）
        const neckYaw = clampedYaw * 0.7;
        const neckPitch = clampedPitch * 0.7;
        const headYaw = clampedYaw * 0.3;
        const headPitch = clampedPitch * 0.3;
        
        // Euler角からQuaternionに変換し、初期回転と合成
        const neckRotationDelta = new THREE.Quaternion().setFromEuler(new THREE.Euler(neckPitch, neckYaw, 0, 'YXZ'));
        const headRotationDelta = new THREE.Quaternion().setFromEuler(new THREE.Euler(headPitch, headYaw, 0, 'YXZ'));
        
        // 初期回転に相対回転を適用
        this.targetNeckRotation.copy(this.initialNeckRotation).multiply(neckRotationDelta);
        this.targetHeadRotation.copy(this.initialHeadRotation).multiply(headRotationDelta);
    }
    
    // アニメーションループで呼び出すメソッド
    update(delta: number): void {
        if (!this.headBone || !this.neckBone) {
            // 初回のみログ出力
            if (!this.headBone && !this.hasLoggedMissingBones) {
                console.log('[VRMSetupManager] update: 頭部ボーンが未設定');
                this.hasLoggedMissingBones = true;
            }
            return;
        }
        
        // 現在の回転から目標回転へスムーズに補間
        this.neckBone.quaternion.slerp(this.targetNeckRotation, this.smoothingFactor);
        this.headBone.quaternion.slerp(this.targetHeadRotation, this.smoothingFactor);
    }
    
    // クリーンアップ用メソッド
    cleanup(): void {
        this.stopGlobalMouseTracking();
    }
}

export function createVRMSetupManager(
    scene: THREE.Scene, 
    controls: OrbitControls, 
    cameraManager: CameraManager
): VRMSetupManager {
    return new VRMSetupManager(scene, controls, cameraManager);
}