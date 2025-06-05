/**
 * MainRenderer - メインレンダラー統合ファイル (Feature-Sliced Design)
 * THREE.jsの基本機能と最小限のサービス統合のみに集中
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
// FSD統合に移行したため削除
// import { MouseFollowRendererIntegrationService, createMouseFollowRendererIntegrationService } from './services/MouseFollowRendererIntegrationService';
import { DebugManagerService, createDebugManagerService } from './services/DebugManagerService';
import { simpleLogger } from './services/logger';
import { themeManager } from './utils/themeManager';
// FSD統合
import { MascotIntegration } from './widgets/mascot-view/model/mascot-integration';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    mascotIntegration?: MascotIntegration;
    vrmExpression?: {
      applyExpression: (name: string, intensity?: number) => boolean;
      resetAllExpressions: () => void;
      getAvailableExpressions: () => Array<{ name: string; displayName: string; isPreset: boolean }>;
    };
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

    // Core Service Instances
    private titleBarMonitor: TitleBarMonitor;
    private mouseHandler: MouseHandler;
    private cameraManager: CameraManager;
    private buttonHandler: ButtonHandler;
    private vrmGlobalHandler: VRMGlobalHandler;
    private renderManager: RenderManager;
    private vrmSetupManager: VRMSetupManager;

    // Integration Services (Feature-Sliced Design)
    private mascotIntegration: MascotIntegration;
    private debugManager: DebugManagerService;

    constructor() {
        this.initializeDOMElements();
        this.initializeTHREEjs();
        // FSD統合
        this.mascotIntegration = new MascotIntegration(this.scene);
        window.mascotIntegration = this.mascotIntegration; // グローバルに公開
        this.debugManager = createDebugManagerService();
        this.initializeServicesAndStart();
    }

    private async initializeServicesAndStart() {
        await this.initializeServices();
        this.startApplication();
    }

    private initializeDOMElements() {
        this.canvasElement = document.getElementById('vrm-canvas') as HTMLCanvasElement;
        this.speechBubbleContainer = document.getElementById('speech-bubble-container') as HTMLDivElement;
        this.speechBubbleText = document.getElementById('speech-bubble-text') as HTMLParagraphElement;
        
        // Ensure transparency immediately
        this.forceTransparency();
    }
    
    private forceTransparency() {
        simpleLogger.debug('[MainRenderer] Forcing transparency on critical elements...');
        
        // body element
        const body = document.body;
        if (body) {
            body.style.backgroundColor = 'transparent';
            body.style.background = 'transparent';
            body.classList.add('main-window');
        }
        
        // canvas-area element
        const canvasArea = document.getElementById('canvas-area');
        if (canvasArea) {
            canvasArea.style.backgroundColor = 'transparent';
            canvasArea.style.background = 'transparent';
        }
        
        // vrm-canvas element
        if (this.canvasElement) {
            this.canvasElement.style.backgroundColor = 'transparent';
            this.canvasElement.style.background = 'transparent';
        }
        
        simpleLogger.debug('[MainRenderer] Transparency forced on DOM elements');
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
        this.renderer.setClearColor(0x000000, 0.0); // Complete transparency
        this.renderer.shadowMap.enabled = false;
        
        simpleLogger.debug('[MainRenderer] WebGL Renderer settings:', {
            alpha: true,
            clearColor: '0x000000',
            clearAlpha: 0.0,
            premultipliedAlpha: false,
            canvasBackground: this.canvasElement.style.backgroundColor,
            canvasAreaBackground: canvasArea?.style.backgroundColor
        });

        // Lighting setup
        const light = new THREE.DirectionalLight(0xffffff, Math.PI);
        light.position.set(1.0, 1.0, 1.0).normalize();
        this.scene.add(light);
        
        const ambientLight = new THREE.AmbientLight(0x666666);
        this.scene.add(ambientLight);

        // Controls setup
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enabled = false; // Enable only on VRM model
        this.controls.target.set(0.0, 1.0, 0.0);
        
        // Mouse button assignments: left=rotate, middle=dolly, right=pan
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };
        
        this.controls.panSpeed = 0.8;
        
        // Disable right-click context menu
        this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
        
        this.controls.update();
    }

    private async initializeServices() {
        // Initialize core service instances
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
        
        // Initialize Mouse Follow Integration Service
        // await this.mouseFollowIntegration.initialize();
        
        this.renderManager = createRenderManager({
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer,
            controls: this.controls,
            cameraManager: this.cameraManager,
            mouseFollowService: null // this.mouseFollowIntegration.getMouseFollowIntegrationService()
        });

        this.vrmSetupManager = createVRMSetupManager(
            this.scene, 
            this.controls, 
            this.cameraManager
        );
        
        // VRMSetupManagerをRenderManagerに設定（頭部・首の追従のため）
        this.renderManager.setVRMSetupManager(this.vrmSetupManager);
    }

    private startApplication() {
        // Start all core services
        this.titleBarMonitor.start();
        this.buttonHandler.initialize();
        this.vrmGlobalHandler.initialize();
        this.renderManager.startAnimationLoop();
        
        // Ensure canvas transparency
        simpleLogger.debug('[MainRenderer] Ensuring canvas transparency...');
        // DOMの準備が完了してから実行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                themeManager.ensureCanvasTransparency();
            });
        } else {
            // 既にDOMが準備されている場合は、requestAnimationFrameで次のフレームで実行
            requestAnimationFrame(() => {
                themeManager.ensureCanvasTransparency();
            });
        }
        
        // Initialize VRM
        this.vrmSetupManager.initializeVRM().then(async () => {
            await this.handleVRMInitialized();
        }).catch((error) => {
            simpleLogger.error('[MainRenderer] VRM initialization failed:', error);
        });

        // Setup event listeners
        this.setupEventListeners();
        
        // Setup debug functions
        this.setupDebugManager();
    }

    /**
     * Handles VRM initialization completion
     */
    private async handleVRMInitialized(): Promise<void> {
        const loadedVRM = this.vrmSetupManager.getLoadedVRM();
        console.log('[MainRenderer] VRM initialization completed. Loaded VRM:', !!loadedVRM);
        
        if (loadedVRM) {
            this.mouseHandler.setVRMInstance(loadedVRM);
            console.log('[MainRenderer] VRM instance set to mouse handler');
            
            // Start mouse follow integration after VRM is loaded
            // FSD統合でマウス追従を開始
            if (this.mascotIntegration && loadedVRM) {
                console.log('[MainRenderer] Starting mouse follow with FSD integration');
                await this.mascotIntegration.initialize();
                await this.mascotIntegration.startMouseTracking();
                
                // ExpressionManagerをグローバルに公開（レガシー互換性のため）
                const expressionManager = this.mascotIntegration.getExpressionManager();
                if (expressionManager) {
                    window.vrmExpression = {
                        applyExpression: (name: string, intensity?: number) => {
                            return expressionManager.applyExpression(name, intensity);
                        },
                        resetAllExpressions: () => {
                            expressionManager.resetAllExpressions();
                        },
                        getAvailableExpressions: () => {
                            return expressionManager.getAvailableExpressions();
                        }
                    };
                    console.log('[MainRenderer] ExpressionManager exposed as window.vrmExpression for legacy compatibility');
                }
            }
            
            // Ensure transparency after VRM loading
            // VRMのレンダリングが完了してから透明性を確保
            requestAnimationFrame(() => {
                themeManager.ensureCanvasTransparency();
            });
        } else {
            console.error('[MainRenderer] VRM instance is null after initialization');
        }
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

        // Theme change listener
        if (window.electronAPI && window.electronAPI.onThemeChanged) {
            window.electronAPI.onThemeChanged((theme: string) => {
                console.log('[MainRenderer] Theme change received:', theme);
                if (themeManager) {
                    themeManager.setTheme(theme);
                    // themeManager内部でthemeAppliedイベントが発火される
                    // イベントリスナーで処理するため、ここでは追加処理不要
                }
            });
            console.log('[MainRenderer] Theme change listener registered');
        }

        // カスタムイベント：テーマ適用完了リスナー
        document.addEventListener('themeApplied', (event: CustomEvent) => {
            console.log('[MainRenderer] Theme applied event received:', event.detail);
            
            // テーマ適用完了後の確実な処理
            requestAnimationFrame(() => {
                themeManager.ensureCanvasTransparency();
                
                // アイコンバーの表示を最終確認
                const iconBar = document.getElementById('icon-bar');
                if (iconBar) {
                    iconBar.style.display = 'flex';
                    iconBar.style.visibility = 'visible';
                    iconBar.style.opacity = '1';
                    console.log('[MainRenderer] Icon bar final visibility check completed');
                }
            });
        });

        // Setup mouse follow activity recording
        // this.mouseFollowIntegration.setupActivityRecording();

        // Beforeunload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // App quit listener (for save before quit)  
        if (window.electronAPI) {
            // app-before-quitイベントのリスナーを追加（preload経由）
            if ((window.electronAPI as any).onAppBeforeQuit) {
                (window.electronAPI as any).onAppBeforeQuit(() => {
                    console.log('[MainRenderer] App before quit event received, saving camera settings...');
                    this.cameraManager.saveCameraSettings();
                });
            }
        }
    }

    /**
     * Sets up debug manager with all dependencies
     */
    private setupDebugManager(): void {
        this.debugManager.setDependencies({
            vrmSetupManager: this.vrmSetupManager,
            mouseHandler: this.mouseHandler,
            camera: this.camera,
            scene: this.scene,
            mouseFollowIntegration: null // FSD統合に移行
        });
        
        this.debugManager.setupDebugFunctions();
    }

    /**
     * Cleanup method for all services
     */
    private async cleanup(): Promise<void> {
        this.cameraManager.saveCameraSettings();
        this.cameraManager.cleanup();
        this.mouseHandler.cleanup();
        this.renderManager.cleanup();
        this.titleBarMonitor.stop();
        
        // Clean up mouse follow integration service
        // FSD統合に移行したため削除
        // await this.mouseFollowIntegration.cleanup();
        
        // Clean up debug functions
        this.debugManager.cleanup();
        
        console.log('[MainRenderer] All cleanup completed');
    }
}

// Initialize the application
new MainRenderer();