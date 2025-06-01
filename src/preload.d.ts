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
            toggleSettingsWindow: () => void;
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
            // カメラ設定関連のAPI
            getCameraSettings: () => Promise<any>;
            setCameraSettings: (settings: any) => Promise<{ success: boolean }>;
            resetCameraSettings: () => Promise<{ success: boolean }>;
            // ウィンドウ位置関連のAPI
            getMainWindowBounds: () => Promise<any>;
            setMainWindowBounds: (bounds: any) => Promise<{ success: boolean }>;
            getChatWindowBounds: () => Promise<any>;
            setChatWindowBounds: (bounds: any) => Promise<{ success: boolean }>;
            getChatWindowVisible: () => Promise<boolean>;
            setChatWindowVisible: (visible: boolean) => Promise<{ success: boolean }>;
            // 画面表示設定の一括操作API
            saveAllDisplaySettings: (settings: any) => Promise<{ success: boolean }>;
            resetAllDisplaySettings: () => Promise<{ success: boolean }>;
            // ユーザー名・マスコット名関連のAPI
            getUserName: () => Promise<string>;
            setUserName: (userName: string) => Promise<{ success: boolean }>;
            getMascotName: () => Promise<string>;
            setMascotName: (mascotName: string) => Promise<{ success: boolean }>;
            // システムプロンプトコア関連のAPI
            getSystemPromptCore: () => Promise<string>;
            setSystemPromptCore: (prompt: string) => Promise<{ success: boolean }>;
            resetSystemPromptCore: () => Promise<{ success: boolean }>;
            // テーマ関連のAPI
            getTheme: () => Promise<string>;
            setTheme: (theme: string) => Promise<{ success: boolean }>;
            getAvailableThemes: () => Promise<any[]>;
            onThemeChanged: (callback: (theme: string) => void) => void;
            // 設定ウィンドウ状態変更通知
            onSettingsWindowStateChanged: (callback: (isOpen: boolean) => void) => void;
            // 表情関連のAPI
            getAvailableExpressions: () => Promise<any[]>;
            getExpressionSettings: () => Promise<any>;
            setExpressionSettings: (settings: any) => Promise<{ success: boolean }>;
            updateExpressionSetting: (expressionName: string, enabled: boolean, defaultWeight: number) => Promise<{ success: boolean }>;
            resetExpressionSettings: () => Promise<{ success: boolean }>;
            previewExpression: (expressionName: string, intensity?: number) => Promise<{ success: boolean }>;
            updateToolsAndReinitializeGemini: () => Promise<{ success: boolean; error?: string }>;
            
            // デフォルト表情関連
            getDefaultExpression: () => Promise<string>;
            setDefaultExpression: (expressionName: string) => Promise<{ success: boolean }>;
            resetToDefaultExpression: () => Promise<{ success: boolean }>;
        };
    }
}
export { };