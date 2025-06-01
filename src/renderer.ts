import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';

import type { ElectronAPI } from './preload.types';
import { loadVRM, loadAnimation,updateVRMFeatures } from './vrmController';
import { getAvailableExpressions, applyExpression } from './vrmController';
import './index.css';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

const canvasElement = document.getElementById('vrm-canvas') as HTMLCanvasElement;
const scene = new THREE.Scene();
const canvasAreaInit = document.getElementById('canvas-area');
const initialAspect = canvasAreaInit ? canvasAreaInit.clientWidth / canvasAreaInit.clientHeight : window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(30, initialAspect, 0.1, 20);
camera.position.set(0.0, 1.2, 5.0);
const speechBubbleContainer = document.getElementById('speech-bubble-container') as HTMLDivElement;
const speechBubbleText = document.getElementById('speech-bubble-text') as HTMLParagraphElement;
let speechBubbleTimeout: number | null = null;


const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('vrm-canvas') as HTMLCanvasElement,
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
});
const canvasArea = document.getElementById('canvas-area');
if (canvasArea) {
    renderer.setSize(canvasArea.clientWidth, canvasArea.clientHeight);
} else {
    renderer.setSize(window.innerWidth, window.innerHeight);
}
renderer.setPixelRatio(window.devicePixelRatio);
// VRMキャンバスの背景を強制的に透明に設定
renderer.setClearColor(0x000000, 0.0);
renderer.shadowMap.enabled = false;

const light = new THREE.DirectionalLight(0xffffff, Math.PI);
light.position.set(1.0, 1.0, 1.0).normalize(); // normalize()も良いかも
scene.add(light);
const ambientLight = new THREE.AmbientLight(0x666666);
scene.add(ambientLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false;
controls.target.set(0.0, 1.0, 0.0); // OrbitControlsの初期ターゲットをモデルの腰あたり(Y=1.0)に設定
controls.update();

// カメラ設定を復元
async function restoreCameraSettings() {
    try {
        if (window.electronAPI && window.electronAPI.getCameraSettings) {
            const settings = await window.electronAPI.getCameraSettings();
            if (settings) {
                // カメラ位置を復元
                camera.position.set(settings.position.x, settings.position.y, settings.position.z);
                
                // OrbitControlsターゲットを復元
                controls.target.set(settings.target.x, settings.target.y, settings.target.z);
                
                // ズームを復元
                camera.zoom = settings.zoom;
                camera.updateProjectionMatrix();
                
                // OrbitControlsを更新
                controls.update();
                
                console.log('カメラ設定を復元しました:', settings);
            }
        }
    } catch (error) {
        console.error('カメラ設定の復元に失敗しました:', error);
    }
}

// カメラ設定を保存
async function saveCameraSettings() {
    try {
        if (window.electronAPI && window.electronAPI.setCameraSettings) {
            const settings = {
                position: {
                    x: camera.position.x,
                    y: camera.position.y,
                    z: camera.position.z
                },
                target: {
                    x: controls.target.x,
                    y: controls.target.y,
                    z: controls.target.z
                },
                zoom: camera.zoom
            };
            
            await window.electronAPI.setCameraSettings(settings);
            console.log('カメラ設定を保存しました:', settings);
        }
    } catch (error) {
        console.error('カメラ設定の保存に失敗しました:', error);
    }
}

// カメラ変更時の自動保存（デバウンス処理付き）
let saveTimeout: number | null = null;
function scheduleCameraSave() {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    saveTimeout = window.setTimeout(() => {
        saveCameraSettings();
    }, 1000); // 1秒後に保存
}

// OrbitControlsの変更イベントを監視
controls.addEventListener('change', scheduleCameraSave);
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
            if (loadedVRMInstance.lookAt) {
                loadedVRMInstance.lookAt.target = lookAtTarget;
            }
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
        loadAnimation('/idle.vrma', () => {
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
            
            // VRMモデルロード完了後にカメラ設定を復元
            restoreCameraSettings();
        });
    } else {
        console.error('renderer.ts: VRMモデルのロードに失敗しました。');
    }
});

function updateSizesAndLog() {
    if (!canvasElement || !camera || !renderer) return;

    const canvasArea = document.getElementById('canvas-area');
    if (!canvasArea) return;
    
    const width = canvasArea.clientWidth;
    const height = canvasArea.clientHeight;

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
    renderer.setPixelRatio(window.devicePixelRatio);
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

    if (!initialSizeHasBeenSet) {
        const canvasArea = document.getElementById('canvas-area');
        if (canvasArea && canvasArea.clientWidth > 0 && canvasArea.clientHeight > 0) {
            console.log("Initial size detected, updating renderer and camera...");
            updateSizesAndLog();
            initialSizeHasBeenSet = true; // フラグを立てて、以降はリサイズイベント任せにする
        }
    }


    renderer.render(scene, camera);
}
animate();

// ページの読み込み完了時にカメラ設定を復元
window.addEventListener('DOMContentLoaded', () => {
    restoreCameraSettings();
});

// アプリ終了前にカメラ設定を保存
window.addEventListener('beforeunload', () => {
    saveCameraSettings();
});

// もしウィンドウサイズが変わったら、カメラとレンダラーも追従させます
window.addEventListener('resize', () => {
    // キャンバスエリアの実際のサイズを取得
    const canvasArea = document.getElementById('canvas-area');
    if (!canvasArea) return;
    
    const width = canvasArea.clientWidth;
    const height = canvasArea.clientHeight;
    
    if (width === 0 || height === 0) {
        console.warn('Canvas area dimensions are zero, skipping resize.');
        return;
    }
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    console.log(`Window resized: ${width}w x ${height}h`);
}, false);

const toggleChatButton = document.getElementById('toggle-chat-icon');

if (toggleChatButton) {
    toggleChatButton.addEventListener('click', () => {
        if (window.electronAPI && window.electronAPI.toggleChatWindowVisibility) {
            window.electronAPI.toggleChatWindowVisibility();
        } else {
            console.error('electronAPI.toggleChatWindowVisibility is not available.');
        }
    });
    
    // チャットウィンドウの状態変更を監視
    if (window.electronAPI && window.electronAPI.onChatWindowStateChanged) {
        window.electronAPI.onChatWindowStateChanged((isVisible: boolean) => {
            if (isVisible) {
                toggleChatButton.classList.add('active');
            } else {
                toggleChatButton.classList.remove('active');
            }
        });
    }
} else {
    console.warn('#toggle-chat-icon element not found.');
}

const settingsButton = document.getElementById('settings-icon');

if (settingsButton) {
    settingsButton.addEventListener('click', () => {
        if (window.electronAPI && window.electronAPI.toggleSettingsWindow) {
            window.electronAPI.toggleSettingsWindow();
        } else {
            console.error('electronAPI.toggleSettingsWindow is not available.');
        }
    });
    
    // 設定ウィンドウの状態変更を監視
    if (window.electronAPI && window.electronAPI.onSettingsWindowStateChanged) {
        window.electronAPI.onSettingsWindowStateChanged((isOpen: boolean) => {
            if (isOpen) {
                settingsButton.classList.add('active');
            } else {
                settingsButton.classList.remove('active');
            }
        });
    }
} else {
    console.warn('#settings-icon element not found.');
}

const quitAppButton = document.getElementById('quit-app-icon');

if (quitAppButton) {
    quitAppButton.addEventListener('click', () => {
        if (window.electronAPI && window.electronAPI.quitApp) {
            // 確認ダイアログを表示
            const confirmQuit = window.confirm('本当にアプリケーションを終了しますか？');
            if (confirmQuit) {
                window.electronAPI.quitApp();
            }
        } else {
            console.error('electronAPI.quitApp is not available.');
        }
    });
} else {
    console.warn('#quit-app-icon element not found.');
}

// ✨ MainWindow タイトルバー監視・強制非表示システム
class TitleBarMonitor {
    private isRunning = false;
    private monitorInterval: number | null = null;
    private frameCount = 0;
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('[TitleBarMonitor] Starting titlebar monitoring...');
        
        // 軽量な監視（2秒間隔）
        this.monitorInterval = window.setInterval(() => {
            this.checkAndHideTitleBar();
        }, 2000); // 2秒間隔に変更
        
        // フォーカス・ブラーイベントでも強制実行
        window.addEventListener('focus', () => this.forceTitleBarHiding());
        window.addEventListener('blur', () => this.forceTitleBarHiding());
        
        // ウィンドウサイズ変更時も強制実行
        window.addEventListener('resize', () => this.forceTitleBarHiding());
    }
    
    private checkAndHideTitleBar() {
        this.frameCount++;
        
        // DOMとウィンドウタイトルの確認・修正
        this.hideTitleElements();
        
        // 定期的にログ出力（デバッグ用）
        if (this.frameCount % 3600 === 0) { // 60秒に1回
            console.log(`[TitleBarMonitor] Active for ${this.frameCount} frames (${Math.round(this.frameCount / 60)} seconds)`);
        }
    }
    
    private hideTitleElements() {
        // document.title を空に
        if (document.title !== '') {
            document.title = '';
        }
        
        // 可能性のあるタイトルバー要素を非表示
        const titleElements = [
            'title',
            '[role="banner"]',
            '.titlebar',
            '.title-bar',
            '.window-title',
            'header'
        ];
        
        titleElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                const htmlElement = element as HTMLElement;
                if (htmlElement.style.display !== 'none') {
                    htmlElement.style.display = 'none';
                }
            });
        });
        
        // body やhtml の余計なマージン・パディングを削除
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.documentElement.style.margin = '0';
        document.documentElement.style.padding = '0';
        
        // -webkit-app-region を no-drag に強制設定
        document.body.style.webkitAppRegion = 'no-drag';
        document.documentElement.style.webkitAppRegion = 'no-drag';
    }
    
    private forceTitleBarHiding() {
        console.log('[TitleBarMonitor] Force hiding titlebar...');
        
        // より強力な非表示処理
        this.hideTitleElements();
        
        // Electron API経由でもタイトルを強制リセット
        if (window.electronAPI && window.electronAPI.logRendererMessage) {
            window.electronAPI.logRendererMessage('Force titlebar hiding requested from renderer');
        }
        
        // CSS強制適用
        const style = document.createElement('style');
        style.textContent = `
            * { -webkit-app-region: no-drag !important; }
            title, [role="banner"], .titlebar, .title-bar, .window-title { display: none !important; }
            body, html { margin: 0 !important; padding: 0 !important; }
        `;
        style.id = 'titlebar-killer';
        
        // 既存のスタイルがあれば削除してから追加
        const existingStyle = document.getElementById('titlebar-killer');
        if (existingStyle) {
            existingStyle.remove();
        }
        document.head.appendChild(style);
    }
    
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        console.log('[TitleBarMonitor] Titlebar monitoring stopped.');
    }
}

// タイトルバー監視を開始
const titleBarMonitor = new TitleBarMonitor();

// DOMContentLoaded後に監視開始
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        titleBarMonitor.start();
    });
} else {
    titleBarMonitor.start();
}

// ページアンロード時に監視停止
window.addEventListener('beforeunload', () => {
    titleBarMonitor.stop();
});

// VRM表情関連の関数をグローバルに公開
(window as any).vrmExpression = {
    getAvailableExpressions: () => {
        try {
            console.log('[Renderer] グローバル表情取得要求');
            const expressions = getAvailableExpressions();
            console.log('[Renderer] グローバル表情取得結果:', expressions.length);
            return expressions;
        } catch (error) {
            console.error('[Renderer] グローバル表情取得エラー:', error);
            return [];
        }
    },
    
    applyExpression: (expressionName: string, intensity?: number) => {
        try {
            console.log('[Renderer] グローバル表情適用要求:', expressionName, intensity);
            const success = applyExpression(expressionName, intensity);
            console.log('[Renderer] グローバル表情適用結果:', success);
            return success;
        } catch (error) {
            console.error('[Renderer] グローバル表情適用エラー:', error);
            return false;
        }
    }
};


