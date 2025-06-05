import * as THREE from 'three';

import type { VRMSetupManager } from './vrmSetupManager';
import type { MouseHandler } from './mouseHandler';
import type { MouseFollowRendererIntegrationService } from './MouseFollowRendererIntegrationService';

/**
 * DebugManagerService
 * 
 * Centralizes all debug functionality that was previously scattered in mainRenderer.ts
 * This service provides debug functions for:
 * - VRM system debugging
 * - Mouse handler debugging
 * - Raycast testing
 * - Speech bubble debugging
 * - Canvas transparency debugging
 * - Mouse follow debugging
 * 
 * This separation follows Feature-Sliced Design principles by isolating
 * debug concerns from core rendering functionality.
 */
export class DebugManagerService {
  private vrmSetupManager: VRMSetupManager | null = null;
  private mouseHandler: MouseHandler | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private scene: THREE.Scene | null = null;
  private mouseFollowIntegration: MouseFollowRendererIntegrationService | null = null;

  constructor() {
    // Service starts without dependencies
  }

  /**
   * Sets the required dependencies for debug operations
   */
  setDependencies(dependencies: {
    vrmSetupManager: VRMSetupManager;
    mouseHandler: MouseHandler;
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    mouseFollowIntegration?: MouseFollowRendererIntegrationService;
  }): void {
    this.vrmSetupManager = dependencies.vrmSetupManager;
    this.mouseHandler = dependencies.mouseHandler;
    this.camera = dependencies.camera;
    this.scene = dependencies.scene;
    this.mouseFollowIntegration = dependencies.mouseFollowIntegration || null;
    
    console.log('[DebugManager] Dependencies set successfully');
  }

  /**
   * Initializes all debug functions and makes them globally available
   */
  setupDebugFunctions(): void {
    this.setupVRMDebugFunction();
    this.setupMouseHandlerDebugFunction();
    this.setupRaycastTestFunction();
    this.setupSpeechBubbleDebugFunction();
    this.setupCanvasTransparencyDebugFunction();
    this.setupMouseFollowDebugFunctions();
    
    this.printAvailableDebugFunctions();
  }

  private setupVRMDebugFunction(): void {
    (window as any).debugVRM = () => {
      if (!this.vrmSetupManager || !this.camera || !this.scene) {
        console.error('VRM debug: Dependencies not available');
        return { error: 'Dependencies not set' };
      }

      const loadedVRM = this.vrmSetupManager.getLoadedVRM();
      console.log('=== VRM Debug Info ===');
      console.log('VRM loaded:', !!loadedVRM);
      console.log('Camera available:', !!this.camera);
      console.log('Scene children count:', this.scene.children.length);
      
      if (loadedVRM) {
        console.log('VRM scene children:', loadedVRM.scene.children.length);
        console.log('VRM humanoid:', !!loadedVRM.humanoid);
      }
      
      return {
        vrmLoaded: !!loadedVRM,
        cameraReady: !!this.camera,
        sceneChildren: this.scene.children.length,
        vrmChildren: loadedVRM?.scene.children.length || 0
      };
    };
  }

  private setupMouseHandlerDebugFunction(): void {
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
        
        // Event listener test
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
  }

  private setupRaycastTestFunction(): void {
    (window as any).testRaycast = (x: number = 0, y: number = 0) => {
      if (!this.vrmSetupManager || !this.camera) {
        console.error('Raycast test: Dependencies not available');
        return false;
      }

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
  }

  private setupSpeechBubbleDebugFunction(): void {
    (window as any).debugSpeechBubble = () => {
      console.log('=== SpeechBubble Debug Info ===');
      
      // Electron API check
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
      
      // DOM elements check
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
  }

  private setupCanvasTransparencyDebugFunction(): void {
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
      
      // CSS variables check
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
  }

  private setupMouseFollowDebugFunctions(): void {
    (window as any).debugMouseFollow = () => {
      console.log('=== Mouse Follow Debug Info ===');
      
      const basicService = this.mouseFollowIntegration?.getMouseFollowIntegrationService();
      if (!basicService) {
        console.log('Basic mouse follow service not available');
        return { available: false };
      }
      
      const debugInfo = basicService.getDebugInfo();
      const status = basicService.getStatus();
      
      console.log('Service Debug Info:', debugInfo);
      console.log('Service Status:', status);
      
      return {
        available: true,
        debugInfo,
        status,
        orchestrator: basicService.getOrchestrator(),
        vrmAdapter: basicService.getVRMAdapter()
      };
    };

    (window as any).debugIdleMouseFollow = () => {
      console.log('=== Complete Idle + Mouse Follow Integration Debug Info ===');
      
      const completeService = this.mouseFollowIntegration?.getIdleMouseFollowIntegrationService();
      if (!completeService) {
        console.log('Complete integration service not available');
        return { available: false };
      }
      
      const debugInfo = completeService.getDebugInfo();
      const status = completeService.getIntegratedStatus();
      const metrics = completeService.getPerformanceMetrics();
      
      console.log('Integration Debug Info:', debugInfo);
      console.log('Integration Status:', status);
      console.log('Performance Metrics:', metrics);
      
      return {
        available: true,
        debugInfo,
        status,
        metrics,
        isActive: completeService.isIntegrationActive(),
        idleManager: completeService.getIdleStateManager(),
        mouseFollowService: completeService.getMouseFollowService()
      };
    };

    (window as any).enableMouseFollow = async () => {
      console.log('=== Enabling Mouse Follow Integration ===');
      
      const completeService = this.mouseFollowIntegration?.getIdleMouseFollowIntegrationService();
      if (!completeService) {
        console.log('Complete integration service not available');
        return false;
      }
      
      try {
        await completeService.enableIntegration();
        console.log('Mouse follow integration enabled successfully');
        return true;
      } catch (error) {
        console.error('Failed to enable mouse follow integration:', error);
        return false;
      }
    };

    (window as any).disableMouseFollow = async () => {
      console.log('=== Disabling Mouse Follow Integration ===');
      
      const completeService = this.mouseFollowIntegration?.getIdleMouseFollowIntegrationService();
      if (!completeService) {
        console.log('Complete integration service not available');
        return false;
      }
      
      try {
        await completeService.disableIntegration();
        console.log('Mouse follow integration disabled successfully');
        return true;
      } catch (error) {
        console.error('Failed to disable mouse follow integration:', error);
        return false;
      }
    };

    // VRMController直接テスト用の関数
    (window as any).testVRMLookAt = () => {
      console.log('=== Testing VRM LookAt Directly ===');
      
      try {
        // VRMSetupManagerからVRMを取得
        const vrm = this.vrmSetupManager?.getLoadedVRM();
        
        console.log('VRM loaded:', !!vrm);
        console.log('VRM lookAt available:', !!vrm?.lookAt);
        console.log('Current lookAt target:', vrm?.lookAt?.target);
        
        if (vrm?.lookAt) {
          // シンプルなターゲットを作成
          const target = new THREE.Object3D();
          target.position.set(2, 1.5, 1);
          
          // 直接ターゲット設定
          vrm.lookAt.target = target;
          console.log('Target set directly');
          console.log('Target position:', target.position);
          console.log('New target:', vrm.lookAt.target);
          
          // 3秒後にターゲット移動
          setTimeout(() => {
            target.position.set(-2, 1.5, 1);
            console.log('Target moved to left');
          }, 3000);
          
          // 6秒後にターゲット前方移動
          setTimeout(() => {
            target.position.set(0, 1.5, 0.5);
            console.log('Target moved forward');
          }, 6000);
          
          return { success: true, target, vrm: !!vrm };
        }
        
        return { success: false, error: 'No lookAt available' };
      } catch (error) {
        console.error('VRM lookAt test failed:', error);
        return { success: false, error: error.message };
      }
    };

    // VRMSetupManagerの初期化状態を確認・再実行する関数
    (window as any).debugVRMSetupManager = () => {
      console.log('=== VRMSetupManager Debug ===');
      
      try {
        const vrm = this.vrmSetupManager?.getLoadedVRM();
        console.log('VRM loaded:', !!vrm);
        console.log('VRM lookAt available:', !!vrm?.lookAt);
        
        if (vrm?.lookAt) {
          console.log('Current lookAt target:', vrm.lookAt.target);
          console.log('Target position:', vrm.lookAt.target?.position);
          
          // VRMSetupManagerのlookAtTargetが設定されているか確認
          console.log('Checking VRMSetupManager lookAtTarget setup...');
          console.log('VRMSetupManager lookAtTarget:', (this.vrmSetupManager as any)?.lookAtTarget);
          
          // vrmControllerのVRMインスタンスと比較
          const vrmControllerInstance = (window as any).vrmController?.getCurrentVRM();
          console.log('vrmController VRM:', vrmControllerInstance);
          console.log('VRM instances are same?', vrm === vrmControllerInstance);
          
          if (vrmControllerInstance?.lookAt) {
            console.log('vrmController lookAt.target:', vrmControllerInstance.lookAt.target);
          }
          
          return {
            vrmLoaded: !!vrm,
            lookAtAvailable: !!vrm?.lookAt,
            currentTarget: vrm.lookAt.target,
            targetPosition: vrm.lookAt.target?.position,
            vrmInstancesMatch: vrm === vrmControllerInstance
          };
        }
        
        return { vrmLoaded: !!vrm, lookAtAvailable: false };
      } catch (error) {
        console.error('VRMSetupManager debug failed:', error);
        return { success: false, error: error.message };
      }
    };
  }

  private printAvailableDebugFunctions(): void {
    console.log('Debug functions available:');
    console.log('- window.debugVRM() - VRM system debug info');
    console.log('- window.debugMouseHandler() - Mouse handler debug info');
    console.log('- window.testRaycast(x, y) - Manual raycast test');
    console.log('- window.debugSpeechBubble() - Speech bubble debug info');
    console.log('- window.debugCanvasTransparency() - Canvas transparency debug');
    console.log('- window.debugMouseFollow() - Basic mouse follow debug');
    console.log('- window.debugIdleMouseFollow() - Complete integration debug');
    console.log('- window.enableMouseFollow() - Enable mouse follow integration');
    console.log('- window.disableMouseFollow() - Disable mouse follow integration');
  }

  /**
   * Cleans up debug functions (removes them from global scope)
   */
  cleanup(): void {
    const debugFunctions = [
      'debugVRM',
      'debugMouseHandler',
      'testRaycast',
      'debugSpeechBubble',
      'debugCanvasTransparency',
      'debugMouseFollow',
      'debugIdleMouseFollow',
      'enableMouseFollow',
      'disableMouseFollow'
    ];

    debugFunctions.forEach(funcName => {
      delete (window as any)[funcName];
    });

    console.log('[DebugManager] Debug functions cleaned up');
  }
}

/**
 * Factory function to create DebugManagerService
 */
export function createDebugManagerService(): DebugManagerService {
  return new DebugManagerService();
}