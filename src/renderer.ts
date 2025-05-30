/// <reference path="preload.d.ts" />

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadVRM, loadAnimation,updateVRMFeatures } from './vrmController';
import * as THREE from 'three';
import { VRMUtils, VRMLoaderPlugin, VRM, VRMHumanBoneName } from '@pixiv/three-vrm'; 
import { getHeadScreenPosition } from './vrmController';
import './index.css';

const canvasElement = document.getElementById('vrm-canvas') as HTMLCanvasElement;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, canvasElement.clientWidth / canvasElement.clientHeight, 0.1, 20);
camera.position.set(0.0, 1.2, 5.0);
const speechBubbleContainer = document.getElementById('speech-bubble-container') as HTMLDivElement;
const speechBubble = document.getElementById('speech-bubble') as HTMLDivElement;
const speechBubbleText = document.getElementById('speech-bubble-text') as HTMLParagraphElement;
let speechBubbleTimeout: number | null = null;

const MIN_DISPLAY_TIME_MS = 6000;    // 最低でも表示する時間 (例: 4秒 = 4000ミリ秒)
const MAX_DISPLAY_TIME_MS = 60000;   // 最大でもこの時間まで (例: 20秒 = 20000ミリ秒)
const CHARS_PER_SECOND_READING_SPEED = 5; // 1秒あたりに読める文字数の目安 (例: 6文字/秒)

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('vrm-canvas') as HTMLCanvasElement,
    alpha: true,
    antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// renderer.setClearColor(0x7fbfff, 1.0); // お手本コードにあった背景色設定。お好みで。

const light = new THREE.DirectionalLight(0xffffff, Math.PI);
light.position.set(1.0, 1.0, 1.0).normalize(); // normalize()も良いかも
scene.add(light);
const ambientLight = new THREE.AmbientLight(0x666666);
scene.add(ambientLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false;
controls.target.set(0.0, 1.0, 0.0); // OrbitControlsの初期ターゲットをモデルの腰あたり(Y=1.0)に設定
controls.update();
let loadedVRMInstance: VRM | null = null; // renderer側でVRMインスタンスを保持する必要があれば

const lookAtTarget = new THREE.Object3D(); // マウスで動かす注視点
scene.add(lookAtTarget); // シーンに追加 (デバッグ時に可視化する場合など)
lookAtTarget.position.set(0, 1.3, 0.5);

// マウスイベントのリスナーを追加 (DOMContentLoaded内や、canvas初期化後など)
window.addEventListener('mousemove', (event) => {
    const headPosition = new THREE.Vector3();
    if (loadedVRMInstance && loadedVRMInstance.humanoid) {
        const headNode = loadedVRMInstance.humanoid.getBoneNode(VRMHumanBoneName.Head);
        if (headNode) {
            headNode.getWorldPosition(headPosition);
        } else {
            headPosition.set(0, 1.3, 0); // フォールバック
        }
    } else {
        headPosition.set(0, 1.3, 0); // フォールバック
    }

    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

    // lookAtTarget の位置を、もっと大胆に動かしてみる
    // const targetX = mouseX * 5.0; // X方向の移動範囲を大きく (以前は * 2.0 や * 4.0 でした)
    // const targetY = mouseY * 3.0 + headPosition.y; // Y方向の移動範囲も大きく

    // マウスXでターゲットのX座標、マウスYでターゲットのY座標を動かす (モデルの正面、少し手前の平面を想定)
    const targetX = (event.clientX / window.innerWidth - 0.5) * 4; // -2 から 2 の範囲くらい
    const targetY = -(event.clientY / window.innerHeight - 0.5) * 2 + headPosition.y; // 頭の高さ中心に -1 から 1 の範囲くらい
    lookAtTarget.position.set(targetX, targetY, headPosition.z + 2.0); // Zは頭の位置より少し手前
});

// if (window.electronAPI && window.electronAPI.onDisplaySpeechBubble) {
//     window.electronAPI.onDisplaySpeechBubble((text: string) => {
//         if (!speechBubbleContainer || !speechBubbleText /*...*/) return;

//         // const currentlyHidden = speechBubbleContainer.style.display === 'none'; // ← この行は不要に

//         if (!text || text.trim() === "") {
//             // if (speechBubbleContainer.style.display !== 'none') { // ← displayからvisibilityに変更
//             if (speechBubbleContainer.style.visibility !== 'hidden') {
//                 speechBubbleContainer.style.visibility = 'hidden'; // ★非表示
//                 // requestAnimationFrame(updateRendererAndCameraSize); // ← キャンバスサイズ変わらないので不要
//             }
//             if (speechBubbleTimeout) clearTimeout(speechBubbleTimeout);
//             speechBubbleTimeout = null;
//             return;
//         }

//         speechBubbleText.textContent = text;
//         // if (speechBubbleContainer.style.display !== 'flex') { // ← displayからvisibilityに変更
//         if (speechBubbleContainer.style.visibility !== 'visible') {
//             speechBubbleContainer.style.visibility = 'visible'; // ★表示！
//             // requestAnimationFrame(updateRendererAndCameraSize); // ← キャンバスサイズ変わらないので不要
//         }

//         if (speechBubbleTimeout) clearTimeout(speechBubbleTimeout);
//         let calculatedDisplayTimeMs = (text.length / CHARS_PER_SECOND_READING_SPEED) * 1000;

//         // 最低表示時間を適用
//         calculatedDisplayTimeMs = Math.max(MIN_DISPLAY_TIME_MS, calculatedDisplayTimeMs);
//         // 最大表示時間を適用
//         calculatedDisplayTimeMs = Math.min(MAX_DISPLAY_TIME_MS, calculatedDisplayTimeMs);
//         console.log(`Text length: ${text.length}, Calculated display time: ${calculatedDisplayTimeMs / 1000}s`);
//         speechBubbleTimeout = window.setTimeout(() => {
//             // if (speechBubbleContainer.style.display !== 'none') { // ← displayからvisibilityに変更
//             if (speechBubbleContainer.style.visibility !== 'hidden') {
//                 speechBubbleContainer.style.visibility = 'hidden'; // ★非表示に戻す
//                 // requestAnimationFrame(updateRendererAndCameraSize); // ← キャンバスサイズ変わらないので不要
//             }
//         }, calculatedDisplayTimeMs); // 表示時間
//     });
//   }

function onAllAssetsReady() {
    console.log('モデルとアニメーションの準備ができました！');
    if (loadedVRMInstance && loadedVRMInstance.humanoid) { // loadedVRMInstanceを使う
        const hipsNode = loadedVRMInstance.humanoid.getBoneNode(VRMHumanBoneName.Hips);
        if (hipsNode) {
            const hipsWorldPosition = new THREE.Vector3();
            hipsNode.getWorldPosition(hipsWorldPosition);
            const targetFocusPosition = hipsWorldPosition.clone()
            targetFocusPosition.y -= 0;
            controls.target.copy(targetFocusPosition);
            controls.update();
            loadedVRMInstance.lookAt.target = lookAtTarget;
            console.log('OrbitControlsのターゲットをVRMの腰に設定しました。');
        }
        // --- ↓ lookAtTargetのY座標調整をここに追加！ ---
        const headNode = loadedVRMInstance.humanoid.getBoneNode(VRMHumanBoneName.Head);
        if (headNode) {
            const headWorldPosition = new THREE.Vector3();
            headNode.getWorldPosition(headWorldPosition);
            lookAtTarget.position.y = headWorldPosition.y; // Y座標だけを頭の高さに合わせる
            console.log(`lookAtTargetのY座標をヘッドポジション: ${headWorldPosition.y} に設定しました。`);
        }
        // --- ここまで追加 ---
    }
}

// まずVRMモデルをロード
loadVRM('/avatar.vrm', scene, (vrm) => { // vrmモデルオブジェクトを受け取る
    console.log('renderer.ts: VRMモデルのロードが完了しました。');
    if (vrm) {
        loadedVRMInstance = vrm; // 必要なら保持
        // 次にアニメーションをロード
        loadAnimation('/VRMA_03.vrma', () => {
            console.log('renderer.ts: アニメーションのロードが完了しました。');
            // モデルとアニメーションの両方がロードされた後に実行したい処理があれば、ここか、
            // あるいは tryInitMixerAndPlay が成功したことを知る別の仕組みが必要になります。
            // npaka様のコードでは、initAnimationClipが呼ばれたら再生開始、という流れでした。
            // 今回は、vrmController内で両方揃ったら勝手に再生が始まるので、
            // renderer側では、例えばOrbitControlsのターゲット設定などを onAllAssetsReady で行う想定です。
            // onAllAssetsReadyをどのタイミングで呼ぶか？
            // → tryInitMixerAndPlayが成功したタイミングで呼びたい。
            // → vrmController.tsに onMixerReady?: () => void のようなコールバックを追加するのが良いかも。
            //    ひとまずは、アニメーションロード完了をもってonAllAssetsReadyを呼んでみます。
            onAllAssetsReady();
        });
    } else {
        console.error('renderer.ts: VRMモデルのロードに失敗しました。');
    }
});

function updateSizesAndLog() {
    if (!canvasElement || !camera || !renderer) return;

    const width = canvasElement.clientWidth;
    const height = canvasElement.clientHeight;

    // 幅か高さが0の場合は、まだレイアウトが確定していない可能性があるので何もしない
    if (width === 0 || height === 0) {
        console.warn('Canvas dimensions are zero, skipping update.');
        return;
    }

    const aspect = width / height;
    console.log(`Canvas Resized/Updated: ${width}w x ${height}h, Aspect: ${aspect.toFixed(2)}`);

    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }



let isMouseOverModel = false;

if (canvasElement) { // canvasElementの存在を確認
    canvasElement.addEventListener('mousemove', (event) => {
        if (!loadedVRMInstance || !camera || !controls) return; // 必要なものが揃っているか確認

        // マウス位置を正規化デバイス座標に変換 (これはクリック判定と同じ)
        const canvasBounds = canvasElement.getBoundingClientRect();
        mouse.x = ((event.clientX - canvasBounds.left) / canvasElement.clientWidth) * 2 - 1;
        mouse.y = -((event.clientY - canvasBounds.top) / canvasElement.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(loadedVRMInstance.scene, true);

        if (intersects.length > 0) {
            // マウスがモデルの上に乗った！
            if (!isMouseOverModel) { // 以前は乗っていなかった場合のみ処理
                isMouseOverModel = true;
                controls.enabled = true; // ★OrbitControlsを有効に！
                // console.log('Mouse ON Model - Controls ENABLED');
                // (任意) カーソルを 'grab' や 'pointer' に変えても良いかも
                // canvasElement.style.cursor = 'grab';
            }
        } else {
            // マウスがモデルから外れた！
            if (isMouseOverModel) { // 以前は乗っていた場合のみ処理
                isMouseOverModel = false;
                controls.enabled = false; // ★OrbitControlsを無効に！
                // console.log('Mouse OFF Model - Controls DISABLED');
                // (任意) カーソルを元に戻す
                // canvasElement.style.cursor = 'default';
            }
        }
    });

    // (オプション) マウスがキャンバスから完全に出たら、確実にOrbitControlsを無効にする
    canvasElement.addEventListener('mouseleave', () => {
        if (controls && controls.enabled) {
            isMouseOverModel = false;
            controls.enabled = false;
            // console.log('Mouse LEAVE Canvas - Controls DISABLED');
            // canvasElement.style.cursor = 'default';
        }
    });
  }

if (canvasElement) { // canvasElementがnullでないことを確認
    canvasElement.addEventListener('click', (event) => {
        if (!loadedVRMInstance || !camera) { // VRMモデルとカメラがロードされているか確認
            console.log("VRM model or camera not ready for click detection.");
            return;
        }

        // 1. マウスのクリック位置をキャンバスのローカル座標に変換
        const canvasBounds = canvasElement.getBoundingClientRect();
        const x = event.clientX - canvasBounds.left;
        const y = event.clientY - canvasBounds.top;

        // 2. ローカル座標を正規化デバイス座標 (NDC) に変換 (-1 to +1 for x and y)
        mouse.x = (x / canvasElement.clientWidth) * 2 - 1;
        mouse.y = -(y / canvasElement.clientHeight) * 2 + 1; // Y座標は上下反転

        // 3. Raycasterにカメラとマウス位置を設定
        raycaster.setFromCamera(mouse, camera);

        // 4. 光線とVRMモデル (loadedVRMInstance.scene) との交差を判定 (trueで再帰的に子要素もチェック)
        const intersects = raycaster.intersectObject(loadedVRMInstance.scene, true);

        if (intersects.length > 0) {
            // 交差があった！ = モデルがクリックされた！
            console.log('VRMモデルがクリックされました！ 一番手前のオブジェクト:', intersects[0].object);
            // ここにご主人様がやりたい処理を書きます
            // 例えば、吹き出しに「いてっ！」と表示するなど
            if (speechBubbleText && speechBubbleContainer) { // speechBubble関連の要素が取得済みなら
                speechBubbleText.textContent = "（きゃっ！触られました…っ）";
                speechBubbleContainer.style.visibility = 'visible';
                if (speechBubbleTimeout) clearTimeout(speechBubbleTimeout); // 古いタイマーをクリア
                speechBubbleTimeout = window.setTimeout(() => {
                    speechBubbleContainer.style.visibility = 'hidden';
                }, 3000); // 3秒で消える
            }
        } else {
            // 交差なし = キャンバスの背景がクリックされた
            console.log('キャンバスの背景がクリックされました。(モデルではありません)');
        }
    });
  }

// --- アニメーションループ ---
const clock = new THREE.Clock();
let initialSizeHasBeenSet = false; // ★初期サイズ設定が完了したかのフラグ

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    controls.update();
    updateVRMFeatures(delta); // vrmControllerの更新処理を呼び出す

    if (!initialSizeHasBeenSet && canvasElement.clientWidth > 0 && canvasElement.clientHeight > 0) {
        console.log("Initial size detected, updating renderer and camera...");
        updateSizesAndLog();
        initialSizeHasBeenSet = true; // フラグを立てて、以降はリサイズイベント任せにする
      }


    renderer.render(scene, camera);
}
animate();

// もしウィンドウサイズが変わったら、カメラとレンダラーも追従させます
window.addEventListener('resize', () => {
    camera.aspect = canvasElement.clientWidth / canvasElement.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasElement.clientWidth, canvasElement.clientHeight);
    //updateSpeechBubblePosition();
}, false);

const toggleChatButton = document.getElementById('toggle-chat-icon');

if (toggleChatButton) {
    toggleChatButton.addEventListener('click', () => {
        if (window.electronAPI && window.electronAPI.toggleChatWindowVisibility) {
            console.log('Toggle chat icon clicked, sending IPC message.');
            window.electronAPI.toggleChatWindowVisibility();
        } else {
            console.error('electronAPI.toggleChatWindowVisibility is not available.');
        }
    });
} else {
    console.warn('#toggle-chat-icon element not found.');
}


