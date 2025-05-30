// src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

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

    getSettings: async (): Promise<any> => {
        return await ipcRenderer.invoke('get-settings');
    },

    saveSettings: async (settings: any): Promise<void> => {
        return await ipcRenderer.invoke('save-settings', settings);
    },

    resetSettings: async (): Promise<void> => {
        return await ipcRenderer.invoke('reset-settings');
    },

    selectVrmFile: async (): Promise<string | null> => {
        return await ipcRenderer.invoke('select-vrm-file');
    }
});