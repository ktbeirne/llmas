declare global {
    interface Window {
        electronAPI: {
            sendPromptToGemini: (prompt: string) => Promise<string>;
            onSetSpeechBubbleText: (callback: (text: string) => void) => void; 
            hideSpeechBubble: () => void; 
            notifyBubbleSize: (size: { width: number; height: number }) => void;
            logRendererMessage: (message: string) => void;
            toggleChatWindowVisibility: () => void;
            onChatWindowStateChanged: (callback: (isVisible: boolean) => void) => void;
            quitApp: () => void;
            // 設定関連のAPI
            openSettings: () => void;
            closeSettings: () => void;
            getSettings: () => Promise<any>;
            saveSettings: (settings: any) => Promise<void>;
            resetSettings: () => Promise<void>;
            selectVrmFile: () => Promise<string | null>;
            // チャット履歴関連のAPI
            sendChatMessage: (message: string) => Promise<string>;
            getChatHistory: () => Promise<any[]>;
            clearChatHistory: () => Promise<{ success: boolean; error?: string }>;
            // システムプロンプト関連のAPI
            getSystemPrompt: () => Promise<string>;
            setSystemPrompt: (prompt: string) => Promise<{ success: boolean }>;
            resetSystemPrompt: () => Promise<{ success: boolean }>;
        };
    }
}
export { };