// src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    sendPromptToGemini: async (prompt: string): Promise<string> => {
        const response = await ipcRenderer.invoke('send-prompt-to-gemini', prompt);
        return response;
    },

    onDisplaySpeechBubble: (callback: (text: string) => void) => {
        ipcRenderer.on('display-speech-bubble', (_event, text) => callback(text));
    }

});

