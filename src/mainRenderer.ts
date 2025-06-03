/**
 * MainRenderer - メインレンダラー統合ファイル (Phase 4.11 Task 5)
 * 全ての機能をサービスに委譲し、最小限の統合レイヤーとして機能
 */
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';

import type { ElectronAPI } from './preload.types';
import './index.css';

// Service imports
import { TitleBarMonitor, createTitleBarMonitor } from './services/titleBarMonitor';
import { MouseHandler, createMouseHandler } from './services/mouseHandler';
import { CameraManager, createCameraManager } from './services/cameraManager';
import { ButtonHandler, createButtonHandler } from './services/buttonHandler';
import { VRMGlobalHandler, createVRMGlobalHandler } from './services/vrmGlobalHandler';
import { RenderManager, createRenderManager } from './services/renderManager';
import { VRMSetupManager, createVRMSetupManager } from './services/vrmSetupManager';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

class MainRenderer {
    // THREE.js Core
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();

    // DOM Elements
    private canvasElement: HTMLCanvasElement;
    private speechBubbleContainer: HTMLDivElement;
    private speechBubbleText: HTMLParagraphElement;

    // Service Instances
    private titleBarMonitor: TitleBarMonitor;
    private mouseHandler: MouseHandler;
    private cameraManager: CameraManager;
    private buttonHandler: ButtonHandler;
    private vrmGlobalHandler: VRMGlobalHandler;
    private renderManager: RenderManager;
    private vrmSetupManager: VRMSetupManager;

    constructor() {
        this.initializeDOMElements();
        this.initializeTHREEjs();
        this.initializeServices();
        this.startApplication();
    }

    private initializeDOMElements() {
        this.canvasElement = document.getElementById('vrm-canvas') as HTMLCanvasElement;
        this.speechBubbleContainer = document.getElementById('speech-bubble-container') as HTMLDivElement;
        this.speechBubbleText = document.getElementById('speech-bubble-text') as HTMLParagraphElement;
    }

    private initializeTHREEjs() {
        // Scene setup
        this.scene = new THREE.Scene();

        // Camera setup
        const canvasAreaInit = document.getElementById('canvas-area');
        const initialAspect = canvasAreaInit ? 
            canvasAreaInit.clientWidth / canvasAreaInit.clientHeight : 
            window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(30, initialAspect, 0.1, 20);
        this.camera.position.set(0.0, 1.2, 5.0);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvasElement,
            alpha: true,
            antialias: true,
            premultipliedAlpha: false,
        });
        
        const canvasArea = document.getElementById('canvas-area');
        if (canvasArea) {
            this.renderer.setSize(canvasArea.clientWidth, canvasArea.clientHeight);
        } else {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
        
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000000, 0.0);
        this.renderer.shadowMap.enabled = false;

        // Lighting setup
        const light = new THREE.DirectionalLight(0xffffff, Math.PI);
        light.position.set(1.0, 1.0, 1.0).normalize();
        this.scene.add(light);
        
        const ambientLight = new THREE.AmbientLight(0x666666);
        this.scene.add(ambientLight);

        // Controls setup
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enabled = false;
        this.controls.target.set(0.0, 1.0, 0.0);
        this.controls.update();
    }

    private initializeServices() {
        // Initialize all service instances
        this.titleBarMonitor = createTitleBarMonitor();
        this.cameraManager = createCameraManager(this.camera, this.controls);
        
        this.mouseHandler = createMouseHandler({
            canvasElement: this.canvasElement,
            camera: this.camera,
            controls: this.controls,
            raycaster: this.raycaster,
            mouse: this.mouse,
            speechBubbleContainer: this.speechBubbleContainer,
            speechBubbleText: this.speechBubbleText
        });

        this.buttonHandler = createButtonHandler();
        this.vrmGlobalHandler = createVRMGlobalHandler();
        
        this.renderManager = createRenderManager({
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer,
            controls: this.controls,
            cameraManager: this.cameraManager
        });

        this.vrmSetupManager = createVRMSetupManager(
            this.scene, 
            this.controls, 
            this.cameraManager
        );
    }

    private startApplication() {
        // Start all services
        this.titleBarMonitor.start();
        this.buttonHandler.initialize();
        this.vrmGlobalHandler.initialize();
        this.renderManager.startAnimationLoop();
        
        // Initialize VRM
        this.vrmSetupManager.initializeVRM().then(() => {
            // Update mouse handler with loaded VRM
            const loadedVRM = this.vrmSetupManager.getLoadedVRM();
            if (loadedVRM) {
                this.mouseHandler.setVRMInstance(loadedVRM);
            }
        });

        // Setup event listeners
        this.setupEventListeners();
    }

    private setupEventListeners() {
        // DOMContentLoaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.cameraManager.restoreCameraSettings();
            });
        } else {
            this.cameraManager.restoreCameraSettings();
        }

        // Beforeunload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    private cleanup() {
        this.cameraManager.saveCameraSettings();
        this.cameraManager.cleanup();
        this.mouseHandler.cleanup();
        this.renderManager.cleanup();
        this.titleBarMonitor.stop();
    }
}

// Initialize the application
new MainRenderer();