/**
 * ButtonHandler Service
 * UI ボタンイベントハンドラー管理
 */
export class ButtonHandler {
    initialize() {
        this.setupChatToggleButton();
        this.setupSettingsButton();
        this.setupQuitAppButton();
    }

    private setupChatToggleButton() {
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
    }

    private setupSettingsButton() {
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
    }

    private setupQuitAppButton() {
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
    }
}

export function createButtonHandler(): ButtonHandler {
    return new ButtonHandler();
}