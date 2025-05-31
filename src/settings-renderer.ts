/// <reference path="preload.d.ts" />

interface WindowSizeSettings {
    width: number;
    height: number;
    preset: string;
}

class SettingsRenderer {
    // 既存のプロパティ
    private presetSelect: HTMLSelectElement;
    private customWidthInput: HTMLInputElement;
    private customHeightInput: HTMLInputElement;
    private customSizeInputs: HTMLElement;
    private currentVrmPath: HTMLInputElement;
    private applyButton: HTMLButtonElement;
    private resetButton: HTMLButtonElement;
    private closeButton: HTMLButtonElement;
    private selectVrmButton: HTMLButtonElement;

    // 新しいプロパティ
    private tabButtons: NodeListOf<HTMLButtonElement>;
    private tabPanes: NodeListOf<HTMLElement>;
    private activeTab = 'display';
    private userNameInput: HTMLInputElement;
    private mascotNameInput: HTMLInputElement;
    private systemPromptCoreTextarea: HTMLTextAreaElement;
    private promptCharacterCount: HTMLElement;
    private performanceWarning: HTMLElement;
    private resetSystemPromptButton: HTMLButtonElement;
    private clearChatHistoryButton: HTMLButtonElement;

    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.loadCurrentSettings();
    }

    private initializeElements(): void {
        // 既存の要素
        this.presetSelect = document.getElementById('window-size-preset') as HTMLSelectElement;
        this.customWidthInput = document.getElementById('custom-width') as HTMLInputElement;
        this.customHeightInput = document.getElementById('custom-height') as HTMLInputElement;
        this.customSizeInputs = document.getElementById('custom-size-inputs') as HTMLElement;
        this.currentVrmPath = document.getElementById('current-vrm-path') as HTMLInputElement;
        this.applyButton = document.getElementById('apply-settings') as HTMLButtonElement;
        this.resetButton = document.getElementById('reset-settings') as HTMLButtonElement;
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
    }

    private setupEventListeners(): void {
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
        this.applyButton.addEventListener('click', () => {
            this.applySettings();
        });

        this.resetButton.addEventListener('click', () => {
            this.resetSettings();
        });

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
                
                // チャット設定も保存
                await this.saveChatSettings();
                
                // 設定適用成功のフィードバック
                this.showSuccessMessage('設定が保存されました');
            } catch (error) {
                console.error('設定の保存に失敗しました:', error);
                alert('設定の保存に失敗しました。');
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
        // 簡易的な成功メッセージ表示
        const originalText = this.applyButton.textContent;
        this.applyButton.textContent = message;
        this.applyButton.style.backgroundColor = '#28a745';
        
        setTimeout(() => {
            this.applyButton.textContent = originalText;
            this.applyButton.style.backgroundColor = '';
        }, 2000);
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

            if (window.electronAPI) {
                if (window.electronAPI.setUserName) {
                    await window.electronAPI.setUserName(userName);
                }
                if (window.electronAPI.setMascotName) {
                    await window.electronAPI.setMascotName(mascotName);
                }
                if (window.electronAPI.setSystemPromptCore) {
                    await window.electronAPI.setSystemPromptCore(promptCore);
                }
            }
        } catch (error) {
            console.error('チャット設定の保存に失敗しました:', error);
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
}

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', () => {
    new SettingsRenderer();
});