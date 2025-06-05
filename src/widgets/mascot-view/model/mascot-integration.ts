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
  LipSyncManager,
  setHeadOrientation as setVRMHeadOrientation,
  type VRM
} from '@features/vrm-control';
import { ExpressionManagerV2 } from '@features/vrm-control/lib/expression-manager-v2';
import { LipSyncManagerV2 } from '@features/vrm-control/lib/lip-sync-manager-v2';
import { 
  VRMBehaviorManagerImpl,
  ExpressionPriority,
  type VRMBehaviorManager
} from '@entities/vrm-behavior';
import { eventBus } from '@shared/lib/app-event-bus';
import * as THREE from 'three';

export class MascotIntegration {
  private mouseFollowService: MouseFollowService | null = null;
  private vrmLoader: VRMLoader | null = null;
  private vrmBehaviorManager: VRMBehaviorManager | null = null;
  
  // V2統合システム
  private expressionManagerV2: ExpressionManagerV2 | null = null;
  private lipSyncManagerV2: LipSyncManagerV2 | null = null;
  
  // レガシー互換性のために残すが、VRMBehaviorManager経由でアクセス
  private expressionManager: ExpressionManager | null = null;
  private animationManager: AnimationManager | null = null;
  private lipSyncManager: LipSyncManager | null = null;
  
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
    
    // 既にVRMがロードされている場合の処理
    const currentVRM = useVRMStore.getState().vrm;
    if (currentVRM) {
      console.log('[MascotIntegration] VRM already loaded during initialization');
      this.handleVRMLoaded(currentVRM);
    }

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
          this.handleVRMLoaded(vrm);
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
  
  /**
   * 既にロード済みのVRMを設定
   */
  setLoadedVRM(vrm: VRM | null): void {
    if (vrm) {
      console.log('[MascotIntegration] Setting already loaded VRM');
      useVRMStore.getState().setVRM(vrm, null);
      
      // 手動でVRMの変更を処理（subscribeが動作しない場合の対策）
      this.handleVRMLoaded(vrm);
    }
  }
  
  /**
   * リップシンクイベントのリスナーを設定
   */
  private setupLipSyncListeners(): void {
    if (window.electronAPI?.onLipSyncEvent) {
      console.log('[MascotIntegration] Setting up lip sync event listeners');
      
      window.electronAPI.onLipSyncEvent((eventType: 'start' | 'pause' | 'stop') => {
        console.log(`[MascotIntegration] Received lip sync event: ${eventType}`);
        
        if (!this.lipSyncManagerV2) {
          console.warn('[MascotIntegration] LipSyncManagerV2 not available');
          return;
        }
        
        switch (eventType) {
          case 'start':
            this.lipSyncManagerV2.handleLipSyncStart();
            break;
          case 'pause':
            this.lipSyncManagerV2.handleLipSyncPause();
            break;
          case 'stop':
            this.lipSyncManagerV2.handleLipSyncStop();
            break;
        }
      });
    } else {
      console.warn('[MascotIntegration] electronAPI.onLipSyncEvent not available');
    }
  }
  
  /**
   * VRMロード時の処理 - ExpressionComposer統合版
   */
  private async handleVRMLoaded(vrm: VRM): Promise<void> {
    console.log('[MascotIntegration] handleVRMLoaded called - using ExpressionComposer V2 system');
    
    // 既存システムをクリーンアップ
    if (this.expressionManagerV2) {
      this.expressionManagerV2.dispose();
    }
    if (this.lipSyncManagerV2) {
      this.lipSyncManagerV2.dispose();
    }
    if (this.vrmBehaviorManager) {
      this.vrmBehaviorManager.dispose();
    }
    
    // V2統合システムを作成
    this.expressionManagerV2 = new ExpressionManagerV2(vrm);
    this.lipSyncManagerV2 = new LipSyncManagerV2(vrm, this.expressionManagerV2.getComposer());
    
    // 相互参照を設定
    this.expressionManagerV2.setLipSyncManager(this.lipSyncManagerV2);
    
    // 自動まばたきを開始
    this.expressionManagerV2.startAutoBlink();
    
    console.log('[MascotIntegration] ExpressionComposer V2 system initialized');
    
    // レガシー互換性のためのフォールバック（段階的移行）
    this.setupLegacyFallback(vrm);
    
    // 設定からリップシンクの有効/無効を反映
    await this.updateLipSyncSettings();
    
    // リップシンクイベントのリスナーを設定
    this.setupLipSyncListeners();
  }
  
  /**
   * レガシー互換性のためのフォールバック設定
   */
  private setupLegacyFallback(vrm: VRM): void {
    // VRMBehaviorManagerを作成（レガシーAPIのため）
    this.vrmBehaviorManager = new VRMBehaviorManagerImpl(
      // ExpressionManager ファクトリー（使用されない）
      (vrm: VRM) => new ExpressionManager(vrm),
      // LipSyncManager ファクトリー（使用されない）
      (expressionManager: ExpressionManager) => new LipSyncManager(expressionManager),
      // AnimationManager ファクトリー
      () => new AnimationManager()
    );
    
    // レガシー参照（互換性のみ）
    this.expressionManager = new ExpressionManager(vrm);
    this.lipSyncManager = new LipSyncManager(this.expressionManager);
    this.animationManager = new AnimationManager();
  }

  update(delta: number): void {
    // VRMの更新
    const vrm = useVRMStore.getState().vrm;
    if (vrm) {
      vrm.update(delta);
    }
    
    // V2統合システムでの更新
    if (this.expressionManagerV2) {
      this.expressionManagerV2.update(delta);
    }
    
    // AnimationManagerのみレガシーから更新
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
  
  /**
   * LipSyncManagerを取得
   */
  getLipSyncManager(): LipSyncManager | null {
    return this.lipSyncManager;
  }

  /**
   * VRMBehaviorManagerを取得（新API）
   */
  getVRMBehaviorManager(): VRMBehaviorManager | null {
    return this.vrmBehaviorManager;
  }

  /**
   * 表情を設定（ExpressionComposer V2経由）
   */
  setExpression(name: string, intensity: number, priority: ExpressionPriority = ExpressionPriority.HIGH): boolean {
    if (this.expressionManagerV2) {
      return this.expressionManagerV2.applyExpression(name, intensity);
    }
    
    // フォールバック: レガシーExpressionManager
    if (this.expressionManager) {
      return this.expressionManager.applyExpression(name, intensity);
    }
    
    return false;
  }

  /**
   * リップシンクを開始（LipSyncManagerV2経由）
   */
  startLipSync(): void {
    if (this.lipSyncManagerV2) {
      this.lipSyncManagerV2.enable();
      this.lipSyncManagerV2.startLipSync();
    } else if (this.lipSyncManager) {
      this.lipSyncManager.startLipSync();
    }
  }

  /**
   * リップシンクを停止（LipSyncManagerV2経由）
   */
  stopLipSync(): void {
    if (this.lipSyncManagerV2) {
      this.lipSyncManagerV2.stopLipSync();
    } else if (this.lipSyncManager) {
      this.lipSyncManager.stopLipSync();
    }
  }
  
  /**
   * リップシンク設定を更新
   */
  private async updateLipSyncSettings(): Promise<void> {
    console.log('[MascotIntegration] updateLipSyncSettings called');
    
    // V2システムの設定
    if (this.lipSyncManagerV2) {
      try {
        const enabled = await window.electronAPI?.getLipSyncEnabled?.();
        console.log('[MascotIntegration] LipSync enabled from settings:', enabled);
        if (enabled) {
          this.lipSyncManagerV2.enable();
        } else {
          this.lipSyncManagerV2.disable();
        }
      } catch (error) {
        console.error('[MascotIntegration] リップシンク設定取得エラー:', error);
        // デフォルトは有効
        console.log('[MascotIntegration] Enabling LipSync V2 by default');
        this.lipSyncManagerV2.enable();
      }
    }
    
    // レガシーシステムの設定（互換性のため）
    if (this.lipSyncManager) {
      try {
        const enabled = await window.electronAPI?.getLipSyncEnabled?.();
        if (enabled) {
          this.lipSyncManager.enable();
        } else {
          this.lipSyncManager.disable();
        }
      } catch (error) {
        this.lipSyncManager.enable();
      }
    }
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

    // V2統合システムの破棄
    if (this.expressionManagerV2) {
      this.expressionManagerV2.dispose();
      this.expressionManagerV2 = null;
    }
    
    if (this.lipSyncManagerV2) {
      this.lipSyncManagerV2.dispose();
      this.lipSyncManagerV2 = null;
    }

    // VRMBehaviorManagerの破棄
    if (this.vrmBehaviorManager) {
      this.vrmBehaviorManager.dispose();
      this.vrmBehaviorManager = null;
    }

    // レガシーマネージャーの破棄
    if (this.expressionManager) {
      this.expressionManager.dispose();
      this.expressionManager = null;
    }
    
    if (this.lipSyncManager) {
      this.lipSyncManager.dispose();
      this.lipSyncManager = null;
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