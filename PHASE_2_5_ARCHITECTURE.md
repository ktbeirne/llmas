# Phase 2.5 アーキテクチャ設計書

## 概要

Phase 2.5は、Phase 2で実装された高品質な設定コンポーネントをさらに改善し、React移行への完璧な準備を整えるための重要なフェーズです。アーキテクチャの統一化、抽象化レイヤーの導入、型安全性の向上を通じて、長期保守性とReact移行成功率を大幅に向上させます。

## 現状分析と課題

### Phase 2の成果
✅ **4コンポーネント正常分離** (890行, 272テスト)
✅ **TDD準拠の高品質実装**
✅ **TypeScript型安全性完全確保**
✅ **責務分離アーキテクチャ実現**

### 特定された課題
🔴 **アーキテクチャ不統一**: 実装品質に格差
🔴 **React移行阻害要因**: DOM直接依存設計
🔴 **コードの重複**: 共通パターンの未統一
🔴 **パフォーマンス格差**: 最適化レベルの不統一

## 目標アーキテクチャ

### 1. 統一されたコンポーネント階層

```
BaseSettingsComponent<TSettings, TBindings>
├── WindowSettingsComponent
├── ChatSettingsComponent  
├── ThemeSettingsComponent
└── ExpressionSettingsComponent

UIAdapter Interface
├── VanillaUIAdapter (現在のDOM実装)
└── ReactUIAdapter (React移行用)

PerformanceManager (全コンポーネント共通)
ErrorHandler (統一エラー戦略)
ResourceManager (メモリリーク防止)
```

### 2. BaseSettingsComponent設計

```typescript
/**
 * 全設定コンポーネントの基底クラス
 * 統一されたライフサイクル、エラーハンドリング、パフォーマンス管理を提供
 */
abstract class BaseSettingsComponent<TSettings, TBindings> implements SettingsComponent {
  // 状態管理
  protected currentSettings: Partial<TSettings> = {};
  protected isInitialized = false;
  protected isDisposed = false;
  
  // リソース管理
  protected eventListeners: EventListenerEntry[] = [];
  protected dynamicElements: HTMLElement[] = [];
  protected resourceManager = new ResourceManager();
  
  // パフォーマンス管理
  protected performanceManager = new PerformanceManager();
  
  // UI抽象化
  protected uiAdapter: UIAdapter<TBindings>;
  
  // 抽象メソッド（各コンポーネントで実装）
  protected abstract initializeBindings(): TBindings;
  protected abstract validateSettings(settings: TSettings): ValidationError[];
  protected abstract getDefaultSettings(): TSettings;
  
  // 統一されたライフサイクル
  async initialize(): Promise<void> {
    if (this.isInitialized || this.isDisposed) return;
    
    const operation = `${this.constructor.name}初期化`;
    this.performanceManager.start(operation);
    
    try {
      this.initializeElements();
      this.setupEventListeners();
      await this.loadSettings();
      this.isInitialized = true;
      console.log(`[${this.constructor.name}] 初期化完了`);
    } catch (error) {
      this.handleError(error, operation);
      throw error;
    } finally {
      this.performanceManager.end(operation);
    }
  }
  
  // 統一されたエラーハンドリング
  protected handleError(error: Error, operation: string): void {
    ErrorHandler.handle(error, {
      context: `${this.constructor.name}:${operation}`,
      showToUser: true,
      retry: false,
      fallback: () => this.loadDefaultSettings()
    });
  }
  
  // 統一されたリソース管理
  dispose(): void {
    if (this.isDisposed) return;
    
    this.resourceManager.cleanup();
    this.eventListeners.forEach(({ element, type, listener }) => {
      safeRemoveEventListener(element, type, listener);
    });
    
    this.isDisposed = true;
    this.isInitialized = false;
    console.log(`[${this.constructor.name}] リソース解放完了`);
  }
}
```

### 3. UI抽象化レイヤー

```typescript
/**
 * UI操作の抽象化インターフェース
 * DOM操作とReact Hooksを統一的に扱う
 */
interface UIAdapter<TBindings> {
  // UI要素のバインディング
  bind<T>(controlId: string, config: UIControlConfig<T>): UIControl<T>;
  
  // 一括UI更新
  updateUI(bindings: Partial<TBindings>): void;
  
  // イベント管理
  addEventListener<K extends keyof HTMLElementEventMap>(
    elementId: string,
    type: K,
    listener: EventListener
  ): void;
  
  // リソース管理
  cleanup(): void;
}

/**
 * UI操作の統一インターフェース
 */
interface UIControl<T> {
  readonly value: T;
  setValue(value: T): void;
  setDisabled(disabled: boolean): void;
  setValidation(errors: ValidationError[]): void;
  focus(): void;
}

/**
 * 現在のDOM操作実装
 */
class VanillaUIAdapter<TBindings> implements UIAdapter<TBindings> {
  private controls = new Map<string, UIControl<any>>();
  private eventListeners: EventListenerEntry[] = [];
  
  bind<T>(controlId: string, config: UIControlConfig<T>): UIControl<T> {
    const element = safeGetElementById(controlId);
    if (!element) throw new Error(`Element not found: ${controlId}`);
    
    const control = new VanillaUIControl<T>(element, config);
    this.controls.set(controlId, control);
    return control;
  }
  
  // DOM操作の具体的実装
}

/**
 * React移行用実装（将来使用）
 */
class ReactUIAdapter<TBindings> implements UIAdapter<TBindings> {
  private hooks = new Map<string, ReactHookWrapper<any>>();
  
  bind<T>(controlId: string, config: UIControlConfig<T>): UIControl<T> {
    // React Hooks ベースの実装
    const [value, setValue] = useState<T>(config.defaultValue);
    const [disabled, setDisabled] = useState(false);
    const [validation, setValidation] = useState<ValidationError[]>([]);
    
    return {
      get value() { return value; },
      setValue,
      setDisabled,
      setValidation,
      focus: () => { /* React ref経由 */ }
    };
  }
}
```

### 4. 型定義の改善

```typescript
/**
 * DOM依存を排除した新しい型定義
 */

// 厳密な文字列リテラル型
type WindowSizePreset = 'small' | 'medium' | 'large' | 'custom';
type ThemeId = 'default' | 'dark' | 'sakura' | 'ocean';
type SettingsSection = 'window' | 'chat' | 'theme' | 'expressions';

// UI操作の抽象化
interface UIControlConfig<T> {
  defaultValue: T;
  validation?: (value: T) => ValidationError[];
  onChange?: (value: T) => void;
  debounceMs?: number;
}

// 設定データの型定義（DOM非依存）
interface WindowSettingsData {
  preset: WindowSizePreset;
  width: number;
  height: number;
  vrmModelPath: string;
}

interface ChatSettingsData {
  userName: string;
  mascotName: string;
  systemPrompt: string;
}

interface ThemeSettingsData {
  selectedTheme: ThemeId;
  availableThemes: ThemeInfo[];
}

interface ExpressionSettingsData {
  [expressionName: string]: {
    enabled: boolean;
    defaultWeight: number;
  };
}

// UIバインディングの型定義（React移行準備）
interface WindowSettingsBindings {
  preset: UIControl<WindowSizePreset>;
  customWidth: UIControl<number>;
  customHeight: UIControl<number>;
  vrmModelPath: UIControl<string>;
}

interface ChatSettingsBindings {
  userName: UIControl<string>;
  mascotName: UIControl<string>;
  systemPrompt: UIControl<string>;
}
```

### 5. パフォーマンス管理の統一

```typescript
/**
 * 全コンポーネント共通のパフォーマンス管理
 */
class PerformanceManager {
  private operations = new Map<string, number>();
  private readonly PERFORMANCE_THRESHOLD = 1000; // 1秒
  
  start(operation: string): void {
    this.operations.set(operation, performance.now());
    console.log(`[Performance] ${operation} 開始`);
  }
  
  end(operation: string): number {
    const startTime = this.operations.get(operation);
    if (!startTime) return 0;
    
    const duration = performance.now() - startTime;
    console.log(`[Performance] ${operation} 完了: ${duration.toFixed(2)}ms`);
    
    if (duration > this.PERFORMANCE_THRESHOLD) {
      console.warn(`[Performance] 性能警告: ${operation} が${this.PERFORMANCE_THRESHOLD}ms超過`);
    }
    
    this.operations.delete(operation);
    return duration;
  }
  
  // DOM操作の最適化
  static batchDOMUpdates(updates: Array<() => void>): void {
    const fragment = document.createDocumentFragment();
    updates.forEach(update => update());
    // DocumentFragment経由で一括更新
  }
  
  // メモリ使用量監視
  static checkMemoryUsage(): MemoryInfo {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0 };
  }
}

/**
 * リソース管理の統一
 */
class ResourceManager {
  private resources: DisposableResource[] = [];
  private eventListeners: EventListenerEntry[] = [];
  private timers: NodeJS.Timeout[] = [];
  
  track<T extends DisposableResource>(resource: T): T {
    this.resources.push(resource);
    return resource;
  }
  
  trackEventListener(entry: EventListenerEntry): void {
    this.eventListeners.push(entry);
  }
  
  trackTimer(timer: NodeJS.Timeout): void {
    this.timers.push(timer);
  }
  
  cleanup(): void {
    // リソースの解放
    this.resources.forEach(resource => {
      try {
        resource.dispose();
      } catch (error) {
        console.warn('[ResourceManager] リソース解放エラー:', error);
      }
    });
    
    // イベントリスナーの削除
    this.eventListeners.forEach(({ element, type, listener }) => {
      safeRemoveEventListener(element, type, listener);
    });
    
    // タイマーのクリア
    this.timers.forEach(timer => clearTimeout(timer));
    
    this.resources = [];
    this.eventListeners = [];
    this.timers = [];
  }
}
```

### 6. エラーハンドリングの統一

```typescript
/**
 * 統一されたエラーハンドリング戦略
 */
interface ErrorStrategy {
  context: string;
  showToUser: boolean;
  retry: boolean;
  fallback?: () => void;
  severity: 'low' | 'medium' | 'high';
}

class ErrorHandler {
  private static errorLog: ErrorEntry[] = [];
  private static readonly MAX_LOG_SIZE = 100;
  
  static handle(error: Error, strategy: ErrorStrategy): void {
    // エラーログ記録
    const entry: ErrorEntry = {
      timestamp: new Date(),
      error: error.message,
      stack: error.stack,
      context: strategy.context,
      severity: strategy.severity
    };
    
    this.logError(entry);
    
    // コンソール出力
    const logFunction = strategy.severity === 'high' ? console.error : 
                       strategy.severity === 'medium' ? console.warn : console.log;
    logFunction(`[${strategy.context}]`, error);
    
    // ユーザー通知
    if (strategy.showToUser) {
      if (strategy.retry) {
        this.showRetryableError(error, strategy);
      } else {
        showErrorMessage(`${strategy.context}でエラーが発生しました`, error);
      }
    }
    
    // フォールバック実行
    if (strategy.fallback) {
      try {
        strategy.fallback();
      } catch (fallbackError) {
        console.error('[ErrorHandler] フォールバック実行エラー:', fallbackError);
      }
    }
  }
  
  private static showRetryableError(error: Error, strategy: ErrorStrategy): void {
    const message = `${strategy.context}でエラーが発生しました。再試行しますか？\n詳細: ${error.message}`;
    if (confirm(message)) {
      if (strategy.fallback) {
        strategy.fallback();
      }
    }
  }
  
  private static logError(entry: ErrorEntry): void {
    this.errorLog.push(entry);
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog.shift();
    }
  }
  
  static getErrorLog(): ErrorEntry[] {
    return [...this.errorLog];
  }
  
  static clearErrorLog(): void {
    this.errorLog = [];
  }
}
```

## React移行準備戦略

### 1. 段階的移行アプローチ

```typescript
/**
 * React移行のための段階的戦略
 */

// Phase 3.1: React基盤構築
interface ReactMigrationPhase1 {
  // Context Provider設計
  createSettingsContext(): React.Context<SettingsService>;
  
  // Custom Hooks実装
  useWindowSettings(): [WindowSettingsData, (data: WindowSettingsData) => Promise<void>];
  useChatSettings(): [ChatSettingsData, (data: ChatSettingsData) => Promise<void>];
  useThemeSettings(): [ThemeSettingsData, (data: ThemeSettingsData) => Promise<void>];
  useExpressionSettings(): [ExpressionSettingsData, (data: ExpressionSettingsData) => Promise<void>];
  
  // Service Layer抽象化
  implementSettingsService(): SettingsService;
}

// Phase 3.2: コンポーネント変換
interface ReactMigrationPhase2 {
  // 現在のクラスコンポーネント → React関数コンポーネント
  convertWindowSettings(): React.FC<WindowSettingsProps>;
  convertChatSettings(): React.FC<ChatSettingsProps>;
  convertThemeSettings(): React.FC<ThemeSettingsProps>;
  convertExpressionSettings(): React.FC<ExpressionSettingsProps>;
  
  // 共通コンポーネント作成
  createFormComponents(): FormComponentLibrary;
  createUIComponents(): UIComponentLibrary;
}
```

### 2. データフロー設計

```typescript
/**
 * React移行後のデータフロー
 */

// Context Provider
const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const settingsService = useSettingsService();
  
  return (
    <SettingsContext.Provider value={settingsService}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom Hook例
function useWindowSettings() {
  const settingsService = useContext(SettingsContext);
  const [settings, setSettings] = useState<WindowSettingsData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const updateSettings = useCallback(async (newSettings: WindowSettingsData) => {
    try {
      await settingsService.save('window', newSettings);
      setSettings(newSettings);
    } catch (error) {
      setError(error);
      throw error;
    }
  }, [settingsService]);
  
  useEffect(() => {
    settingsService.load<WindowSettingsData>('window')
      .then(setSettings)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [settingsService]);
  
  return { settings, updateSettings, loading, error };
}

// React Component例
const WindowSettingsComponent: React.FC = () => {
  const { settings, updateSettings, loading, error } = useWindowSettings();
  const [validation, setValidation] = useState<ValidationError[]>([]);
  
  const handlePresetChange = useCallback((preset: WindowSizePreset) => {
    const newSettings = { ...settings, preset };
    const errors = validateWindowSettings(newSettings);
    setValidation(errors);
    
    if (errors.length === 0) {
      updateSettings(newSettings);
    }
  }, [settings, updateSettings]);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;
  
  return (
    <SettingsForm>
      <PresetSelector
        value={settings.preset}
        onChange={handlePresetChange}
        options={WINDOW_SIZE_PRESETS}
      />
      <CustomSizeInputs
        width={settings.width}
        height={settings.height}
        onChange={(size) => updateSettings({ ...settings, ...size })}
        disabled={settings.preset !== 'custom'}
      />
      <ValidationDisplay errors={validation} />
    </SettingsForm>
  );
};
```

## 実装戦略

### 段階的実装アプローチ

#### Stage 1: 基盤クラス実装 (2日)
1. `BaseSettingsComponent` 実装
2. `UIAdapter` インターフェース・実装
3. `PerformanceManager` 実装
4. `ErrorHandler` 実装
5. `ResourceManager` 実装

#### Stage 2: 型定義改善 (1日)
1. 厳密な型定義作成
2. DOM依存排除
3. React対応型準備
4. バリデーション型統一

#### Stage 3: コンポーネント移行 (2日)
1. `WindowSettingsComponent` → BaseSettings拡張
2. `ChatSettingsComponent` → BaseSettings拡張
3. `ThemeSettingsComponent` → BaseSettings拡張
4. `ExpressionSettingsComponent` → BaseSettings拡張

#### Stage 4: テスト・検証 (1日)
1. 全コンポーネントテスト実行
2. パフォーマンス検証
3. メモリリーク確認
4. エラーハンドリング確認

## 成功指標

### 技術指標
- ✅ **全272テスト通過維持**
- ✅ **コード重複50%削減**
- ✅ **パフォーマンス統一**
- ✅ **メモリリーク0件**
- ✅ **型安全性100%**

### React移行準備指標
- ✅ **DOM依存0%** (UIAdapter経由100%)
- ✅ **抽象化レイヤー100%カバー**
- ✅ **React対応型定義完了**
- ✅ **移行テストプラン策定**

### 品質指標
- ✅ **エラーハンドリング統一100%**
- ✅ **リソース管理統一100%**
- ✅ **パフォーマンス最適化統一100%**
- ✅ **アーキテクチャ一貫性100%**

## リスク管理

### 特定リスク
1. **破壊的変更リスク**: 段階的移行で最小化
2. **パフォーマンス悪化**: ベンチマーク比較で検証
3. **テスト失敗**: 各段階でテスト実行
4. **機能回帰**: 包括的回帰テスト実施

### 緩和策
1. **バックアップ戦略**: git branch活用
2. **ロールバック計画**: 各段階で復元ポイント作成
3. **段階的検証**: 小さな変更単位でテスト
4. **ペアレビュー**: 重要変更の複数確認

## 次フェーズへの準備

Phase 2.5完了により、以下が実現されます：

1. **React移行成功率90%以上**
2. **アーキテクチャ統一による保守性向上**
3. **パフォーマンス最適化による品質向上**
4. **技術的負債の解消**

これにより、Phase 3のReact移行を安全かつ効率的に実行できる完璧な基盤が整います。