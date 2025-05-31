import Store from 'electron-store';
import path from 'path';
import { ChatHistoryStore } from './chatHistoryStore';

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
    userName?: string;
    mascotName?: string;
    systemPromptCore?: string;
}

export const WINDOW_PRESETS = {
    small: { width: 300, height: 600 },
    medium: { width: 400, height: 800 },
    large: { width: 500, height: 1000 }
} as const;

export class SettingsStore {
    private store: Store<SettingsData>;
    private chatHistoryStore: ChatHistoryStore;

    constructor() {
        this.store = new Store<SettingsData>({
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
                systemPromptCore: 'あなたは親しみやすいデスクトップマスコットです。ユーザーとの会話を楽しみ、役立つ情報を提供してください。'
            }
        });
        this.chatHistoryStore = new ChatHistoryStore();
        
        // デバッグ用：ストアの場所と現在のデータを出力
        console.log('[SettingsStore] 設定ファイル保存場所:', this.store.path);
        console.log('[SettingsStore] 現在保存されているデータ:', this.store.store);
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
        const corePrompt = this.getSystemPromptCore();

        const prefixInstruction = `Your role is a desktop mascot named ${mascotName}. You operate on the desktop of a user whose name is ${userName}. In all following interactions, you must use the names ${mascotName} (for yourself) and ${userName} (for the user) correctly and appropriately.`;

        return `${prefixInstruction} ${corePrompt}`;
    }
}