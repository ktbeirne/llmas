/**
 * CameraManager Service
 * カメラ設定の保存・復元・管理処理
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { safeElectronAPICall, safeDOMOperation } from './serviceErrorEnhancer';
import { logger } from './logger';
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
    
    // デフォルトのカメラ設定
    private static readonly DEFAULT_SETTINGS: CameraSettings = {
        position: { x: 0.3, y: 1.0, z: 1.5 },
        target: { x: 0, y: 0.8, z: 0 },
        zoom: 1.0
    };

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

    async restoreCameraSettings(): Promise<void> {
        console.log('[CameraManager] Starting camera settings restoration...');
        
        const settings = await safeElectronAPICall(
            'CameraManager',
            'getCameraSettings',
            async () => {
                if (window.electronAPI?.getCameraSettings) {
                    console.log('[CameraManager] Calling electronAPI.getCameraSettings...');
                    const result = await window.electronAPI.getCameraSettings();
                    console.log('[CameraManager] Raw API result:', result);
                    return result;
                }
                console.log('[CameraManager] electronAPI.getCameraSettings not available');
                return null;
            }
        );
        
        console.log('[CameraManager] Processed settings:', settings);

        if (settings) {
            safeDOMOperation('CameraManager', 'applyCameraSettings', () => {
                // デバッグログを追加
                logger.info('CameraManager', 'applyCameraSettings', 'Attempting to apply settings', settings);
                
                // settingsオブジェクトの構造を検証
                if (!settings.position || typeof settings.position.x !== 'number' || 
                    typeof settings.position.y !== 'number' || typeof settings.position.z !== 'number') {
                    logger.warn('CameraManager', 'applyCameraSettings', 'Invalid camera position in settings, using defaults', settings);
                    this.applyDefaultSettings();
                    return;
                }
                
                if (!settings.target || typeof settings.target.x !== 'number' || 
                    typeof settings.target.y !== 'number' || typeof settings.target.z !== 'number') {
                    logger.warn('CameraManager', 'applyCameraSettings', 'Invalid camera target in settings, using defaults', settings);
                    this.applyDefaultSettings();
                    return;
                }
                
                if (typeof settings.zoom !== 'number' || settings.zoom <= 0) {
                    logger.warn('CameraManager', 'applyCameraSettings', 'Invalid camera zoom in settings, using defaults', settings);
                    this.applyDefaultSettings();
                    return;
                }
                
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
            logger.info('CameraManager', 'restoreCameraSettings', 'No camera settings found, using defaults');
            this.applyDefaultSettings();
        }
    }
    
    private applyDefaultSettings(): void {
        safeDOMOperation('CameraManager', 'applyDefaultSettings', () => {
            // デフォルト設定を適用
            this.camera.position.set(
                CameraManager.DEFAULT_SETTINGS.position.x,
                CameraManager.DEFAULT_SETTINGS.position.y,
                CameraManager.DEFAULT_SETTINGS.position.z
            );
            
            this.controls.target.set(
                CameraManager.DEFAULT_SETTINGS.target.x,
                CameraManager.DEFAULT_SETTINGS.target.y,
                CameraManager.DEFAULT_SETTINGS.target.z
            );
            
            this.camera.zoom = CameraManager.DEFAULT_SETTINGS.zoom;
            this.camera.updateProjectionMatrix();
            this.controls.update();
            
            logger.info('CameraManager', 'applyDefaultSettings', 'Default camera settings applied');
        });
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