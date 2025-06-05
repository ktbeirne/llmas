/**
 * MouseHandler Service
 * マウスインタラクション（OrbitControls制御、クリック検出）処理
 */
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface MouseHandlerConfig {
    canvasElement: HTMLCanvasElement;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    speechBubbleContainer?: HTMLDivElement;
    speechBubbleText?: HTMLParagraphElement;
}

export class MouseHandler {
    private config: MouseHandlerConfig;
    private loadedVRMInstance: VRM | null = null;
    private isMouseOverModel = false;
    private speechBubbleTimeout: number | null = null;
    
    // イベントリスナーの参照を保持（メモリリーク修正）
    private mouseMoveHandler: (event: MouseEvent) => void;
    private mouseLeaveHandler: () => void;
    private clickHandler: (event: MouseEvent) => void;

    constructor(config: MouseHandlerConfig) {
        this.config = config;
        
        // イベントハンドラーをバインド（メモリリーク修正）
        this.mouseMoveHandler = this.handleMouseMove.bind(this);
        this.mouseLeaveHandler = this.handleMouseLeave.bind(this);
        this.clickHandler = this.handleClick.bind(this);
        
        this.setupMouseEvents();
    }

    setVRMInstance(vrm: VRM | null) {
        this.loadedVRMInstance = vrm;
        console.log('[MouseHandler] VRM instance updated:', !!vrm);
        if (vrm) {
            console.log('[MouseHandler] VRM scene object count:', vrm.scene.children.length);
        }
    }

    private setupMouseEvents() {
        // マウス移動によるOrbitControls制御（メモリリーク修正：参照を保存）
        this.config.canvasElement.addEventListener('mousemove', this.mouseMoveHandler);

        // マウスがキャンバスから出たらOrbitControls無効化（メモリリーク修正：参照を保存）
        this.config.canvasElement.addEventListener('mouseleave', this.mouseLeaveHandler);

        // クリック検出（メモリリーク修正：参照を保存）
        this.config.canvasElement.addEventListener('click', this.clickHandler);
    }

    private handleMouseMove(event: MouseEvent) {
        // デバッグログを一時的に無効化
        // if (Math.random() < 0.01) {
        //     console.log('[MouseHandler] handleMouseMove called');
        // }
        
        if (!this.loadedVRMInstance || !this.config.camera || !this.config.controls) {
            // デバッグ: 必要な要素が不足している場合
            if (!this.loadedVRMInstance) {
                console.log('[MouseHandler] VRM instance not available');
            }
            if (!this.config.camera) {
                console.log('[MouseHandler] Camera not available');
            }
            if (!this.config.controls) {
                console.log('[MouseHandler] Controls not available');
            }
            return;
        }

        // マウス位置を正規化デバイス座標に変換
        const canvasBounds = this.config.canvasElement.getBoundingClientRect();
        this.config.mouse.x = ((event.clientX - canvasBounds.left) / this.config.canvasElement.clientWidth) * 2 - 1;
        this.config.mouse.y = -((event.clientY - canvasBounds.top) / this.config.canvasElement.clientHeight) * 2 + 1;

        this.config.raycaster.setFromCamera(this.config.mouse, this.config.camera);
        const intersects = this.config.raycaster.intersectObject(this.loadedVRMInstance.scene, true);

        // デバッグログを一時的に無効化
        // if (Math.random() < 0.01) {
        //     console.log('[MouseHandler] Raycast result:', {
        //         mousePos: { x: this.config.mouse.x, y: this.config.mouse.y },
        //         intersectsCount: intersects.length,
        //         isMouseOverModel: this.isMouseOverModel,
        //         controlsEnabled: this.config.controls.enabled
        //     });
        // }

        if (intersects.length > 0) {
            // マウスがモデルの上に乗った
            if (!this.isMouseOverModel) {
                this.isMouseOverModel = true;
                this.config.controls.enabled = true; // OrbitControlsを有効
                // console.log('[MouseHandler] Mouse ON Model - Controls ENABLED');
            }
        } else {
            // マウスがモデルから外れた
            if (this.isMouseOverModel) {
                this.isMouseOverModel = false;
                this.config.controls.enabled = false; // OrbitControlsを無効
                // console.log('[MouseHandler] Mouse OFF Model - Controls DISABLED');
            }
        }
    }

    private handleMouseLeave() {
        if (this.config.controls && this.config.controls.enabled) {
            this.isMouseOverModel = false;
            this.config.controls.enabled = false;
            // console.log('Mouse LEAVE Canvas - Controls DISABLED');
        }
    }

    private handleClick(event: MouseEvent) {
        if (!this.loadedVRMInstance || !this.config.camera) {
            console.log("VRM model or camera not ready for click detection.");
            return;
        }

        // マウスのクリック位置をキャンバスのローカル座標に変換
        const canvasBounds = this.config.canvasElement.getBoundingClientRect();
        const x = event.clientX - canvasBounds.left;
        const y = event.clientY - canvasBounds.top;

        // ローカル座標を正規化デバイス座標 (NDC) に変換
        this.config.mouse.x = (x / this.config.canvasElement.clientWidth) * 2 - 1;
        this.config.mouse.y = -(y / this.config.canvasElement.clientHeight) * 2 + 1;

        // Raycasterにカメラとマウス位置を設定
        this.config.raycaster.setFromCamera(this.config.mouse, this.config.camera);

        // 光線とVRMモデルとの交差を判定
        const intersects = this.config.raycaster.intersectObject(this.loadedVRMInstance.scene, true);

        if (intersects.length > 0) {
            // モデルがクリックされた
            console.log('VRMモデルがクリックされました！ 一番手前のオブジェクト:', intersects[0].object);
            this.showSpeechBubble("（きゃっ！触られました…っ）", 3000);
        } else {
            // キャンバスの背景がクリックされた
            console.log('キャンバスの背景がクリックされました。(モデルではありません)');
        }
    }

    private showSpeechBubble(text: string, duration: number) {
        if (!this.config.speechBubbleText || !this.config.speechBubbleContainer) return;

        this.config.speechBubbleText.textContent = text;
        this.config.speechBubbleContainer.style.visibility = 'visible';
        
        if (this.speechBubbleTimeout) {
            clearTimeout(this.speechBubbleTimeout);
        }
        
        this.speechBubbleTimeout = window.setTimeout(() => {
            if (this.config.speechBubbleContainer) {
                this.config.speechBubbleContainer.style.visibility = 'hidden';
            }
        }, duration);
    }


    cleanup() {
        // タイマーのクリア
        if (this.speechBubbleTimeout) {
            clearTimeout(this.speechBubbleTimeout);
            this.speechBubbleTimeout = null;
        }
        
        // イベントリスナーの削除（メモリリーク修正）
        if (this.config.canvasElement) {
            this.config.canvasElement.removeEventListener('mousemove', this.mouseMoveHandler);
            this.config.canvasElement.removeEventListener('mouseleave', this.mouseLeaveHandler);
            this.config.canvasElement.removeEventListener('click', this.clickHandler);
        }
        
        // 参照のクリア
        this.loadedVRMInstance = null;
        this.isMouseOverModel = false;
    }
}

export function createMouseHandler(config: MouseHandlerConfig): MouseHandler {
    return new MouseHandler(config);
}