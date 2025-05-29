import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMUtils, VRMLoaderPlugin, VRM, VRMHumanBoneName } from '@pixiv/three-vrm'; 
import { createVRMAnimationClip, VRMAnimationLoaderPlugin, VRMAnimation } from '@pixiv/three-vrm-animation';

let currentVRM: VRM | null = null; 
let currentVRMAnimation: VRMAnimation | null = null; // VRMAからロードしたアニメーションデータを保持
let animationMixer: THREE.AnimationMixer | null = null;

const loader = new GLTFLoader(); // ローダーはここで一元管理しましょう
// VRMモデルを読み込むためのプラグインを登録
loader.register((parser) => new VRMLoaderPlugin(parser));
// VRMアニメーションを読み込むためのプラグインも登録！
loader.register((parser) => new VRMAnimationLoaderPlugin(parser));


// モデルとアニメーションが両方揃ったらMixerを初期化して再生する内部関数
function tryInitMixerAndPlay() {
    if (currentVRM && currentVRMAnimation && !animationMixer) { // animationMixerが未作成の場合のみ
        console.log('モデルとアニメーションが揃ったのでMixerを初期化して再生します。');
        animationMixer = new THREE.AnimationMixer(currentVRM.scene);
        const clip = createVRMAnimationClip(currentVRMAnimation, currentVRM);
        if (clip) {
            animationMixer.clipAction(clip).play();
            console.log(`アニメーションクリップ「${clip.name}」を再生開始。`);
        } else {
            console.error('AnimationClipの生成に失敗。');
        }
    }
}

// VRMモデルをロードする関数
export function loadVRM(
    modelURL: string,
    scene: THREE.Scene,
    // ★このコールバックは、renderer.tsがvrmオブジェクトを受け取るためだけのもの
    onModelLoaded?: (vrm: VRM) => void
) {
    loader.load(
        modelURL,
        (gltf) => {
            const vrm = gltf.userData.vrm as VRM;
            if (!vrm) {
                console.error('gltf.userData.vrm が見つかりません。');
                if (onModelLoaded) onModelLoaded(undefined as any); // エラーを通知する方が良い
                return;
            }
            if (currentVRM && currentVRM.scene) {
                scene.remove(currentVRM.scene);
                VRMUtils.deepDispose(currentVRM.scene);
            }
            scene.add(vrm.scene);
            VRMUtils.rotateVRM0(vrm);
            currentVRM = vrm; // モジュール内変数に保持
            console.log('VRMモデル召喚成功:', currentVRM);
            tryInitMixerAndPlay(); // アニメーションのセットアップを試みる
            if (onModelLoaded) {
                onModelLoaded(vrm); // renderer.tsにvrmオブジェクトを渡す
            }
        },
        (progress) => console.log(`VRM「${modelURL}」読み込み中... ${(progress.loaded / progress.total) * 100}%`),
        (error) => {
            console.error(`VRM「${modelURL}」召喚失敗:`, error);
            if (onModelLoaded) onModelLoaded(undefined as any);
        }
    );
}

// VRMアニメーションをロードする関数
export function loadAnimation(
    animationURL: string,
    // ★このコールバックは、renderer.tsがアニメーションロード完了を知るためだけのもの (引数なし)
    onAnimationLoaded?: () => void
) {
    loader.load(
        animationURL,
        (gltf) => {
            const vrmAnimations = gltf.userData.vrmAnimations as VRMAnimation[];
            if (!vrmAnimations || vrmAnimations.length === 0) {
                console.warn(`アニメーションファイル「${animationURL}」にデータが見つかりません。`);
                if (onAnimationLoaded) onAnimationLoaded();
                return;
            }
            currentVRMAnimation = vrmAnimations[0]; // モジュール内変数に保持
            console.log('VRMアニメーションロード成功:', currentVRMAnimation);
            tryInitMixerAndPlay(); // アニメーションのセットアップを試みる
            if (onAnimationLoaded) {
                onAnimationLoaded();
            }
        },
        (progress) => console.log(`アニメーション「${animationURL}」読み込み中... ${(progress.loaded / progress.total) * 100}%`),
        (error) => {
            console.error(`アニメーション「${animationURL}」ロード失敗:`, error);
            if (onAnimationLoaded) onAnimationLoaded();
        }
    );
  }

function handleAutoBlink(vrm: VRM | null) { // currentVRM を引数で受け取る
    if (!vrm || !vrm.expressionManager) {
        return;
    }
    const expressionManager = vrm.expressionManager;
    // 2～7秒ごとにランダムでまばたきする感じ
    if (Math.random() < 0.5 / (60 * 5)) { // だいたい5秒に1回くらいの確率 (60fps想定)
        expressionManager.setValue('blink', 1.0);
        setTimeout(() => {
            // setTimeoutの中で再度vrmとexpressionManagerの存在を確認するのがより安全です
            if (vrm && vrm.expressionManager) {
                vrm.expressionManager.setValue('blink', 0.0);
            }
        }, 100);
    }
}


// VRMの毎フレーム更新と、自動的な振る舞いを担当する関数
export function updateVRMFeatures(delta: number) {
    if (currentVRM) {
        currentVRM.update(delta); // VRMモデル自体の基本的な更新
        // ヘルパー関数を呼び出す！
        handleAutoBlink(currentVRM);

        if (animationMixer) {
           animationMixer.update(delta); // これでアニメーションが進みます！
        }

        // --- 視線制御の更新を追加 ---
        if (currentVRM.lookAt) { // lookAtコントローラーが存在すれば
            currentVRM.lookAt.update(delta); // ★ 毎フレームlookAtの状態を更新！
            // target は renderer.ts で設定済みの想定
        }
      // --- ここまで追加 ---

        // handleAutoSway(currentVRM, delta); // 将来的にはこんな感じに
    }
  }

export function getHeadScreenPosition(
    camera: THREE.PerspectiveCamera, // renderer.ts からカメラを受け取る
    rendererDomElement: HTMLCanvasElement // renderer.ts からcanvas要素を受け取る
): { x: number; y: number; isInFront: boolean } | null {
    if (!currentVRM || !currentVRM.humanoid) return null;
    const headNode = currentVRM.humanoid.getBoneNode(VRMHumanBoneName.Head);
    if (!headNode) return null;

    const worldPosition = new THREE.Vector3();
    headNode.getWorldPosition(worldPosition); // 頭のボーンのワールド座標を取得

    // カメラから見た時に、頭がカメラの正面にあるか（背後にないか）簡易チェック
    const viewZ = worldPosition.clone().project(camera).z;

    // ワールド座標をスクリーン座標 (NDC: -1 to +1 for x and y) に変換
    const screenPosition = worldPosition.clone().project(camera);

    // NDCを実際のピクセル座標 (左上が0,0) に変換
    const screenX = (screenPosition.x + 1) / 2 * rendererDomElement.clientWidth;
    const screenY = (-screenPosition.y + 1) / 2 * rendererDomElement.clientHeight;

    return { x: screenX, y: screenY, isInFront: viewZ < 1 }; // isInFront: trueならカメラの描画範囲内
  }