/**
 * Mascot Integration - FSD Phase 2
 * widgetレイヤーでのフィーチャー統合
 */

import { 
  initializeMouseFollow, 
  useMouseFollowStore,
  MouseFollowService,
  MouseFollowSettings,
  HeadOrientation
} from '@features/mouse-follow';
import { 
  useVRMStore,
  VRMLoader,
  ExpressionManager,
  AnimationManager,
  setHeadOrientation as setVRMHeadOrientation,
  type VRM
} from '@features/vrm-control';
import { eventBus } from '@shared/lib/app-event-bus';
import * as THREE from 'three';

export class MascotIntegration {
  private mouseFollowService: MouseFollowService | null = null;
  private vrmLoader: VRMLoader | null = null;
  private expressionManager: ExpressionManager | null = null;
  private animationManager: AnimationManager | null = null;
  private unsubscribeOrientation: (() => void) | null = null;
  private unsubscribeVRM: (() => void) | null = null;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  async initialize(): Promise<void> {
    // VRMローダーの初期化
    this.vrmLoader = new VRMLoader();

    // マウス追従機能の初期化
    this.mouseFollowService = await initializeMouseFollow();

    // オリエンテーション同期の設定
    this.setupOrientationSync();
    
    // VRM状態の監視設定
    this.setupVRMSync();

    // 初期状態でenabledならトラッキング開始
    const mouseState = useMouseFollowStore.getState();
    if (mouseState.enabled) {
      await this.mouseFollowService.start();
    }
  }

  private setupOrientationSync(): void {
    // マウス追従のオリエンテーション変更を購読
    this.unsubscribeOrientation = useMouseFollowStore.subscribe(
      (state) => state.smoothedOrientation,
      (orientation) => {
        if (orientation) {
          const vrm = useVRMStore.getState().vrm;
          if (vrm) {
            // VRMモデルの頭部オリエンテーションを更新
            setVRMHeadOrientation(vrm, orientation.pitch, orientation.yaw, orientation.roll);
          }
          
          // イベントを発行（他のwidgetや機能が利用可能）
          eventBus.emit('mascot:head-orientation-changed', orientation);
        }
      }
    );
  }

  private setupVRMSync(): void {
    // VRMモデルの変更を監視
    this.unsubscribeVRM = useVRMStore.subscribe(
      (state) => state.vrm,
      (vrm) => {
        if (vrm) {
          // 新しいVRMモデルがロードされたら管理クラスを更新
          this.expressionManager = new ExpressionManager(vrm);
          this.expressionManager.startAutoBlink();
          
          const animation = useVRMStore.getState().currentAnimation;
          if (animation) {
            this.animationManager = new AnimationManager();
            if (this.animationManager.initialize(vrm, animation)) {
              this.animationManager.play();
            }
          }
        }
      }
    );
  }

  updateMouseFollowSettings(settings: Partial<MouseFollowSettings>): void {
    if (this.mouseFollowService) {
      this.mouseFollowService.updateSettings(settings);
    }
  }

  getHeadOrientation(): HeadOrientation | null {
    const state = useMouseFollowStore.getState();
    return state.smoothedOrientation;
  }

  async startMouseTracking(): Promise<boolean> {
    if (!this.mouseFollowService) {
      return false;
    }
    return this.mouseFollowService.start();
  }

  async stopMouseTracking(): Promise<void> {
    if (this.mouseFollowService) {
      await this.mouseFollowService.stop();
    }
  }

  async loadVRMModel(modelUrl: string, onProgress?: (percent: number) => void): Promise<VRM | null> {
    if (!this.vrmLoader) return null;
    
    try {
      const vrm = await this.vrmLoader.loadVRMModel(modelUrl, this.scene, onProgress);
      useVRMStore.getState().setVRM(vrm, modelUrl);
      return vrm;
    } catch (error) {
      console.error('[MascotIntegration] VRMモデルロードエラー:', error);
      useVRMStore.getState().setLoadError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  async loadVRMAnimation(animationUrl: string, onProgress?: (percent: number) => void): Promise<boolean> {
    if (!this.vrmLoader) return false;
    
    try {
      const animation = await this.vrmLoader.loadVRMAnimation(animationUrl, onProgress);
      if (animation) {
        useVRMStore.getState().setAnimation(animation, animationUrl);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[MascotIntegration] アニメーションロードエラー:', error);
      return false;
    }
  }

  update(delta: number): void {
    // VRMの更新
    const vrm = useVRMStore.getState().vrm;
    if (vrm) {
      vrm.update(delta);
    }
    
    // 表情管理の更新
    if (this.expressionManager) {
      this.expressionManager.update(delta);
    }
    
    // アニメーション管理の更新
    if (this.animationManager) {
      this.animationManager.update(delta);
    }
  }

  /**
   * ExpressionManagerを取得（レガシー互換性のため）
   */
  getExpressionManager(): ExpressionManager | null {
    return this.expressionManager;
  }

  async dispose(): Promise<void> {
    // 購読の解除
    if (this.unsubscribeOrientation) {
      this.unsubscribeOrientation();
      this.unsubscribeOrientation = null;
    }
    
    if (this.unsubscribeVRM) {
      this.unsubscribeVRM();
      this.unsubscribeVRM = null;
    }

    // マウス追従サービスの破棄
    if (this.mouseFollowService) {
      await this.mouseFollowService.dispose();
      this.mouseFollowService = null;
    }

    // VRM関連の破棄
    if (this.expressionManager) {
      this.expressionManager.dispose();
      this.expressionManager = null;
    }
    
    if (this.animationManager) {
      this.animationManager.dispose();
      this.animationManager = null;
    }
    
    if (this.vrmLoader) {
      this.vrmLoader.dispose();
      this.vrmLoader = null;
    }
    
    // ストアのリセット
    useVRMStore.getState().reset();
  }
}