/**
 * CameraManager Service
 * カメラ設定の保存・復元・管理処理
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { safeElectronAPICall, safeDOMOperation } from './serviceErrorEnhancer';
import { logger, LogMethod } from './logger';
import { errorHandler, ErrorCategory } from './errorHandler';

export interface CameraSettings {
    position: {
        x: number;
        y: number;
        z: number;
    };
    target: {
        x: number;
        y: number;
        z: number;
    };
    zoom: number;
}

export class CameraManager {
    private camera: THREE.PerspectiveCamera;
    private controls: OrbitControls;
    private saveTimeout: number | null = null;

    constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
        this.camera = camera;
        this.controls = controls;
        this.setupAutoSave();
    }

    private setupAutoSave() {
        // OrbitControlsの変更イベントを監視
        this.controls.addEventListener('change', () => {
            this.scheduleCameraSave();
        });
    }

    @LogMethod('CameraManager')
    async restoreCameraSettings(): Promise<void> {
        const settings = await safeElectronAPICall(
            'CameraManager',
            'getCameraSettings',
            async () => {
                if (window.electronAPI?.getCameraSettings) {
                    return await window.electronAPI.getCameraSettings();
                }
                return null;
            }
        );

        if (settings) {
            safeDOMOperation('CameraManager', 'applyCameraSettings', () => {
                // カメラ位置を復元
                this.camera.position.set(settings.position.x, settings.position.y, settings.position.z);
                
                // OrbitControlsターゲットを復元
                this.controls.target.set(settings.target.x, settings.target.y, settings.target.z);
                
                // ズームを復元
                this.camera.zoom = settings.zoom;
                this.camera.updateProjectionMatrix();
                
                // OrbitControlsを更新
                this.controls.update();
                
                logger.info('CameraManager', 'restoreCameraSettings', 'Camera settings restored successfully', settings);
            });
        } else {
            logger.info('CameraManager', 'restoreCameraSettings', 'No camera settings found to restore');
        }
    }

    async saveCameraSettings() {
        try {
            if (window.electronAPI && window.electronAPI.setCameraSettings) {
                const settings: CameraSettings = {
                    position: {
                        x: this.camera.position.x,
                        y: this.camera.position.y,
                        z: this.camera.position.z
                    },
                    target: {
                        x: this.controls.target.x,
                        y: this.controls.target.y,
                        z: this.controls.target.z
                    },
                    zoom: this.camera.zoom
                };
                
                await window.electronAPI.setCameraSettings(settings);
                console.log('カメラ設定を保存しました:', settings);
            }
        } catch (error) {
            console.error('カメラ設定の保存に失敗しました:', error);
        }
    }

    private scheduleCameraSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = window.setTimeout(() => {
            this.saveCameraSettings();
        }, 1000); // 1秒後に保存
    }

    updateWindowSize(width: number, height: number) {
        // 幅か高さが0の場合は、まだレイアウトが確定していない可能性があるので何もしない
        if (width === 0 || height === 0) {
            console.warn('Canvas dimensions are zero, skipping update.');
            return;
        }

        const aspect = width / height;
        console.log(`Canvas Resized/Updated: ${width}w x ${height}h, Aspect: ${aspect.toFixed(2)}`);

        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
    }

    cleanup() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
    }
}

export function createCameraManager(camera: THREE.PerspectiveCamera, controls: OrbitControls): CameraManager {
    return new CameraManager(camera, controls);
}