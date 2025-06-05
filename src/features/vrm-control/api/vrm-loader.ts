/**
 * VRM Loader - FSD Phase 2
 * VRMモデルとアニメーションのロード機能
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMUtils, VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';
import { 
  createVRMAnimationClip, 
  VRMAnimationLoaderPlugin, 
  VRMAnimation 
} from '@pixiv/three-vrm-animation';
import { VRMLoadError, VRMAnimationError } from '../types';

export class VRMLoader {
  private loader: GLTFLoader;
  private currentVRM: VRM | null = null;

  constructor() {
    this.loader = new GLTFLoader();
    // VRMモデルを読み込むためのプラグインを登録
    this.loader.register((parser) => new VRMLoaderPlugin(parser));
    // VRMアニメーションを読み込むためのプラグインも登録
    this.loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  }

  /**
   * VRMモデルをロード
   */
  async loadVRMModel(
    modelURL: string,
    scene: THREE.Scene,
    onProgress?: (percent: number) => void
  ): Promise<VRM> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        modelURL,
        (gltf) => {
          const vrm = gltf.userData.vrm as VRM | undefined;
          if (!vrm) {
            reject(new VRMLoadError('VRM data not found in GLTF', modelURL));
            return;
          }

          // 既存のモデルをシーンから削除
          if (this.currentVRM?.scene) {
            scene.remove(this.currentVRM.scene);
            VRMUtils.deepDispose(this.currentVRM.scene);
          }

          scene.add(vrm.scene);
          VRMUtils.rotateVRM0(vrm);
          this.currentVRM = vrm;
          
          console.log('[VRMLoader] VRMモデルロード成功:', modelURL);
          resolve(vrm);
        },
        (progress) => {
          if (onProgress) {
            const percent = (progress.loaded / progress.total) * 100;
            onProgress(percent);
          }
        },
        (error) => {
          console.error(`[VRMLoader] VRM「${modelURL}」ロード失敗:`, error);
          reject(new VRMLoadError(error.message || 'Unknown error', modelURL));
        }
      );
    });
  }

  /**
   * VRMアニメーションをロード
   */
  async loadVRMAnimation(
    animationURL: string,
    onProgress?: (percent: number) => void
  ): Promise<VRMAnimation | null> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        animationURL,
        (gltf) => {
          const vrmAnimations = gltf.userData.vrmAnimations as VRMAnimation[] | undefined;
          if (!vrmAnimations || vrmAnimations.length === 0) {
            console.warn(`[VRMLoader] アニメーションファイル「${animationURL}」にデータが見つかりません`);
            resolve(null);
            return;
          }

          const animation = vrmAnimations[0];
          console.log('[VRMLoader] VRMアニメーションロード成功:', animationURL);
          console.log('[VRMLoader] アニメーション構造:', {
            humanoidTracks: animation.humanoidTracks ? Object.keys(animation.humanoidTracks) : 'なし',
            expressionTracks: animation.expressionTracks ? Object.keys(animation.expressionTracks) : 'なし',
            lookAtTrack: animation.lookAtTrack ? 'あり' : 'なし'
          });
          
          resolve(animation);
        },
        (progress) => {
          if (onProgress) {
            const percent = (progress.loaded / progress.total) * 100;
            onProgress(percent);
          }
        },
        (error) => {
          console.error(`[VRMLoader] アニメーション「${animationURL}」ロード失敗:`, error);
          reject(new VRMAnimationError(error.message || 'Unknown error', animationURL));
        }
      );
    });
  }

  /**
   * VRMAnimationClipを作成
   */
  createAnimationClip(
    animation: VRMAnimation,
    vrm: VRM
  ): THREE.AnimationClip | null {
    try {
      const clip = createVRMAnimationClip(animation, vrm);
      if (clip) {
        console.log(`[VRMLoader] アニメーションクリップ「${clip.name}」を作成`);
      }
      return clip;
    } catch (error) {
      console.error('[VRMLoader] AnimationClip作成エラー:', error);
      return null;
    }
  }

  /**
   * 現在のVRMモデルを取得
   */
  getCurrentVRM(): VRM | null {
    return this.currentVRM;
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    if (this.currentVRM) {
      // VRMの表情管理をクリア
      if (this.currentVRM.expressionManager) {
        this.currentVRM.expressionManager.destroy();
      }
      
      // VRMのLookAtをクリア
      if (this.currentVRM.lookAt) {
        this.currentVRM.lookAt.destroy();
      }
      
      // VRMシーンを parent から削除
      if (this.currentVRM.scene.parent) {
        this.currentVRM.scene.parent.remove(this.currentVRM.scene);
      }
      
      // VRMシーン内のリソースを再帰的に破棄
      this.currentVRM.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });
      
      this.currentVRM = null;
      console.log('[VRMLoader] リソースをクリーンアップしました');
    }
  }
}