
import Store from 'electron-store';

import { ExpressionSettings } from '../types/tools';

import { ChatHistoryStore } from './chatHistoryStore';
import { SystemPromptBuilder } from './SystemPromptBuilder';


export interface WindowSizeSettings {
    width: number;
    height: number;
    preset: string;
}

export interface CameraSettings {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    zoom: number;
}

export interface WindowBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface SettingsData {
    windowSize?: WindowSizeSettings;
    vrmModelPath?: string;
    cameraSettings?: CameraSettings;
    mainWindowBounds?: WindowBounds;
    chatWindowBounds?: WindowBounds;
    chatWindowVisible?: boolean;
    chatCollapseState?: boolean;
    userName?: string;
    mascotName?: string;
    systemPromptCore?: string;
    theme?: string;
    expressionSettings?: ExpressionSettings;
    defaultExpression?: string;
}

export const WINDOW_PRESETS = {
    small: { width: 300, height: 600 },
    medium: { width: 400, height: 800 },
    large: { width: 500, height: 1000 }
} as const;

export class SettingsStore {
    private store: any;
    private chatHistoryStore: ChatHistoryStore;
    private systemPromptBuilder: SystemPromptBuilder;

    constructor() {
        this.store = new Store({
            name: 'app-settings',
            defaults: {
                windowSize: {
                    width: 400,
                    height: 600,
                    preset: 'medium'
                },
                vrmModelPath: '/avatar.vrm',
                cameraSettings: {
                    position: { x: 0.0, y: 1.2, z: 5.0 },
                    target: { x: 0.0, y: 1.0, z: 0.0 },
                    zoom: 1.0
                },
                chatWindowVisible: false,
                userName: 'User',
                mascotName: 'Mascot',
                systemPromptCore: 'あなたは親しみやすいデスクトップマスコットです。ユーザーとの会話を楽しみ、役立つ情報を提供してください。',
                theme: 'default',
                defaultExpression: 'neutral',
                expressionSettings: {
                    'happy': { enabled: true, defaultWeight: 1.0 },
                    'sad': { enabled: true, defaultWeight: 1.0 },
                    'angry': { enabled: true, defaultWeight: 1.0 },
                    'surprised': { enabled: true, defaultWeight: 1.0 },
                    'relaxed': { enabled: true, defaultWeight: 1.0 },
                    'neutral': { enabled: true, defaultWeight: 1.0 },
                    'fun': { enabled: true, defaultWeight: 1.0 },
                    'joy': { enabled: true, defaultWeight: 1.0 },
                    'sorrow': { enabled: true, defaultWeight: 1.0 },
                    'aa': { enabled: true, defaultWeight: 1.0 },
                    'ih': { enabled: true, defaultWeight: 1.0 },
                    'ou': { enabled: true, defaultWeight: 1.0 },
                    'ee': { enabled: true, defaultWeight: 1.0 },
                    'oh': { enabled: true, defaultWeight: 1.0 },
                    'blink': { enabled: true, defaultWeight: 1.0 },
                    'blinkL': { enabled: true, defaultWeight: 1.0 },
                    'blinkR': { enabled: true, defaultWeight: 1.0 }
                }
            }
        });
        this.chatHistoryStore = new ChatHistoryStore();
        this.systemPromptBuilder = new SystemPromptBuilder();
        
        // デバッグ用：ストアの場所と現在のデータを出力
        console.log('[SettingsStore] 設定ファイル保存場所:', this.store.path);
        console.log('[SettingsStore] 現在保存されているデータ:', this.store.store);
        
        // 既存ユーザーの設定に表情設定がない場合は初期化
        this.initializeExpressionSettingsIfMissing();
        
        // 強制的に設定を保存して確実に永続化
        this.store.store;
    }

    getWindowSize(): WindowSizeSettings {
        if (this.store.has('windowSize')) {
            return this.store.get('windowSize') as WindowSizeSettings;
        }
        
        return {
            width: 400,
            height: 600,
            preset: 'medium'
        };
    }

    setWindowSize(settings: WindowSizeSettings): void {
        // バリデーション
        if (settings.width < 200 || settings.width > 1000) {
            throw new Error('Window size must be at least 200x300 and at most 1000x1200');
        }
        
        if (settings.height < 300 || settings.height > 1200) {
            throw new Error('Window size must be at least 200x300 and at most 1000x1200');
        }

        this.store.set('windowSize', settings);
    }

    getVrmModelPath(): string {
        if (this.store.has('vrmModelPath')) {
            return this.store.get('vrmModelPath') as string;
        }
        
        return '/avatar.vrm';
    }

    setVrmModelPath(filePath: string): void {
        // VRMファイルの拡張子チェック
        if (!filePath.toLowerCase().endsWith('.vrm')) {
            throw new Error('File must have .vrm extension');
        }

        this.store.set('vrmModelPath', filePath);
    }

    getAllSettings(): SettingsData {
        return {
            windowSize: this.getWindowSize(),
            vrmModelPath: this.getVrmModelPath()
        };
    }

    saveAllSettings(settings: SettingsData): void {
        if (settings.windowSize) {
            this.setWindowSize(settings.windowSize);
        }
        
        if (settings.vrmModelPath) {
            this.setVrmModelPath(settings.vrmModelPath);
        }
    }

    resetToDefaults(): void {
        this.store.clear();
    }

    // 設定ファイルのパスを取得（デバッグ用）
    getConfigPath(): string {
        return this.store.path;
    }

    // システムプロンプト関連のプロキシメソッド
    getSystemPrompt(): string {
        return this.chatHistoryStore.getSystemPrompt();
    }

    setSystemPrompt(prompt: string): void {
        if (!prompt || prompt.trim().length === 0) {
            throw new Error('System prompt cannot be empty');
        }
        
        this.chatHistoryStore.setSystemPrompt(prompt);
    }

    // 会話履歴リセット関連のプロキシメソッド
    clearChatHistory(): void {
        this.chatHistoryStore.clearHistory();
    }

    resetSystemPromptToDefault(): void {
        this.chatHistoryStore.setSystemPrompt('あなたは親しみやすく愛らしいAIアシスタントです。ユーザーと楽しく会話してください。');
    }

    // カメラ設定関連のメソッド
    getCameraSettings(): CameraSettings {
        return this.store.get('cameraSettings', {
            position: { x: 0.0, y: 1.2, z: 5.0 },
            target: { x: 0.0, y: 1.0, z: 0.0 },
            zoom: 1.0
        }) as CameraSettings;
    }

    setCameraSettings(settings: CameraSettings): void {
        // バリデーション
        if (!settings.position || typeof settings.position.x !== 'number' || 
            typeof settings.position.y !== 'number' || typeof settings.position.z !== 'number') {
            throw new Error('Invalid camera position data');
        }
        
        if (!settings.target || typeof settings.target.x !== 'number' || 
            typeof settings.target.y !== 'number' || typeof settings.target.z !== 'number') {
            throw new Error('Invalid camera target data');
        }
        
        if (typeof settings.zoom !== 'number' || settings.zoom <= 0) {
            throw new Error('Invalid camera zoom data');
        }
        
        this.store.set('cameraSettings', settings);
    }

    // メインウィンドウ位置関連のメソッド
    getMainWindowBounds(): WindowBounds | null {
        const bounds = this.store.get('mainWindowBounds', null) as WindowBounds | null;
        console.log('[SettingsStore] メインウィンドウ位置を読み込み:', bounds);
        return bounds;
    }

    setMainWindowBounds(bounds: WindowBounds): void {
        // バリデーション
        if (typeof bounds.x !== 'number' || typeof bounds.y !== 'number' ||
            typeof bounds.width !== 'number' || typeof bounds.height !== 'number') {
            throw new Error('Invalid window bounds data');
        }
        
        if (bounds.width < 200 || bounds.height < 300) {
            throw new Error('Window bounds too small');
        }
        
        console.log('[SettingsStore] メインウィンドウ位置を保存:', bounds);
        this.store.set('mainWindowBounds', bounds);
    }

    // チャットウィンドウ位置関連のメソッド
    getChatWindowBounds(): WindowBounds | null {
        const bounds = this.store.get('chatWindowBounds', null) as WindowBounds | null;
        console.log('[SettingsStore] チャットウィンドウ位置を読み込み:', bounds);
        return bounds;
    }

    setChatWindowBounds(bounds: WindowBounds): void {
        // バリデーション
        if (typeof bounds.x !== 'number' || typeof bounds.y !== 'number' ||
            typeof bounds.width !== 'number' || typeof bounds.height !== 'number') {
            throw new Error('Invalid window bounds data');
        }
        
        if (bounds.width < 200 || bounds.height < 200) {
            throw new Error('Chat window bounds too small');
        }
        
        console.log('[SettingsStore] チャットウィンドウ位置を保存:', bounds);
        this.store.set('chatWindowBounds', bounds);
    }

    // チャットウィンドウ表示状態関連のメソッド
    getChatWindowVisible(): boolean {
        return this.store.get('chatWindowVisible', false) as boolean;
    }

    setChatWindowVisible(visible: boolean): void {
        this.store.set('chatWindowVisible', visible);
    }

    // チャット折り畳み状態関連のメソッド
    getChatCollapseState(): boolean {
        return this.store.get('chatCollapseState', false) as boolean;
    }

    setChatCollapseState(collapsed: boolean): void {
        this.store.set('chatCollapseState', collapsed);
    }

    // 画面表示設定をリセット
    resetDisplaySettings(): void {
        this.store.delete('cameraSettings');
        this.store.delete('mainWindowBounds');
        this.store.delete('chatWindowBounds');
        this.store.delete('chatWindowVisible');
    }

    // ユーザー名・マスコット名関連のメソッド
    getUserName(): string {
        return this.store.get('userName', 'User') as string;
    }

    setUserName(userName: string): void {
        this.store.set('userName', userName);
    }

    getMascotName(): string {
        return this.store.get('mascotName', 'Mascot') as string;
    }

    setMascotName(mascotName: string): void {
        this.store.set('mascotName', mascotName);
    }

    // ユーザー定義システムプロンプト関連のメソッド
    getSystemPromptCore(): string {
        return this.store.get('systemPromptCore', 'あなたは親しみやすいデスクトップマスコットです。ユーザーとの会話を楽しみ、役立つ情報を提供してください。') as string;
    }

    setSystemPromptCore(prompt: string): void {
        this.store.set('systemPromptCore', prompt);
    }

    // 最終的なシステムプロンプトを構築する
    buildFinalSystemPrompt(): string {
        const userName = this.getUserName();
        const mascotName = this.getMascotName();
        const userPrompt = this.getSystemPromptCore();

        // SystemPromptBuilderを使用して構築
        return this.systemPromptBuilder.buildSystemPrompt({
            userName,
            mascotName,
            userPrompt
        });
    }

    // システムプロンプトテンプレートをリロード
    reloadSystemPromptTemplate(): void {
        this.systemPromptBuilder.reloadTemplate();
        console.log('[SettingsStore] システムプロンプトテンプレートをリロードしました');
    }

    // テーマ関連のメソッド
    getTheme(): string {
        return this.store.get('theme', 'default') as string;
    }

    setTheme(theme: string): void {
        this.store.set('theme', theme);
    }

    // 表情設定関連のメソッド
    getExpressionSettings(): ExpressionSettings {
        return this.store.get('expressionSettings', {}) as ExpressionSettings;
    }

    setExpressionSettings(settings: ExpressionSettings): void {
        this.store.set('expressionSettings', settings);
    }

    updateExpressionSetting(expressionName: string, enabled: boolean, defaultWeight: number): void {
        const currentSettings = this.getExpressionSettings();
        currentSettings[expressionName] = {
            enabled,
            defaultWeight: Math.max(0, Math.min(1, defaultWeight))
        };
        this.setExpressionSettings(currentSettings);
    }

    getExpressionSetting(expressionName: string): { enabled: boolean; defaultWeight: number } | null {
        const settings = this.getExpressionSettings();
        return settings[expressionName] || null;
    }

    removeExpressionSetting(expressionName: string): void {
        const currentSettings = this.getExpressionSettings();
        delete currentSettings[expressionName];
        this.setExpressionSettings(currentSettings);
    }

    resetExpressionSettings(): void {
        this.store.delete('expressionSettings');
    }

    // 有効な表情のリストを取得
    getEnabledExpressions(): string[] {
        const settings = this.getExpressionSettings();
        return Object.keys(settings).filter(name => settings[name].enabled);
    }

    // 表情のデフォルトウェイトを取得（設定されていない場合は1.0）
    getExpressionDefaultWeight(expressionName: string): number {
        const setting = this.getExpressionSetting(expressionName);
        return setting ? setting.defaultWeight : 1.0;
    }

    // 表情が有効かどうかをチェック
    isExpressionEnabled(expressionName: string): boolean {
        const setting = this.getExpressionSetting(expressionName);
        const result = setting ? setting.enabled : false;
        console.log(`[SettingsStore] isExpressionEnabled('${expressionName}'): setting=${JSON.stringify(setting)}, result=${result}`);
        return result;
    }

    // 既存ユーザーの設定に表情設定がない場合は基本的な表情を初期化
    private initializeExpressionSettingsIfMissing(): void {
        const currentSettings = this.getExpressionSettings();
        
        // 表情設定が空またはundefinedの場合、デフォルト表情を設定
        if (!currentSettings || Object.keys(currentSettings).length === 0) {
            console.log('[SettingsStore] 表情設定が見つからないため、基本表情を初期化します');
            
            const defaultExpressions = {
                'happy': { enabled: true, defaultWeight: 1.0 },
                'sad': { enabled: true, defaultWeight: 1.0 },
                'angry': { enabled: true, defaultWeight: 1.0 },
                'surprised': { enabled: true, defaultWeight: 1.0 },
                'relaxed': { enabled: true, defaultWeight: 1.0 },
                'neutral': { enabled: true, defaultWeight: 1.0 },
                'fun': { enabled: true, defaultWeight: 1.0 },
                'joy': { enabled: true, defaultWeight: 1.0 },
                'sorrow': { enabled: true, defaultWeight: 1.0 },
                'aa': { enabled: true, defaultWeight: 1.0 },
                'ih': { enabled: true, defaultWeight: 1.0 },
                'ou': { enabled: true, defaultWeight: 1.0 },
                'ee': { enabled: true, defaultWeight: 1.0 },
                'oh': { enabled: true, defaultWeight: 1.0 },
                'blink': { enabled: true, defaultWeight: 1.0 },
                'blinkL': { enabled: true, defaultWeight: 1.0 },
                'blinkR': { enabled: true, defaultWeight: 1.0 }
            };
            
            this.setExpressionSettings(defaultExpressions);
            console.log('[SettingsStore] 基本表情の初期化が完了しました:', Object.keys(defaultExpressions));
        } else {
            console.log('[SettingsStore] 既存の表情設定を使用します:', Object.keys(currentSettings));
        }
    }

    // デフォルト表情関連のメソッド
    getDefaultExpression(): string {
        return this.store.get('defaultExpression', 'neutral') as string;
    }

    setDefaultExpression(expressionName: string): void {
        if (!expressionName || typeof expressionName !== 'string') {
            throw new Error('無効な表情名です');
        }
        this.store.set('defaultExpression', expressionName);
        console.log(`[SettingsStore] デフォルト表情を '${expressionName}' に設定しました`);
    }
}