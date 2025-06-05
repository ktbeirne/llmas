# FSD実装パターン集

## 1. Store実装パターン

### 基本的なStore

```typescript
// src/features/[feature-name]/model/[feature]-store.ts
import { create } from 'zustand';
import { eventBus } from '@shared/lib/app-event-bus';

interface FeatureState {
  // State
  data: SomeData | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchData: () => Promise<void>;
  updateData: (data: Partial<SomeData>) => void;
  reset: () => void;
}

export const useFeatureStore = create<FeatureState>((set, get) => ({
  // Initial state
  data: null,
  isLoading: false,
  error: null,
  
  // Actions
  fetchData: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const data = await api.fetchData();
      set({ data, isLoading: false });
      
      // 成功をイベントで通知
      eventBus.emit('feature:data-loaded', { data });
    } catch (error) {
      set({ error: error.message, isLoading: false });
      
      // エラーをイベントで通知
      eventBus.emit('app:error', { 
        error, 
        context: 'feature-data-fetch' 
      });
    }
  },
  
  updateData: (updates) => {
    const currentData = get().data;
    if (!currentData) return;
    
    const newData = { ...currentData, ...updates };
    set({ data: newData });
    
    // 変更を通知
    eventBus.emit('feature:data-updated', { data: newData });
  },
  
  reset: () => {
    set({ data: null, isLoading: false, error: null });
  }
}));
```

### Subscribe付きStore

```typescript
// 他のFeatureの変更を監視する例
export const useFeatureStore = create<FeatureState>()(
  subscribeWithSelector((set, get) => ({
    // ... state and actions
    
    // 初期化時に他Featureを監視
    init: () => {
      const unsubscribe = eventBus.subscribe(
        'other-feature:changed',
        (data) => {
          // 他Featureの変更に反応
          set({ relatedData: data });
        }
      );
      
      // クリーンアップ関数を保存
      set({ cleanup: unsubscribe });
    }
  }))
);
```

---

## 2. UIコンポーネントパターン

### 基本的なFeature UI

```typescript
// src/features/[feature-name]/ui/FeatureComponent.tsx
import { useFeatureStore } from '../model/feature-store';
import { Card, Button } from '@shared/ui';

export const FeatureComponent: React.FC = () => {
  const { data, isLoading, error, fetchData } = useFeatureStore();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <Card>
      <h2>Feature Data</h2>
      {data ? (
        <div>{JSON.stringify(data)}</div>
      ) : (
        <Button onClick={fetchData}>Load Data</Button>
      )}
    </Card>
  );
};
```

### Hook付きコンポーネント

```typescript
// src/features/[feature-name]/lib/hooks.ts
export const useFeatureData = () => {
  const store = useFeatureStore();
  
  useEffect(() => {
    // 初期データ取得
    store.fetchData();
    
    // イベント監視
    const unsubscribe = eventBus.subscribe(
      'app:refresh-requested',
      () => store.fetchData()
    );
    
    return unsubscribe;
  }, []);
  
  return {
    data: store.data,
    isLoading: store.isLoading,
    refresh: store.fetchData
  };
};

// UIコンポーネントで使用
export const FeatureComponent: React.FC = () => {
  const { data, isLoading, refresh } = useFeatureData();
  // ...
};
```

---

## 3. API通信パターン

### 基本的なAPI実装

```typescript
// src/features/[feature-name]/api/feature-api.ts
import { api } from '@shared/api/client';

export const featureApi = {
  async fetchList(params?: ListParams): Promise<Item[]> {
    const response = await api.get('/items', { params });
    return response.data;
  },
  
  async createItem(data: CreateItemDto): Promise<Item> {
    const response = await api.post('/items', data);
    return response.data;
  },
  
  async updateItem(id: string, data: UpdateItemDto): Promise<Item> {
    const response = await api.patch(`/items/${id}`, data);
    return response.data;
  },
  
  async deleteItem(id: string): Promise<void> {
    await api.delete(`/items/${id}`);
  }
};
```

### エラーハンドリング付きAPI

```typescript
// src/features/[feature-name]/api/feature-api.ts
class FeatureApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'FeatureApiError';
  }
}

export const featureApi = {
  async fetchWithRetry<T>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<T> {
    const maxRetries = 3;
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await api.get(endpoint, options);
        return response.data;
      } catch (error) {
        lastError = error;
        
        // リトライ可能なエラーか判定
        if (error.response?.status >= 500) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          continue;
        }
        
        // リトライ不可能なエラー
        throw new FeatureApiError(
          error.message,
          'FETCH_ERROR',
          error.response?.status
        );
      }
    }
    
    throw new FeatureApiError(
      'Max retries exceeded',
      'MAX_RETRIES',
      lastError?.response?.status
    );
  }
};
```

---

## 4. Widget実装パターン

### Feature組み合わせWidget

```typescript
// src/widgets/dashboard/ui/Dashboard.tsx
import { useMouseFollowStore } from '@features/mouse-follow';
import { useVRMControlStore } from '@features/vrm-control';
import { useSettingsStore } from '@features/settings';

export const Dashboard: React.FC = () => {
  // 複数のFeatureを組み合わせ
  const mouseFollow = useMouseFollowStore();
  const vrmControl = useVRMControlStore();
  const settings = useSettingsStore();
  
  // Widget層で調整ロジック
  useEffect(() => {
    // マウス追従が有効かつVRMが準備完了の場合のみ動作
    if (mouseFollow.isEnabled && vrmControl.isReady) {
      const unsubscribe = eventBus.subscribe(
        'mouse-follow:position-changed',
        (position) => {
          // 設定に基づいて感度を調整
          const adjustedPosition = {
            x: position.x * settings.sensitivity,
            y: position.y * settings.sensitivity
          };
          
          vrmControl.lookAt(adjustedPosition);
        }
      );
      
      return unsubscribe;
    }
  }, [mouseFollow.isEnabled, vrmControl.isReady, settings.sensitivity]);
  
  return (
    <div className="dashboard">
      <MouseFollowPanel />
      <VRMControlPanel />
      <SettingsPanel />
    </div>
  );
};
```

---

## 5. テストパターン

### Store単体テスト

```typescript
// src/features/[feature-name]/model/feature-store.test.ts
import { renderHook, act } from '@testing-library/react';
import { useFeatureStore } from './feature-store';

describe('FeatureStore', () => {
  beforeEach(() => {
    // Storeをリセット
    useFeatureStore.setState({
      data: null,
      isLoading: false,
      error: null
    });
  });
  
  it('should fetch data successfully', async () => {
    // APIモック
    vi.mock('../api/feature-api', () => ({
      featureApi: {
        fetchList: vi.fn().mockResolvedValue([{ id: '1', name: 'Test' }])
      }
    }));
    
    const { result } = renderHook(() => useFeatureStore());
    
    await act(async () => {
      await result.current.fetchData();
    });
    
    expect(result.current.data).toEqual([{ id: '1', name: 'Test' }]);
    expect(result.current.isLoading).toBe(false);
  });
});
```

### イベント統合テスト

```typescript
// src/features/[feature-name]/__tests__/integration.test.ts
import { eventBus } from '@shared/lib/app-event-bus';
import { useFeatureStore } from '../model/feature-store';

describe('Feature Event Integration', () => {
  it('should emit event when data changes', async () => {
    const eventHandler = vi.fn();
    
    // イベント監視
    eventBus.subscribe('feature:data-updated', eventHandler);
    
    // データ更新
    const { updateData } = useFeatureStore.getState();
    updateData({ name: 'Updated' });
    
    // イベントが発火されたことを確認
    expect(eventHandler).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Updated' })
    });
  });
});
```

---

## 6. エラーハンドリングパターン

### グローバルエラーハンドリング

```typescript
// src/app/providers/ErrorBoundary.tsx
export const GlobalErrorHandler: React.FC = ({ children }) => {
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(
      'app:error',
      ({ error, context }) => {
        console.error(`Error in ${context}:`, error);
        
        // ユーザー通知
        if (error.userMessage) {
          showNotification({
            type: 'error',
            message: error.userMessage
          });
        }
        
        // エラー追跡サービスに送信
        if (process.env.NODE_ENV === 'production') {
          trackError(error, { context });
        }
      }
    );
    
    return unsubscribe;
  }, []);
  
  return <>{children}</>;
};
```

---

## 7. 非同期処理パターン

### 並行処理の管理

```typescript
// src/features/[feature-name]/model/async-store.ts
export const useAsyncFeatureStore = create<AsyncState>((set, get) => ({
  tasks: new Map(),
  
  async executeTask(taskId: string, task: () => Promise<any>) {
    const tasks = get().tasks;
    
    // 既存タスクがあればキャンセル
    if (tasks.has(taskId)) {
      const controller = tasks.get(taskId);
      controller.abort();
    }
    
    // 新しいタスクを開始
    const controller = new AbortController();
    tasks.set(taskId, controller);
    
    try {
      const result = await task();
      
      // 成功時の処理
      if (!controller.signal.aborted) {
        set({ result });
        eventBus.emit('feature:task-completed', { taskId, result });
      }
    } catch (error) {
      // エラー処理
      if (!controller.signal.aborted) {
        eventBus.emit('app:error', { error, context: taskId });
      }
    } finally {
      tasks.delete(taskId);
    }
  },
  
  cancelTask(taskId: string) {
    const tasks = get().tasks;
    const controller = tasks.get(taskId);
    
    if (controller) {
      controller.abort();
      tasks.delete(taskId);
    }
  }
}));
```

---

## 8. リップシンク統合パターン

### IPCイベントフローによる非同期表情制御

```typescript
// Speech Bubble Window → Main Process → Main Window のイベントフロー

// 1. Speech Bubble Windowからの発信
// renderer/speech_bubble/renderer.ts
window.electronAPI.sendLipSyncData({
  phoneme: currentPhoneme,
  duration: phonemeDuration
});

// 2. Main ProcessでのIPC処理
// src/main/ipc/handlers/VRMHandler.ts
ipcMain.handle('vrm:lip-sync', async (event, data) => {
  // Main Windowに転送
  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send('vrm:lip-sync-update', data);
  }
});

// 3. Main WindowのMascotIntegrationでの受信
// src/widgets/mascot-view/model/mascot-integration.ts
export class MascotIntegration {
  private setupLipSyncListener(): void {
    if (!window.electronAPI?.onLipSyncUpdate) {
      logger.warn('Lip sync API not available');
      return;
    }

    this.lipSyncUnsubscribe = window.electronAPI.onLipSyncUpdate(
      async (data) => {
        try {
          await this.lipSyncManager?.processLipSyncData(data);
        } catch (error) {
          logger.error('Failed to process lip sync data', error);
        }
      }
    );
  }
}
```

### ExpressionComposerパターン

```typescript
// 複数の表情を同時に管理する合成システム
// src/features/vrm-control/lib/lip-sync-manager.ts

export class LipSyncManagerV2 {
  private expressionComposer?: ExpressionComposer;

  async processLipSyncData(data: LipSyncData): Promise<void> {
    if (!this.expressionComposer) return;

    // ExpressionComposerで口の形状のみを更新
    // 他の表情（感情表現など）は維持される
    this.expressionComposer.setMouth(data.phoneme, data.weight);
    
    // 合成された表情をVRMに適用
    const composed = this.expressionComposer.compose();
    this.expressionComposer.applyToVRM(this.vrm);
  }
}
```

### 重要な実装ポイント

1. **イベントリスナーの設定タイミング**
   - MascotIntegrationの初期化時に必ず設定
   - VRMロード完了前でも設定しておく
   - dispose時に必ずクリーンアップ

2. **非同期処理の考慮**
   - Speech BubbleとMain Windowは別プロセス
   - IPCによる遅延を考慮した設計
   - エラー時のフォールバック処理

3. **表情の合成**
   - ExpressionComposerで複数表情を管理
   - リップシンクは口の形状のみを制御
   - 感情表現との独立性を保つ

4. **パフォーマンス最適化**
   - 不要な更新をスキップ
   - 差分更新による効率化
   - フレームレート考慮

```typescript
// 実装チェックリスト
export interface LipSyncIntegrationChecklist {
  // IPC設定
  ipcHandlerRegistered: boolean;      // Main ProcessにIPCハンドラー登録済み
  electronAPIExposed: boolean;         // preloadでAPI公開済み
  
  // イベントリスナー
  listenerSetupInMascot: boolean;      // MascotIntegrationでリスナー設定済み
  cleanupImplemented: boolean;         // dispose時のクリーンアップ実装済み
  
  // 表情管理
  expressionComposerIntegrated: boolean; // ExpressionComposer統合済み
  mouthOnlyUpdate: boolean;            // 口のみの更新実装済み
  
  // エラーハンドリング
  errorHandlingImplemented: boolean;   // エラー処理実装済み
  loggingAdded: boolean;              // 適切なログ出力追加済み
}
```

---

これらのパターンを参考に、一貫性のあるFSD実装を行ってください。