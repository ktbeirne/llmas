// src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

import { SettingsData, CameraSettings, WindowBounds } from './utils/settingsStore';
import { ChatMessage } from './utils/chatHistoryStore';
import { VRMExpressionInfo, ExpressionSettings } from './types/tools';
import { ThemeInfo } from './types/ipc';

contextBridge.exposeInMainWorld('electronAPI', {
    sendPromptToGemini: async (prompt: string): Promise<string> => {
        const response = await ipcRenderer.invoke('send-prompt-to-gemini', prompt);
        return response;
    },


    // ★★★ 新しい吹き出しウィンドウ用のAPIを追加 ★★★
    onSetSpeechBubbleText: (callback: (text: string) => void) => {
        ipcRenderer.on('set-speech-bubble-text', (_event, text) => callback(text));
    },

    hideSpeechBubble: () => {
        ipcRenderer.send('hide-speech-bubble-window');
    },

    notifyBubbleSize: (size: { width: number; height: number }) => {
        ipcRenderer.send('notify-bubble-size', size);
    },

    logRendererMessage: (message: string) => {
        ipcRenderer.send('log-from-speech-bubble', message); // 新しいチャンネル名
    },

    toggleChatWindowVisibility: () => {
        ipcRenderer.send('toggle-chat-visibility');
    },

    onChatWindowStateChanged: (callback: (isVisible: boolean) => void) => {
        ipcRenderer.on('chat-window-state-changed', (_event, isVisible) => callback(isVisible));
    },

    quitApp: () => {
        ipcRenderer.send('quit-app');
    },

    // 設定関連のAPI
    openSettings: () => {
        ipcRenderer.send('open-settings');
    },

    closeSettings: () => {
        ipcRenderer.send('close-settings');
    },

    toggleSettingsWindow: () => {
        ipcRenderer.send('toggle-settings-window');
    },

    getSettings: async (): Promise<SettingsData> => {
        return await ipcRenderer.invoke('get-settings');
    },

    saveSettings: async (settings: SettingsData): Promise<void> => {
        return await ipcRenderer.invoke('save-settings', settings);
    },

    resetSettings: async (): Promise<void> => {
        return await ipcRenderer.invoke('reset-settings');
    },

    selectVrmFile: async (): Promise<string | null> => {
        return await ipcRenderer.invoke('select-vrm-file');
    },

    // チャット履歴関連のAPI
    sendChatMessage: async (message: string): Promise<string> => {
        return await ipcRenderer.invoke('send-message', message);
    },

    getChatHistory: async (): Promise<ChatMessage[]> => {
        return await ipcRenderer.invoke('get-chat-history');
    },

    clearChatHistory: async (): Promise<{ success: boolean; error?: string }> => {
        return await ipcRenderer.invoke('clear-chat-history');
    },

    // システムプロンプト関連のAPI
    getSystemPrompt: async (): Promise<string> => {
        return await ipcRenderer.invoke('get-system-prompt');
    },

    setSystemPrompt: async (prompt: string): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('set-system-prompt', prompt);
    },

    resetSystemPrompt: async (): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('reset-system-prompt');
    },

    // カメラ設定関連のAPI
    getCameraSettings: async (): Promise<CameraSettings> => {
        const response = await ipcRenderer.invoke('get-camera-settings');
        if (response.success && response.data) {
            return response.data.settings;
        }
        return null;
    },

    setCameraSettings: async (settings: CameraSettings): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('set-camera-settings', settings);
    },

    resetCameraSettings: async (): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('reset-camera-settings');
    },

    // ウィンドウ位置関連のAPI
    getMainWindowBounds: async (): Promise<WindowBounds> => {
        return await ipcRenderer.invoke('get-main-window-bounds');
    },

    setMainWindowBounds: async (bounds: WindowBounds): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('set-main-window-bounds', bounds);
    },

    getChatWindowBounds: async (): Promise<WindowBounds> => {
        return await ipcRenderer.invoke('get-chat-window-bounds');
    },

    setChatWindowBounds: async (bounds: WindowBounds): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('set-chat-window-bounds', bounds);
    },

    getChatWindowVisible: async (): Promise<boolean> => {
        return await ipcRenderer.invoke('get-chat-window-visible');
    },

    setChatWindowVisible: async (visible: boolean): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('set-chat-window-visible', visible);
    },

    // 画面表示設定の一括操作API
    saveAllDisplaySettings: async (settings: SettingsData): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('save-all-display-settings', settings);
    },

    resetAllDisplaySettings: async (): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('reset-all-display-settings');
    },

    // ユーザー名・マスコット名関連のAPI
    getUserName: async (): Promise<string> => {
        return await ipcRenderer.invoke('get-user-name');
    },

    setUserName: async (userName: string): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('set-user-name', userName);
    },

    getMascotName: async (): Promise<string> => {
        return await ipcRenderer.invoke('get-mascot-name');
    },

    setMascotName: async (mascotName: string): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('set-mascot-name', mascotName);
    },

    // システムプロンプトコア関連のAPI
    getSystemPromptCore: async (): Promise<string> => {
        return await ipcRenderer.invoke('get-system-prompt-core');
    },

    setSystemPromptCore: async (prompt: string): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('set-system-prompt-core', prompt);
    },

    resetSystemPromptCore: async (): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('reset-system-prompt-core');
    },

    // テーマ関連のAPI
    getTheme: async (): Promise<string> => {
        return await ipcRenderer.invoke('get-theme');
    },

    setTheme: async (theme: string): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('set-theme', theme);
    },

    getAvailableThemes: async (): Promise<ThemeInfo[]> => {
        return await ipcRenderer.invoke('get-available-themes');
    },

    // テーマ変更通知のリスナー
    onThemeChanged: (callback: (theme: string) => void) => {
        ipcRenderer.on('theme-changed', (_event, theme) => callback(theme));
    },

    // 設定ウィンドウ状態変更通知のリスナー
    onSettingsWindowStateChanged: (callback: (isOpen: boolean) => void) => {
        ipcRenderer.on('settings-window-state-changed', (_event, isOpen) => callback(isOpen));
    },

    // 表情設定関連のAPI
    getAvailableExpressions: async (): Promise<VRMExpressionInfo[]> => {
        return await ipcRenderer.invoke('get-available-expressions');
    },

    getExpressionSettings: async (): Promise<ExpressionSettings> => {
        return await ipcRenderer.invoke('get-expression-settings');
    },

    setExpressionSettings: async (settings: ExpressionSettings): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('set-expression-settings', settings);
    },

    updateExpressionSetting: async (expressionName: string, enabled: boolean, defaultWeight: number): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('update-expression-setting', expressionName, enabled, defaultWeight);
    },

    resetExpressionSettings: async (): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('reset-expression-settings');
    },

    previewExpression: async (expressionName: string, intensity?: number): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('preview-expression', expressionName, intensity);
    },

    updateToolsAndReinitializeGemini: async (): Promise<{ success: boolean; error?: string }> => {
        return await ipcRenderer.invoke('update-tools-and-reinitialize-gemini');
    },

    // デフォルト表情関連のAPI
    getDefaultExpression: async (): Promise<string> => {
        return await ipcRenderer.invoke('get-default-expression');
    },

    setDefaultExpression: async (expressionName: string): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('set-default-expression', expressionName);
    },

    resetToDefaultExpression: async (): Promise<{ success: boolean }> => {
        return await ipcRenderer.invoke('reset-expression-to-default');
    }
});