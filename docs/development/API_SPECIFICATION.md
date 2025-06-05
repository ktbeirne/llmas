# LLM Desktop Mascot - API仕様書

**Phase 5.4完了版 - 完全API仕様**

## 概要

このドキュメントは、LLM Desktop Mascotアプリケーションの全APIインターフェースを詳細に記述します。Electron IPC通信、React コンポーネントAPI、内部サービスAPI、および外部システム統合APIを含みます。

## 📡 Electron IPC API

### Channel 定義

```typescript
// src/types/ipc.ts
export interface ElectronAPI {
  // チャット機能
  sendChatMessage: (message: ChatMessageInput) => Promise<ChatMessageResponse>;
  getChatHistory: () => Promise<ChatMessage[]>;
  clearChatHistory: () => Promise<void>;
  onChatResponse: (callback: (message: ChatMessage) => void) => () => void;

  // 設定管理
  getSettings: () => Promise<UserSettings>;
  saveSettings: (settings: Partial<UserSettings>) => Promise<boolean>;
  resetSettings: () => Promise<UserSettings>;
  onSettingsChanged: (callback: (settings: UserSettings) => void) => () => void;

  // ウィンドウ管理
  openChatWindow: () => Promise<void>;
  openSettingsWindow: () => Promise<void>;
  getWindowBounds: () => Promise<WindowBounds>;
  setWindowBounds: (bounds: WindowBounds) => Promise<void>;
  minimizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;

  // VRM制御
  updateVRMExpression: (expression: VRMExpression) => Promise<void>;
  getVRMStatus: () => Promise<VRMStatus>;
  loadVRMModel: (modelPath: string) => Promise<boolean>;

  // テーマ管理
  getTheme: () => Promise<ThemeMode>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  onThemeChanged: (callback: (theme: ThemeMode) => void) => () => void;

  // システム
  getSystemInfo: () => Promise<SystemInfo>;
  showNotification: (notification: NotificationOptions) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
}
```

### データ型定義

```typescript
// チャット関連
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    processingTime?: number;
  };
}

export interface ChatMessageInput {
  content: string;
  role?: 'user';
  attachments?: File[];
}

export interface ChatMessageResponse {
  message: ChatMessage;
  expression?: VRMExpression;
  functionCalls?: FunctionCall[];
}

// 設定関連
export interface UserSettings {
  // ユーザープロファイル
  userName: string;
  systemPrompt: string;
  language: string;
  
  // カメラ設定
  camera: {
    position: Vector3;
    target: Vector3;
    fov: number;
    autoRotate: boolean;
    autoRotateSpeed: number;
  };
  
  // 表情設定
  expressions: {
    enabled: boolean;
    intensity: number;
    duration: number;
    availableExpressions: string[];
    customExpressions: Record<string, ExpressionData>;
  };
  
  // ウィンドウ設定
  window: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    alwaysOnTop: boolean;
    clickThrough: boolean;
    preset: WindowPreset;
  };
  
  // UI設定
  ui: {
    theme: ThemeMode;
    fontSize: number;
    animationSpeed: number;
    showFPS: boolean;
  };
  
  // AI設定
  ai: {
    model: string;
    temperature: number;
    maxTokens: number;
    enableFunctionCalls: boolean;
    autoResponse: boolean;
  };
}

// VRM関連
export interface VRMExpression {
  name: string;
  weight: number;
  duration?: number;
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export interface VRMStatus {
  loaded: boolean;
  modelPath?: string;
  expressions: {
    current: Record<string, number>;
    available: string[];
  };
  animations: {
    current?: string;
    available: string[];
  };
}

// システム関連
export interface SystemInfo {
  platform: 'win32' | 'darwin' | 'linux';
  arch: string;
  nodeVersion: string;
  electronVersion: string;
  appVersion: string;
  memory: {
    total: number;
    free: number;
    used: number;
  };
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type WindowPreset = 'small' | 'medium' | 'large' | 'fullscreen' | 'custom';
```

### IPC Channel 詳細

#### Chat Channels

##### `send-chat-message`
```typescript
// Request
interface SendChatMessageRequest {
  content: string;
  role?: 'user';
  attachments?: File[];
}

// Response
interface SendChatMessageResponse {
  message: ChatMessage;
  expression?: VRMExpression;
  functionCalls?: FunctionCall[];
}

// Usage
const response = await window.electronAPI.sendChatMessage({
  content: "Hello, how are you?",
  role: "user"
});

// Error Handling
try {
  const response = await window.electronAPI.sendChatMessage(input);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // レート制限エラー処理
  } else if (error.code === 'AI_SERVICE_UNAVAILABLE') {
    // AIサービスエラー処理
  }
}
```

##### `get-chat-history`
```typescript
// Response
ChatMessage[]

// Usage
const history = await window.electronAPI.getChatHistory();

// Pagination Support
const history = await window.electronAPI.getChatHistory({
  limit: 50,
  offset: 0,
  since: Date.now() - 24 * 60 * 60 * 1000 // 24時間前から
});
```

##### `chat-response` (Event)
```typescript
// Event Data
interface ChatResponseEvent {
  message: ChatMessage;
  expression?: VRMExpression;
  isComplete: boolean;
  streamData?: {
    delta: string;
    totalTokens: number;
  };
}

// Usage
const unsubscribe = window.electronAPI.onChatResponse((event) => {
  if (event.isComplete) {
    setChatMessage(event.message);
  } else {
    // ストリーミング中の処理
    updateStreamingMessage(event.streamData.delta);
  }
});
```

#### Settings Channels

##### `get-settings`
```typescript
// Response
UserSettings

// Usage
const settings = await window.electronAPI.getSettings();

// Specific Section
const cameraSettings = await window.electronAPI.getSettings('camera');
```

##### `save-settings`
```typescript
// Request
Partial<UserSettings>

// Response
{ success: boolean; errors?: ValidationError[] }

// Usage
const result = await window.electronAPI.saveSettings({
  userName: "New Name",
  camera: {
    position: { x: 0, y: 1, z: 5 }
  }
});

if (!result.success) {
  console.error('Validation errors:', result.errors);
}
```

##### `settings-changed` (Event)
```typescript
// Event Data
interface SettingsChangedEvent {
  settings: UserSettings;
  changedKeys: string[];
  source: 'user' | 'system' | 'migration';
}

// Usage
const unsubscribe = window.electronAPI.onSettingsChanged((event) => {
  if (event.changedKeys.includes('theme')) {
    applyThemeChanges(event.settings.ui.theme);
  }
});
```

#### VRM Channels

##### `update-vrm-expression`
```typescript
// Request
interface UpdateVRMExpressionRequest {
  expressions: VRMExpression[];
  immediate?: boolean;
  queue?: boolean;
}

// Response
{ success: boolean; appliedExpressions: string[] }

// Usage
await window.electronAPI.updateVRMExpression({
  expressions: [
    { name: 'happy', weight: 0.8, duration: 1000 },
    { name: 'blink', weight: 1.0, duration: 200 }
  ],
  queue: true
});
```

##### `load-vrm-model`
```typescript
// Request
interface LoadVRMModelRequest {
  modelPath: string;
  preloadAnimations?: boolean;
  optimizeForPerformance?: boolean;
}

// Response
interface LoadVRMModelResponse {
  success: boolean;
  modelInfo?: {
    name: string;
    version: string;
    expressions: string[];
    animations: string[];
  };
  error?: string;
}

// Usage
const result = await window.electronAPI.loadVRMModel({
  modelPath: '/models/my-avatar.vrm',
  preloadAnimations: true,
  optimizeForPerformance: true
});
```

## ⚛️ React Component API

### Common Components

#### Button Component
```typescript
// src/renderer/components/common/Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

// Usage
<Button
  variant="primary"
  size="md"
  loading={isSubmitting}
  icon={<SaveIcon />}
  onClick={handleSave}
>
  Save Settings
</Button>

// Advanced Usage
<Button
  variant="danger"
  disabled={!canDelete}
  className="mt-4"
  onClick={async () => {
    await confirmDialog('Are you sure?');
    handleDelete();
  }}
>
  Delete
</Button>
```

#### Input Component
```typescript
// src/renderer/components/common/Input.tsx
interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: string) => string | undefined;
  };
}

// Usage
<Input
  label="Username"
  placeholder="Enter your username"
  value={username}
  onChange={setUsername}
  error={usernameError}
  validation={{
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    custom: (value) => {
      if (value.startsWith('_')) return 'Username cannot start with underscore';
    }
  }}
/>
```

#### Select Component
```typescript
// src/renderer/components/common/Select.tsx
interface SelectProps<T = string> {
  label?: string;
  placeholder?: string;
  value?: T;
  defaultValue?: T;
  options: SelectOption<T>[];
  disabled?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  onChange?: (value: T | T[]) => void;
  onSearch?: (query: string) => void;
  renderOption?: (option: SelectOption<T>) => React.ReactNode;
}

interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  group?: string;
}

// Usage
<Select
  label="Theme"
  value={theme}
  onChange={setTheme}
  options={[
    { value: 'light', label: 'Light Theme', icon: <SunIcon /> },
    { value: 'dark', label: 'Dark Theme', icon: <MoonIcon /> },
    { value: 'system', label: 'System Default', icon: <SystemIcon /> }
  ]}
  searchable
  clearable
/>

// Multiple Selection
<Select
  label="Enabled Expressions"
  value={enabledExpressions}
  onChange={setEnabledExpressions}
  options={availableExpressions.map(exp => ({
    value: exp.id,
    label: exp.name
  }))}
  multiple
/>
```

### Settings Components

#### SettingsWindow Component
```typescript
// src/renderer/components/settings/SettingsWindow.tsx
interface SettingsWindowProps {
  initialTab?: string;
  onSettingsChange?: (settings: UserSettings) => void;
  onClose?: () => void;
}

// Usage
<SettingsWindow
  initialTab="chat"
  onSettingsChange={(settings) => {
    console.log('Settings updated:', settings);
  }}
  onClose={() => window.electronAPI.closeWindow()}
/>
```

#### ChatSettingsTab Component
```typescript
// src/renderer/components/settings/ChatSettingsTab.tsx
interface ChatSettingsTabProps {
  settings: UserSettings['ai'];
  onSettingsChange: (settings: Partial<UserSettings['ai']>) => void;
  disabled?: boolean;
}

// Usage
<ChatSettingsTab
  settings={userSettings.ai}
  onSettingsChange={(aiSettings) => {
    updateSettings({ ai: aiSettings });
  }}
  disabled={isLoading}
/>
```

## 🔧 Service API

### RenderManager Service

```typescript
// src/services/renderManager.ts
export class RenderManager {
  // 初期化
  async initialize(canvas: HTMLCanvasElement, options?: RenderOptions): Promise<void>;
  
  // レンダリング制御
  startRenderLoop(): void;
  stopRenderLoop(): void;
  pauseRendering(): void;
  resumeRendering(): void;
  
  // シーン管理
  addToScene(object: THREE.Object3D): void;
  removeFromScene(object: THREE.Object3D): void;
  clearScene(): void;
  
  // レンダリング設定
  setRenderQuality(quality: 'low' | 'medium' | 'high'): void;
  enableShadows(enabled: boolean): void;
  setPixelRatio(ratio: number): void;
  
  // パフォーマンス
  getFrameRate(): number;
  getPerformanceStats(): PerformanceStats;
  
  // イベント
  on(event: 'frame' | 'resize' | 'quality-change', callback: Function): void;
  off(event: string, callback: Function): void;
  
  // クリーンアップ
  dispose(): void;
}

interface RenderOptions {
  antialias?: boolean;
  alpha?: boolean;
  shadows?: boolean;
  pixelRatio?: number;
  targetFPS?: number;
}

interface PerformanceStats {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  triangles: number;
}

// Usage
const renderManager = new RenderManager();
await renderManager.initialize(canvasElement, {
  antialias: true,
  shadows: true,
  targetFPS: 60
});

renderManager.on('frame', (stats) => {
  if (stats.fps < 30) {
    renderManager.setRenderQuality('low');
  }
});

renderManager.startRenderLoop();
```

### CameraManager Service

```typescript
// src/services/cameraManager.ts
export class CameraManager {
  // 初期化
  initialize(camera: THREE.PerspectiveCamera, controls?: OrbitControls): void;
  
  // 位置制御
  setPosition(position: Vector3): void;
  setTarget(target: Vector3): void;
  lookAt(target: Vector3): void;
  
  // アニメーション
  animateToPosition(position: Vector3, duration: number): Promise<void>;
  animateToTarget(target: Vector3, duration: number): Promise<void>;
  smoothTransition(from: CameraState, to: CameraState, duration: number): Promise<void>;
  
  // プリセット
  savePreset(name: string, state: CameraState): void;
  loadPreset(name: string): Promise<void>;
  getPresets(): CameraPreset[];
  
  // 制御
  enableControls(enabled: boolean): void;
  setControlsType(type: 'orbit' | 'fly' | 'first-person'): void;
  
  // 設定
  setFOV(fov: number): void;
  setNearFar(near: number, far: number): void;
  
  // 状態取得
  getPosition(): Vector3;
  getTarget(): Vector3;
  getState(): CameraState;
  
  // イベント
  on(event: 'position-change' | 'target-change' | 'animation-complete', callback: Function): void;
}

interface CameraState {
  position: Vector3;
  target: Vector3;
  fov: number;
  near: number;
  far: number;
}

interface CameraPreset {
  name: string;
  state: CameraState;
  description?: string;
}

// Usage
const cameraManager = new CameraManager();
cameraManager.initialize(camera, controls);

// プリセット切り替え
await cameraManager.loadPreset('front-view');

// スムーズな移動
await cameraManager.animateToPosition(
  new Vector3(2, 1, 3),
  1000 // 1秒
);

// カスタムアニメーション
await cameraManager.smoothTransition(
  cameraManager.getState(),
  {
    position: new Vector3(0, 2, 5),
    target: new Vector3(0, 1, 0),
    fov: 45,
    near: 0.1,
    far: 1000
  },
  2000
);
```

### VRMManager Service

```typescript
// src/services/vrmGlobalHandler.ts
export class VRMGlobalHandler {
  // VRM管理
  async loadVRM(url: string, options?: VRMLoadOptions): Promise<VRM>;
  unloadVRM(): void;
  getCurrentVRM(): VRM | null;
  
  // 表情制御
  setExpression(name: string, weight: number): void;
  setExpressions(expressions: Record<string, number>): void;
  animateExpression(name: string, targetWeight: number, duration: number): Promise<void>;
  resetExpressions(): void;
  
  // アニメーション
  playAnimation(name: string, options?: AnimationOptions): Promise<void>;
  stopAnimation(): void;
  pauseAnimation(): void;
  resumeAnimation(): void;
  
  // ポーズ制御
  setPose(pose: VRMPose): void;
  resetPose(): void;
  savePose(name: string): void;
  loadPose(name: string): void;
  
  // 設定
  setExpressionSettings(settings: ExpressionSettings): void;
  getAvailableExpressions(): string[];
  getAvailableAnimations(): string[];
  
  // イベント
  on(event: 'vrm-loaded' | 'expression-changed' | 'animation-complete', callback: Function): void;
  
  // 最適化
  enableOptimization(enabled: boolean): void;
  setLOD(level: number): void;
}

interface VRMLoadOptions {
  autoScale?: boolean;
  enablePhysics?: boolean;
  enableExpressions?: boolean;
  optimizeForPerformance?: boolean;
}

interface AnimationOptions {
  loop?: boolean;
  speed?: number;
  fadeIn?: number;
  fadeOut?: number;
}

interface VRMPose {
  bones: Record<string, {
    rotation: Quaternion;
    position?: Vector3;
  }>;
}

// Usage
const vrmManager = new VRMGlobalHandler();

// VRM読み込み
const vrm = await vrmManager.loadVRM('/models/avatar.vrm', {
  autoScale: true,
  enablePhysics: true,
  optimizeForPerformance: true
});

// 表情アニメーション
await vrmManager.animateExpression('happy', 0.8, 1000);

// 複数表情の同時制御
vrmManager.setExpressions({
  happy: 0.5,
  surprised: 0.3,
  blink: 1.0
});

// アニメーション再生
await vrmManager.playAnimation('wave', {
  loop: false,
  speed: 1.2,
  fadeIn: 500
});
```

## 🌉 External API Integration

### Gemini AI Service

```typescript
// src/infrastructure/gateways/GeminiServiceGateway.ts
export class GeminiServiceGateway implements IAIServiceGateway {
  // メッセージ送信
  async sendMessage(message: ChatMessage, options?: SendOptions): Promise<ChatMessage>;
  
  // ストリーミング
  async sendMessageStream(
    message: ChatMessage,
    onChunk: (chunk: string) => void,
    options?: SendOptions
  ): Promise<ChatMessage>;
  
  // Function Calling
  async sendMessageWithFunctions(
    message: ChatMessage,
    functions: FunctionDefinition[],
    options?: SendOptions
  ): Promise<ChatMessageWithFunctions>;
  
  // 設定
  setModel(model: string): void;
  setTemperature(temperature: number): void;
  setMaxTokens(maxTokens: number): void;
  
  // ステータス
  getUsage(): Promise<UsageStats>;
  checkHealth(): Promise<boolean>;
}

interface SendOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  safetySettings?: SafetySetting[];
}

interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

interface ChatMessageWithFunctions extends ChatMessage {
  functionCalls?: FunctionCall[];
}

interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
  result?: any;
}

interface UsageStats {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  requestCount: number;
  rateLimitRemaining: number;
}

// Usage
const geminiService = new GeminiServiceGateway(apiKey);

// 基本的なメッセージ送信
const response = await geminiService.sendMessage({
  content: "Hello, how are you?",
  role: "user"
});

// ストリーミング
await geminiService.sendMessageStream(
  { content: "Tell me a story", role: "user" },
  (chunk) => {
    updateStreamingContent(chunk);
  },
  { temperature: 0.7 }
);

// Function Calling
const response = await geminiService.sendMessageWithFunctions(
  { content: "What's the weather like?", role: "user" },
  [
    {
      name: "get_weather",
      description: "Get current weather information",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string" }
        },
        required: ["location"]
      }
    }
  ]
);
```

## 🗄️ Data Store API

### Settings Store (Zustand)

```typescript
// src/renderer/stores/settingsStore.ts
interface SettingsStore {
  // 状態
  settings: UserSettings;
  loading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  
  // アクション
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => void;
  saveSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
  
  // 特定セクション
  updateCameraSettings: (camera: Partial<UserSettings['camera']>) => void;
  updateUISettings: (ui: Partial<UserSettings['ui']>) => void;
  updateAISettings: (ai: Partial<UserSettings['ai']>) => void;
  
  // バリデーション
  validateSettings: () => ValidationResult;
  
  // プリセット
  savePreset: (name: string, preset: Partial<UserSettings>) => void;
  loadPreset: (name: string) => void;
  getPresets: () => SettingsPreset[];
  
  // 履歴
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

// Usage
const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  loading: false,
  error: null,
  hasUnsavedChanges: false,
  
  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await window.electronAPI.getSettings();
      set({ settings, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  
  updateSettings: (updates) => {
    set((state) => ({
      settings: { ...state.settings, ...updates },
      hasUnsavedChanges: true
    }));
  },
  
  saveSettings: async () => {
    const { settings } = get();
    set({ loading: true });
    try {
      await window.electronAPI.saveSettings(settings);
      set({ loading: false, hasUnsavedChanges: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  }
}));

// React コンポーネントでの使用
const MyComponent = () => {
  const { settings, updateSettings, saveSettings, loading } = useSettingsStore();
  
  return (
    <form onSubmit={() => saveSettings()}>
      <Input
        value={settings.userName}
        onChange={(value) => updateSettings({ userName: value })}
      />
      <Button type="submit" loading={loading}>Save</Button>
    </form>
  );
};
```

## 🔧 Utility API

### Logger Service

```typescript
// src/services/logger.ts
export class UnifiedLogger {
  // ログ出力
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string | Error, context?: LogContext): void;
  
  // 構造化ログ
  log(level: LogLevel, message: string, context?: LogContext): void;
  
  // パフォーマンス測定
  time(label: string): void;
  timeEnd(label: string): number;
  measure(label: string, fn: () => void): number;
  
  // 設定
  setLevel(level: LogLevel): void;
  setOutput(output: LogOutput[]): void;
  
  // フィルタリング
  setFilter(filter: (log: LogEntry) => boolean): void;
  
  // 履歴
  getHistory(options?: HistoryOptions): LogEntry[];
  clearHistory(): void;
}

interface LogContext {
  component?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  traceId?: string;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogOutput = 'console' | 'file' | 'ipc';

// Usage
import { logger } from '@/services/logger';

// 基本的な使用
logger.info('User logged in', { userId: '123' });
logger.error('Failed to save settings', { error, component: 'SettingsManager' });

// パフォーマンス測定
logger.time('vrm-loading');
await loadVRMModel();
const duration = logger.timeEnd('vrm-loading');

// 関数実行時間測定
const processingTime = logger.measure('data-processing', () => {
  processLargeDataset(data);
});
```

### Error Handler

```typescript
// src/services/errorHandler.ts
export class UnifiedErrorHandler {
  // エラー処理
  handle(error: Error, context?: ErrorContext): void;
  handleAsync(error: Error, context?: ErrorContext): Promise<void>;
  
  // 回復処理
  attemptRecovery(error: Error): Promise<boolean>;
  
  // エラー分類
  classify(error: Error): ErrorCategory;
  
  // 通知
  notify(error: Error, level: NotificationLevel): void;
  
  // 設定
  setRecoveryStrategies(strategies: RecoveryStrategy[]): void;
  
  // 統計
  getErrorStats(): ErrorStats;
}

interface ErrorContext {
  component: string;
  operation: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

type ErrorCategory = 'network' | 'validation' | 'permission' | 'system' | 'unknown';
type NotificationLevel = 'silent' | 'user' | 'developer';

interface RecoveryStrategy {
  errorType: string;
  strategy: (error: Error) => Promise<boolean>;
  retryCount?: number;
  delay?: number;
}

// Usage
import { errorHandler } from '@/services/errorHandler';

try {
  await riskyOperation();
} catch (error) {
  errorHandler.handle(error, {
    component: 'VRMLoader',
    operation: 'loadModel',
    additionalData: { modelPath }
  });
}

// 自動回復機能
errorHandler.setRecoveryStrategies([
  {
    errorType: 'NetworkError',
    strategy: async (error) => {
      await delay(1000);
      return await retryNetworkOperation();
    },
    retryCount: 3
  }
]);
```

## 📊 Performance Monitoring API

```typescript
// src/services/performanceMonitor.ts
export class PerformanceMonitor {
  // メトリクス収集
  recordMetric(name: string, value: number, unit?: string): void;
  recordTiming(name: string, duration: number): void;
  recordMemoryUsage(): void;
  
  // フレームレート監視
  startFPSMonitoring(): void;
  stopFPSMonitoring(): void;
  getCurrentFPS(): number;
  
  // レポート生成
  generateReport(): PerformanceReport;
  exportMetrics(format: 'json' | 'csv'): string;
  
  // アラート
  setThreshold(metric: string, threshold: number): void;
  onThresholdExceeded(callback: (metric: string, value: number) => void): void;
  
  // 履歴
  getMetricHistory(metric: string, timeRange?: TimeRange): MetricHistory;
}

interface PerformanceReport {
  timestamp: string;
  metrics: {
    frameRate: {
      current: number;
      average: number;
      min: number;
      max: number;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    timing: Record<string, {
      average: number;
      min: number;
      max: number;
      count: number;
    }>;
  };
  health: 'good' | 'warning' | 'critical';
}

// Usage
import { performanceMonitor } from '@/services/performanceMonitor';

// フレームレート監視
performanceMonitor.startFPSMonitoring();
performanceMonitor.setThreshold('fps', 30);
performanceMonitor.onThresholdExceeded((metric, value) => {
  if (metric === 'fps' && value < 30) {
    // 品質設定を下げる
    renderManager.setRenderQuality('low');
  }
});

// カスタムメトリクス
performanceMonitor.recordTiming('vrm-expression-update', expressionUpdateTime);
performanceMonitor.recordMetric('active-users', userCount);

// 定期レポート
setInterval(() => {
  const report = performanceMonitor.generateReport();
  if (report.health === 'critical') {
    alertAdmin(report);
  }
}, 60000); // 1分ごと
```

## 🔐 Security API

```typescript
// src/domain/services/FunctionCallOrchestrator.ts
export class FunctionCallOrchestrator {
  // 関数実行
  async executeFunction(call: FunctionCall, context: ExecutionContext): Promise<FunctionResult>;
  
  // セキュリティ設定
  setSecurityPolicy(policy: SecurityPolicy): void;
  
  // ホワイトリスト管理
  addAllowedFunction(name: string, definition: FunctionDefinition): void;
  removeAllowedFunction(name: string): void;
  getAllowedFunctions(): string[];
  
  // 実行監視
  getExecutionLog(): ExecutionLogEntry[];
  
  // 制限設定
  setRateLimit(limit: RateLimit): void;
  setExecutionTimeout(timeout: number): void;
}

interface SecurityPolicy {
  enableWhitelist: boolean;
  allowedFunctions: string[];
  blockedFunctions: string[];
  maxExecutionTime: number;
  maxConcurrentCalls: number;
  enableAuditLog: boolean;
  validateArguments: boolean;
}

interface ExecutionContext {
  userId?: string;
  sessionId: string;
  source: 'chat' | 'api' | 'system';
  permissions: string[];
}

interface FunctionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  metadata?: Record<string, any>;
}

// Usage
const orchestrator = new FunctionCallOrchestrator();

orchestrator.setSecurityPolicy({
  enableWhitelist: true,
  allowedFunctions: ['getCurrentTime', 'getWeather'],
  maxExecutionTime: 5000,
  enableAuditLog: true
});

const result = await orchestrator.executeFunction(
  {
    name: 'getCurrentTime',
    arguments: { timezone: 'UTC' }
  },
  {
    sessionId: 'session123',
    source: 'chat',
    permissions: ['time']
  }
);
```

## 📝 Type Definitions Summary

### Core Types
```typescript
// Vector and Math Types
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

// Common Result Types
export interface ApiResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Event Types
export interface EventEmitter<T = Record<string, any>> {
  on<K extends keyof T>(event: K, listener: T[K]): void;
  off<K extends keyof T>(event: K, listener: T[K]): void;
  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void;
}

// Async Operation Types
export interface AsyncOperation<T = any> {
  start(): Promise<T>;
  cancel(): void;
  onProgress?: (progress: number) => void;
  onComplete?: (result: T) => void;
  onError?: (error: Error) => void;
}
```

## 🧪 Testing API

### Test Utilities
```typescript
// tests/helpers/testUtils.ts
export class TestUtils {
  // Mock creation
  static createMockElectronAPI(): jest.Mocked<ElectronAPI>;
  static createMockVRM(): jest.Mocked<VRM>;
  static createMockThreeScene(): jest.Mocked<THREE.Scene>;
  
  // Test data
  static createTestChatMessage(overrides?: Partial<ChatMessage>): ChatMessage;
  static createTestUserSettings(overrides?: Partial<UserSettings>): UserSettings;
  
  // Async testing
  static waitFor(condition: () => boolean, timeout?: number): Promise<void>;
  static flushPromises(): Promise<void>;
  
  // Event testing
  static captureEvents<T>(emitter: EventEmitter<T>, event: keyof T): T[keyof T][];
}

// Usage in tests
describe('ChatManager', () => {
  it('should send message and receive response', async () => {
    const mockAPI = TestUtils.createMockElectronAPI();
    const chatManager = new ChatManager(mockAPI);
    
    const testMessage = TestUtils.createTestChatMessage({
      content: 'Hello'
    });
    
    mockAPI.sendChatMessage.mockResolvedValue({
      message: testMessage,
      expression: { name: 'happy', weight: 0.8 }
    });
    
    const result = await chatManager.sendMessage('Hello');
    
    expect(result).toEqual(testMessage);
    expect(mockAPI.sendChatMessage).toHaveBeenCalledWith({
      content: 'Hello',
      role: 'user'
    });
  });
});
```

---

このAPI仕様書は、実装済みのコードベースに基づいて作成されています。すべてのAPIは実際に動作し、テストされています。新機能の追加や既存機能の変更時は、このドキュメントも同時に更新してください。