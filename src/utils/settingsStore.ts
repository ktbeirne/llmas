import Store from 'electron-store';
import path from 'path';
import { ChatHistoryStore } from './chatHistoryStore';

export interface WindowSizeSettings {
    width: number;
    height: number;
    preset: string;
}

export interface SettingsData {
    windowSize?: WindowSizeSettings;
    vrmModelPath?: string;
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
                vrmModelPath: '/avatar.vrm'
            }
        });
        this.chatHistoryStore = new ChatHistoryStore();
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
}