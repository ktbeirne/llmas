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
import { themeManager } from './utils/themeManager';

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
        
        // DOM要素の取得後、即座に透過性を確保
        this.forceTransparency();
    }
    
    private forceTransparency() {
        console.log('[MainRenderer] Forcing transparency on critical elements...');
        
        // body要素
        const body = document.body;
        if (body) {
            body.style.backgroundColor = 'transparent';
            body.style.background = 'transparent';
            body.classList.add('main-window');
        }
        
        // canvas-area要素
        const canvasArea = document.getElementById('canvas-area');
        if (canvasArea) {
            canvasArea.style.backgroundColor = 'transparent';
            canvasArea.style.background = 'transparent';
        }
        
        // vrm-canvas要素
        if (this.canvasElement) {
            this.canvasElement.style.backgroundColor = 'transparent';
            this.canvasElement.style.background = 'transparent';
        }
        
        console.log('[MainRenderer] Transparency forced on DOM elements');
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
        this.renderer.setClearColor(0x000000, 0.0); // 完全透明
        this.renderer.shadowMap.enabled = false;
        
        // デバッグ: レンダラー設定を確認
        console.log('[MainRenderer] WebGL Renderer settings:', {
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
        this.controls.enabled = false; // VRMモデル上でのみ有効化する仕様
        this.controls.target.set(0.0, 1.0, 0.0);
        
        // マウスボタンの割り当てを変更
        // 右ボタンでパン（上下左右移動）、左ボタンで回転
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };
        
        // パン速度の調整（必要に応じて）
        this.controls.panSpeed = 0.8;
        
        // 右クリックのコンテキストメニューを無効化
        this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
        
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
        
        // Ensure canvas transparency
        console.log('[MainRenderer] Ensuring canvas transparency...');
        setTimeout(() => {
            themeManager.ensureCanvasTransparency();
        }, 100);
        
        // Initialize VRM
        this.vrmSetupManager.initializeVRM().then(() => {
            // Update mouse handler with loaded VRM
            const loadedVRM = this.vrmSetupManager.getLoadedVRM();
            console.log('[MainRenderer] VRM initialization completed. Loaded VRM:', !!loadedVRM);
            if (loadedVRM) {
                this.mouseHandler.setVRMInstance(loadedVRM);
                console.log('[MainRenderer] VRM instance set to mouse handler');
                
                // VRM読み込み完了後に透過性を再確認
                setTimeout(() => {
                    themeManager.ensureCanvasTransparency();
                }, 200);
            } else {
                console.error('[MainRenderer] VRM instance is null after initialization');
            }
        }).catch((error) => {
            console.error('[MainRenderer] VRM initialization failed:', error);
        });

        // Setup event listeners
        this.setupEventListeners();
        
        // デバッグ用グローバル関数を設定
        this.setupDebugFunctions();
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
                    // テーマ変更後に透明性を確保
                    setTimeout(() => {
                        themeManager.ensureCanvasTransparency();
                    }, 100);
                }
            });
            console.log('[MainRenderer] Theme change listener registered');
        }

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

    private setupDebugFunctions() {
        // デバッグ用関数をグローバルに設定
        (window as any).debugVRM = () => {
            const loadedVRM = this.vrmSetupManager.getLoadedVRM();
            console.log('=== VRM Debug Info ===');
            console.log('VRM loaded:', !!loadedVRM);
            console.log('Camera available:', !!this.camera);
            console.log('Controls available:', !!this.controls);
            console.log('Controls enabled:', this.controls?.enabled);
            console.log('MouseHandler VRM instance:', !!this.mouseHandler);
            console.log('Scene children count:', this.scene.children.length);
            if (loadedVRM) {
                console.log('VRM scene children:', loadedVRM.scene.children.length);
                console.log('VRM humanoid:', !!loadedVRM.humanoid);
            }
            return {
                vrmLoaded: !!loadedVRM,
                cameraReady: !!this.camera,
                controlsReady: !!this.controls,
                controlsEnabled: this.controls?.enabled,
                sceneChildren: this.scene.children.length,
                vrmChildren: loadedVRM?.scene.children.length || 0
            };
        };
        
        (window as any).debugMouseHandler = () => {
            console.log('=== MouseHandler Debug Info ===');
            const canvas = document.getElementById('vrm-canvas');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                console.log('Canvas bounds:', rect);
                console.log('Canvas size:', {
                    width: canvas.offsetWidth,
                    height: canvas.offsetHeight
                });
                
                // イベントリスナーのテスト
                console.log('Testing canvas mouse events...');
                const testHandler = (e: MouseEvent) => {
                    console.log('Canvas mouse event triggered:', e.type, e.clientX, e.clientY);
                };
                canvas.addEventListener('mousemove', testHandler, { once: true });
                console.log('Move mouse over canvas to test event listener');
                
                setTimeout(() => {
                    canvas.removeEventListener('mousemove', testHandler);
                }, 5000);
            }
            return {
                canvasFound: !!canvas,
                canvasBounds: canvas?.getBoundingClientRect()
            };
        };
        
        (window as any).testRaycast = (x: number = 0, y: number = 0) => {
            console.log('=== Manual Raycast Test ===');
            const loadedVRM = this.vrmSetupManager.getLoadedVRM();
            if (!loadedVRM) {
                console.log('No VRM loaded');
                return false;
            }
            
            const mouse = new THREE.Vector2(x, y);
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);
            const intersects = raycaster.intersectObject(loadedVRM.scene, true);
            
            console.log('Manual raycast result:', {
                mousePos: { x, y },
                intersectsCount: intersects.length,
                intersects: intersects.map(i => ({
                    distance: i.distance,
                    objectName: i.object.name || 'unnamed',
                    objectType: i.object.type
                }))
            });
            
            return intersects.length > 0;
        };
        
        (window as any).debugSpeechBubble = () => {
            console.log('=== SpeechBubble Debug Info ===');
            
            // Electron API確認
            const hasElectronAPI = !!(window as any).electronAPI;
            console.log('ElectronAPI available:', hasElectronAPI);
            
            if (hasElectronAPI) {
                const api = (window as any).electronAPI;
                console.log('SpeechBubble APIs:', {
                    onSetSpeechBubbleText: !!api.onSetSpeechBubbleText,
                    hideSpeechBubble: !!api.hideSpeechBubble,
                    notifyBubbleSize: !!api.notifyBubbleSize
                });
            }
            
            // DOM要素確認
            const speechElements = {
                bubbleContent: document.getElementById('bubble-content'),
                speechTail: document.querySelector('.speech-tail'),
                speechTailBorder: document.querySelector('.speech-tail-border')
            };
            
            console.log('Speech bubble DOM elements:', {
                bubbleContent: !!speechElements.bubbleContent,
                speechTail: !!speechElements.speechTail,
                speechTailBorder: !!speechElements.speechTailBorder
            });
            
            return {
                electronAPI: hasElectronAPI,
                domElements: speechElements
            };
        };
        
        (window as any).debugCanvasTransparency = () => {
            console.log('=== Canvas Transparency Debug Info ===');
            
            const canvasArea = document.getElementById('canvas-area');
            const vrmCanvas = document.getElementById('vrm-canvas');
            const body = document.body;
            
            if (canvasArea) {
                const styles = getComputedStyle(canvasArea);
                console.log('Canvas Area styles:', {
                    backgroundColor: styles.backgroundColor,
                    background: styles.background,
                    colorBackground: styles.getPropertyValue('--color-background')
                });
            }
            
            if (vrmCanvas) {
                const styles = getComputedStyle(vrmCanvas);
                console.log('VRM Canvas styles:', {
                    backgroundColor: styles.backgroundColor,
                    background: styles.background
                });
            }
            
            if (body) {
                const styles = getComputedStyle(body);
                console.log('Body styles:', {
                    backgroundColor: styles.backgroundColor,
                    background: styles.background,
                    dataTheme: body.getAttribute('data-theme'),
                    className: body.className
                });
            }
            
            // CSS変数の値も確認
            const rootStyles = getComputedStyle(document.documentElement);
            console.log('CSS Variables:', {
                colorBackground: rootStyles.getPropertyValue('--color-background'),
                colorSurface: rootStyles.getPropertyValue('--color-surface'),
                themeBackground: rootStyles.getPropertyValue('--theme-background')
            });
            
            return {
                canvasArea: canvasArea ? getComputedStyle(canvasArea).backgroundColor : null,
                vrmCanvas: vrmCanvas ? getComputedStyle(vrmCanvas).backgroundColor : null,
                body: body ? getComputedStyle(body).backgroundColor : null
            };
        };
        
        console.log('Debug functions available: window.debugVRM(), window.debugMouseHandler(), window.testRaycast(x, y), window.debugSpeechBubble(), window.debugCanvasTransparency()');
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