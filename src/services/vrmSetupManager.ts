/**
 * VRMSetupManager Service
 * VRM初期化とセットアップ処理
 */
import * as THREE from 'three';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadVRM, loadAnimation } from '../vrmController';
import { CameraManager } from './cameraManager';

export class VRMSetupManager {
    private scene: THREE.Scene;
    private controls: OrbitControls;
    private cameraManager: CameraManager;
    private lookAtTarget: THREE.Object3D;
    private loadedVRMInstance: VRM | null = null;

    constructor(scene: THREE.Scene, controls: OrbitControls, cameraManager: CameraManager) {
        this.scene = scene;
        this.controls = controls;
        this.cameraManager = cameraManager;
        
        // lookAtTarget の初期化
        this.lookAtTarget = new THREE.Object3D();
        this.scene.add(this.lookAtTarget);
        this.lookAtTarget.position.set(0, 1.3, 0.5);
        
        this.setupMouseLookAt();
    }

    async initializeVRM() {
        // まずVRMモデルをロード
        loadVRM('/avatar.vrm', this.scene, (vrm) => {
            console.log('VRMSetupManager: VRMモデルのロードが完了しました。');
            if (vrm) {
                this.loadedVRMInstance = vrm;
                // 次にアニメーションをロード
                loadAnimation('/idle.vrma', () => {
                    console.log('VRMSetupManager: アニメーションのロードが完了しました。');
                    this.onAllAssetsReady();
                    
                    // VRMモデルロード完了後にカメラ設定を復元
                    this.cameraManager.restoreCameraSettings();
                });
            } else {
                console.error('VRMSetupManager: VRMモデルのロードに失敗しました。');
            }
        });
    }

    getLoadedVRM(): VRM | null {
        return this.loadedVRMInstance;
    }

    private onAllAssetsReady() {
        console.log('モデルとアニメーションの準備ができました！');
        if (this.loadedVRMInstance && this.loadedVRMInstance.humanoid) {
            const hipsNode = this.loadedVRMInstance.humanoid.getBoneNode(VRMHumanBoneName.Hips);
            if (hipsNode) {
                const hipsWorldPosition = new THREE.Vector3();
                hipsNode.getWorldPosition(hipsWorldPosition);
                const targetFocusPosition = hipsWorldPosition.clone();
                targetFocusPosition.y -= 0;
                this.controls.target.copy(targetFocusPosition);
                this.controls.update();
                if (this.loadedVRMInstance.lookAt) {
                    this.loadedVRMInstance.lookAt.target = this.lookAtTarget;
                }
                console.log('OrbitControlsのターゲットをVRMの腰に設定しました。');
            }
            
            // lookAtTargetのY座標調整
            const headNode = this.loadedVRMInstance.humanoid.getBoneNode(VRMHumanBoneName.Head);
            if (headNode) {
                const headWorldPosition = new THREE.Vector3();
                headNode.getWorldPosition(headWorldPosition);
                this.lookAtTarget.position.y = headWorldPosition.y; // Y座標だけを頭の高さに合わせる
                console.log(`lookAtTargetのY座標をヘッドポジション: ${headWorldPosition.y} に設定しました。`);
            }
        }
    }

    private setupMouseLookAt() {
        // マウスイベントのリスナーを追加
        window.addEventListener('mousemove', (event) => {
            const headPosition = new THREE.Vector3();
            if (this.loadedVRMInstance && this.loadedVRMInstance.humanoid) {
                const headNode = this.loadedVRMInstance.humanoid.getBoneNode(VRMHumanBoneName.Head);
                if (headNode) {
                    headNode.getWorldPosition(headPosition);
                } else {
                    headPosition.set(0, 1.3, 0); // フォールバック
                }
            } else {
                headPosition.set(0, 1.3, 0); // フォールバック
            }

            // マウスXでターゲットのX座標、マウスYでターゲットのY座標を動かす
            const targetX = (event.clientX / window.innerWidth - 0.5) * 4; // -2 から 2 の範囲くらい
            const targetY = -(event.clientY / window.innerHeight - 0.5) * 2 + headPosition.y; // 頭の高さ中心に -1 から 1 の範囲くらい
            this.lookAtTarget.position.set(targetX, targetY, headPosition.z + 2.0); // Zは頭の位置より少し手前
        });
    }
}

export function createVRMSetupManager(
    scene: THREE.Scene, 
    controls: OrbitControls, 
    cameraManager: CameraManager
): VRMSetupManager {
    return new VRMSetupManager(scene, controls, cameraManager);
}