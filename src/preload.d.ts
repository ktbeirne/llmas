import { IPCTypes } from './types/ipc';

export interface ElectronAPI {
    sendPromptToGemini: IPCTypes.SendPromptToGemini;
    onSetSpeechBubbleText: IPCTypes.OnSetSpeechBubbleText; 
    hideSpeechBubble: IPCTypes.HideSpeechBubble; 
    notifyBubbleSize: IPCTypes.NotifyBubbleSize;
    logRendererMessage: IPCTypes.LogRendererMessage;
    toggleChatWindowVisibility: IPCTypes.ToggleChatWindowVisibility;
    onChatWindowStateChanged: IPCTypes.OnChatWindowStateChanged;
    quitApp: IPCTypes.QuitApp;
    // 設定関連のAPI
    openSettings: IPCTypes.OpenSettings;
    closeSettings: IPCTypes.CloseSettings;
    toggleSettingsWindow: IPCTypes.ToggleSettingsWindow;
    getSettings: IPCTypes.GetSettings;
    saveSettings: IPCTypes.SaveSettings;
    resetSettings: IPCTypes.ResetSettings;
    selectVrmFile: IPCTypes.SelectVrmFile;
    // チャット履歴関連のAPI
    sendChatMessage: IPCTypes.SendChatMessage;
    getChatHistory: IPCTypes.GetChatHistory;
    clearChatHistory: IPCTypes.ClearChatHistory;
    // チャット折り畳み状態関連のAPI
    getChatCollapseState: IPCTypes.GetChatCollapseState;
    setChatCollapseState: IPCTypes.SetChatCollapseState;
    setChatWindowSize: IPCTypes.SetChatWindowSize;
    setChatWindowSizeWithHeight: IPCTypes.SetChatWindowSizeWithHeight;
    // システムプロンプト関連のAPI
    getSystemPrompt: IPCTypes.GetSystemPrompt;
    setSystemPrompt: IPCTypes.SetSystemPrompt;
    resetSystemPrompt: IPCTypes.ResetSystemPrompt;
    // カメラ設定関連のAPI
    getCameraSettings: IPCTypes.GetCameraSettings;
    setCameraSettings: IPCTypes.SetCameraSettings;
    resetCameraSettings: IPCTypes.ResetCameraSettings;
    // ウィンドウ位置関連のAPI
    getMainWindowBounds: IPCTypes.GetMainWindowBounds;
    setMainWindowBounds: IPCTypes.SetMainWindowBounds;
    getChatWindowBounds: IPCTypes.GetChatWindowBounds;
    setChatWindowBounds: IPCTypes.SetChatWindowBounds;
    getChatWindowVisible: IPCTypes.GetChatWindowVisible;
    setChatWindowVisible: IPCTypes.SetChatWindowVisible;
    // 画面表示設定の一括操作API
    saveAllDisplaySettings: IPCTypes.SaveAllDisplaySettings;
    resetAllDisplaySettings: IPCTypes.ResetAllDisplaySettings;
    // ユーザー名・マスコット名関連のAPI
    getUserName: IPCTypes.GetUserName;
    setUserName: IPCTypes.SetUserName;
    getMascotName: IPCTypes.GetMascotName;
    setMascotName: IPCTypes.SetMascotName;
    // システムプロンプトコア関連のAPI
    getSystemPromptCore: IPCTypes.GetSystemPromptCore;
    setSystemPromptCore: IPCTypes.SetSystemPromptCore;
    resetSystemPromptCore: IPCTypes.ResetSystemPromptCore;
    // テーマ関連のAPI
    getTheme: IPCTypes.GetTheme;
    setTheme: IPCTypes.SetTheme;
    getAvailableThemes: IPCTypes.GetAvailableThemes;
    onThemeChanged: IPCTypes.OnThemeChanged;
    // 設定ウィンドウ状態変更通知
    onSettingsWindowStateChanged: IPCTypes.OnSettingsWindowStateChanged;
    // 表情関連のAPI
    getAvailableExpressions: IPCTypes.GetAvailableExpressions;
    getExpressionSettings: IPCTypes.GetExpressionSettings;
    setExpressionSettings: IPCTypes.SetExpressionSettings;
    updateExpressionSetting: IPCTypes.UpdateExpressionSetting;
    resetExpressionSettings: IPCTypes.ResetExpressionSettings;
    previewExpression: IPCTypes.PreviewExpression;
    updateToolsAndReinitializeGemini: IPCTypes.UpdateToolsAndReinitializeGemini;
    
    // デフォルト表情関連
    getDefaultExpression: IPCTypes.GetDefaultExpression;
    setDefaultExpression: IPCTypes.SetDefaultExpression;
    resetToDefaultExpression: IPCTypes.ResetToDefaultExpression;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}