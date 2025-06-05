/**
 * RenderManager Service
 * レンダリングループとサイズ管理処理
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { updateVRMFeatures } from '../vrmController';
import { CameraManager } from './cameraManager';
import { MouseFollowIntegrationService } from './mouseFollowIntegrationService';
import { VRMSetupManager } from './vrmSetupManager';

export interface RenderManagerConfig {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    cameraManager: CameraManager;
    mouseFollowService?: MouseFollowIntegrationService; // Optional mouse follow integration
    vrmSetupManager?: VRMSetupManager; // Optional VRM setup manager
}

export class RenderManager {
    private config: RenderManagerConfig;
    private clock = new THREE.Clock();
    private initialSizeHasBeenSet = false;
    private animationId: number | null = null;

    constructor(config: RenderManagerConfig) {
        this.config = config;
        this.setupWindowResizeListener();
    }

    startAnimationLoop() {
        this.animate();
    }

    stopAnimationLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    private animate = () => {
        this.animationId = requestAnimationFrame(this.animate);
        const delta = this.clock.getDelta();

        this.config.controls.update();
        updateVRMFeatures(delta); // vrmControllerの更新処理を呼び出す
        
        // VRM setup manager update (頭部・首の追従)
        if (this.config.vrmSetupManager) {
            this.config.vrmSetupManager.update(delta);
        }
        
        // Mouse follow integration (if enabled)
        if (this.config.mouseFollowService) {
            this.config.mouseFollowService.integrateWithVRMUpdate(delta);
        }
        
        // Update FSD mascot integration (expression updates, etc.)
        if (window.mascotIntegration) {
            try {
                window.mascotIntegration.update(delta);
            } catch (error) {
                console.error('[RenderManager] Error updating mascot integration:', error);
            }
        }

        if (!this.initialSizeHasBeenSet) {
            const canvasArea = document.getElementById('canvas-area');
            if (canvasArea && canvasArea.clientWidth > 0 && canvasArea.clientHeight > 0) {
                console.log("Initial size detected, updating renderer and camera...");
                this.updateSizesAndLog();
                this.initialSizeHasBeenSet = true; // フラグを立てて、以降はリサイズイベント任せにする
            }
        }

        this.config.renderer.render(this.config.scene, this.config.camera);
    };

    private updateSizesAndLog() {
        const canvasArea = document.getElementById('canvas-area');
        if (!canvasArea) return;
        
        const width = canvasArea.clientWidth;
        const height = canvasArea.clientHeight;

        // 幅か高さが0の場合は、まだレイアウトが確定していない可能性があるので何もしない
        if (width === 0 || height === 0) {
            console.warn('Canvas dimensions are zero, skipping update.');
            return;
        }

        this.config.cameraManager.updateWindowSize(width, height);
        this.config.renderer.setSize(width, height);
        this.config.renderer.setPixelRatio(window.devicePixelRatio);
    }

    private setupWindowResizeListener() {
        // ウィンドウサイズ変更の監視
        window.addEventListener('resize', () => {
            // キャンバスエリアの実際のサイズを取得
            const canvasArea = document.getElementById('canvas-area');
            if (!canvasArea) return;
            
            const width = canvasArea.clientWidth;
            const height = canvasArea.clientHeight;
            
            if (width === 0 || height === 0) {
                console.warn('Canvas area dimensions are zero, skipping resize.');
                return;
            }
            
            this.config.cameraManager.updateWindowSize(width, height);
            this.config.renderer.setSize(width, height);
            this.config.renderer.setPixelRatio(window.devicePixelRatio);
            
            console.log(`Window resized: ${width}w x ${height}h`);
        }, false);
    }

    /**
     * Gets the mouse follow service if available
     */
    getMouseFollowService(): MouseFollowIntegrationService | undefined {
        return this.config.mouseFollowService;
    }
    
    /**
     * Sets the VRM setup manager
     */
    setVRMSetupManager(vrmSetupManager: VRMSetupManager): void {
        this.config.vrmSetupManager = vrmSetupManager;
    }

    cleanup() {
        this.stopAnimationLoop();
        
        // Clean up mouse follow service if present
        if (this.config.mouseFollowService) {
            try {
                // Disable mouse follow to clean up resources
                this.config.mouseFollowService.disableMouseFollow();
            } catch (error) {
                console.error('Error cleaning up mouse follow service:', error);
            }
        }
    }
}

export function createRenderManager(config: RenderManagerConfig): RenderManager {
    return new RenderManager(config);
}