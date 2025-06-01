import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMUtils, VRMLoaderPlugin, VRM, VRMHumanBoneName } from '@pixiv/three-vrm'; 
import { createVRMAnimationClip, VRMAnimationLoaderPlugin, VRMAnimation } from '@pixiv/three-vrm-animation';
import { VRMExpressionInfo } from './types/tools';

/**
 * VRMモデルとアニメーションの管理クラス
 */
export class VRMController {
  private static instance: VRMController | null = null;
  private currentVRM: VRM | null = null;
  private currentVRMAnimation: VRMAnimation | null = null;
  private animationMixer: THREE.AnimationMixer | null = null;
  private loader: GLTFLoader;
  
  // まばたきのタイミング管理
  private blinkTimer = 0;
  private nextBlinkTime = 0;

  private constructor() {
    this.loader = new GLTFLoader();
    // VRMモデルを読み込むためのプラグインを登録
    this.loader.register((parser) => new VRMLoaderPlugin(parser));
    // VRMアニメーションを読み込むためのプラグインも登録
    this.loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
    
    // 初回のまばたきタイミングを設定
    this.resetBlinkTimer();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): VRMController {
    if (!this.instance) {
      this.instance = new VRMController();
    }
    return this.instance;
  }

  /**
   * まばたきタイマーをリセット
   */
  private resetBlinkTimer(): void {
    this.blinkTimer = 0;
    // 2～7秒のランダムな間隔でまばたき
    this.nextBlinkTime = 2 + Math.random() * 5;
  }

  /**
   * モデルとアニメーションが両方揃ったらMixerを初期化して再生
   */
  private tryInitMixerAndPlay(): void {
    if (this.currentVRM && this.currentVRMAnimation && !this.animationMixer) {
      console.log('モデルとアニメーションが揃ったのでMixerを初期化して再生します');
      this.animationMixer = new THREE.AnimationMixer(this.currentVRM.scene);
      const clip = createVRMAnimationClip(this.currentVRMAnimation, this.currentVRM);
      
      if (clip) {
        this.animationMixer.clipAction(clip).play();
        console.log(`アニメーションクリップ「${clip.name}」を再生開始`);
      } else {
        console.error('AnimationClipの生成に失敗');
      }
    }
  }

  /**
   * VRMモデルをロード
   */
  async loadVRM(
    modelURL: string,
    scene: THREE.Scene
  ): Promise<VRM | null> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        modelURL,
        (gltf) => {
          const vrm = gltf.userData.vrm as VRM | undefined;
          if (!vrm) {
            const error = new Error('gltf.userData.vrm が見つかりません');
            console.error(error);
            reject(error);
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
          console.log('VRMモデル召喚成功:', this.currentVRM);
          
          this.tryInitMixerAndPlay();
          resolve(vrm);
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`VRM「${modelURL}」読み込み中... ${percent.toFixed(1)}%`);
        },
        (error) => {
          console.error(`VRM「${modelURL}」召喚失敗:`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * VRMアニメーションをロード
   */
  async loadAnimation(animationURL: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        animationURL,
        (gltf) => {
          const vrmAnimations = gltf.userData.vrmAnimations as VRMAnimation[] | undefined;
          if (!vrmAnimations || vrmAnimations.length === 0) {
            console.warn(`アニメーションファイル「${animationURL}」にデータが見つかりません`);
            resolve();
            return;
          }

          this.currentVRMAnimation = vrmAnimations[0];
          console.log('VRMアニメーションロード成功:', this.currentVRMAnimation);
          this.tryInitMixerAndPlay();
          resolve();
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`アニメーション「${animationURL}」読み込み中... ${percent.toFixed(1)}%`);
        },
        (error) => {
          console.error(`アニメーション「${animationURL}」ロード失敗:`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * 自動まばたきの処理
   */
  private handleAutoBlink(delta: number): void {
    if (!this.currentVRM?.expressionManager) return;

    this.blinkTimer += delta;
    
    if (this.blinkTimer >= this.nextBlinkTime) {
      // まばたきを実行
      this.currentVRM.expressionManager.setValue('blink', 1.0);
      
      // 100ms後に目を開く
      setTimeout(() => {
        if (this.currentVRM?.expressionManager) {
          this.currentVRM.expressionManager.setValue('blink', 0.0);
        }
      }, 100);
      
      // 次のまばたきタイミングを設定
      this.resetBlinkTimer();
    }
  }

  /**
   * VRMの毎フレーム更新
   */
  updateFeatures(delta: number): void {
    if (!this.currentVRM) return;

    // VRMモデル自体の基本的な更新
    this.currentVRM.update(delta);
    
    // 自動まばたき
    this.handleAutoBlink(delta);

    // アニメーション更新
    if (this.animationMixer) {
      this.animationMixer.update(delta);
    }

    // 視線制御の更新
    if (this.currentVRM.lookAt) {
      this.currentVRM.lookAt.update(delta);
    }
  }

  /**
   * 頭の位置をスクリーン座標で取得
   */
  getHeadScreenPosition(
    camera: THREE.PerspectiveCamera,
    rendererDomElement: HTMLCanvasElement
  ): { x: number; y: number; isInFront: boolean } | null {
    if (!this.currentVRM?.humanoid) return null;
    
    const headNode = this.currentVRM.humanoid.getBoneNode(VRMHumanBoneName.Head);
    if (!headNode) return null;

    const worldPosition = new THREE.Vector3();
    headNode.getWorldPosition(worldPosition);

    // カメラから見た時に、頭がカメラの正面にあるかチェック
    const viewZ = worldPosition.clone().project(camera).z;

    // ワールド座標をスクリーン座標 (NDC: -1 to +1) に変換
    const screenPosition = worldPosition.clone().project(camera);

    // NDCを実際のピクセル座標に変換
    const screenX = (screenPosition.x + 1) / 2 * rendererDomElement.clientWidth;
    const screenY = (-screenPosition.y + 1) / 2 * rendererDomElement.clientHeight;

    return { 
      x: screenX, 
      y: screenY, 
      isInFront: viewZ < 1 // カメラの描画範囲内かどうか
    };
  }

  /**
   * 現在のVRMモデルを取得
   */
  getCurrentVRM(): VRM | null {
    return this.currentVRM;
  }

  /**
   * 利用可能な表情リストを取得
   */
  getAvailableExpressions(): VRMExpressionInfo[] {
    console.log('[VRMController] getAvailableExpressions 呼び出し');
    console.log('[VRMController] currentVRM状態:', !!this.currentVRM);
    console.log('[VRMController] expressionManager状態:', !!this.currentVRM?.expressionManager);
    
    if (!this.currentVRM) {
      console.warn('[VRMController] VRMモデルが読み込まれていません');
      return [];
    }
    
    if (!this.currentVRM.expressionManager) {
      console.warn('[VRMController] ExpressionManagerが利用できません');
      return [];
    }

    const expressions: VRMExpressionInfo[] = [];
    
    // すべての表情（プリセット + カスタム）を取得
    const allExpressions = this.currentVRM.expressionManager.expressionMap;
    const customExpressions = this.currentVRM.expressionManager.customExpressionMap;
    
    Object.keys(allExpressions).forEach(name => {
      const isPreset = !customExpressions.hasOwnProperty(name);
      expressions.push({
        name,
        displayName: this.getExpressionDisplayName(name),
        isPreset
      });
    });

    console.log(`[VRMController] 利用可能な表情: ${expressions.length}個`, expressions.map(e => e.name));
    return expressions;
  }

  /**
   * 表情の表示名を取得（日本語名があれば使用）
   */
  private getExpressionDisplayName(name: string): string {
    const displayNames: { [key: string]: string } = {
      'happy': '喜び',
      'sad': '悲しみ',
      'angry': '怒り',
      'surprised': '驚き',
      'relaxed': 'リラックス',
      'neutral': 'ニュートラル',
      'blink': 'まばたき',
      'blinkLeft': '左まばたき',
      'blinkRight': '右まばたき',
      'lookUp': '上を見る',
      'lookDown': '下を見る',
      'lookLeft': '左を見る',
      'lookRight': '右を見る'
    };
    
    return displayNames[name] || name;
  }

  /**
   * 表情を適用
   */
  applyExpression(expressionName: string, intensity?: number): boolean {
    if (!this.currentVRM?.expressionManager) {
      console.error('[VRMController] VRMモデルまたはExpressionManagerが利用できません');
      return false;
    }

    const expression = this.currentVRM.expressionManager.getExpression(expressionName);
    if (!expression) {
      console.error(`[VRMController] 表情 '${expressionName}' が見つかりません`);
      return false;
    }

    // デフォルト強度は1.0
    const weight = intensity !== undefined ? Math.max(0, Math.min(1, intensity)) : 1.0;

    try {
      // 他の表情をリセット（blinkとlook系以外）
      if (!expressionName.startsWith('blink') && !expressionName.startsWith('look')) {
        this.resetNonBasicExpressions();
      }

      // 指定された表情を適用
      this.currentVRM.expressionManager.setValue(expressionName, weight);
      
      console.log(`[VRMController] 表情 '${expressionName}' を強度 ${weight} で適用しました`);
      return true;
    } catch (error) {
      console.error(`[VRMController] 表情適用エラー:`, error);
      return false;
    }
  }

  /**
   * 基本的でない表情（happy, sad, angry等）をリセット
   */
  private resetNonBasicExpressions(): void {
    if (!this.currentVRM?.expressionManager) return;

    const basicExpressions = ['blink', 'blinkLeft', 'blinkRight', 'lookUp', 'lookDown', 'lookLeft', 'lookRight'];
    const allExpressions = this.currentVRM.expressionManager.expressionMap;
    
    Object.keys(allExpressions).forEach(name => {
      if (!basicExpressions.includes(name)) {
        this.currentVRM!.expressionManager.setValue(name, 0.0);
      }
    });
  }

  /**
   * 現在の表情の値を取得
   */
  getExpressionValue(expressionName: string): number | null {
    if (!this.currentVRM?.expressionManager) {
      return null;
    }
    
    return this.currentVRM.expressionManager.getValue(expressionName);
  }

  /**
   * すべての表情をリセット（まばたきを除く）
   */
  resetAllExpressions(): void {
    if (!this.currentVRM?.expressionManager) return;

    const allExpressions = this.currentVRM.expressionManager.expressionMap;
    Object.keys(allExpressions).forEach(name => {
      if (!name.startsWith('blink')) {
        this.currentVRM!.expressionManager.setValue(name, 0.0);
      }
    });
    
    console.log('[VRMController] すべての表情をリセットしました（まばたきを除く）');
  }
}

// 後方互換性のための関数（既存のコードとの互換性を保つ）
const vrmController = VRMController.getInstance();

export function loadVRM(
  modelURL: string,
  scene: THREE.Scene,
  onModelLoaded?: (vrm: VRM) => void
): void {
  vrmController.loadVRM(modelURL, scene)
    .then((vrm) => {
      if (onModelLoaded && vrm) {
        onModelLoaded(vrm);
      }
    })
    .catch((error) => {
      console.error('VRM loading failed:', error);
    });
}

export function loadAnimation(
  animationURL: string,
  onAnimationLoaded?: () => void
): void {
  vrmController.loadAnimation(animationURL)
    .then(() => {
      if (onAnimationLoaded) {
        onAnimationLoaded();
      }
    })
    .catch((error) => {
      console.error('Animation loading failed:', error);
    });
}

export function updateVRMFeatures(delta: number): void {
  vrmController.updateFeatures(delta);
}

export function getHeadScreenPosition(
  camera: THREE.PerspectiveCamera,
  rendererDomElement: HTMLCanvasElement
): { x: number; y: number; isInFront: boolean } | null {
  return vrmController.getHeadScreenPosition(camera, rendererDomElement);
}

export function getAvailableExpressions(): VRMExpressionInfo[] {
  return vrmController.getAvailableExpressions();
}

export function applyExpression(expressionName: string, intensity?: number): boolean {
  return vrmController.applyExpression(expressionName, intensity);
}

export function getExpressionValue(expressionName: string): number | null {
  return vrmController.getExpressionValue(expressionName);
}

export function resetAllExpressions(): void {
  vrmController.resetAllExpressions();
}