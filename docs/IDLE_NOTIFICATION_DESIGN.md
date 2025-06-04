# Idle Notification Feature Design Document

## 1. 概要

このドキュメントは、LLMASマスコットアプリケーションにおける「アイドル時ウィンドウ状態通知機能」の設計仕様を定義します。この機能により、ユーザーがアプリケーションと直接やり取りしていない間も、AIがユーザーのコンテキストを理解し、より適切なインタラクションを提供できるようになります。

## 2. 機能要件

### 2.1 基本要件
- ユーザーのアイドル状態を検出（設定可能な時間で判定）
- アイドル時に定期的にアクティブウィンドウのタイトルを取得
- 取得した情報をAI（Gemini）に送信
- ユーザーのプライバシーを考慮した設定オプションの提供

### 2.2 ユーザーストーリー
1. **開発者として**：アイドル状態を検出し、設定された間隔でアクティブウィンドウのタイトルを取得し、AIモデルに送信するモジュールを実装したい
2. **エンドユーザーとして**：マスコットが私の作業内容を理解し、適切な反応やサポートを提供してほしい
3. **エンドユーザーとして**：この機能の有効/無効を簡単に切り替え、アイドル検出時間と通知間隔を調整したい
4. **AIモデルとして**：ユーザーのアクティブなタスクについての情報を定期的に受け取り、明示的なインタラクションなしでもユーザーの状況を理解したい

## 3. アーキテクチャ設計

### 3.1 Clean Architecture準拠の層構造

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Settings UI   │  │   Chat Window   │                  │
│  │     (React)     │  │     (React)     │                  │
│  └─────────────────┘  └─────────────────┘                  │
├─────────────────────────────────────────────────────────────┤
│                    Application Layer                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              ApplicationService                      │   │
│  │          (orchestrates idle monitoring)              │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                     Service Layer                            │
│  ┌─────────────────┐  ┌──────────────────────────────┐    │
│  │ IdleStateManager│  │ StatusNotificationService    │    │
│  │    (新規)       │  │        (新規)                │    │
│  └─────────────────┘  └──────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────┐ │
│  │   IdleState     │  │ NotificationRule│  │ChatHistory │ │
│  │    Entity       │  │     Entity      │  │  Manager   │ │
│  └─────────────────┘  └─────────────────┘  └────────────┘ │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Gateway Interfaces                      │   │
│  │ (IActivityTrackingGateway, IPromptTemplateRepo)    │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                  Infrastructure Layer                        │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ ElectronWindow │  │ SettingsStore│  │ChatHistory   │   │
│  │ TrackingGateway│  │   Adapter    │  │StoreAdapter  │   │
│  └────────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 新規コンポーネント詳細

#### 3.2.1 IdleStateManager Service
```typescript
// src/services/idleStateManager.ts
export class IdleStateManager extends EventEmitter {
    private lastActivity: number = Date.now();
    private idleTimer?: NodeJS.Timeout;
    private notificationTimer?: NodeJS.Timeout;
    private isIdle: boolean = false;
    
    constructor(
        private activityGateway: IActivityTrackingGateway,
        private settingsRepo: ISettingsRepository,
        private notificationService: StatusNotificationService,
        private chatHistoryManager: ChatHistoryManager
    ) {
        super();
        this.initialize();
    }
    
    private async initialize(): Promise<void> {
        // チャットアクティビティの監視
        this.chatHistoryManager.on('userMessage', () => {
            this.updateActivity();
        });
        
        // 設定変更の監視
        this.settingsRepo.onSettingsChange('idleNotification', (settings) => {
            this.reconfigureTimers(settings);
        });
        
        // 初期設定の適用
        const settings = await this.settingsRepo.getIdleNotificationSettings();
        if (settings.enabled) {
            this.startMonitoring();
        }
    }
    
    private updateActivity(): void {
        this.lastActivity = Date.now();
        if (this.isIdle) {
            this.exitIdleState();
        }
    }
    
    private async checkIdleState(): Promise<void> {
        const settings = await this.settingsRepo.getIdleNotificationSettings();
        const idleDuration = Date.now() - this.lastActivity;
        
        if (idleDuration >= settings.idleThreshold * 60 * 1000 && !this.isIdle) {
            await this.enterIdleState();
        }
    }
    
    private async enterIdleState(): Promise<void> {
        this.isIdle = true;
        this.emit('idleStateEntered');
        
        // アイドル通知の開始
        const settings = await this.settingsRepo.getIdleNotificationSettings();
        this.startNotificationCycle(settings.notificationInterval);
    }
    
    private async sendStatusNotification(): Promise<void> {
        try {
            const windowTitle = await this.activityGateway.getActiveWindowTitle();
            const idleDuration = Date.now() - this.lastActivity;
            
            await this.notificationService.generateStatusNotification(
                windowTitle,
                idleDuration
            );
        } catch (error) {
            console.error('Failed to send status notification:', error);
        }
    }
}
```

#### 3.2.2 StatusNotificationService
```typescript
// src/domain/services/StatusNotificationService.ts
export class StatusNotificationService {
    private idleInteractionBuffer: IdleInteraction[] = [];
    private totalTokenCount: number = 0;
    private readonly TOKEN_THRESHOLD = 2000;
    private readonly COMPRESSION_THRESHOLD = 1000;
    
    constructor(
        private aiGateway: IAIServiceGateway,
        private historyManager: ChatHistoryManager,
        private promptTemplateRepo: IPromptTemplateRepository
    ) {}
    
    async generateStatusNotification(
        windowTitle: string,
        idleDuration: number
    ): Promise<StatusNotificationResult> {
        // プロンプトテンプレートの取得
        const template = await this.promptTemplateRepo.getTemplate('idle_status');
        const prompt = template.format({ 
            windowTitle, 
            idleDurationMinutes: Math.floor(idleDuration / 60000) 
        });
        
        // AIレスポンスの生成（ユーザーメッセージとして送信）
        const aiResponse = await this.aiGateway.generateResponse({
            message: prompt,
            role: 'user',
            metadata: { source: 'idle_monitor' }
        });
        
        // アイドルバッファへの追加
        const interaction: IdleInteraction = {
            id: generateId(),
            userPrompt: prompt,
            aiResponse: aiResponse.content,
            tokenCount: this.calculateTokenCount(prompt + aiResponse.content),
            timestamp: new Date(),
            windowTitle: windowTitle
        };
        
        await this.addToIdleBuffer(interaction);
        
        // Display Logへの記録（AIレスポンスのみ）
        await this.historyManager.addMessage({
            content: aiResponse.content,
            role: 'assistant',
            visibility: {
                showInUI: true,
                includeInContext: false // バッファから後で追加
            },
            metadata: {
                source: 'idle_monitor'
            }
        });
        
        return {
            response: aiResponse.content,
            buffered: true,
            tokenCount: interaction.tokenCount
        };
    }
    
    async flushBufferToContext(): Promise<void> {
        if (this.idleInteractionBuffer.length === 0) return;
        
        if (this.totalTokenCount > this.TOKEN_THRESHOLD) {
            // トークン数が閾値を超える場合は要約
            const summary = await this.summarizeInteractions();
            await this.historyManager.addSystemMessage(summary);
        } else {
            // そのままコンテキストに追加
            for (const interaction of this.idleInteractionBuffer) {
                await this.historyManager.addToInternalContext({
                    userMessage: interaction.userPrompt,
                    assistantMessage: interaction.aiResponse,
                    metadata: { source: 'idle_monitor', buffered: true }
                });
            }
        }
        
        // バッファのクリア
        this.idleInteractionBuffer = [];
        this.totalTokenCount = 0;
    }
    
    private async summarizeInteractions(): Promise<string> {
        const interactions = this.idleInteractionBuffer.map(i => ({
            window: i.windowTitle,
            response: i.aiResponse,
            time: i.timestamp
        }));
        
        const summaryPrompt = await this.promptTemplateRepo.getTemplate('idle_summary');
        const summary = await this.aiGateway.summarize({
            interactions,
            template: summaryPrompt
        });
        
        return summary.content;
    }
}
```

#### 3.2.3 拡張ChatMessage エンティティ
```typescript
// src/domain/entities/ChatMessage.ts
export interface ChatMessage {
    id: string;
    content: string;
    role: 'user' | 'assistant' | 'system';
    timestamp: Date;
    tokenCount?: number;
}

export interface ExtendedChatMessage extends ChatMessage {
    // UI表示とコンテキスト管理の分離
    displayContent?: string;      // UI表示用（フォーマット済み）
    contextContent?: string;      // AIコンテキスト用（生データ）
    
    // 可視性制御
    visibility: {
        showInUI: boolean;        // Display Logに表示するか
        includeInContext: boolean; // Internal Context Logに含めるか
    };
    
    // メタデータ
    metadata?: {
        source: 'user' | 'system' | 'idle_monitor';
        compressed?: boolean;      // 要約済みかどうか
        originalTokenCount?: number; // 圧縮前のトークン数
        relatedMessageIds?: string[]; // 関連メッセージのID
    };
}

export interface IdleInteraction {
    id: string;
    userPrompt: string;
    aiResponse: string;
    tokenCount: number;
    timestamp: Date;
    windowTitle: string;
}
```

#### 3.2.4 設定エンティティ
```typescript
// src/domain/entities/IdleNotificationSettings.ts
export interface IdleNotificationSettings {
    // 基本設定
    enabled: boolean;
    idleThreshold: number;        // アイドル判定時間（分）
    notificationInterval: number;  // 通知間隔（分）
    
    // 動作設定
    behavior: {
        captureWindowTitle: boolean;   // ウィンドウタイトルを取得
        generateAIResponse: boolean;   // AI応答を生成
        showInChatUI: boolean;        // チャットUIに表示
        playSound: boolean;           // 通知音を再生
        showBubble: boolean;          // スピーチバブルを表示
    };
    
    // バッファ管理設定
    bufferConfig: {
        maxTokens: number;            // 最大トークン数（デフォルト: 2000）
        compressionThreshold: number;  // 圧縮閾値（デフォルト: 1000）
        retentionPeriod: number;      // 保持期間（分）
    };
    
    // プロンプトテンプレート（カスタマイズ可能）
    promptTemplate?: string;
}

// バリデーションルール
export const idleNotificationSettingsSchema = {
    idleThreshold: { min: 1, max: 120 },      // 1分〜2時間
    notificationInterval: { min: 5, max: 60 }, // 5分〜1時間
    bufferConfig: {
        maxTokens: { min: 500, max: 10000 },
        compressionThreshold: { min: 100, max: 5000 },
        retentionPeriod: { min: 5, max: 1440 } // 5分〜24時間
    }
};
```

### 3.3 UI設計

#### 3.3.1 設定画面コンポーネント
```typescript
// src/renderer/components/settings/IdleNotificationSettingsTab.tsx
import React from 'react';
import { Card, FormField, useSettingsSection } from '@/components/common';
import { useIdleNotificationSettings } from '@/hooks';

export const IdleNotificationSettingsTab: React.FC = () => {
    const {
        settings,
        updateSettings,
        isLoading,
        error,
        validation
    } = useIdleNotificationSettings();
    
    const handleToggle = async (enabled: boolean) => {
        await updateSettings({ ...settings, enabled });
    };
    
    const handleThresholdChange = async (value: number) => {
        await updateSettings({ 
            ...settings, 
            idleThreshold: value 
        });
    };
    
    return (
        <div className="space-y-6">
            {/* 基本設定セクション */}
            <Card 
                header={{ 
                    title: 'アイドル通知設定',
                    description: 'アイドル時にAIがユーザーの状況を理解する機能'
                }}
            >
                <FormField
                    type="switch"
                    label="アイドル通知を有効にする"
                    description="一定時間操作がない場合、AIに現在の作業状況を伝えます"
                    switchProps={{
                        checked: settings?.enabled || false,
                        onChange: handleToggle,
                        disabled: isLoading
                    }}
                    error={error?.enabled}
                />
            </Card>
            
            {/* 詳細設定（有効時のみ表示） */}
            {settings?.enabled && (
                <>
                    {/* タイミング設定 */}
                    <Card header={{ title: 'タイミング設定' }}>
                        <div className="space-y-4">
                            <FormField
                                type="slider"
                                label="アイドル判定時間"
                                description="この時間操作がないとアイドル状態と判定します"
                                sliderProps={{
                                    min: 1,
                                    max: 120,
                                    step: 1,
                                    value: settings.idleThreshold,
                                    onChange: handleThresholdChange,
                                    marks: {
                                        1: '1分',
                                        30: '30分',
                                        60: '1時間',
                                        120: '2時間'
                                    }
                                }}
                                suffix="分"
                                error={validation?.idleThreshold}
                            />
                            
                            <FormField
                                type="slider"
                                label="通知間隔"
                                description="アイドル中、この間隔でAIに情報を送信します"
                                sliderProps={{
                                    min: 5,
                                    max: 60,
                                    step: 5,
                                    value: settings.notificationInterval,
                                    onChange: (value) => updateSettings({
                                        ...settings,
                                        notificationInterval: value
                                    }),
                                    marks: {
                                        5: '5分',
                                        15: '15分',
                                        30: '30分',
                                        60: '1時間'
                                    }
                                }}
                                suffix="分"
                                error={validation?.notificationInterval}
                            />
                        </div>
                    </Card>
                    
                    {/* 動作設定 */}
                    <Card header={{ title: '動作設定' }}>
                        <div className="space-y-3">
                            <FormField
                                type="checkbox"
                                label="ウィンドウタイトルを含める"
                                description="現在アクティブなウィンドウの情報をAIに伝えます"
                                checkboxProps={{
                                    checked: settings.behavior.captureWindowTitle,
                                    onChange: (checked) => updateSettings({
                                        ...settings,
                                        behavior: {
                                            ...settings.behavior,
                                            captureWindowTitle: checked
                                        }
                                    })
                                }}
                            />
                            
                            <FormField
                                type="checkbox"
                                label="チャットUIに表示"
                                description="アイドル時のAI応答をチャット画面に表示します"
                                checkboxProps={{
                                    checked: settings.behavior.showInChatUI,
                                    onChange: (checked) => updateSettings({
                                        ...settings,
                                        behavior: {
                                            ...settings.behavior,
                                            showInChatUI: checked
                                        }
                                    })
                                }}
                            />
                            
                            <FormField
                                type="checkbox"
                                label="通知音を再生"
                                description="アイドル時の応答で音を鳴らします"
                                checkboxProps={{
                                    checked: settings.behavior.playSound,
                                    onChange: (checked) => updateSettings({
                                        ...settings,
                                        behavior: {
                                            ...settings.behavior,
                                            playSound: checked
                                        }
                                    })
                                }}
                            />
                        </div>
                    </Card>
                    
                    {/* 詳細設定（開発者向け） */}
                    <Card 
                        header={{ 
                            title: '詳細設定',
                            collapsible: true,
                            defaultCollapsed: true
                        }}
                    >
                        <div className="space-y-4">
                            <FormField
                                type="number"
                                label="最大トークン数"
                                description="バッファに保持する最大トークン数"
                                inputProps={{
                                    type: 'number',
                                    min: 500,
                                    max: 10000,
                                    value: settings.bufferConfig.maxTokens,
                                    onChange: (e) => updateSettings({
                                        ...settings,
                                        bufferConfig: {
                                            ...settings.bufferConfig,
                                            maxTokens: parseInt(e.target.value)
                                        }
                                    })
                                }}
                                suffix="トークン"
                            />
                            
                            <FormField
                                type="number"
                                label="圧縮閾値"
                                description="この値を超えると要約処理を行います"
                                inputProps={{
                                    type: 'number',
                                    min: 100,
                                    max: 5000,
                                    value: settings.bufferConfig.compressionThreshold,
                                    onChange: (e) => updateSettings({
                                        ...settings,
                                        bufferConfig: {
                                            ...settings.bufferConfig,
                                            compressionThreshold: parseInt(e.target.value)
                                        }
                                    })
                                }}
                                suffix="トークン"
                            />
                        </div>
                    </Card>
                </>
            )}
            
            {/* エラー表示 */}
            {error && (
                <div className="text-red-500 text-sm p-4 bg-red-50 rounded">
                    {error.message}
                </div>
            )}
        </div>
    );
};
```

## 4. TDD実装計画

### 4.1 フェーズ1: ドメイン層の実装（2-3日）

#### テスト作成順序
1. **ChatMessage拡張**
   ```typescript
   // src/domain/entities/ChatMessage.test.ts
   describe('ExtendedChatMessage', () => {
       it('should separate display content from context content', () => {
           const message = new ExtendedChatMessage({
               content: 'Original content',
               displayContent: 'Formatted for UI',
               contextContent: 'Raw for AI'
           });
           
           expect(message.displayContent).not.toBe(message.contextContent);
       });
       
       it('should handle visibility flags correctly', () => {
           const message = new ExtendedChatMessage({
               visibility: { showInUI: true, includeInContext: false }
           });
           
           expect(message.shouldShowInUI()).toBe(true);
           expect(message.shouldIncludeInContext()).toBe(false);
       });
   });
   ```

2. **IdleNotificationSettings**
   ```typescript
   // src/domain/entities/IdleNotificationSettings.test.ts
   describe('IdleNotificationSettings', () => {
       it('should validate threshold values', () => {
           const settings = new IdleNotificationSettings({
               idleThreshold: 0 // Invalid
           });
           
           expect(settings.validate()).toContainError('idleThreshold');
       });
       
       it('should provide default values', () => {
           const settings = new IdleNotificationSettings({});
           
           expect(settings.idleThreshold).toBe(10); // Default 10 minutes
           expect(settings.notificationInterval).toBe(15); // Default 15 minutes
       });
   });
   ```

### 4.2 フェーズ2: サービス層の実装（3-4日）

#### StatusNotificationServiceのテスト
```typescript
// src/domain/services/StatusNotificationService.test.ts
describe('StatusNotificationService', () => {
    let service: StatusNotificationService;
    let mockAIGateway: MockAIGateway;
    let mockHistoryManager: MockChatHistoryManager;
    
    beforeEach(() => {
        mockAIGateway = new MockAIGateway();
        mockHistoryManager = new MockChatHistoryManager();
        service = new StatusNotificationService(
            mockAIGateway,
            mockHistoryManager,
            new MockPromptTemplateRepo()
        );
    });
    
    describe('generateStatusNotification', () => {
        it('should generate AI response for window title', async () => {
            const result = await service.generateStatusNotification(
                'Visual Studio Code',
                300000 // 5 minutes
            );
            
            expect(mockAIGateway.generateResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Visual Studio Code')
                })
            );
            expect(result.response).toBeDefined();
        });
        
        it('should add interaction to idle buffer', async () => {
            await service.generateStatusNotification('Chrome', 600000);
            
            expect(service.getBufferSize()).toBe(1);
            expect(service.getTotalTokenCount()).toBeGreaterThan(0);
        });
        
        it('should only add assistant response to display log', async () => {
            await service.generateStatusNotification('Chrome', 600000);
            
            const displayMessages = mockHistoryManager.getDisplayMessages();
            expect(displayMessages).toHaveLength(1);
            expect(displayMessages[0].role).toBe('assistant');
            expect(displayMessages[0].metadata.source).toBe('idle_monitor');
        });
    });
    
    describe('buffer management', () => {
        it('should flush buffer when user becomes active', async () => {
            // Add multiple interactions
            await service.generateStatusNotification('App1', 300000);
            await service.generateStatusNotification('App2', 600000);
            
            await service.flushBufferToContext();
            
            expect(service.getBufferSize()).toBe(0);
            expect(mockHistoryManager.getInternalContextSize()).toBe(2);
        });
        
        it('should summarize when token count exceeds threshold', async () => {
            // Mock high token count
            service.setTokenThreshold(100);
            
            await service.generateStatusNotification('App1', 300000);
            await service.generateStatusNotification('App2', 600000);
            
            await service.flushBufferToContext();
            
            expect(mockAIGateway.summarize).toHaveBeenCalled();
            expect(mockHistoryManager.getSystemMessages()).toHaveLength(1);
        });
    });
});
```

#### IdleStateManagerのテスト
```typescript
// src/services/idleStateManager.test.ts
describe('IdleStateManager', () => {
    let manager: IdleStateManager;
    let mockActivityGateway: MockActivityTrackingGateway;
    let mockNotificationService: MockStatusNotificationService;
    
    beforeEach(() => {
        vi.useFakeTimers();
        mockActivityGateway = new MockActivityTrackingGateway();
        mockNotificationService = new MockStatusNotificationService();
        
        manager = new IdleStateManager(
            mockActivityGateway,
            new MockSettingsRepository(),
            mockNotificationService,
            new MockChatHistoryManager()
        );
    });
    
    afterEach(() => {
        vi.useRealTimers();
    });
    
    describe('idle detection', () => {
        it('should enter idle state after threshold', async () => {
            const idleEnterSpy = vi.fn();
            manager.on('idleStateEntered', idleEnterSpy);
            
            // Simulate 10 minutes passing
            vi.advanceTimersByTime(10 * 60 * 1000);
            
            expect(idleEnterSpy).toHaveBeenCalled();
            expect(manager.isInIdleState()).toBe(true);
        });
        
        it('should exit idle state on user activity', async () => {
            // Enter idle state
            vi.advanceTimersByTime(10 * 60 * 1000);
            expect(manager.isInIdleState()).toBe(true);
            
            // Simulate user activity
            manager.handleUserActivity();
            
            expect(manager.isInIdleState()).toBe(false);
        });
    });
    
    describe('notification cycle', () => {
        it('should send notifications at configured intervals', async () => {
            // Enter idle state
            vi.advanceTimersByTime(10 * 60 * 1000);
            
            // Advance by notification interval (15 minutes)
            vi.advanceTimersByTime(15 * 60 * 1000);
            
            expect(mockNotificationService.generateStatusNotification)
                .toHaveBeenCalledTimes(1);
            
            // Advance again
            vi.advanceTimersByTime(15 * 60 * 1000);
            
            expect(mockNotificationService.generateStatusNotification)
                .toHaveBeenCalledTimes(2);
        });
        
        it('should stop notifications when disabled', async () => {
            // Disable feature
            await manager.updateSettings({ enabled: false });
            
            // Try to enter idle state
            vi.advanceTimersByTime(10 * 60 * 1000);
            
            expect(manager.isInIdleState()).toBe(false);
            expect(mockNotificationService.generateStatusNotification)
                .not.toHaveBeenCalled();
        });
    });
});
```

### 4.3 フェーズ3: インフラストラクチャ層の実装（2-3日）

#### ActivityTrackingGateway実装
```typescript
// src/infrastructure/gateways/ElectronActivityTrackingGateway.test.ts
describe('ElectronActivityTrackingGateway', () => {
    let gateway: ElectronActivityTrackingGateway;
    
    beforeEach(() => {
        gateway = new ElectronActivityTrackingGateway();
    });
    
    it('should get active window title', async () => {
        // Mock Electron API
        vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue({
            getTitle: () => 'Test Window'
        });
        
        const title = await gateway.getActiveWindowTitle();
        
        expect(title).toBe('Test Window');
    });
    
    it('should handle no focused window', async () => {
        vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(null);
        
        const title = await gateway.getActiveWindowTitle();
        
        expect(title).toBe('Desktop');
    });
    
    it('should filter sensitive information', async () => {
        vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue({
            getTitle: () => 'Password Manager - MyPasswords.kdbx'
        });
        
        const title = await gateway.getActiveWindowTitle();
        
        expect(title).toBe('Password Manager');
    });
});
```

### 4.4 フェーズ4: UI実装（2-3日）

#### React Hooks のテスト
```typescript
// src/renderer/hooks/useIdleNotificationSettings.test.tsx
describe('useIdleNotificationSettings', () => {
    it('should load settings on mount', async () => {
        const { result } = renderHook(() => useIdleNotificationSettings());
        
        expect(result.current.isLoading).toBe(true);
        
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
            expect(result.current.settings).toBeDefined();
        });
    });
    
    it('should update settings', async () => {
        const { result } = renderHook(() => useIdleNotificationSettings());
        
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        
        act(() => {
            result.current.updateSettings({
                ...result.current.settings,
                enabled: true
            });
        });
        
        await waitFor(() => {
            expect(result.current.settings.enabled).toBe(true);
        });
    });
    
    it('should validate settings before update', async () => {
        const { result } = renderHook(() => useIdleNotificationSettings());
        
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        
        act(() => {
            result.current.updateSettings({
                ...result.current.settings,
                idleThreshold: 200 // Invalid (max is 120)
            });
        });
        
        await waitFor(() => {
            expect(result.current.validation?.idleThreshold).toBeDefined();
        });
    });
});
```

### 4.5 フェーズ5: IPC統合（1-2日）

#### IPCハンドラーのテスト
```typescript
// src/main/ipc/handlers/IdleNotificationHandler.test.ts
describe('IdleNotificationHandler', () => {
    let handler: IdleNotificationHandler;
    let mockIdleStateManager: MockIdleStateManager;
    
    beforeEach(() => {
        mockIdleStateManager = new MockIdleStateManager();
        handler = new IdleNotificationHandler(mockIdleStateManager);
    });
    
    it('should handle get-idle-settings request', async () => {
        const settings = await handler.handle('idle:get-settings');
        
        expect(settings).toMatchObject({
            enabled: expect.any(Boolean),
            idleThreshold: expect.any(Number),
            notificationInterval: expect.any(Number)
        });
    });
    
    it('should handle update-idle-settings request', async () => {
        const newSettings = {
            enabled: true,
            idleThreshold: 15,
            notificationInterval: 20
        };
        
        await handler.handle('idle:update-settings', newSettings);
        
        expect(mockIdleStateManager.updateSettings)
            .toHaveBeenCalledWith(newSettings);
    });
    
    it('should handle get-idle-state request', async () => {
        mockIdleStateManager.setIdleState(true);
        
        const state = await handler.handle('idle:get-state');
        
        expect(state).toMatchObject({
            isIdle: true,
            idleDuration: expect.any(Number)
        });
    });
});
```

### 4.6 フェーズ6: E2Eテスト（2-3日）

#### End-to-End テスト
```typescript
// tests/e2e/idle-notification.spec.ts
import { test, expect } from '@playwright/test';
import { ElectronApplication } from '@playwright/test';
import { launchElectronApp } from './helpers';

test.describe('Idle Notification Feature', () => {
    let electronApp: ElectronApplication;
    
    test.beforeAll(async () => {
        electronApp = await launchElectronApp();
    });
    
    test.afterAll(async () => {
        await electronApp.close();
    });
    
    test('should enable idle notification in settings', async () => {
        // Open settings window
        const settingsWindow = await electronApp.firstWindow();
        await settingsWindow.click('[data-testid="settings-button"]');
        
        // Navigate to idle notification tab
        await settingsWindow.click('[data-testid="idle-notification-tab"]');
        
        // Enable the feature
        const toggleSwitch = settingsWindow.locator(
            '[data-testid="idle-notification-toggle"]'
        );
        await toggleSwitch.click();
        
        // Verify it's enabled
        await expect(toggleSwitch).toBeChecked();
    });
    
    test('should detect idle state and send notification', async () => {
        // Enable feature with short idle threshold for testing
        await electronApp.evaluate(async ({ app }) => {
            const settings = {
                enabled: true,
                idleThreshold: 0.1, // 6 seconds for testing
                notificationInterval: 0.1
            };
            await app.settingsStore.updateIdleNotificationSettings(settings);
        });
        
        // Wait for idle state
        await electronApp.waitForTimeout(7000);
        
        // Check if notification was sent
        const chatWindow = await electronApp.windows()[1];
        const messages = chatWindow.locator('[data-testid="chat-message"]');
        
        // Should have at least one idle notification message
        const idleMessage = messages.filter({
            has: chatWindow.locator('[data-source="idle_monitor"]')
        });
        
        await expect(idleMessage).toHaveCount(1);
    });
    
    test('should resume normal operation after activity', async () => {
        // Simulate idle state
        await electronApp.waitForTimeout(7000);
        
        // Simulate user activity
        const chatWindow = await electronApp.windows()[1];
        await chatWindow.type('[data-testid="chat-input"]', 'Hello');
        await chatWindow.click('[data-testid="send-button"]');
        
        // Verify idle state ended
        const idleState = await electronApp.evaluate(async ({ app }) => {
            return app.idleStateManager.isInIdleState();
        });
        
        expect(idleState).toBe(false);
    });
});
```

## 5. 技術的考慮事項

### 5.1 プライバシーとセキュリティ

#### ウィンドウタイトルのフィルタリング
```typescript
// src/infrastructure/gateways/WindowTitleFilter.ts
export class WindowTitleFilter {
    private sensitivePatterns = [
        /password/i,
        /token/i,
        /secret/i,
        /private/i,
        /incognito/i,
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email
    ];
    
    filter(title: string): string {
        // Remove file paths
        title = title.replace(/[A-Za-z]:\\[^|]*\|?/g, '');
        title = title.replace(/\/[^|]*\|?/g, '');
        
        // Check for sensitive patterns
        for (const pattern of this.sensitivePatterns) {
            if (pattern.test(title)) {
                return this.sanitizeTitle(title);
            }
        }
        
        return title;
    }
    
    private sanitizeTitle(title: string): string {
        // Extract only the application name
        const appMatch = title.match(/^([^-–—]+)/);
        return appMatch ? appMatch[1].trim() : 'Application';
    }
}
```

### 5.2 パフォーマンス最適化

#### アクティビティ監視の最適化
```typescript
export class OptimizedActivityMonitor {
    private lastCheck: number = 0;
    private readonly CHECK_INTERVAL = 1000; // 1秒ごと
    
    shouldCheck(): boolean {
        const now = Date.now();
        if (now - this.lastCheck >= this.CHECK_INTERVAL) {
            this.lastCheck = now;
            return true;
        }
        return false;
    }
}
```

#### トークンカウントの効率的な計算
```typescript
export class TokenCounter {
    private cache = new Map<string, number>();
    
    count(text: string): number {
        const cached = this.cache.get(text);
        if (cached !== undefined) return cached;
        
        // 簡易的なトークン計算（実際はtiktokenライブラリ等を使用）
        const tokens = Math.ceil(text.length / 4);
        this.cache.set(text, tokens);
        
        // キャッシュサイズ制限
        if (this.cache.size > 1000) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        return tokens;
    }
}
```

### 5.3 エラーハンドリング

#### 包括的なエラー処理
```typescript
export class IdleNotificationErrorHandler {
    async handleError(error: Error, context: ErrorContext): Promise<void> {
        console.error(`Idle notification error in ${context.component}:`, error);
        
        switch (context.severity) {
            case 'critical':
                // 機能を無効化
                await this.disableFeature();
                await this.notifyUser('アイドル通知機能でエラーが発生したため、一時的に無効化されました。');
                break;
                
            case 'warning':
                // リトライまたはフォールバック
                if (context.retryable && context.retryCount < 3) {
                    await this.scheduleRetry(context);
                } else {
                    await this.fallbackBehavior(context);
                }
                break;
                
            case 'info':
                // ログのみ
                console.info('Non-critical error:', error.message);
                break;
        }
    }
}
```

## 6. マイルストーンと成果物

### 6.1 マイルストーン

1. **M1: ドメイン層完成**（3日）
   - 全エンティティの実装とテスト完了
   - ドメインサービスのインターフェース定義

2. **M2: コアサービス実装**（4日）
   - IdleStateManagerの完全実装
   - StatusNotificationServiceの完全実装
   - 単体テストカバレッジ90%以上

3. **M3: UI統合**（3日）
   - 設定画面の実装
   - チャット画面への統合
   - UIテスト完了

4. **M4: システム統合**（3日）
   - IPC通信の実装
   - E2Eテストの実施
   - パフォーマンステスト

5. **M5: 最終調整**（2日）
   - バグ修正
   - ドキュメント更新
   - リリース準備

### 6.2 成果物

1. **コード成果物**
   - 新規サービスクラス（2つ）
   - 拡張エンティティ（3つ）
   - UIコンポーネント（1つ）
   - テストファイル（15+）

2. **ドキュメント成果物**
   - 本設計書
   - APIドキュメント
   - ユーザーガイド更新
   - リリースノート

3. **設定ファイル**
   - プロンプトテンプレート（JSON）
   - デフォルト設定値
   - 環境設定更新

## 7. リスクと対策

### 7.1 技術的リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Electron APIでのウィンドウタイトル取得制限 | 高 | 中 | OS固有APIへのフォールバック実装 |
| トークン数計算の精度 | 中 | 低 | 公式ライブラリ（tiktoken）の使用 |
| アイドル検出の精度 | 中 | 中 | 複数の指標での判定（マウス、キーボード、フォーカス） |

### 7.2 セキュリティリスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 個人情報の漏洩 | 高 | 中 | 厳格なフィルタリング実装 |
| AIへの不適切な情報送信 | 高 | 低 | ユーザー確認機能の追加 |
| ログの永続化 | 中 | 低 | 自動削除機能の実装 |

## 8. 今後の拡張可能性

1. **コンテキスト情報の拡張**
   - アプリケーション内のドキュメント名
   - ブラウザのタブ情報
   - ファイルシステムの状態

2. **AI応答のカスタマイズ**
   - ユーザーごとの応答スタイル
   - 時間帯別の挙動変更
   - ムード設定

3. **統計とアナリティクス**
   - 生産性レポート
   - アプリケーション使用時間
   - アイドルパターン分析

4. **他システムとの連携**
   - カレンダー連携
   - タスク管理ツール連携
   - 通知システム統合

## 9. まとめ

このアイドル通知機能は、LLMASアプリケーションに新たな次元のインタラクティビティをもたらします。Clean Architectureの原則に従い、既存のシステムと調和しながら、ユーザーのプライバシーを尊重した実装を行います。TDDアプローチにより品質を保証し、段階的な実装により着実に機能を構築していきます。

総開発期間は約15日を想定し、各フェーズでの成果物を明確に定義することで、進捗管理とリスク管理を効率的に行います。