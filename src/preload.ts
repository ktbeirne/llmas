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
    }
});