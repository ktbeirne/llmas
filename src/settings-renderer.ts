import type { ElectronAPI } from './preload.types';
import { VRMExpressionInfo, ExpressionSettings } from './types/tools';
import { ThemeInfo } from './types/ipc';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

interface WindowSizeSettings {
    width: number;
    height: number;
    preset: string;
}

class SettingsRenderer {
    // 既存のプロパティ
    private presetSelect!: HTMLSelectElement;
    private customWidthInput!: HTMLInputElement;
    private customHeightInput!: HTMLInputElement;
    private customSizeInputs!: HTMLElement;
    private currentVrmPath!: HTMLInputElement;
    private applyButton!: HTMLButtonElement;
    private resetButton!: HTMLButtonElement;
    private closeButton!: HTMLButtonElement;
    private selectVrmButton!: HTMLButtonElement;
    
    // タブ専用ボタン
    private applyDisplayButton!: HTMLButtonElement;
    private resetDisplayButton!: HTMLButtonElement;
    private applyChatButton!: HTMLButtonElement;
    private resetChatButton!: HTMLButtonElement;
    private applyExpressionButton!: HTMLButtonElement;
    private resetExpressionButton!: HTMLButtonElement;

    // 新しいプロパティ
    private tabButtons!: NodeListOf<HTMLButtonElement>;
    private tabPanes!: NodeListOf<HTMLElement>;
    private activeTab = 'display';
    private userNameInput!: HTMLInputElement;
    private mascotNameInput!: HTMLInputElement;
    private systemPromptCoreTextarea!: HTMLTextAreaElement;
    private promptCharacterCount!: HTMLElement;
    private performanceWarning!: HTMLElement;
    private resetSystemPromptButton!: HTMLButtonElement;
    private clearChatHistoryButton!: HTMLButtonElement;
    private themeGrid!: HTMLElement;
    private selectedTheme = 'default';
    private availableThemes: ThemeInfo[] = [];
    
    // 表情設定関連のプロパティ
    private expressionSettings: ExpressionSettings = {};
    private availableExpressions: VRMExpressionInfo[] = [];
    private expressionList!: HTMLElement;
    private expressionLoading!: HTMLElement;
    private expressionError!: HTMLElement;
    private previewExpressionSelect!: HTMLSelectElement;
    private previewIntensity!: HTMLInputElement;
    private previewIntensityValue!: HTMLElement;
    private previewExpressionBtn!: HTMLButtonElement;
    private resetExpressionBtn!: HTMLButtonElement;
    private saveExpressionsBtn!: HTMLButtonElement;
    private resetExpressionsBtn!: HTMLButtonElement;
    private isExpressionsInitialized = false;

    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.loadCurrentSettings();
    }

    private initializeElements(): void {
        console.log('[DEBUG] initializeElements開始');
        // 既存の要素
        this.presetSelect = document.getElementById('window-size-preset') as HTMLSelectElement;
        this.customWidthInput = document.getElementById('custom-width') as HTMLInputElement;
        this.customHeightInput = document.getElementById('custom-height') as HTMLInputElement;
        this.customSizeInputs = document.getElementById('custom-size-inputs') as HTMLElement;
        this.currentVrmPath = document.getElementById('current-vrm-path') as HTMLInputElement;
        this.applyButton = document.getElementById('apply-settings') as HTMLButtonElement; // 削除済み - nullになる
        this.resetButton = document.getElementById('reset-settings') as HTMLButtonElement; // 削除済み - nullになる
        this.closeButton = document.getElementById('close-settings') as HTMLButtonElement;
        this.selectVrmButton = document.getElementById('select-vrm-model') as HTMLButtonElement;

        // 新しい要素
        this.tabButtons = document.querySelectorAll('.tab-button') as NodeListOf<HTMLButtonElement>;
        this.tabPanes = document.querySelectorAll('.tab-pane') as NodeListOf<HTMLElement>;
        this.userNameInput = document.getElementById('user-name') as HTMLInputElement;
        this.mascotNameInput = document.getElementById('mascot-name') as HTMLInputElement;
        this.systemPromptCoreTextarea = document.getElementById('system-prompt-core') as HTMLTextAreaElement;
        this.promptCharacterCount = document.getElementById('prompt-character-count') as HTMLElement;
        this.performanceWarning = document.getElementById('performance-warning') as HTMLElement;
        this.resetSystemPromptButton = document.getElementById('reset-system-prompt') as HTMLButtonElement;
        this.clearChatHistoryButton = document.getElementById('clear-chat-history') as HTMLButtonElement;
        this.themeGrid = document.getElementById('theme-grid') as HTMLElement;
        
        console.log('[DEBUG] タブボタン数:', this.tabButtons.length);
        console.log('[DEBUG] タブペイン数:', this.tabPanes.length);
        
        // 各タブボタンの詳細情報をログ出力
        this.tabButtons.forEach((button, index) => {
            console.log(`[DEBUG] タブボタン${index}:`, {
                dataset: button.dataset.tab,
                classList: Array.from(button.classList),
                style: {
                    pointerEvents: getComputedStyle(button).pointerEvents,
                    zIndex: getComputedStyle(button).zIndex,
                    webkitAppRegion: getComputedStyle(button).webkitAppRegion
                }
            });
        });
        
        // 表情設定関連の要素
        this.expressionList = document.getElementById('expression-list') as HTMLElement;
        this.expressionLoading = document.getElementById('expression-loading') as HTMLElement;
        this.expressionError = document.getElementById('expression-error') as HTMLElement;
        this.previewExpressionSelect = document.getElementById('preview-expression-select') as HTMLSelectElement;
        this.previewIntensity = document.getElementById('preview-intensity') as HTMLInputElement;
        this.previewIntensityValue = document.getElementById('preview-intensity-value') as HTMLElement;
        this.previewExpressionBtn = document.getElementById('preview-expression-btn') as HTMLButtonElement;
        this.resetExpressionBtn = document.getElementById('reset-expression-btn') as HTMLButtonElement;
        this.saveExpressionsBtn = document.getElementById('save-expressions') as HTMLButtonElement;
        this.resetExpressionsBtn = document.getElementById('reset-expressions') as HTMLButtonElement; // 削除済み
        
        // タブ専用ボタンの初期化
        this.applyDisplayButton = document.getElementById('apply-display-settings') as HTMLButtonElement;
        this.resetDisplayButton = document.getElementById('reset-display-settings') as HTMLButtonElement;
        this.applyChatButton = document.getElementById('apply-chat-settings') as HTMLButtonElement;
        this.resetChatButton = document.getElementById('reset-chat-settings') as HTMLButtonElement;
        this.applyExpressionButton = document.getElementById('apply-expression-settings') as HTMLButtonElement;
        this.resetExpressionButton = document.getElementById('reset-expression-settings') as HTMLButtonElement;
        
        // ボタンの存在確認ログ
        console.log('[DEBUG] ボタン初期化結果:');
        console.log('[DEBUG] applyDisplayButton:', this.applyDisplayButton ? '存在' : 'null');
        console.log('[DEBUG] resetDisplayButton:', this.resetDisplayButton ? '存在' : 'null');
        console.log('[DEBUG] applyChatButton:', this.applyChatButton ? '存在' : 'null');
        console.log('[DEBUG] resetChatButton:', this.resetChatButton ? '存在' : 'null');
        console.log('[DEBUG] applyExpressionButton:', this.applyExpressionButton ? '存在' : 'null');
        console.log('[DEBUG] resetExpressionButton:', this.resetExpressionButton ? '存在' : 'null');
    }

    private setupEventListeners(): void {
        // 折りたたみ機能の設定
        this.setupCollapsibleTheme();
        
        // プリセット選択の変更
        this.presetSelect.addEventListener('change', () => {
            this.handlePresetChange();
        });

        // カスタムサイズ入力の変更
        this.customWidthInput.addEventListener('input', () => {
            this.presetSelect.value = 'custom';
            this.toggleCustomInputs(true);
        });

        this.customHeightInput.addEventListener('input', () => {
            this.presetSelect.value = 'custom';
            this.toggleCustomInputs(true);
        });

        // ボタンイベント
        if (this.applyButton) {
            this.applyButton.addEventListener('click', () => {
                this.applySettings();
        });
        } else {
            console.log('[DEBUG] applyButtonは削除済み（各タブに移動）');
        }

        if (this.resetButton) {
            this.resetButton.addEventListener('click', () => {
                this.resetSettings();
        });
        } else {
            console.log('[DEBUG] resetButtonは削除済み（各タブに移動）');
        }

        this.closeButton.addEventListener('click', () => {
            this.closeSettings();
        });

        this.selectVrmButton.addEventListener('click', () => {
            this.selectVrmModel();
        });

        // タブ切り替え
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                if (tabName) {
                    this.switchTab(tabName);
                }
            });
        });

        // システムプロンプト関連
        this.systemPromptCoreTextarea.addEventListener('input', () => {
            this.updateCharacterCount();
        });

        this.resetSystemPromptButton.addEventListener('click', () => {
            this.resetSystemPrompt();
        });

        this.clearChatHistoryButton.addEventListener('click', () => {
            this.clearChatHistory();
        });

        // 表情設定関連のイベントリスナー
        this.setupExpressionEventListeners();
        
        // タブ専用ボタンのイベントリスナー（グローバルクリックハンドラーのみ使用）
        this.setupGlobalClickHandler();

        // テーマ関連の初期化
        console.log('テーマ初期化をスケジュールします');
        
        // DOM読み込み後に確実に実行
        const initializeAfterDOM = () => {
            this.initializeThemes();
            this.setupStaticThemeCards();
            // 表情タブが選択されている場合のみ初期化
            if (this.activeTab === 'expressions') {
                this.initializeExpressions();
            }
        };
        
        // DOMContentLoadedまたは次のイベントループで実行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeAfterDOM);
        } else {
            // 既にDOMが準備されている場合は、requestIdleCallbackで実行
            if ('requestIdleCallback' in window) {
                requestIdleCallback(initializeAfterDOM);
            } else {
                // requestIdleCallbackがサポートされていない場合はPromiseで
                Promise.resolve().then(initializeAfterDOM);
            }
        }
    }

    private handlePresetChange(): void {
        const preset = this.presetSelect.value;
        
        switch (preset) {
            case 'small':
                this.customWidthInput.value = '300';
                this.customHeightInput.value = '600';
                this.toggleCustomInputs(false);
                break;
            case 'medium':
                this.customWidthInput.value = '400';
                this.customHeightInput.value = '800';
                this.toggleCustomInputs(false);
                break;
            case 'large':
                this.customWidthInput.value = '500';
                this.customHeightInput.value = '1000';
                this.toggleCustomInputs(false);
                break;
            case 'custom':
                this.toggleCustomInputs(true);
                break;
        }
    }

    private toggleCustomInputs(enabled: boolean): void {
        if (enabled) {
            this.customSizeInputs.classList.add('active');
        } else {
            this.customSizeInputs.classList.remove('active');
        }
    }

    private async loadCurrentSettings(): Promise<void> {
        if (window.electronAPI && window.electronAPI.getSettings) {
            try {
                const settings = await window.electronAPI.getSettings();
                
                // ウィンドウサイズ設定を反映
                if (settings.windowSize) {
                    this.customWidthInput.value = settings.windowSize.width.toString();
                    this.customHeightInput.value = settings.windowSize.height.toString();
                    this.presetSelect.value = settings.windowSize.preset || 'medium';
                    this.handlePresetChange();
                }
                
                // VRMモデルパスを反映
                if (settings.vrmModelPath) {
                    this.currentVrmPath.value = settings.vrmModelPath;
                }
                
                // ユーザー名・マスコット名・システムプロンプトを読み込み
                await this.loadChatSettings();
                
                // テーマ設定を読み込み
                await this.loadThemeSettings();
            } catch (error) {
                console.error('設定の読み込みに失敗しました:', error);
            }
        }
    }

    private async applySettings(): Promise<void> {
        const width = parseInt(this.customWidthInput.value);
        const height = parseInt(this.customHeightInput.value);
        const preset = this.presetSelect.value;

        // バリデーション
        if (width < 200 || width > 1000) {
            alert('幅は200〜1000の範囲で入力してください。');
            return;
        }

        if (height < 300 || height > 1200) {
            alert('高さは300〜1200の範囲で入力してください。');
            return;
        }

        const windowSizeSettings: WindowSizeSettings = {
            width,
            height,
            preset
        };

        const vrmModelPath = this.currentVrmPath.value;

        if (window.electronAPI && window.electronAPI.saveSettings) {
            try {
                await window.electronAPI.saveSettings({
                    windowSize: windowSizeSettings,
                    vrmModelPath
                });
                
                // テーマ設定を最初に保存（最も重要）
                await this.saveThemeSettings();
                
                // 画面表示設定のみを保存（チャット設定は保存しない）
                
                // 設定適用成功のフィードバック
                this.showSuccessMessage('画面表示設定が保存されました');
            } catch (error) {
                console.error('画面表示設定の保存に失敗しました:', error);
                alert('画面表示設定の保存に失敗しました。');
            }
        }
    }

    private async resetSettings(): Promise<void> {
        const confirmReset = confirm('設定をデフォルトに戻しますか？');
        if (!confirmReset) return;

        if (window.electronAPI && window.electronAPI.resetSettings) {
            try {
                await window.electronAPI.resetSettings();
                await this.loadCurrentSettings();
                this.showSuccessMessage('設定がリセットされました');
            } catch (error) {
                console.error('設定のリセットに失敗しました:', error);
                alert('設定のリセットに失敗しました。');
            }
        }
    }

    private closeSettings(): void {
        if (window.electronAPI && window.electronAPI.closeSettings) {
            window.electronAPI.closeSettings();
        }
    }

    private async selectVrmModel(): Promise<void> {
        if (window.electronAPI && window.electronAPI.selectVrmFile) {
            try {
                const filePath = await window.electronAPI.selectVrmFile();
                if (filePath) {
                    this.currentVrmPath.value = filePath;
                }
            } catch (error) {
                console.error('VRMファイルの選択に失敗しました:', error);
                alert('VRMファイルの選択に失敗しました。');
            }
        }
    }

    private showSuccessMessage(message: string): void {
        // 簡易的な成功メッセージ表示（汎用ボタン用）
        // 現在アクティブなタブの適用ボタンにメッセージを表示
        let targetButton: HTMLButtonElement | null = null;
        
        if (this.activeTab === 'display' && this.applyDisplayButton) {
            targetButton = this.applyDisplayButton;
        } else if (this.activeTab === 'chat' && this.applyChatButton) {
            targetButton = this.applyChatButton;
        } else if (this.activeTab === 'expressions' && this.applyExpressionButton) {
            targetButton = this.applyExpressionButton;
        }
        
        if (targetButton) {
            const originalText = targetButton.textContent;
            targetButton.textContent = message;
            targetButton.style.backgroundColor = '#28a745';
            
            setTimeout(() => {
                if (targetButton) {
                    targetButton.textContent = originalText;
                    targetButton.style.backgroundColor = '';
                }
            }, 2000);
        } else {
            // フォールバック：アラートで表示
            alert(message);
        }
    }

    // 新しいメソッド
    private switchTab(tabName: string): void {
        this.activeTab = tabName;

        // すべてのタブボタンとペインから active クラスを削除
        this.tabButtons.forEach(button => button.classList.remove('active'));
        this.tabPanes.forEach(pane => pane.classList.remove('active'));

        // 指定されたタブをアクティブにする
        const activeButton = document.querySelector(`[data-tab="${tabName}"]`) as HTMLButtonElement;
        const activePane = document.getElementById(`${tabName}-tab`) as HTMLElement;

        if (activeButton && activePane) {
            activeButton.classList.add('active');
            activePane.classList.add('active');
        }

        // 表情タブに切り替えた場合、初期化を実行
        if (tabName === 'expressions' && !this.isExpressionsInitialized) {
            console.log('表情タブに切り替えました。初期化を開始します。');
            this.initializeExpressions();
        }
    }

    private async loadChatSettings(): Promise<void> {
        try {
            // ユーザー名・マスコット名・システムプロンプトを読み込み
            if (window.electronAPI && window.electronAPI.getUserName) {
                const userName = await window.electronAPI.getUserName();
                this.userNameInput.value = userName || 'User';
            }

            if (window.electronAPI && window.electronAPI.getMascotName) {
                const mascotName = await window.electronAPI.getMascotName();
                this.mascotNameInput.value = mascotName || 'Mascot';
            }

            if (window.electronAPI && window.electronAPI.getSystemPromptCore) {
                const promptCore = await window.electronAPI.getSystemPromptCore();
                this.systemPromptCoreTextarea.value = promptCore || '';
                this.updateCharacterCount();
            }
        } catch (error) {
            console.error('チャット設定の読み込みに失敗しました:', error);
        }
    }

    private async saveChatSettings(): Promise<void> {
        try {
            const userName = this.userNameInput.value.trim() || 'User';
            const mascotName = this.mascotNameInput.value.trim() || 'Mascot';
            const promptCore = this.systemPromptCoreTextarea.value.trim();

            console.log('[DEBUG] saveChatSettings - 保存する値:');
            console.log('[DEBUG] - userName:', userName);
            console.log('[DEBUG] - mascotName:', mascotName);
            console.log('[DEBUG] - promptCore length:', promptCore.length);

            if (window.electronAPI) {
                console.log('[DEBUG] electronAPI利用可能');
                
                if (window.electronAPI.setUserName) {
                    console.log('[DEBUG] setUserName実行中...');
                    const result1 = await window.electronAPI.setUserName(userName);
                    console.log('[DEBUG] setUserName結果:', result1);
                } else {
                    console.warn('[DEBUG] setUserNameメソッドが存在しません');
                }
                
                if (window.electronAPI.setMascotName) {
                    console.log('[DEBUG] setMascotName実行中...');
                    const result2 = await window.electronAPI.setMascotName(mascotName);
                    console.log('[DEBUG] setMascotName結果:', result2);
                } else {
                    console.warn('[DEBUG] setMascotNameメソッドが存在しません');
                }
                
                if (window.electronAPI.setSystemPromptCore) {
                    console.log('[DEBUG] setSystemPromptCore実行中...');
                    const result3 = await window.electronAPI.setSystemPromptCore(promptCore);
                    console.log('[DEBUG] setSystemPromptCore結果:', result3);
                } else {
                    console.warn('[DEBUG] setSystemPromptCoreメソッドが存在しません');
                }
                
                console.log('[DEBUG] saveChatSettings - 全ての保存操作完了');
            } else {
                console.error('[DEBUG] electronAPIが利用できません');
                throw new Error('electronAPIが利用できません');
            }
        } catch (error) {
            console.error('[DEBUG] saveChatSettings でエラー発生:', error);
            console.error('[DEBUG] エラーの詳細:', error instanceof Error ? error.stack : String(error));
            throw error;
        }
    }

    private updateCharacterCount(): void {
        const length = this.systemPromptCoreTextarea.value.length;
        this.promptCharacterCount.textContent = length.toString();
        
        // パフォーマンス警告の表示制御
        if (length > 10000) {
            this.performanceWarning.style.display = 'flex';
        } else {
            this.performanceWarning.style.display = 'none';
        }
    }

    private async resetSystemPrompt(): Promise<void> {
        const confirmReset = confirm('システムプロンプトをデフォルトに戻しますか？');
        if (!confirmReset) return;

        if (window.electronAPI && window.electronAPI.resetSystemPromptCore) {
            try {
                await window.electronAPI.resetSystemPromptCore();
                await this.loadChatSettings();
                this.showSuccessMessage('システムプロンプトがリセットされました');
            } catch (error) {
                console.error('システムプロンプトのリセットに失敗しました:', error);
                alert('システムプロンプトのリセットに失敗しました。');
            }
        }
    }

    private async clearChatHistory(): Promise<void> {
        const confirmClear = confirm('本当に会話履歴をすべて削除しますか？この操作は元に戻せません。');
        if (!confirmClear) return;

        if (window.electronAPI && window.electronAPI.clearChatHistory) {
            try {
                await window.electronAPI.clearChatHistory();
                this.showSuccessMessage('会話履歴がクリアされました');
            } catch (error) {
                console.error('会話履歴のクリアに失敗しました:', error);
                alert('会話履歴のクリアに失敗しました。');
            }
        }
    }

    // テーマ関連のメソッド
    private async initializeThemes(): Promise<void> {
        try {
            console.log('テーマ初期化を開始します...');
            console.log('electronAPI:', window.electronAPI);
            console.log('getAvailableThemes:', window.electronAPI?.getAvailableThemes);
            
            if (window.electronAPI && window.electronAPI.getAvailableThemes) {
                this.availableThemes = await window.electronAPI.getAvailableThemes();
                console.log('取得したテーマ:', this.availableThemes);
                this.renderThemeCards();
            } else {
                console.error('electronAPI または getAvailableThemes が利用できません');
                // フォールバック：基本テーマを直接定義
                this.availableThemes = [
                    {
                        id: 'default',
                        name: 'ソフト＆ドリーミー',
                        description: '明るく親しみやすい、やわらかな印象のテーマ',
                        preview: {
                            primary: '#5082C4',
                            secondary: '#8E7CC3',
                            accent: '#E91E63',
                            background: '#FDFBF7'
                        }
                    },
                    {
                        id: 'dark',
                        name: 'ダークモード',
                        description: '目に優しく洗練された暗めのテーマ',
                        preview: {
                            primary: '#60A5FA',
                            secondary: '#A78BFA',
                            accent: '#FCD34D',
                            background: '#0F172A'
                        }
                    },
                    {
                        id: 'sakura',
                        name: '桜',
                        description: '日本の春をイメージした温かみのあるテーマ',
                        preview: {
                            primary: '#D1477A',
                            secondary: '#C485C7',
                            accent: '#FF5722',
                            background: '#FDF2F8'
                        }
                    },
                    {
                        id: 'ocean',
                        name: 'オーシャン',
                        description: '海の静けさをイメージした爽やかなテーマ',
                        preview: {
                            primary: '#0077BE',
                            secondary: '#06AED5',
                            accent: '#FFC947',
                            background: '#F0FEFF'
                        }
                    },
                    {
                        id: 'forest',
                        name: 'フォレスト',
                        description: '森の静寂をイメージした、落ち着いた自然派テーマ',
                        preview: {
                            primary: '#6B7280',
                            secondary: '#8B7355',
                            accent: '#2D8659',
                            background: '#F9FAFB'
                        }
                    },
                    {
                        id: 'wonderland',
                        name: 'ワンダーランド',
                        description: '不思議の国のアリスの幻想世界をイメージした魔法的なテーマ',
                        preview: {
                            primary: '#7C3AED',
                            secondary: '#EC4899',
                            accent: '#10B981',
                            background: '#FAF5FF'
                        }
                    }
                ];
                console.log('フォールバックテーマを使用:', this.availableThemes);
                this.renderThemeCards();
            }
        } catch (error) {
            console.error('テーマの初期化に失敗しました:', error);
        }
    }

    private async loadThemeSettings(): Promise<void> {
        try {
            if (window.electronAPI && window.electronAPI.getTheme) {
                this.selectedTheme = await window.electronAPI.getTheme() || 'default';
                this.updateThemeSelection();
            }
        } catch (error) {
            console.error('テーマ設定の読み込みに失敗しました:', error);
        }
    }

    private renderThemeCards(): void {
        console.log('renderThemeCards を開始します');
        console.log('themeGrid:', this.themeGrid);
        console.log('availableThemes:', this.availableThemes);
        
        if (!this.themeGrid) {
            console.error('themeGrid 要素が見つかりません');
            return;
        }

        this.themeGrid.innerHTML = '';

        this.availableThemes.forEach((theme, themeIndex) => {
            console.log(`テーマ ${themeIndex} を処理中:`, theme);
            
            const themeCard = document.createElement('div');
            themeCard.className = 'theme-card';
            themeCard.dataset.themeId = theme.id;

            const themeHeader = document.createElement('div');
            themeHeader.className = 'theme-header';

            const themeTitle = document.createElement('h3');
            themeTitle.className = 'theme-title';
            themeTitle.textContent = theme.name;

            const themeDescription = document.createElement('p');
            themeDescription.className = 'theme-description';
            themeDescription.textContent = theme.description || '';

            const themePreview = document.createElement('div');
            themePreview.className = 'theme-preview';

            // preview がオブジェクトであることを確認
            const previewColors = theme.preview || {
                primary: '#5082C4',
                secondary: '#8E7CC3',
                accent: '#E91E63',
                background: '#FDFBF7'
            };
            
            Object.values(previewColors).forEach((color: string) => {
                const colorDiv = document.createElement('div');
                colorDiv.className = 'theme-color';
                colorDiv.style.backgroundColor = color;
                themePreview.appendChild(colorDiv);
            });

            const themeLabels = document.createElement('div');
            themeLabels.className = 'theme-labels';
            
            const labels = ['メイン', 'サブ', 'アクセント', '背景'];
            labels.forEach((label) => {
                const labelSpan = document.createElement('span');
                labelSpan.className = 'theme-label';
                labelSpan.textContent = label;
                themeLabels.appendChild(labelSpan);
            });

            themeHeader.appendChild(themeTitle);
            themeCard.appendChild(themeHeader);
            themeCard.appendChild(themeDescription);
            themeCard.appendChild(themePreview);
            themeCard.appendChild(themeLabels);

            // テーマ選択イベント
            themeCard.addEventListener('click', () => {
                console.log('テーマが選択されました:', theme.id);
                this.selectTheme(theme.id);
            });

            this.themeGrid.appendChild(themeCard);
            console.log(`テーマカード ${themeIndex} を追加しました`);
        });
        
        console.log('すべてのテーマカードを追加完了。Grid の内容:', this.themeGrid.innerHTML);

        this.updateThemeSelection();
    }

    private async selectTheme(themeId: string): Promise<void> {
        this.selectedTheme = themeId;
        this.updateThemeSelection();
        
        try {
            // ElectronAPIでテーマを保存し、メインウィンドウに通知
            if (window.electronAPI && window.electronAPI.setTheme) {
                const result = await window.electronAPI.setTheme(themeId);
                if (result.success) {
                    console.log(`テーマ ${themeId} を適用しました`);
                } else {
                    console.error('テーマの適用に失敗しました:', result.error);
                }
            }
            
            // 設定画面自体のプレビューも更新
            if (window.themeManager) {
                window.themeManager.setTheme(themeId);
            }
        } catch (error) {
            console.error('テーマ設定でエラーが発生しました:', error);
        }
    }

    private updateThemeSelection(): void {
        console.log('テーマ選択状態を更新します. 選択されたテーマ:', this.selectedTheme);
        
        // すべてのテーマカードから selected クラスを削除
        const themeCards = document.querySelectorAll('.theme-card');
        themeCards.forEach(card => {
            const cardElement = card as HTMLElement;
            cardElement.classList.remove('selected');
        });
        
        // 選択されたテーマに selected クラスを追加
        const selectedCard = document.querySelector(`[data-theme-id="${this.selectedTheme}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
            console.log(`テーマ ${this.selectedTheme} を選択状態にしました`);
        } else {
            console.log(`テーマ ${this.selectedTheme} のカードが見つかりません`);
        }
    }

    private async saveThemeSettings(): Promise<void> {
        try {
            // まず現在の設定画面のテーマを即座に変更
            if (window.themeManager) {
                window.themeManager.setTheme(this.selectedTheme);
            }
            
            if (window.electronAPI && window.electronAPI.setTheme) {
                const result = await window.electronAPI.setTheme(this.selectedTheme);
                
                if (result && result.success) {
                    console.log('テーマが正常に保存されました');
                } else {
                    console.error('テーマの保存に失敗しました:', result);
                }
            } else {
                console.error('electronAPI または setTheme が利用できません');
            }
        } catch (error) {
            console.error('テーマ設定の保存でエラーが発生しました:', error);
            throw error;
        }
    }

    // 静的テーマカードの設定
    private setupStaticThemeCards(): void {
        console.log('静的テーマカードのイベントリスナーを設定します');
        
        const themeCards = document.querySelectorAll('.theme-card');
        console.log('見つかったテーマカード:', themeCards.length);
        
        themeCards.forEach(card => {
            const themeId = (card as HTMLElement).dataset.themeId;
            if (themeId) {
                card.addEventListener('click', () => {
                    console.log('テーマが選択されました:', themeId);
                    this.selectTheme(themeId);
                });
                console.log(`テーマカード ${themeId} にイベントリスナーを追加しました`);
            }
        });
        
        // 現在のテーマを読み込んで選択状態を更新
        this.loadThemeSettings();
    }

    // 折りたたみ機能の設定
    private setupCollapsibleTheme(): void {
        const themeHeader = document.getElementById('theme-header');
        const themeContent = document.getElementById('theme-content');
        
        if (themeHeader && themeContent) {
            themeHeader.addEventListener('click', () => {
                this.toggleCollapse(themeHeader, themeContent);
            });
        }
    }

    private toggleCollapse(header: HTMLElement, content: HTMLElement): void {
        const isExpanded = content.classList.contains('expanded');
        
        if (isExpanded) {
            // 折りたたむ
            content.classList.remove('expanded');
            header.classList.remove('expanded');
        } else {
            // 展開する
            content.classList.add('expanded');
            header.classList.add('expanded');
        }
    }

    // 表情設定関連のメソッド
    private setupExpressionEventListeners(): void {
        console.log('[DEBUG] setupExpressionEventListeners開始');
        
        // null チェックを追加して安全にイベントリスナーを設定
        
        // プレビュー強度スライダー
        if (this.previewIntensity) {
            this.previewIntensity.addEventListener('input', () => {
                const value = parseFloat(this.previewIntensity.value);
                if (this.previewIntensityValue) {
                    this.previewIntensityValue.textContent = value.toFixed(1);
                }
            });
            console.log('[DEBUG] previewIntensity イベントリスナー設定完了');
        } else {
            console.warn('[DEBUG] previewIntensity 要素が見つかりません');
        }

        // プレビューボタン
        if (this.previewExpressionBtn) {
            this.previewExpressionBtn.addEventListener('click', () => {
                this.previewExpression();
            });
            console.log('[DEBUG] previewExpressionBtn イベントリスナー設定完了');
        } else {
            console.warn('[DEBUG] previewExpressionBtn 要素が見つかりません');
        }

        // リセットボタン
        if (this.resetExpressionBtn) {
            this.resetExpressionBtn.addEventListener('click', () => {
                this.resetExpressions();
            });
            console.log('[DEBUG] resetExpressionBtn イベントリスナー設定完了');
        } else {
            console.warn('[DEBUG] resetExpressionBtn 要素が見つかりません');
        }

        // 保存ボタン
        if (this.saveExpressionsBtn) {
            this.saveExpressionsBtn.addEventListener('click', () => {
                this.saveExpressionSettings();
            });
            console.log('[DEBUG] saveExpressionsBtn イベントリスナー設定完了');
        } else {
            console.warn('[DEBUG] saveExpressionsBtn 要素が見つかりません');
        }

        // 設定リセットボタン（削除済みのため null チェックが重要）
        if (this.resetExpressionsBtn) {
            this.resetExpressionsBtn.addEventListener('click', () => {
                this.resetExpressionSettings();
            });
            console.log('[DEBUG] resetExpressionsBtn イベントリスナー設定完了');
        } else {
            console.warn('[DEBUG] resetExpressionsBtn 要素が見つかりません（削除済み）');
        }
        
        console.log('[DEBUG] setupExpressionEventListeners完了');
    }

    private async initializeExpressions(): Promise<void> {
        if (this.isExpressionsInitialized) {
            console.log('表情設定は既に初期化済みです');
            return;
        }
        
        console.log('表情設定を初期化中...');
        
        try {
            this.showExpressionLoading();
            
            // VRMモデルの状態を確認
            let expressions: VRMExpressionInfo[] = [];
            let retryCount = 0;
            const maxRetries = 5;
            
            while (expressions.length === 0 && retryCount < maxRetries) {
                expressions = await window.electronAPI.getAvailableExpressions();
                console.log(`表情取得試行 ${retryCount + 1}/${maxRetries}:`, expressions.length, '個の表情');
                
                if (expressions.length === 0) {
                    retryCount++;
                    if (retryCount < maxRetries) {
                        console.log('VRMモデルの読み込み待ち中... 1秒後に再試行');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
            
            if (expressions.length === 0) {
                this.showExpressionError('VRMモデルが読み込まれていないか、利用可能な表情がありません。メインウィンドウでVRMモデルが正しく表示されているか確認してください。');
                this.isExpressionsInitialized = false; // 再試行可能にする
                return;
            }
            
            // 重複を除去
            const uniqueExpressions = expressions.filter((expr, index, self) => 
                self.findIndex(e => e.name === expr.name) === index
            );
            this.availableExpressions = uniqueExpressions;
            console.log('重複除去後の表情:', this.availableExpressions.length);

            // 現在の設定を取得
            this.expressionSettings = await window.electronAPI.getExpressionSettings();
            console.log('現在の表情設定:', this.expressionSettings);

            // 表情リストを表示
            this.renderExpressionList();
            this.populatePreviewSelect();
            this.showExpressionList();
            
            this.isExpressionsInitialized = true;
            console.log('表情設定の初期化が完了しました');
            
        } catch (error) {
            console.error('表情設定の初期化に失敗:', error);
            this.showExpressionError(`表情設定の読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
            this.isExpressionsInitialized = false; // 再試行可能にする
        }
    }

    private showExpressionLoading(): void {
        this.expressionLoading.style.display = 'block';
        this.expressionList.style.display = 'none';
        this.expressionError.style.display = 'none';
    }

    private showExpressionList(): void {
        this.expressionLoading.style.display = 'none';
        this.expressionList.style.display = 'block';
        this.expressionError.style.display = 'none';
    }

    private showExpressionError(message: string): void {
        this.expressionLoading.style.display = 'none';
        this.expressionList.style.display = 'none';
        this.expressionError.style.display = 'block';
        const errorSpan = this.expressionError.querySelector('span');
        if (errorSpan) {
            errorSpan.textContent = message;
        }
        
        // エラー状態でも再試行ボタンを追加
        this.addRetryButton();
    }

    private addRetryButton(): void {
        // 既存の再試行ボタンがあれば削除
        const existingButton = this.expressionError.querySelector('.retry-button');
        if (existingButton) {
            existingButton.remove();
        }
        
        // 再試行ボタンを作成
        const retryButton = document.createElement('button');
        retryButton.className = 'retry-button secondary';
        retryButton.textContent = '再試行';
        retryButton.style.marginTop = '10px';
        retryButton.addEventListener('click', () => {
            this.isExpressionsInitialized = false;
            this.initializeExpressions();
        });
        
        this.expressionError.appendChild(retryButton);
    }

    private renderExpressionList(): void {
        console.log('[DEBUG] renderExpressionList 呼び出し開始');
        console.log('[DEBUG] 利用可能表情数:', this.availableExpressions.length);
        
        // 既存のイベントリスナーを削除（メモリリーク防止）
        const existingSliders = this.expressionList.querySelectorAll('input[type="range"]');
        console.log('[DEBUG] 既存スライダー数:', existingSliders.length);
        existingSliders.forEach(slider => {
            slider.replaceWith(slider.cloneNode(true));
        });
        
        // コンテナを完全にクリア
        this.expressionList.innerHTML = '';
        console.log('[DEBUG] expressionListをクリアしました');
        
        // 重複チェック済みの表情リストを使用
        const uniqueExpressions = this.availableExpressions.filter((expr, index, self) => 
            self.findIndex(e => e.name === expr.name) === index
        );
        console.log('[DEBUG] 重複除去後の表情数:', uniqueExpressions.length);
        
        if (uniqueExpressions.length === 0) {
            console.log('[DEBUG] 表示する表情がありません');
            return;
        }
        
        const listHtml = uniqueExpressions.map(expr => {
            const setting = this.expressionSettings[expr.name];
            const enabled = setting ? setting.enabled : false;
            const defaultWeight = setting ? setting.defaultWeight : 1.0;
            
            return `
                <div class="expression-item" data-expression="${expr.name}">
                    <div class="expression-header">
                        <div class="expression-checkbox-group">
                            <input type="checkbox" id="expr-${expr.name}" ${enabled ? 'checked' : ''}>
                            <label for="expr-${expr.name}">
                                <span class="expression-name">${expr.displayName || expr.name}</span>
                            </label>
                        </div>
                        <span class="expression-type ${expr.isPreset ? 'preset' : 'custom'}">${expr.isPreset ? 'プリセット' : 'カスタム'}</span>
                    </div>
                    <div class="expression-controls">
                        <div class="slider-group">
                            <label for="weight-${expr.name}">デフォルト強度:</label>
                            <input type="range" id="weight-${expr.name}" min="0" max="1" step="0.1" value="${defaultWeight}">
                            <span class="weight-value">${defaultWeight.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        console.log('[DEBUG] 生成されたHTML長さ:', listHtml.length);
        
        // 既存の全スライダーを確認
        const allSlidersBeforeUpdate = document.querySelectorAll('input[type="range"]');
        console.log('[DEBUG] 更新前の全スライダー数:', allSlidersBeforeUpdate.length);
        allSlidersBeforeUpdate.forEach((slider, index) => {
            console.log(`[DEBUG] スライダー${index}: id="${slider.id}", container="${slider.closest('.expression-item, .preview-controls')?.className}"`);
        });
        
        this.expressionList.innerHTML = listHtml;
        
        // 設定後のスライダーをチェック
        const newSliders = this.expressionList.querySelectorAll('input[type="range"]');
        console.log('[DEBUG] 新しいスライダー数:', newSliders.length);
        
        // 更新後の全スライダーを確認
        const allSlidersAfterUpdate = document.querySelectorAll('input[type="range"]');
        console.log('[DEBUG] 更新後の全スライダー数:', allSlidersAfterUpdate.length);
        allSlidersAfterUpdate.forEach((slider, index) => {
            console.log(`[DEBUG] 更新後スライダー${index}: id="${slider.id}", container="${slider.closest('.expression-item, .preview-controls')?.className}"`);
        });

        // イベントリスナーを追加（重複除去済みリストを使用）
        uniqueExpressions.forEach(expr => {
            const checkbox = document.getElementById(`expr-${expr.name}`) as HTMLInputElement;
            const slider = document.getElementById(`weight-${expr.name}`) as HTMLInputElement;
            
            if (!checkbox || !slider) {
                console.warn(`[DEBUG] 要素が見つかりません: expr-${expr.name} または weight-${expr.name}`);
                return;
            }
            
            const valueSpan = slider.nextElementSibling as HTMLElement;

            checkbox.addEventListener('change', async () => {
                await this.updateExpressionSetting(expr.name, checkbox.checked, parseFloat(slider.value));
            });

            slider.addEventListener('input', async () => {
                const value = parseFloat(slider.value);
                if (valueSpan) {
                    valueSpan.textContent = value.toFixed(1);
                }
                await this.updateExpressionSetting(expr.name, checkbox.checked, value);
            });
        });
    }

    private populatePreviewSelect(): void {
        // 既存のオプションをクリア（最初のオプションは残す）
        while (this.previewExpressionSelect.children.length > 1) {
            this.previewExpressionSelect.removeChild(this.previewExpressionSelect.lastChild!);
        }

        // 表情を追加
        this.availableExpressions.forEach(expr => {
            const option = document.createElement('option');
            option.value = expr.name;
            option.textContent = expr.displayName || expr.name;
            this.previewExpressionSelect.appendChild(option);
        });
    }

    private async updateExpressionSetting(expressionName: string, enabled: boolean, defaultWeight: number): Promise<void> {
        if (!this.expressionSettings[expressionName]) {
            this.expressionSettings[expressionName] = { enabled: false, defaultWeight: 0 };
        }
        this.expressionSettings[expressionName].enabled = enabled;
        this.expressionSettings[expressionName].defaultWeight = defaultWeight;
        
        // 設定をリアルタイムで保存
        try {
            const result = await window.electronAPI.updateExpressionSetting(expressionName, enabled, defaultWeight);
            console.log(`[Settings] 表情設定を更新: ${expressionName} enabled=${enabled} weight=${defaultWeight}`);
            console.log(`[Settings] 保存結果:`, result);
            
            if (result.success) {
                // tools.jsonの動的更新をトリガー
                await this.updateToolsAndReinitializeGemini();
            } else {
                console.error('[Settings] 表情設定の保存に失敗:', result);
            }
        } catch (error) {
            console.error('表情設定の更新エラー:', error);
        }
    }
    
    private async updateToolsAndReinitializeGemini(): Promise<void> {
        try {
            console.log('[Settings] tools.json更新とGeminiService再初期化を開始');
            const result = await window.electronAPI.updateToolsAndReinitializeGemini();
            if (result.success) {
                console.log('[Settings] tools.json更新とGeminiService再初期化が完了');
            } else {
                console.error('[Settings] tools.json更新に失敗:', result.error);
            }
        } catch (error) {
            console.error('[Settings] tools.json更新エラー:', error);
        }
    }

    private async previewExpression(): Promise<void> {
        const selectedExpression = this.previewExpressionSelect.value;
        if (!selectedExpression) {
            alert('プレビューする表情を選択してください。');
            return;
        }

        const intensity = parseFloat(this.previewIntensity.value);
        
        try {
            const result = await window.electronAPI.previewExpression(selectedExpression, intensity);
            if (!result.success) {
                console.error('表情プレビューに失敗:', result);
                alert('表情のプレビューに失敗しました。');
            }
        } catch (error) {
            console.error('表情プレビューエラー:', error);
            alert('表情のプレビューでエラーが発生しました。');
        }
    }

    private async resetExpressions(): Promise<void> {
        try {
            const result = await window.electronAPI.previewExpression('neutral', 0);
            if (!result.success) {
                console.log('ニュートラル表情のリセットに失敗しましたが、続行します');
            }
        } catch (error) {
            console.error('表情リセットエラー:', error);
        }
    }

    private async saveExpressionSettings(): Promise<void> {
        try {
            console.log('[DEBUG] saveExpressionSettings開始');
            console.log('[DEBUG] electronAPI利用可能性:', !!window.electronAPI);
            console.log('[DEBUG] 保存する表情設定:', this.expressionSettings);
            console.log('[DEBUG] 表情設定キー数:', Object.keys(this.expressionSettings).length);
            
            if (!window.electronAPI) {
                console.error('[DEBUG] electronAPIが利用できません');
                alert('electronAPIが利用できません。Electronアプリ内から実行してください。');
                return;
            }
            
            if (!window.electronAPI.setExpressionSettings) {
                console.error('[DEBUG] setExpressionSettingsメソッドが存在しません');
                console.log('[DEBUG] 利用可能なelectronAPIメソッド:', Object.keys(window.electronAPI));
                alert('setExpressionSettingsメソッドが利用できません。');
                return;
            }
            
            console.log('[DEBUG] setExpressionSettings実行中...');
            const result = await window.electronAPI.setExpressionSettings(this.expressionSettings);
            console.log('[DEBUG] setExpressionSettings結果:', result);
            
            if (result && result.success) {
                console.log('[DEBUG] 表情設定保存成功（Storeに保存済み）');
                alert('表情設定をStoreに保存しました。');
            } else {
                console.error('[DEBUG] 表情設定保存失敗:', result);
                alert(`表情設定のStore保存に失敗しました: ${result && 'error' in result ? result.error || 'Unknown error' : 'No result returned'}`);
            }
        } catch (error) {
            console.error('[DEBUG] saveExpressionSettings でエラー発生:', error);
            console.error('[DEBUG] エラーの詳細:', error instanceof Error ? error.stack : String(error));
            alert(`表情設定の保存でエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async resetExpressionSettings(): Promise<void> {
        if (!confirm('表情設定をリセットしますか？この操作は元に戻せません。')) {
            return;
        }

        try {
            console.log('[DEBUG] resetExpressionSettings開始（Storeクリア・イベント発行）');
            
            if (window.electronAPI && window.electronAPI.resetExpressionSettings) {
                const result = await window.electronAPI.resetExpressionSettings();
                console.log('[DEBUG] resetExpressionSettings結果:', result);
                
                if (result && result.success) {
                    console.log('[DEBUG] Storeクリア成功、イベント発行済み');
                    // 設定をリロード
                    this.expressionSettings = {};
                    this.isExpressionsInitialized = false;
                    console.log('[DEBUG] 表情設定の再初期化中...');
                    await this.initializeExpressions();
                    console.log('[DEBUG] 表情設定の再初期化完了');
                    alert('表情設定をStoreからリセットし、イベントを発行しました。');
                } else {
                    console.error('[DEBUG] 表情設定Storeリセット失敗:', result);
                    alert('表情設定のStoreリセットに失敗しました。');
                }
            } else {
                console.error('[DEBUG] electronAPI.resetExpressionSettingsが利用できません');
                alert('electronAPIが利用できません。');
            }
        } catch (error) {
            console.error('表情設定リセットエラー:', error);
            alert('表情設定のリセットでエラーが発生しました。');
        }
    }
    
    // 会話設定のみを適用するメソッド
    private async applyChatSettings(): Promise<void> {
        try {
            console.log('[DEBUG] applyChatSettings開始');
            console.log('[DEBUG] electronAPI利用可能性:', !!window.electronAPI);
            console.log('[DEBUG] 利用可能なelectronAPIメソッド:', window.electronAPI ? Object.keys(window.electronAPI) : 'なし');
            console.log('[DEBUG] 現在の値:');
            console.log('[DEBUG] ユーザー名:', this.userNameInput.value);
            console.log('[DEBUG] マスコット名:', this.mascotNameInput.value);
            console.log('[DEBUG] システムプロンプト文字数:', this.systemPromptCoreTextarea.value.length);
            
            // electronAPI の存在確認
            if (!window.electronAPI) {
                console.error('[DEBUG] electronAPIが利用できません');
                alert('electronAPIが利用できません。Electronアプリ内から実行してください。');
                return;
            }
            
            await this.saveChatSettings();
            console.log('[DEBUG] saveChatSettings完了');
            
            this.showChatSuccessMessage('会話設定が保存されました');
            console.log('[DEBUG] applyChatSettings完了');
        } catch (error) {
            console.error('[DEBUG] applyChatSettings でエラー発生:', error);
            console.error('[DEBUG] エラーの詳細:', error instanceof Error ? error.stack : String(error));
            alert(`会話設定の保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    // 会話設定をリセットするメソッド
    private async resetChatSettings(): Promise<void> {
        const confirmReset = confirm('会話設定をデフォルトに戻しますか？');
        if (!confirmReset) return;
        
        try {
            
            // electronAPIの確認
            if (!window.electronAPI) {
                alert('electronAPIが利用できません。');
                return;
            }
            
            // システムプロンプトをリセット
            if (window.electronAPI.resetSystemPromptCore) {
                await window.electronAPI.resetSystemPromptCore();
            }
            
            // ユーザー名とマスコット名をデフォルト値に設定
            if (window.electronAPI.setUserName && window.electronAPI.setMascotName) {
                await window.electronAPI.setUserName('User');
                await window.electronAPI.setMascotName('Mascot');
            }
            
            // 画面に反映（ストアから再読み込み）
            await this.loadChatSettings();
            
            // フォーム要素の状態をリセットして入力可能にする
            this.restoreFormInteractivity();
            
            // DOMの更新が完了してから再度確認
            requestAnimationFrame(() => {
                // フォーム要素がまだ無効な場合は再度有効化
                if (this.userNameInput?.disabled || this.mascotNameInput?.disabled) {
                    this.restoreFormInteractivity();
                }
            });
            
            this.showResetSuccessMessage('会話設定がリセットされました');
        } catch (error) {
            console.error('会話設定のリセットでエラー発生:', error);
            alert(`会話設定のリセットに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    // 会話設定用の成功メッセージ表示（適用ボタン用）
    private showChatSuccessMessage(message: string): void {
        if (this.applyChatButton) {
            const originalText = this.applyChatButton.textContent;
            this.applyChatButton.textContent = message;
            this.applyChatButton.style.backgroundColor = '#28a745';
            
            setTimeout(() => {
                if (this.applyChatButton) {
                    this.applyChatButton.textContent = originalText;
                    this.applyChatButton.style.backgroundColor = '';
                }
            }, 2000);
        }
    }
    
    // 会話設定リセット用の成功メッセージ表示（リセットボタン用）
    private showResetSuccessMessage(message: string): void {
        const resetButton = document.getElementById('reset-chat-settings') as HTMLButtonElement;
        if (resetButton) {
            const originalText = resetButton.textContent;
            resetButton.textContent = message;
            resetButton.style.backgroundColor = '#28a745';
            
            setTimeout(() => {
                if (resetButton) {
                    resetButton.textContent = originalText;
                    resetButton.style.backgroundColor = '';
                }
            }, 2000);
        }
    }
    
    // フォーム要素の入力可能状態を復元するメソッド
    private restoreFormInteractivity(): void {
        try {
            const formElements = [
                { element: this.userNameInput, selector: '#user-name' },
                { element: this.mascotNameInput, selector: '#mascot-name' },
                { element: this.systemPromptCoreTextarea, selector: '#system-prompt-core' }
            ];
            
            formElements.forEach(({ element, selector }) => {
                if (element) {
                    // 基本属性をリセット
                    element.disabled = false;
                    element.readOnly = false;
                    element.removeAttribute('disabled');
                    element.removeAttribute('readonly');
                    
                    // スタイル属性をクリア
                    element.style.pointerEvents = '';
                    element.style.opacity = '';
                    element.style.webkitAppRegion = 'no-drag';
                    
                    // 親要素のドラッグ領域を修正
                    let parentEl = element.parentElement;
                    while (parentEl && parentEl !== document.body) {
                        const parentComputedStyle = getComputedStyle(parentEl);
                        if (parentComputedStyle.webkitAppRegion === 'drag') {
                            parentEl.style.setProperty('-webkit-app-region', 'no-drag', 'important');
                            parentEl.classList.add('force-no-drag');
                        }
                        parentEl = parentEl.parentElement;
                    }
                    
                    // タブインデックスを設定
                    element.tabIndex = 0;
                } else {
                    // 要素が見つからない場合はDOMから再取得
                    const freshElement = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
                    if (freshElement) {
                        freshElement.disabled = false;
                        freshElement.readOnly = false;
                        freshElement.style.pointerEvents = '';
                        freshElement.style.opacity = '';
                        freshElement.tabIndex = 0;
                    }
                }
            });
            
            // DOMの更新後にフォーカスを設定
            requestAnimationFrame(() => {
                if (this.userNameInput && !this.userNameInput.disabled) {
                    this.userNameInput.focus();
                }
            });
        } catch (error) {
            console.error('フォーム要素の復元でエラーが発生しました:', error);
        }
    }
    
    
    // グローバルクリックハンドラー
    private setupGlobalClickHandler(): void {
        
        document.addEventListener('click', async (event) => {
            const target = event.target as HTMLElement;
            if (!target || target.tagName !== 'BUTTON') return;
            
            const buttonId = target.id;
            
            try {
                switch (buttonId) {
                    case 'apply-display-settings':
                        event.preventDefault();
                        await this.applySettings();
                        break;
                        
                    case 'reset-display-settings':
                        event.preventDefault();
                        await this.resetSettings();
                        break;
                        
                    case 'apply-chat-settings':
                        event.preventDefault();
                        await this.applyChatSettings();
                        break;
                        
                    case 'reset-chat-settings':
                        event.preventDefault();
                        await this.resetChatSettings();
                        break;
                        
                    case 'apply-expression-settings':
                        event.preventDefault();
                        await this.saveExpressionSettings();
                        break;
                        
                    case 'reset-expression-settings':
                        event.preventDefault();
                        await this.resetExpressionSettings();
                        break;
                        
                    default:
                        return;
                }
            } catch (error) {
                alert('エラーが発生しました: ' + (error instanceof Error ? error.message : String(error)));
            }
        });
        
    }
}

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', () => {
    new SettingsRenderer();
});