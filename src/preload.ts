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
    }
});