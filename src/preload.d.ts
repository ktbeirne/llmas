declare global {
    interface Window {
        electronAPI: {
            sendPromptToGemini: (prompt: string) => Promise<string>;
            onSetSpeechBubbleText: (callback: (text: string) => void) => void; 
            hideSpeechBubble: () => void; 
        };
    }
}
export { };