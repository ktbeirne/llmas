// src/speechBubbleRenderer.ts

// preload.d.tsで定義されている型を参照するために、tsconfig.jsonの設定で
// srcフォルダ全体が含まれているので、通常はこの行は不要ですが、
// もしエディタが window.electronAPI を認識しない場合は追加してみてください。
/// <reference path="..\..\src\preload.d.ts" />

// ★ デバッグ: スクリプトの読み込みを確認
console.log('[SpeechBubbleRenderer] Script loaded');

// ★ デバッグ: window.electronAPIの存在を確認
console.log('[SpeechBubbleRenderer] window.electronAPI exists:', !!window.electronAPI);
if (window.electronAPI) {
    console.log('[SpeechBubbleRenderer] Available APIs:', Object.keys(window.electronAPI));
}

const bubbleContent = document.getElementById('bubble-content') as HTMLDivElement | null;
console.log('[SpeechBubbleRenderer] bubble-content element found:', !!bubbleContent);

let hideTimeout: number | null = null; // setTimeoutの戻り値の型はnumber

// 表示時間計算用の定数 (ご主人様のお好みで調整してくださいね♡)
const MIN_DISPLAY_TIME_MS = 4000;    // 最低表示時間 (ミリ秒)
const MAX_DISPLAY_TIME_MS = 20000;   // 最大表示時間 (ミリ秒)
const CHARS_PER_SECOND_READING_SPEED = 6; // 1秒あたりに読める文字数

// CSSで設定したpaddingやborderの値を考慮するため (片側分)
// speechBubble.html の #bubble-content のスタイルに合わせて調整してください。
// 例: padding: 10px 15px; border: 1px solid #ccc; の場合
const BUBBLE_PADDING_TOP_BOTTOM = 10; // padding-top と padding-bottom の片側の値
const BUBBLE_PADDING_LEFT_RIGHT = 15; // padding-left と padding-right の片側の値
const BUBBLE_BORDER_THICKNESS = 1;    // borderの太さ (上下左右同じと仮定)

// 各行の描画幅を測定するヘルパー関数
function getTextWidth(text: string, style: CSSStyleDeclaration): number {
    const element = document.createElement("span");
    document.body.appendChild(element); // 一時的にbodyに追加して計算可能にする

    // スタイルを適用
    element.style.font = style.font;
    element.style.fontSize = style.fontSize;
    element.style.fontFamily = style.fontFamily;
    element.style.fontWeight = style.fontWeight;
    element.style.letterSpacing = style.letterSpacing;
    element.style.whiteSpace = 'nowrap'; // 重要: 折り返させずに幅を測る
    element.style.visibility = 'hidden'; // 画面には表示しない
    element.style.position = 'absolute'; // レイアウトに影響を与えないように

    element.textContent = text;
    const width = element.offsetWidth;
    document.body.removeChild(element); // 測定が終わったら削除
    return width;
}

if (window.electronAPI && window.electronAPI.onSetSpeechBubbleText) {
    console.log('[SpeechBubbleRenderer] Setting up onSetSpeechBubbleText listener');
    
    window.electronAPI.onSetSpeechBubbleText((text) => {
        console.log('[SpeechBubbleRenderer] Received text:', text ? text.substring(0, 30) + '...' : 'null or empty');
        
        if (window.electronAPI && window.electronAPI.logRendererMessage) {
            window.electronAPI.logRendererMessage(`onSetSpeechBubbleText called with text: "${text ? text.substring(0, 30) + '...' : 'null or empty'}"`);
        }

        if (bubbleContent) {
            bubbleContent.textContent = text; // まずテキストを設定

            // 既存のタイマーがあればクリア
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }

            if (text && text.trim() !== "") {
                if (window.electronAPI && window.electronAPI.logRendererMessage) {
                    window.electronAPI.logRendererMessage('Attempting to get size based on longest line.');
                }

                // bubbleContent が null でないことを再度確認 (TypeScriptのnullチェックのため)
                // このブロックは if (bubbleContent) の内側なので、本来は不要ですが、より安全に
                if (bubbleContent) {
                    const computedStyle = getComputedStyle(bubbleContent); // スタイルを取得

                    // CSSからmax-width, min-width, max-heightを動的に取得
                    const cssMaxWidth = parseFloat(computedStyle.maxWidth) || 500; // デフォルト500px
                    const cssMinWidth = parseFloat(computedStyle.minWidth) || 300;   // デフォルト0px (制限なし)
                    const cssMaxHeight = parseFloat(computedStyle.maxHeight) || 150; // デフォルト150px

                    if (window.electronAPI && window.electronAPI.logRendererMessage) {
                        window.electronAPI.logRendererMessage(`CSS Values: maxWidth=${cssMaxWidth}, minWidth=${cssMinWidth}, maxHeight=${cssMaxHeight}`);
                    }

                    const lines = text.split('\n');
                    let longestLineWidth = 0;
                    lines.forEach(line => {
                        // 空白だけの行や空行でも、ある程度の幅を持つように半角スペースで測る
                        const measureText = line.trim() === '' ? ' ' : line.trim();
                        const lineWidth = getTextWidth(measureText, computedStyle);
                        if (lineWidth > longestLineWidth) {
                            longestLineWidth = lineWidth;
                        }
                    });

                    if (window.electronAPI && window.electronAPI.logRendererMessage) {
                        window.electronAPI.logRendererMessage(`LongestLineWidthCalc: Calculated longest line width = ${longestLineWidth}`);
                    }
                    let contentRenderedWidth = longestLineWidth;
                    let contentRenderedHeight = bubbleContent.scrollHeight; // 高さは従来通りscrollHeightから取得

                    if (window.electronAPI && window.electronAPI.logRendererMessage) {
                        window.electronAPI.logRendererMessage(`LongestLineWidthCalc: contentRenderedWidth=${contentRenderedWidth}, scrollHeight=${contentRenderedHeight}`);
                    }

                    let displayWidth = Math.min(contentRenderedWidth, cssMaxWidth);
                    if (cssMinWidth > 0) {
                        displayWidth = Math.max(displayWidth, cssMinWidth);
                    }

                    let displayHeight = Math.min(contentRenderedHeight, cssMaxHeight);
                    // (オプション) 必要であれば、displayHeight にも parseFloat(computedStyle.minHeight) || 0 を使った最小高さの考慮を追加できます。

                    // ウィンドウサイズとしては、padding と border を加える
                    let finalWindowWidth = displayWidth + (BUBBLE_PADDING_LEFT_RIGHT * 2) + (BUBBLE_BORDER_THICKNESS * 2);
                    let finalWindowHeight = displayHeight + (BUBBLE_PADDING_TOP_BOTTOM * 2) + (BUBBLE_BORDER_THICKNESS * 2);

                    // ウィンドウ幅もCSSのmin-widthにpadding/borderを考慮した値を下回らないように
                    if (cssMinWidth > 0) {
                        finalWindowWidth = Math.max(finalWindowWidth, cssMinWidth + (BUBBLE_PADDING_LEFT_RIGHT * 2) + (BUBBLE_BORDER_THICKNESS * 2));
                    }
                    // ウィンドウとして設定する最小サイズ
                    finalWindowWidth = Math.max(finalWindowWidth, 60);
                    finalWindowHeight = Math.max(finalWindowHeight, 40);

                    if (window.electronAPI && window.electronAPI.notifyBubbleSize) {
                        if (window.electronAPI.logRendererMessage) {
                            window.electronAPI.logRendererMessage(`LongestLineWidthCalc: Notifying size: finalWindowWidth=${Math.ceil(finalWindowWidth)}, finalWindowHeight=${Math.ceil(finalWindowHeight)}`);
                        }
                        window.electronAPI.notifyBubbleSize({ width: Math.ceil(finalWindowWidth), height: Math.ceil(finalWindowHeight) });
                    } else {
                        if (window.electronAPI && window.electronAPI.logRendererMessage) {
                            window.electronAPI.logRendererMessage('Error: electronAPI.notifyBubbleSize is NOT available.');
                        }
                    }
                } //  if (bubbleContent) - inner check

                // 表示時間を計算
                let calculatedDisplayTimeMs = (text.length / CHARS_PER_SECOND_READING_SPEED) * 1000;
                calculatedDisplayTimeMs = Math.max(MIN_DISPLAY_TIME_MS, calculatedDisplayTimeMs);
                calculatedDisplayTimeMs = Math.min(MAX_DISPLAY_TIME_MS, calculatedDisplayTimeMs);

                if (window.electronAPI && window.electronAPI.logRendererMessage) {
                    window.electronAPI.logRendererMessage(`Timer set for ${calculatedDisplayTimeMs / 1000}s.`);
                }

                hideTimeout = window.setTimeout(() => { // setTimeoutの戻り値はnumberなのでwindow.を付けるとより明確
                    if (window.electronAPI && window.electronAPI.logRendererMessage) {
                        window.electronAPI.logRendererMessage('Timer expired. Clearing text and requesting hide.');
                    }
                    if (bubbleContent) bubbleContent.textContent = ''; // 内容を空にする
                    if (window.electronAPI && window.electronAPI.hideSpeechBubble) {
                        window.electronAPI.hideSpeechBubble();
                    }
                    hideTimeout = null;
                }, calculatedDisplayTimeMs);

            } else { // テキストが空またはトリムして空の場合
                if (window.electronAPI && window.electronAPI.logRendererMessage) {
                    window.electronAPI.logRendererMessage('Text is empty or whitespace. Clearing text and requesting hide.');
                }
                if (bubbleContent) bubbleContent.textContent = '';
                if (window.electronAPI && window.electronAPI.hideSpeechBubble) {
                    window.electronAPI.hideSpeechBubble();
                }
            }
        } else { // bubbleContent が null だった場合
            if (window.electronAPI && window.electronAPI.logRendererMessage) {
                window.electronAPI.logRendererMessage('Error: bubbleContent element not found in onSetSpeechBubbleText.');
            }
        }
    });
    
    console.log('[SpeechBubbleRenderer] onSetSpeechBubbleText listener setup complete');
} else {
    console.error('[SpeechBubbleRenderer] electronAPI or onSetSpeechBubbleText is not available.');
    console.error('[SpeechBubbleRenderer] window.electronAPI:', window.electronAPI);
    if (window.electronAPI) {
        console.error('[SpeechBubbleRenderer] window.electronAPI.onSetSpeechBubbleText:', window.electronAPI.onSetSpeechBubbleText);
    }
    
    if (window.electronAPI && window.electronAPI.logRendererMessage) { // メインプロセスにログを送るAPIが使えるなら
        window.electronAPI.logRendererMessage('Error: electronAPI or onSetSpeechBubbleText is not available in speechBubbleRenderer.ts.');
    }
    if (bubbleContent) bubbleContent.textContent = "API接続エラーです…";
}

// ★ デバッグ: DOMContentLoadedイベントでも確認
document.addEventListener('DOMContentLoaded', () => {
    console.log('[SpeechBubbleRenderer] DOMContentLoaded fired');
    console.log('[SpeechBubbleRenderer] window.electronAPI exists (after DOM):', !!window.electronAPI);
});