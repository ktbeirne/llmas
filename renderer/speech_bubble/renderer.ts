// SpeechBubbleRenderer.ts - テーマ対応版

import { themeManager } from '../../src/utils/themeManager';

// ★ デバッグ: スクリプトの読み込みを確認
console.log('[SpeechBubbleRenderer] Script loaded with theme support');

// ★ デバッグ: window.electronAPIの存在を確認
console.log('[SpeechBubbleRenderer] window.electronAPI exists:', !!window.electronAPI);
if (window.electronAPI) {
    console.log('[SpeechBubbleRenderer] Available APIs:', Object.keys(window.electronAPI));
}

const bubbleContent = document.getElementById('bubble-content') as HTMLDivElement | null;
const speechTail = document.querySelector('.speech-tail') as HTMLElement | null;
const speechTailBorder = document.querySelector('.speech-tail-border') as HTMLElement | null;
console.log('[SpeechBubbleRenderer] bubble-content element found:', !!bubbleContent);
console.log('[SpeechBubbleRenderer] speech-tail elements found:', !!speechTail, !!speechTailBorder);

let hideTimeout: number | null = null; // setTimeoutの戻り値の型はnumber
let typewriterTimeout: number | null = null; // タイプライターエフェクト用のタイマー
let typewriterInterval: number | null = null; // タイプライターエフェクト用のインターバル

// ✨ テーマ管理の初期化
function initializeTheme() {
    console.log('[SpeechBubbleRenderer] Initializing theme system');
    
    // 現在のテーマを適用
    const currentTheme = themeManager.getCurrentTheme();
    applyThemeToSpeechBubble(currentTheme);
    
    // テーマ変更リスナーを追加
    themeManager.addThemeChangeListener((newTheme: string) => {
        console.log('[SpeechBubbleRenderer] Theme changed to:', newTheme);
        applyThemeToSpeechBubble(newTheme);
    });

    // IPCからのテーマ変更通知を受信
    if (window.electronAPI && window.electronAPI.onThemeChanged) {
        window.electronAPI.onThemeChanged((theme: string) => {
            console.log('[SpeechBubbleRenderer] Theme change received via IPC:', theme);
            themeManager.setTheme(theme);
        });
    }
}

// ✨ SpeechBubbleにテーマを適用
function applyThemeToSpeechBubble(themeId: string) {
    const root = document.documentElement;
    
    // 既存のテーマ属性をクリア
    root.removeAttribute('data-theme');
    
    // 新しいテーマを適用
    if (themeId !== 'default') {
        root.setAttribute('data-theme', themeId);
    }
    
    console.log('[SpeechBubbleRenderer] Theme applied:', themeId);
}

// DOMContentLoaded時にテーマを初期化
document.addEventListener('DOMContentLoaded', initializeTheme);

// ✨ 簡易Markdownレンダリング機能
function renderMarkdown(text: string): string {
    if (!text) return '';
    
    const html = text
        // エスケープHTMLタグ
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        
        // コードブロック（```で囲まれた部分）
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        
        // インラインコード（`で囲まれた部分）
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        
        // 太字（**で囲まれた部分）
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        
        // 斜体（*で囲まれた部分、ただし**は除外）
        .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
        
        // リンク（[text](url)形式）
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        
        // 見出し（# ## ###）
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        
        // 改行をbrタグに変換
        .replace(/\n/g, '<br>');
    
    return html;
}

// ✨ 現在のタイプライター処理をキャンセル
function cancelTypewriter() {
    if (typewriterTimeout) {
        clearTimeout(typewriterTimeout);
        typewriterTimeout = null;
    }
    if (typewriterInterval) {
        clearInterval(typewriterInterval);
        typewriterInterval = null;
    }
}

// ✨ タイプライターエフェクトでテキストを表示（スクロール追従付き）
function displayTextWithTypewriter(text: string, enableMarkdown = true, onComplete?: () => void) {
    if (!bubbleContent) return;
    
    // 既存のタイプライター処理をキャンセル
    cancelTypewriter();
    
    if (!text || text.trim() === '') {
        bubbleContent.innerHTML = '';
        if (onComplete) onComplete();
        return;
    }
    
    // マークダウンが有効な場合は事前にレンダリング
    const finalText = enableMarkdown ? renderMarkdown(text) : text;
    
    // タイプライターエフェクトの実装
    let currentIndex = 0;
    bubbleContent.innerHTML = '';
    
    const typeNextCharacter = () => {
        if (currentIndex < finalText.length) {
            // HTMLタグを考慮した文字追加
            if (enableMarkdown && finalText[currentIndex] === '<') {
                // HTMLタグの場合は丸ごと追加
                const tagEnd = finalText.indexOf('>', currentIndex);
                if (tagEnd !== -1) {
                    const tag = finalText.substring(currentIndex, tagEnd + 1);
                    bubbleContent.innerHTML += tag;
                    currentIndex = tagEnd + 1;
                } else {
                    bubbleContent.innerHTML += finalText[currentIndex];
                    currentIndex++;
                }
            } else {
                bubbleContent.innerHTML += finalText[currentIndex];
                currentIndex++;
            }
            
            // 文字追加後にスクロールを追従（スクロールが必要な場合）
            autoScrollDuringTypewriter();
            
            typewriterTimeout = window.setTimeout(typeNextCharacter, TYPEWRITER_SPEED_MS);
        } else {
            // タイプライター完了
            if (onComplete) onComplete();
        }
    };
    
    // タイプライター開始
    typeNextCharacter();
}

// ✨ タイプライター中のリアルタイムスクロール追従
function autoScrollDuringTypewriter() {
    if (!bubbleContent) return;
    
    // スクロールが発生している場合のみ自動スクロール
    const hasVerticalScroll = bubbleContent.scrollHeight > bubbleContent.clientHeight;
    
    if (hasVerticalScroll) {
        // スムーズに最下部にスクロール
        bubbleContent.scrollTop = bubbleContent.scrollHeight;
    }
}

// ✨ テキストを安全にHTMLとして設定する関数（即座に表示）
function setSpeechBubbleContent(text: string, enableMarkdown = true) {
    if (!bubbleContent) return;
    
    if (enableMarkdown) {
        const renderedHtml = renderMarkdown(text);
        bubbleContent.innerHTML = renderedHtml;
    } else {
        bubbleContent.textContent = text;
    }
}

// 表示時間計算用の定数 (ご主人様のお好みで調整してくださいね♡)
const MIN_DISPLAY_TIME_MS = 4000;    // 最低表示時間 (ミリ秒)
const MAX_DISPLAY_TIME_MS = 20000;   // 最大表示時間 (ミリ秒)
const CHARS_PER_SECOND_READING_SPEED = 6; // 1秒あたりに読める文字数

// タイプライターエフェクト用の定数
const TYPEWRITER_SPEED_MS = 50;      // 1文字あたりの表示間隔 (ミリ秒)

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

// IPC リスナーは DOMContentLoaded で設定するため、ここでは設定しない
// 重複を避けるため、この部分を削除

// ✨ 完全なテキストを隠し要素でレンダリングしてサイズ計算
function calculateSizeFromFullText(text: string, enableMarkdown = true): { width: number; height: number } {
    if (!bubbleContent) return { width: 250, height: 100 };
    
    // 隠し要素を作成してサイズ測定（完全にbubbleContentを複製）
    const hiddenElement = document.createElement('div');
    hiddenElement.id = 'hidden-bubble-content'; // 固有IDを設定
    
    // 位置とvisibilityの設定
    hiddenElement.style.position = 'absolute';
    hiddenElement.style.visibility = 'hidden';
    hiddenElement.style.pointerEvents = 'none';
    hiddenElement.style.left = '-9999px';
    hiddenElement.style.top = '-9999px';
    hiddenElement.style.zIndex = '-1000';
    
    // bubbleContentの全てのスタイルを完全にコピー
    const computedStyle = getComputedStyle(bubbleContent);
    const stylesToCopy = [
        'backgroundColor', 'color', 'padding', 'border', 'borderRadius',
        'maxWidth', 'minWidth', 'maxHeight', 'minHeight', 'width', 'height',
        'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
        'whiteSpace', 'wordWrap', 'overflowWrap', 'textAlign', 'textIndent',
        'borderLeft', 'borderRight', 'borderTop', 'borderBottom',
        'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
        'marginLeft', 'marginRight', 'marginTop', 'marginBottom',
        'boxSizing', 'display', 'overflow', 'overflowX', 'overflowY'
    ];
    
    stylesToCopy.forEach(prop => {
        hiddenElement.style[prop] = computedStyle[prop];
    });
    
    // CSS値の取得（Numberとして）
    const cssMaxWidth = parseFloat(computedStyle.maxWidth) || 500;
    const cssMinWidth = parseFloat(computedStyle.minWidth) || 250;
    const cssMaxHeight = parseFloat(computedStyle.maxHeight) || 400;
    
    // CSSの制約を強制適用
    hiddenElement.style.maxWidth = cssMaxWidth + 'px';
    hiddenElement.style.minWidth = cssMinWidth + 'px';
    hiddenElement.style.maxHeight = cssMaxHeight + 'px';
    
    // widthを未設定にして自然なサイズ測定を可能に
    hiddenElement.style.width = 'auto';
    hiddenElement.style.height = 'auto';
    
    // 完全なテキストを設定
    if (enableMarkdown) {
        hiddenElement.innerHTML = renderMarkdown(text);
    } else {
        hiddenElement.textContent = text;
    }
    
    // DOMに追加してサイズを測定
    document.body.appendChild(hiddenElement);
    
    // スタイルの再計算を強制
    hiddenElement.offsetHeight; // リフローを強制
    
    const contentWidth = hiddenElement.offsetWidth;
    const contentHeight = hiddenElement.offsetHeight;
    const scrollWidth = hiddenElement.scrollWidth;
    const scrollHeight = hiddenElement.scrollHeight;
    
    // 測定完了後に削除
    document.body.removeChild(hiddenElement);
    
    // より大きい方を採用（スクロールサイズも考慮）
    let finalWidth = Math.max(contentWidth, scrollWidth);
    let finalHeight = Math.max(contentHeight, scrollHeight);
    
    // CSS制約の適用
    finalWidth = Math.min(Math.max(finalWidth, cssMinWidth), cssMaxWidth);
    finalHeight = Math.min(finalHeight, cssMaxHeight);
    
    // 最小値保証
    finalWidth = Math.max(finalWidth, 60);
    finalHeight = Math.max(finalHeight, 40);
    
    if (window.electronAPI && window.electronAPI.logRendererMessage) {
        window.electronAPI.logRendererMessage(`Full text size calculated: contentW=${contentWidth}, contentH=${contentHeight}, scrollW=${scrollWidth}, scrollH=${scrollHeight}, finalW=${finalWidth}, finalH=${finalHeight}`);
    }
    
    return { width: Math.ceil(finalWidth), height: Math.ceil(finalHeight) };
}

// ✨ 文字数に応じた動的サイズ調整とスクロール対応
function calculateAndNotifySize(text: string, enableMarkdown = true) {
    if (!bubbleContent) return;
    
    if (window.electronAPI && window.electronAPI.logRendererMessage) {
        window.electronAPI.logRendererMessage('Calculating dynamic size based on text content.');
    }

    // サイズ制約
    const MAX_CONTENT_WIDTH = 500;
    const MAX_CONTENT_HEIGHT = 200;
    const MIN_CONTENT_WIDTH = 250;
    const MIN_CONTENT_HEIGHT = 80;
    const PADDING_HORIZONTAL = 20 * 2;
    const PADDING_VERTICAL = 16 * 2;
    const BORDER_SIZE = 2 * 2;
    const SHADOW_HORIZONTAL = 24;
    const SHADOW_VERTICAL = 32;
    const TAIL_HEIGHT = 12;
    
    // 一時的にテキストを設定して自然なサイズを測定
    const originalContent = bubbleContent.innerHTML;
    const originalVisibility = bubbleContent.style.visibility;
    
    // 測定用に一時設定
    bubbleContent.style.visibility = 'hidden';
    bubbleContent.style.width = 'auto';
    bubbleContent.style.height = 'auto';
    bubbleContent.style.maxWidth = MAX_CONTENT_WIDTH + 'px';
    bubbleContent.style.maxHeight = 'none'; // 高さ制限を一時解除
    bubbleContent.style.minWidth = MIN_CONTENT_WIDTH + 'px';
    bubbleContent.style.minHeight = MIN_CONTENT_HEIGHT + 'px';
    
    if (enableMarkdown) {
        bubbleContent.innerHTML = renderMarkdown(text);
    } else {
        bubbleContent.textContent = text;
    }
    
    // リフロー強制
    bubbleContent.offsetHeight;
    
    // 自然なサイズを取得
    const naturalWidth = bubbleContent.offsetWidth;
    const naturalHeight = bubbleContent.offsetHeight;
    
    // 実際に使用するコンテンツサイズ（制約内で）
    const actualContentWidth = Math.min(naturalWidth, MAX_CONTENT_WIDTH);
    const actualContentHeight = Math.min(naturalHeight, MAX_CONTENT_HEIGHT);
    
    // スクロールが必要かチェック
    const needsVerticalScroll = naturalHeight > MAX_CONTENT_HEIGHT;
    const needsHorizontalScroll = naturalWidth > MAX_CONTENT_WIDTH;
    
    // 最終的なコンテンツサイズを設定
    bubbleContent.style.width = actualContentWidth + 'px';
    bubbleContent.style.height = actualContentHeight + 'px';
    bubbleContent.style.maxWidth = MAX_CONTENT_WIDTH + 'px';
    bubbleContent.style.maxHeight = MAX_CONTENT_HEIGHT + 'px';
    bubbleContent.style.overflowY = needsVerticalScroll ? 'auto' : 'hidden';
    bubbleContent.style.overflowX = needsHorizontalScroll ? 'auto' : 'hidden';
    bubbleContent.style.boxSizing = 'border-box';
    
    // 元の内容に戻す
    bubbleContent.innerHTML = '';
    bubbleContent.style.visibility = originalVisibility;
    
    // box-sizing: border-boxの場合、padding/borderは含まれるため、ウィンドウサイズ計算を調整
    // bubbleContentのサイズは既にpadding/borderを含んでいる
    const windowWidth = actualContentWidth + SHADOW_HORIZONTAL; // padding/borderは既に含まれている
    const windowHeight = actualContentHeight + SHADOW_VERTICAL + TAIL_HEIGHT;
    
    // 詳細デバッグログ
    if (window.electronAPI && window.electronAPI.logRendererMessage) {
        window.electronAPI.logRendererMessage(`Dynamic sizing: natural(${naturalWidth}x${naturalHeight}) -> actual(${actualContentWidth}x${actualContentHeight}) -> window(${windowWidth}x${windowHeight}), scrollY=${needsVerticalScroll}, scrollX=${needsHorizontalScroll}`);
        window.electronAPI.logRendererMessage(`Size breakdown: contentWithPaddingBorder(${actualContentWidth}x${actualContentHeight}) + shadow(${SHADOW_HORIZONTAL}x${SHADOW_VERTICAL}) + tail(${TAIL_HEIGHT}) = window(${windowWidth}x${windowHeight})`);
        
        // 実際のコンテンツサイズも確認
        setTimeout(() => {
            if (bubbleContent) {
                const actualRect = bubbleContent.getBoundingClientRect();
                window.electronAPI.logRendererMessage(`Actual rendered: bubbleContent(${actualRect.width}x${actualRect.height}), offset(${bubbleContent.offsetWidth}x${bubbleContent.offsetHeight}), client(${bubbleContent.clientWidth}x${bubbleContent.clientHeight})`);
            }
        }, 100);
    }
    
    // ウィンドウサイズを通知
    const size = { width: windowWidth, height: windowHeight };
    
    console.log('[SpeechBubbleRenderer] Calculated size to notify:', size);
    console.log('[SpeechBubbleRenderer] Content size breakdown:', {
        actualContentWidth,
        actualContentHeight,
        shadowHorizontal: SHADOW_HORIZONTAL,
        shadowVertical: SHADOW_VERTICAL,
        tailHeight: TAIL_HEIGHT
    });

    if (window.electronAPI && window.electronAPI.notifyBubbleSize) {
        console.log('[SpeechBubbleRenderer] Calling notifyBubbleSize...');
        window.electronAPI.notifyBubbleSize(size);
        
        // サイズ設定後にしっぽの位置を更新
        setTimeout(() => {
            updateTailPosition();
        }, 50);
    }
}

// ✨ しっぽの位置を正しく調整
function updateTailPosition() {
    if (!bubbleContent || !speechTail || !speechTailBorder) return;
    
    // bubbleContentの位置とサイズを取得
    const rect = bubbleContent.getBoundingClientRect();
    const bodyRect = document.body.getBoundingClientRect();
    
    // bubbleContentの下端中央に配置
    const tailX = rect.left + (rect.width / 2) - bodyRect.left - 12; // 12px = triangle half width
    const tailY = rect.bottom - bodyRect.top; // 吹き出しの底辺に接地
    const tailBorderY = tailY + 2; // 境界線は少し下に
    
    // しっぽメイン
    speechTail.style.left = tailX + 'px';
    speechTail.style.top = tailY + 'px';
    
    // しっぽ境界線
    speechTailBorder.style.left = (tailX - 2) + 'px'; // 2px wider
    speechTailBorder.style.top = tailBorderY + 'px';
    
    if (window.electronAPI && window.electronAPI.logRendererMessage) {
        window.electronAPI.logRendererMessage(`Tail positioned: x=${tailX}, y=${tailY}, bubbleRect(${rect.left},${rect.top},${rect.width},${rect.height})`);
    }
}

// ✨ スクロールが必要な場合の自動下スクロール
function scrollToBottomIfNeeded() {
    if (!bubbleContent) return;
    
    // スクロールが発生しているかチェック
    const hasVerticalScroll = bubbleContent.scrollHeight > bubbleContent.clientHeight;
    const hasHorizontalScroll = bubbleContent.scrollWidth > bubbleContent.clientWidth;
    
    if (hasVerticalScroll) {
        // スムーズに下にスクロール
        bubbleContent.scrollTo({
            top: bubbleContent.scrollHeight,
            behavior: 'smooth'
        });
        
        if (window.electronAPI && window.electronAPI.logRendererMessage) {
            window.electronAPI.logRendererMessage(`Auto-scrolled to bottom: scrollHeight=${bubbleContent.scrollHeight}, clientHeight=${bubbleContent.clientHeight}`);
        }
    }
    
    if (hasHorizontalScroll) {
        // 横スクロールは左端に戻す
        bubbleContent.scrollTo({
            left: 0,
            behavior: 'smooth'
        });
        
        if (window.electronAPI && window.electronAPI.logRendererMessage) {
            window.electronAPI.logRendererMessage(`Reset horizontal scroll to left`);
        }
    }
}

// ✨ 表示時間のスケジュール設定を分離
function scheduleHideTimeout(text: string) {
    // 表示時間を計算
    let calculatedDisplayTimeMs = (text.length / CHARS_PER_SECOND_READING_SPEED) * 1000;
    calculatedDisplayTimeMs = Math.max(MIN_DISPLAY_TIME_MS, calculatedDisplayTimeMs);
    calculatedDisplayTimeMs = Math.min(MAX_DISPLAY_TIME_MS, calculatedDisplayTimeMs);

    if (window.electronAPI && window.electronAPI.logRendererMessage) {
        window.electronAPI.logRendererMessage(`Timer set for ${calculatedDisplayTimeMs / 1000}s.`);
    }

    hideTimeout = window.setTimeout(() => {
        if (window.electronAPI && window.electronAPI.logRendererMessage) {
            window.electronAPI.logRendererMessage('Timer expired. Clearing text and requesting hide.');
        }
        if (bubbleContent) setSpeechBubbleContent('', false);
        if (window.electronAPI && window.electronAPI.hideSpeechBubble) {
            window.electronAPI.hideSpeechBubble();
        }
        hideTimeout = null;
    }, calculatedDisplayTimeMs);
}

// ★ デバッグ: DOMContentLoadedイベントでも確認
document.addEventListener('DOMContentLoaded', () => {
    console.log('[SpeechBubbleRenderer] DOMContentLoaded fired');
    console.log('[SpeechBubbleRenderer] window.electronAPI exists (after DOM):', !!window.electronAPI);
    
    // IPCリスナーの設定 - DOMContentLoadedで一度だけ設定
    if (window.electronAPI && window.electronAPI.onSetSpeechBubbleText) {
        console.log('[SpeechBubbleRenderer] Setting up IPC listener for set-speech-bubble-text');
        window.electronAPI.onSetSpeechBubbleText((text: string) => {
            console.log('[SpeechBubbleRenderer] Received text via IPC:', text ? text.substring(0, 50) + '...' : 'null or empty');
            
            if (window.electronAPI && window.electronAPI.logRendererMessage) {
                window.electronAPI.logRendererMessage(`onSetSpeechBubbleText called with text: "${text ? text.substring(0, 30) + '...' : 'null or empty'}"`);
            }

            if (bubbleContent) {
                // 既存のタイマーとタイプライター処理があればクリア
                if (hideTimeout) {
                    clearTimeout(hideTimeout);
                    hideTimeout = null;
                }
                cancelTypewriter();

                if (text && text.trim() !== "") {
                    console.log('[SpeechBubbleRenderer] Processing text:', {
                        length: text.length,
                        lines: text.split('\n').length,
                        preview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
                    });
                    
                    // 即座にサイズを計算してウィンドウを表示（完全なテキストから計算）
                    calculateAndNotifySize(text, true);
                    
                    // タイプライターエフェクトでテキストを表示
                    displayTextWithTypewriter(text, true, () => {
                        // タイプライター完了後の処理
                        if (window.electronAPI && window.electronAPI.logRendererMessage) {
                            window.electronAPI.logRendererMessage('Typewriter effect completed. Checking for auto-scroll and setting hide timeout.');
                        }
                        
                        if (bubbleContent) {
                            // スクロールが必要な場合は自動で下にスクロール
                            scrollToBottomIfNeeded();
                            
                            // しっぽの位置を最終調整
                            updateTailPosition();
                            
                            scheduleHideTimeout(text);
                        }
                    });
                } else { // テキストが空またはトリムして空の場合
                    if (window.electronAPI && window.electronAPI.logRendererMessage) {
                        window.electronAPI.logRendererMessage('Text is empty or whitespace. Clearing text and requesting hide.');
                    }
                    if (bubbleContent) setSpeechBubbleContent('', false);
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
    } else {
        console.error('[SpeechBubbleRenderer] window.electronAPI.onSetSpeechBubbleText is not available');
        if (window.electronAPI && window.electronAPI.logRendererMessage) {
            window.electronAPI.logRendererMessage('Error: electronAPI or onSetSpeechBubbleText is not available in speechBubbleRenderer.ts.');
        }
        if (bubbleContent) setSpeechBubbleContent("API接続エラーです…", false);
    }
    
    // テーマシステムの初期化
    initializeTheme();
});