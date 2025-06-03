# Phase 3: React移行 詳細設計書

## 概要

Phase 3は、Phase 2.5で完成した統一アーキテクチャをベースに、settings-renderer.ts (1,429行) を React 19 + TypeScript環境に段階的移行する重要なフェーズです。ElectronとReactの統合、型安全性の維持、パフォーマンス最適化を通じて、現代的で保守性の高いフロントエンド実装を実現します。

## 戦略的決定 (Think Harder結果)

### 1. 段階的移行戦略採用
- **Big Bang移行回避**: 全体一括変更によるリスクを最小化
- **コンポーネント単位移行**: WindowSettings → Theme → Chat → Expression順
- **iframe分離アプローチ**: 移行期のVanilla/React並行実行で安全性確保
- **機能フラグ活用**: ロールバック可能な設計

### 2. 技術スタック決定
- **React 19**: 最新の性能改善とServer Components準備
- **Zustand**: 軽量(2.9kb)、TypeScript完全対応、Electron IPC親和性
- **React Testing Library**: 既存Vitest + 685テスト拡張
- **TypeScript厳密化**: Phase 2.5の型定義基盤を活用・拡張

### 3. ElectronとReactの統合戦略
- **型安全IPC Bridge**: ReactElectronAPI拡張インターフェース
- **Hot Reload対応**: 開発効率向上
- **プロセス分離維持**: セキュリティ・安定性確保

## 現状分析と課題

### Phase 2.5の成果活用
✅ **BaseSettingsComponent統一**: 全4コンポーネントで一貫アーキテクチャ
✅ **UIAdapter抽象化**: React移行準備完了
✅ **厳密型定義**: WindowSettingsData, ThemeId等活用可能
✅ **685テスト全合格**: ゼロリグレッション基盤

### React移行の技術的課題
🔴 **DOM直接操作 → 宣言的UI**: パラダイム変更
🔴 **複雑状態管理**: ExpressionSettings(47テスト)の高度な処理
🔴 **パフォーマンス維持**: 50個超VRM表情のバッチレンダリング
🔴 **ElectronAPI統合**: IPC通信の型安全化
🔴 **テスト戦略拡張**: React Testing Library統合

## 技術アーキテクチャ設計

### 1. React環境構成

```typescript
/**
 * React移行後のディレクトリ構成
 */
src/
├── main.ts (変更なし)
├── preload.ts (型定義強化)
├── renderer/
│   ├── App.tsx (React root)
│   ├── components/
│   │   ├── WindowSettingsComponent.tsx
│   │   ├── ChatSettingsComponent.tsx
│   │   ├── ThemeSettingsComponent.tsx
│   │   └── ExpressionSettingsComponent.tsx
│   ├── hooks/
│   │   ├── useWindowSettings.ts
│   │   ├── useChatSettings.ts
│   │   ├── useThemeSettings.ts
│   │   └── useExpressionSettings.ts
│   ├── stores/
│   │   ├── settingsStore.ts (Zustand)
│   │   └── performanceStore.ts
│   ├── types/
│   │   ├── ReactTypes.ts
│   │   └── PropsTypes.ts
│   └── utils/
│       ├── ReactUIAdapter.ts
│       └── ElectronBridge.ts
└── legacy/ (段階移行期保持)
    └── settings-renderer.ts
```

### 2. 状態管理アーキテクチャ (Zustand)

```typescript
/**
 * Zustand Store設計
 * BaseSettingsComponentの概念をReactで実現
 */
interface SettingsStore {
  // 各設定セクションの状態
  window: WindowSettingsData | null;
  chat: ChatSettingsData | null;
  theme: ThemeSettingsData | null;
  expressions: ExpressionSettingsData | null;
  
  // 共通状態
  isLoading: Record<SettingsSection, boolean>;
  errors: Record<SettingsSection, Error | null>;
  validation: Record<SettingsSection, ValidationError[]>;
  
  // Actions (ElectronAPI統合)
  loadSettings: <T extends SettingsSection>(section: T) => Promise<void>;
  updateSettings: <T extends SettingsSection>(section: T, data: SettingsDataMap[T]) => Promise<void>;
  resetSettings: <T extends SettingsSection>(section: T) => Promise<void>;
  
  // Performance管理
  performance: {
    operations: Map<string, number>;
    startOperation: (name: string) => void;
    endOperation: (name: string) => number;
  };
  
  // Error管理
  handleError: (section: SettingsSection, error: Error, operation: string) => void;
  clearErrors: (section: SettingsSection) => void;
}

/**
 * Zustand Store実装例
 */
const useSettingsStore = create<SettingsStore>((set, get) => ({
  // 初期状態
  window: null,
  chat: null,
  theme: null,
  expressions: null,
  isLoading: { window: false, chat: false, theme: false, expressions: false },
  errors: { window: null, chat: null, theme: null, expressions: null },
  validation: { window: [], chat: [], theme: [], expressions: [] },
  
  // Settings操作
  loadSettings: async <T extends SettingsSection>(section: T) => {
    set(state => ({ isLoading: { ...state.isLoading, [section]: true } }));
    
    try {
      const data = await window.electronAPI.getSettings(section);
      set(state => ({ 
        [section]: data,
        isLoading: { ...state.isLoading, [section]: false },
        errors: { ...state.errors, [section]: null }
      }));
    } catch (error) {
      get().handleError(section, error as Error, `${section}設定読み込み`);
    }
  },
  
  updateSettings: async <T extends SettingsSection>(section: T, data: SettingsDataMap[T]) => {
    // バリデーション
    const errors = validateSettings(section, data);
    set(state => ({ validation: { ...state.validation, [section]: errors } }));
    
    if (errors.length > 0) return;
    
    set(state => ({ isLoading: { ...state.isLoading, [section]: true } }));
    
    try {
      const result = await window.electronAPI.setSettings(section, data);
      if (result.success) {
        set(state => ({ 
          [section]: data,
          isLoading: { ...state.isLoading, [section]: false },
          errors: { ...state.errors, [section]: null }
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      get().handleError(section, error as Error, `${section}設定更新`);
    }
  },
  
  // Performance管理統合
  performance: {
    operations: new Map(),
    startOperation: (name: string) => {
      get().performance.operations.set(name, performance.now());
      console.log(`[React Performance] ${name} 開始`);
    },
    endOperation: (name: string) => {
      const startTime = get().performance.operations.get(name);
      if (!startTime) return 0;
      
      const duration = performance.now() - startTime;
      console.log(`[React Performance] ${name} 完了: ${duration.toFixed(2)}ms`);
      
      if (duration > 1000) {
        console.warn(`[React Performance] 性能警告: ${name} が1秒超過`);
      }
      
      get().performance.operations.delete(name);
      return duration;
    }
  },
  
  // Error管理統合
  handleError: (section: SettingsSection, error: Error, operation: string) => {
    console.error(`[React ${section}]`, error);
    set(state => ({ 
      isLoading: { ...state.isLoading, [section]: false },
      errors: { ...state.errors, [section]: error }
    }));
    
    // 統一エラーハンドリング活用
    ErrorHandler.handle(error, {
      context: `React:${section}:${operation}`,
      showToUser: true,
      retry: false,
      severity: 'medium'
    });
  }
}));
```

### 3. Custom Hooks設計

```typescript
/**
 * 設定管理用Custom Hook
 * BaseSettingsComponentの機能をReact Hooksで実現
 */
interface UseSettingsReturn<T> {
  settings: T | null;
  updateSettings: (settings: T) => Promise<void>;
  resetSettings: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  validation: ValidationError[];
  performance: {
    startOperation: (name: string) => void;
    endOperation: (name: string) => number;
  };
}

/**
 * WindowSettings用Hook実装
 */
function useWindowSettings(): UseSettingsReturn<WindowSettingsData> {
  const store = useSettingsStore();
  
  const settings = store.window;
  const isLoading = store.isLoading.window;
  const error = store.errors.window;
  const validation = store.validation.window;
  
  const updateSettings = useCallback(async (newSettings: WindowSettingsData) => {
    store.performance.startOperation('WindowSettings:更新');
    await store.updateSettings('window', newSettings);
    store.performance.endOperation('WindowSettings:更新');
  }, [store]);
  
  const resetSettings = useCallback(async () => {
    store.performance.startOperation('WindowSettings:リセット');
    await store.resetSettings('window');
    store.performance.endOperation('WindowSettings:リセット');
  }, [store]);
  
  // 初期読み込み
  useEffect(() => {
    if (!settings && !isLoading) {
      store.loadSettings('window');
    }
  }, [settings, isLoading, store]);
  
  return {
    settings,
    updateSettings,
    resetSettings,
    isLoading,
    error,
    validation,
    performance: store.performance
  };
}

/**
 * ExpressionSettings用Hook実装 (最も複雑)
 */
function useExpressionSettings(): UseSettingsReturn<ExpressionSettingsData> & {
  availableExpressions: VRMExpressionInfo[];
  loadExpressionsWithRetry: () => Promise<void>;
  previewExpression: (name: string, intensity: number) => Promise<void>;
  resetExpressions: () => Promise<void>;
} {
  const store = useSettingsStore();
  const [availableExpressions, setAvailableExpressions] = useState<VRMExpressionInfo[]>([]);
  const [currentState, setCurrentState] = useState<'loading' | 'loaded' | 'error'>('loading');
  
  // VRM表情読み込み (リトライロジック付き)
  const loadExpressionsWithRetry = useCallback(async () => {
    const maxRetries = 5;
    const retryDelay = 1000;
    
    store.performance.startOperation('ExpressionSettings:VRM表情読み込み');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const expressions = await window.electronAPI.getAvailableExpressions();
        if (expressions && expressions.length > 0) {
          setAvailableExpressions(expressions);
          setCurrentState('loaded');
          store.performance.endOperation('ExpressionSettings:VRM表情読み込み');
          return;
        }
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        if (attempt === maxRetries) {
          setCurrentState('error');
          store.handleError('expressions', error as Error, 'VRM表情読み込み');
          store.performance.endOperation('ExpressionSettings:VRM表情読み込み');
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }, [store]);
  
  // 表情プレビュー
  const previewExpression = useCallback(async (name: string, intensity: number) => {
    try {
      const result = await window.electronAPI.previewExpression(name, intensity);
      if (!result || !result.success) {
        throw new Error('表情プレビューに失敗しました');
      }
    } catch (error) {
      store.handleError('expressions', error as Error, '表情プレビュー');
    }
  }, [store]);
  
  // 表情リセット
  const resetExpressions = useCallback(async () => {
    try {
      await window.electronAPI.previewExpression('neutral', 0);
    } catch (error) {
      store.handleError('expressions', error as Error, '表情リセット');
    }
  }, [store]);
  
  // 初期化
  useEffect(() => {
    loadExpressionsWithRetry();
  }, [loadExpressionsWithRetry]);
  
  return {
    settings: store.expressions,
    updateSettings: store.updateSettings.bind(null, 'expressions'),
    resetSettings: store.resetSettings.bind(null, 'expressions'),
    isLoading: store.isLoading.expressions,
    error: store.errors.expressions,
    validation: store.validation.expressions,
    performance: store.performance,
    availableExpressions,
    loadExpressionsWithRetry,
    previewExpression,
    resetExpressions
  };
}
```

### 4. React Component設計

```typescript
/**
 * WindowSettingsComponent React実装
 */
interface WindowSettingsProps {
  className?: string;
  onSettingsChange?: (settings: WindowSettingsData) => void;
}

const WindowSettingsComponent: React.FC<WindowSettingsProps> = ({ 
  className, 
  onSettingsChange 
}) => {
  const {
    settings,
    updateSettings,
    resetSettings,
    isLoading,
    error,
    validation,
    performance
  } = useWindowSettings();
  
  // プリセット変更ハンドラー
  const handlePresetChange = useCallback((preset: WindowSizePreset) => {
    if (!settings) return;
    
    performance.startOperation('WindowSettings:プリセット変更');
    const newSettings = { ...settings, preset };
    updateSettings(newSettings);
    onSettingsChange?.(newSettings);
    performance.endOperation('WindowSettings:プリセット変更');
  }, [settings, updateSettings, onSettingsChange, performance]);
  
  // カスタムサイズ変更ハンドラー
  const handleCustomSizeChange = useCallback((width: number, height: number) => {
    if (!settings) return;
    
    const newSettings = { ...settings, width, height, preset: 'custom' as WindowSizePreset };
    updateSettings(newSettings);
    onSettingsChange?.(newSettings);
  }, [settings, updateSettings, onSettingsChange]);
  
  // ローディング状態
  if (isLoading) {
    return <LoadingSpinner message="ウィンドウ設定を読み込み中..." />;
  }
  
  // エラー状態
  if (error) {
    return (
      <ErrorDisplay 
        error={error} 
        onRetry={() => window.location.reload()}
        message="ウィンドウ設定の読み込みに失敗しました"
      />
    );
  }
  
  // 設定未読み込み
  if (!settings) {
    return <div>設定を読み込み中...</div>;
  }
  
  return (
    <div className={`window-settings ${className || ''}`}>
      <SettingsHeader title="ウィンドウ設定" />
      
      {/* プリセット選択 */}
      <SettingsSection title="サイズプリセット">
        <PresetSelector
          value={settings.preset}
          onChange={handlePresetChange}
          options={[
            { value: 'small', label: '小 (300x400)' },
            { value: 'medium', label: '中 (400x600)' },
            { value: 'large', label: '大 (500x800)' },
            { value: 'custom', label: 'カスタム' }
          ]}
        />
      </SettingsSection>
      
      {/* カスタムサイズ */}
      {settings.preset === 'custom' && (
        <SettingsSection title="カスタムサイズ">
          <CustomSizeInputs
            width={settings.width}
            height={settings.height}
            onChange={handleCustomSizeChange}
            validation={validation.filter(v => ['width', 'height'].includes(v.field))}
          />
        </SettingsSection>
      )}
      
      {/* VRMモデルパス */}
      <SettingsSection title="VRMモデル">
        <VRMModelSelector
          value={settings.vrmModelPath}
          onChange={(path) => updateSettings({ ...settings, vrmModelPath: path })}
          validation={validation.filter(v => v.field === 'vrmModelPath')}
        />
      </SettingsSection>
      
      {/* バリデーションエラー表示 */}
      {validation.length > 0 && (
        <ValidationDisplay errors={validation} />
      )}
      
      {/* アクションボタン */}
      <SettingsActions>
        <Button 
          variant="primary" 
          onClick={() => updateSettings(settings)}
          disabled={validation.length > 0}
        >
          設定を適用
        </Button>
        <Button 
          variant="secondary" 
          onClick={resetSettings}
        >
          リセット
        </Button>
      </SettingsActions>
    </div>
  );
};
```

### 5. ElectronAPI React統合

```typescript
/**
 * React特化ElectronAPI型定義
 */
interface ReactElectronAPI extends ElectronAPI {
  // 型安全な設定操作
  getSettings: <T extends SettingsSection>(section: T) => Promise<SettingsDataMap[T]>;
  setSettings: <T extends SettingsSection>(section: T, data: SettingsDataMap[T]) => Promise<SettingsResult>;
  
  // React特化イベント処理
  onSettingsChanged: <T extends SettingsSection>(
    section: T, 
    callback: (data: SettingsDataMap[T]) => void
  ) => () => void; // cleanup関数を返す
  
  // パフォーマンス監視
  getPerformanceMetrics: () => Promise<PerformanceMetrics>;
  
  // React開発支援
  enableReactDevTools: () => Promise<void>;
  getReactComponentTree: () => Promise<ComponentTreeData>;
}

/**
 * React用ElectronAPI Bridge
 */
class ReactElectronBridge {
  private static eventListeners = new Map<string, Set<Function>>();
  
  static async getSettings<T extends SettingsSection>(section: T): Promise<SettingsDataMap[T]> {
    const startTime = performance.now();
    
    try {
      const data = await window.electronAPI.getSettings(section);
      const duration = performance.now() - startTime;
      
      console.log(`[React Bridge] ${section}設定読み込み: ${duration.toFixed(2)}ms`);
      return data;
    } catch (error) {
      console.error(`[React Bridge] ${section}設定読み込み失敗:`, error);
      throw error;
    }
  }
  
  static onSettingsChanged<T extends SettingsSection>(
    section: T, 
    callback: (data: SettingsDataMap[T]) => void
  ): () => void {
    const listenerKey = `settings:${section}`;
    
    if (!this.eventListeners.has(listenerKey)) {
      this.eventListeners.set(listenerKey, new Set());
      
      // ElectronAPIイベント登録
      window.electronAPI.onSettingsChanged(section, (data) => {
        const listeners = this.eventListeners.get(listenerKey);
        listeners?.forEach(listener => listener(data));
      });
    }
    
    this.eventListeners.get(listenerKey)!.add(callback);
    
    // cleanup関数
    return () => {
      const listeners = this.eventListeners.get(listenerKey);
      listeners?.delete(callback);
      
      if (listeners?.size === 0) {
        this.eventListeners.delete(listenerKey);
      }
    };
  }
}
```

## 段階的移行戦略

### Phase 3.1: React基盤構築 (2-3日)

#### 環境セットアップ
1. **React 19パッケージ追加**
   ```bash
   npm install react@19 react-dom@19
   npm install -D @types/react@19 @types/react-dom@19
   npm install -D @vitejs/plugin-react
   ```

2. **Vite設定更新**
   ```typescript
   // vite.renderer.config.ts
   import react from '@vitejs/plugin-react';
   
   export default defineConfig({
     plugins: [react()],
     // 既存設定...
   });
   ```

3. **TypeScript JSX設定**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "jsx": "react-jsx",
       "jsxImportSource": "react"
     }
   }
   ```

#### 基本React構成
1. **App.tsx作成**
2. **React Root マウント**
3. **Hot Reload動作確認**
4. **ElectronAPI アクセス確認**

### Phase 3.2: 状態管理・Hook基盤 (2日)

#### Zustand State Management
1. **Zustand設定・基本Store実装**
2. **Custom Hooks基盤作成**
3. **ReactUIAdapter実装**
4. **ElectronAPI React Bridge**

### Phase 3.3: コンポーネント段階移行 (6-8日)

#### 3.3.1: WindowSettingsComponent (最優先・検証用)
- **理由**: 最もシンプル、React移行の検証に最適
- **Custom Hook**: `useWindowSettings`
- **React Component**: `WindowSettingsComponent.tsx`
- **テスト**: React Testing Library
- **検証**: 既存26テストとの機能比較

#### 3.3.2: ThemeSettingsComponent
- **理由**: UI複雑だが状態管理シンプル
- **Custom Hook**: `useThemeSettings`
- **特別対応**: 動的テーマカード生成
- **検証**: 39テストとの機能比較

#### 3.3.3: ChatSettingsComponent
- **理由**: 複数API連携あり
- **Custom Hook**: `useChatSettings`
- **特別対応**: デバウンス処理、複数API調整
- **検証**: 38テストとの機能比較

#### 3.3.4: ExpressionSettingsComponent (最後・最複雑)
- **理由**: VRM表情処理、最も高度な機能
- **Custom Hook**: `useExpressionSettings`
- **特別対応**: 
  - VRM表情リトライロジック
  - 50個超バッチレンダリング
  - WeakMap使用メモリリーク防止
  - tools.json連携
- **パフォーマンス最適化**: React.memo, useMemo, 仮想化
- **検証**: 47テストとの機能比較

### Phase 3.4: 統合・最適化 (2日)

#### 全体統合・テスト
1. **全コンポーネント統合動作確認**
2. **React Testing Library テスト拡張**
3. **パフォーマンス最適化・検証**
4. **アクセシビリティ改善**
5. **最終的な品質確認**

## パフォーマンス最適化戦略

### 1. React特化最適化

```typescript
/**
 * ExpressionSettingsComponent最適化例
 */
const ExpressionSettingsComponent = React.memo(() => {
  const {
    settings,
    availableExpressions,
    updateSettings,
    isLoading,
    error
  } = useExpressionSettings();
  
  // 重い計算のメモ化
  const sortedExpressions = useMemo(() => {
    return availableExpressions.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [availableExpressions]);
  
  // 大量リスト用仮想化
  const virtualizer = useVirtualizer({
    count: sortedExpressions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5
  });
  
  // デバウンス済み更新
  const debouncedUpdate = useMemo(
    () => debounce((name: string, value: any) => {
      updateSettings({ ...settings, [name]: value });
    }, 300),
    [settings, updateSettings]
  );
  
  // 大量データレンダリング最適化
  if (sortedExpressions.length > 50) {
    return (
      <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <ExpressionItem
              key={virtualItem.key}
              expression={sortedExpressions[virtualItem.index]}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`
              }}
            />
          ))}
        </div>
      </div>
    );
  }
  
  // 通常レンダリング (50個以下)
  return (
    <div className="expression-settings">
      {sortedExpressions.map(expression => (
        <ExpressionItem 
          key={expression.name} 
          expression={expression}
          onChange={debouncedUpdate}
        />
      ))}
    </div>
  );
});
```

### 2. メモリ管理最適化

```typescript
/**
 * Custom Hook内でのリソース管理
 */
function useExpressionSettings() {
  const [availableExpressions, setAvailableExpressions] = useState<VRMExpressionInfo[]>([]);
  
  // WeakMapでメモリリーク防止
  const expressionElementMap = useRef(new WeakMap<HTMLElement, string>());
  
  // cleanup効果
  useEffect(() => {
    return () => {
      // 明示的クリーンアップ
      expressionElementMap.current = new WeakMap();
    };
  }, []);
  
  // AbortController for API calls
  const abortControllerRef = useRef<AbortController>();
  
  const loadExpressions = useCallback(async () => {
    // 既存リクエストをキャンセル
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    try {
      const expressions = await window.electronAPI.getAvailableExpressions({
        signal: abortControllerRef.current.signal
      });
      setAvailableExpressions(expressions);
    } catch (error) {
      if (!abortControllerRef.current.signal.aborted) {
        console.error('表情読み込みエラー:', error);
      }
    }
  }, []);
  
  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);
  
  return { availableExpressions, loadExpressions };
}
```

## テスト戦略

### 1. React Testing Library統合

```typescript
/**
 * WindowSettingsComponent テスト例
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import WindowSettingsComponent from '../WindowSettingsComponent';

// ElectronAPI モック
const mockElectronAPI = {
  getSettings: vi.fn(),
  setSettings: vi.fn(),
  onSettingsChanged: vi.fn()
};

// グローバルモック設定
global.window.electronAPI = mockElectronAPI;

describe('WindowSettingsComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockElectronAPI.getSettings.mockResolvedValue({
      preset: 'medium',
      width: 400,
      height: 600,
      vrmModelPath: '/path/to/model.vrm'
    });
  });
  
  it('should render window settings correctly', async () => {
    render(<WindowSettingsComponent />);
    
    // ローディング状態確認
    expect(screen.getByText('ウィンドウ設定を読み込み中...')).toBeInTheDocument();
    
    // 設定読み込み後の表示確認
    await waitFor(() => {
      expect(screen.getByDisplayValue('medium')).toBeInTheDocument();
    });
    
    expect(mockElectronAPI.getSettings).toHaveBeenCalledWith('window');
  });
  
  it('should handle preset change correctly', async () => {
    mockElectronAPI.setSettings.mockResolvedValue({ success: true });
    
    render(<WindowSettingsComponent />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('medium')).toBeInTheDocument();
    });
    
    // プリセット変更
    fireEvent.change(screen.getByDisplayValue('medium'), { target: { value: 'large' } });
    
    await waitFor(() => {
      expect(mockElectronAPI.setSettings).toHaveBeenCalledWith('window', {
        preset: 'large',
        width: 400,
        height: 600,
        vrmModelPath: '/path/to/model.vrm'
      });
    });
  });
  
  it('should display validation errors correctly', async () => {
    render(<WindowSettingsComponent />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('medium')).toBeInTheDocument();
    });
    
    // 無効な値を入力
    const widthInput = screen.getByLabelText(/幅/);
    fireEvent.change(widthInput, { target: { value: '50' } }); // 最小値以下
    
    await waitFor(() => {
      expect(screen.getByText(/幅は100以上である必要があります/)).toBeInTheDocument();
    });
  });
});
```

### 2. E2E テスト拡張

```typescript
/**
 * React設定画面 E2E テスト
 */
import { test, expect } from '@playwright/test';

test.describe('React Settings UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings'); // React版設定画面
  });
  
  test('should switch between Vanilla and React UI', async ({ page }) => {
    // React版の確認
    await expect(page.locator('[data-testid="react-window-settings"]')).toBeVisible();
    
    // 機能テスト
    await page.selectOption('[data-testid="window-preset"]', 'large');
    await page.click('[data-testid="apply-settings"]');
    
    // 設定反映確認
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
  
  test('should maintain performance with large expression lists', async ({ page }) => {
    await page.goto('/settings#expressions');
    
    // パフォーマンス測定開始
    const startTime = Date.now();
    
    // 大量表情リスト表示
    await page.waitForSelector('[data-testid="expression-list"]');
    const expressions = await page.locator('[data-testid="expression-item"]').count();
    
    const loadTime = Date.now() - startTime;
    
    // パフォーマンス要件確認
    expect(expressions).toBeGreaterThan(50); // 大量データ
    expect(loadTime).toBeLessThan(2000); // 2秒以内でレンダリング
  });
});
```

## リスク管理・軽減策

### 1. 技術的リスク

| リスク | 影響度 | 確率 | 軽減策 |
|--------|--------|------|--------|
| ElectronAPI統合失敗 | 高 | 中 | MSWでモック化、段階的確認 |
| パフォーマンス悪化 | 高 | 中 | ベンチマークテスト、最適化 |
| 型エラー増加 | 中 | 高 | 厳密型定義、lint強化 |
| テスト失敗 | 中 | 中 | 各段階でテスト確認 |

### 2. プロジェクトリスク

| リスク | 影響度 | 確率 | 軽減策 |
|--------|--------|------|--------|
| 開発期間超過 | 中 | 中 | MVP機能先行、段階的機能追加 |
| 機能回帰 | 高 | 低 | 既存テスト維持、回帰テスト |
| チーム学習コスト | 低 | 高 | ドキュメント充実、段階的習得 |

### 3. 緊急時対応

```typescript
/**
 * フィーチャーフラグによるロールバック機能
 */
interface FeatureFlags {
  useReactSettings: boolean;
  useReactWindowSettings: boolean;
  useReactChatSettings: boolean;
  useReactThemeSettings: boolean;
  useReactExpressionSettings: boolean;
}

const featureFlags: FeatureFlags = {
  useReactSettings: true,
  useReactWindowSettings: true,
  useReactChatSettings: false, // 問題発生時の緊急無効化
  useReactThemeSettings: true,
  useReactExpressionSettings: false
};

/**
 * 条件付きコンポーネントレンダリング
 */
function SettingsApp() {
  return (
    <div className="settings-app">
      {featureFlags.useReactWindowSettings ? (
        <WindowSettingsComponent />
      ) : (
        <LegacyWindowSettings />
      )}
      
      {featureFlags.useReactChatSettings ? (
        <ChatSettingsComponent />
      ) : (
        <LegacyChatSettings />
      )}
    </div>
  );
}
```

## 成功指標・検証基準

### 技術指標
- ✅ **全テスト通過維持**: 685テスト + React拡張テスト
- ✅ **パフォーマンス維持**: レンダリング時間2秒以内
- ✅ **メモリ使用量**: 増加率20%以内
- ✅ **バンドルサイズ**: 増加率30%以内

### 機能指標
- ✅ **機能同等性**: 既存機能100%再現
- ✅ **エラーハンドリング**: 統一されたエラー処理
- ✅ **アクセシビリティ**: WCAG AA準拠
- ✅ **国際化**: 日本語UI完全対応

### 開発体験指標
- ✅ **Hot Reload**: 変更反映3秒以内
- ✅ **型安全性**: TypeScript エラー0件
- ✅ **開発ツール**: React DevTools統合
- ✅ **デバッグ**: ElectronとReact統合デバッグ

## ドキュメント更新計画

### 新規作成ドキュメント
1. **REACT_ARCHITECTURE.md**: React版アーキテクチャ詳細
2. **MIGRATION_GUIDE.md**: 移行手順書
3. **TESTING_STRATEGY_REACT.md**: Reactテスト戦略
4. **PERFORMANCE_GUIDELINES.md**: パフォーマンス最適化ガイド

### 更新対象ドキュメント
1. **CLAUDE.md**: React開発コマンド追加
2. **README.md**: React環境説明
3. **package.json**: scripts追加
4. **tsconfig.json**: React対応設定

## 次フェーズへの準備

Phase 3完了により、以下が実現されます：

1. **現代的フロントエンド実装**: React 19 + TypeScript
2. **保守性大幅向上**: 宣言的UI、型安全性
3. **開発体験改善**: Hot Reload、DevTools
4. **スケーラビリティ確保**: コンポーネント再利用、状態管理

これにより、将来的な機能拡張や新技術導入が容易になり、長期的な技術的優位性を確保できます。