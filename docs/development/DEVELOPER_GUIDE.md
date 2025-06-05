# LLM Desktop Mascot - 開発者ガイド

**Feature-Sliced Design完全対応版 - 実践的開発ガイド**

## ✅ アーキテクチャ完了状況

**このプロジェクトはFeature-Sliced Design (FSD)への移行が完了しています (2025/06/05)**

- **FSDアーキテクチャ**: [docs/fsd-migration/FSD_ARCHITECTURE_DESIGN.md](./docs/fsd-migration/FSD_ARCHITECTURE_DESIGN.md)
- **開発ガイドライン**: [docs/fsd-migration/FSD_DEVELOPMENT_GUIDE.md](./docs/fsd-migration/FSD_DEVELOPMENT_GUIDE.md)
- **移行履歴**: [docs/fsd-migration/MIGRATION_CHECKLIST.md](./docs/fsd-migration/MIGRATION_CHECKLIST.md)

**すべての新機能はFeature-Sliced Designで実装してください。**

## 概要

このガイドは、LLM Desktop Mascotプロジェクトに新しく参加する開発者が、Feature-Sliced Designアーキテクチャを理解し、迅速かつ効果的に開発を開始できるよう設計されています。

## 🚀 クイックスタート

### 必要な環境
- **Node.js**: v18.x 以上（推奨: v20.x）
- **npm**: v8.x 以上
- **Git**: v2.30 以上
- **OS**: Windows 10+, macOS 10.15+, Ubuntu 18.04+

### 初期セットアップ

```bash
# 1. リポジトリのクローン
git clone <repository-url>
cd LLMDesktopMascot

# 2. 依存関係のインストール
npm install

# 3. 環境設定
cp .env.example .env
# .envファイルにGemini APIキーを設定

# 4. 開発サーバー起動
npm start

# 5. テスト実行（開発環境確認）
npm test
```

### 開発サーバー起動確認
```bash
# アプリケーションが正常に起動することを確認
npm start

# 別のターミナルでテスト実行
npm run test:e2e:headless
```

## 📁 プロジェクト構造理解

### 新しいFeature-Sliced Design構造 ⭐
```
src/
├── app/                # アプリケーション初期化
│   ├── providers/      # Context Providers
│   └── stores/         # グローバル状態
├── features/           # 機能別スライス (核心)
│   ├── mouse-follow/   # マウス追従機能
│   ├── vrm-control/    # VRM制御機能
│   ├── chat/          # チャット機能
│   ├── settings/      # 設定管理
│   ├── animation/     # アニメーション管理
│   └── mcp-integration/ # MCP統合 (開発中)
├── shared/            # 共有リソース
│   ├── ui/            # 共通UIコンポーネント
│   ├── lib/           # 共通ユーティリティ
│   └── types/         # 共通型定義
├── widgets/           # Feature組み合わせ
│   ├── mascot-view/   # メインビュー
│   └── settings-panel/ # 設定パネル
└── entities/          # ビジネスエンティティ
```

### 💡 Feature内部構造の理解
```typescript
// 各Featureの標準構造
src/features/mouse-follow/
├── model/             # ビジネスロジック・状態管理
│   └── mouse-follow-store.ts
├── ui/                # UIコンポーネント
│   └── MouseFollowSettings.tsx
├── lib/               # ユーティリティ・計算
│   ├── calculations.ts
│   └── screen-adapter.ts
├── types/             # Feature固有型定義
│   └── mouse-follow-types.ts
└── index.ts           # Public API (重要!)

// 📝 Public APIの例
export { useMouseFollowStore } from './model/mouse-follow-store'
export { MouseFollowSettings } from './ui/MouseFollowSettings'
export type { MousePosition, HeadOrientation } from './types'
```

### 🚨 移行中の注意事項
```typescript
// ❌ 古い構造 (移行中削除予定)
src/domain/            # Clean Architecture残存
src/application/       # Clean Architecture残存
src/infrastructure/    # Clean Architecture残存

// ✅ 新しい構造 (今後はこちらを使用)
src/features/          # Feature-Sliced Design
src/shared/            # 共通リソース
src/widgets/           # Feature組み合わせ
```

## 🔧 開発フロー

### 1. 機能開発の基本フロー

#### TDD開発プロセス（必須）
```bash
# 1. RED: 失敗するテストを先に書く
# テストファイル作成
touch src/services/newFeature.test.ts

# 2. テスト実装
cat > src/services/newFeature.test.ts << 'EOF'
import { NewFeature } from './newFeature';

describe('NewFeature', () => {
  describe('processData', () => {
    it('should process data correctly', () => {
      const feature = new NewFeature();
      const result = feature.processData('input');
      
      expect(result).toBe('expected_output');
    });

    it('should throw error for invalid input', () => {
      const feature = new NewFeature();
      
      expect(() => feature.processData('')).toThrow('Invalid input');
    });
  });
});
EOF

# 3. テスト実行（RED - 失敗することを確認）
npm test -- --testPathPattern=newFeature.test.ts

# 4. GREEN: テストを通すコードを実装
touch src/services/newFeature.ts

# 5. 実装
cat > src/services/newFeature.ts << 'EOF'
export class NewFeature {
  processData(input: string): string {
    if (!input) {
      throw new Error('Invalid input');
    }
    return `processed_${input}`;
  }
}
EOF

# 6. テスト実行（GREEN - 成功することを確認）
npm test -- --testPathPattern=newFeature.test.ts

# 7. REFACTOR: コードクリーンアップ
# コード改善、最適化

# 8. 最終テスト
npm test
npm run lint
npm run type-check
```

### 2. React コンポーネント開発

#### 新しい設定コンポーネントの追加
```bash
# 1. コンポーネントファイル作成
mkdir -p src/renderer/components/settings
touch src/renderer/components/settings/NewSettingsTab.tsx
touch src/renderer/components/settings/NewSettingsTab.test.tsx

# 2. テスト先行実装
cat > src/renderer/components/settings/NewSettingsTab.test.tsx << 'EOF'
import { render, screen, fireEvent } from '@testing-library/react';
import { NewSettingsTab } from './NewSettingsTab';

describe('NewSettingsTab', () => {
  it('should render settings form', () => {
    render(<NewSettingsTab />);
    
    expect(screen.getByLabelText('New Setting')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const mockSave = jest.fn();
    render(<NewSettingsTab onSave={mockSave} />);
    
    fireEvent.change(screen.getByLabelText('New Setting'), {
      target: { value: 'test value' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    
    expect(mockSave).toHaveBeenCalledWith({ newSetting: 'test value' });
  });
});
EOF

# 3. コンポーネント実装
cat > src/renderer/components/settings/NewSettingsTab.tsx << 'EOF'
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Card } from '../common/Card';

const schema = z.object({
  newSetting: z.string().min(1, 'Setting is required')
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSave?: (data: FormData) => void;
}

export const NewSettingsTab: React.FC<Props> = ({ onSave }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const onSubmit = (data: FormData) => {
    onSave?.(data);
  };

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="New Setting"
          {...register('newSetting')}
          error={errors.newSetting?.message}
        />
        <Button type="submit">Save</Button>
      </form>
    </Card>
  );
};
EOF

# 4. コンポーネントのエクスポート更新
echo "export { NewSettingsTab } from './NewSettingsTab';" >> src/renderer/components/settings/index.ts

# 5. テスト実行
npm test -- --testPathPattern=NewSettingsTab.test.tsx
```

### 3. Three.js VRM機能の追加

#### 新しいVRM機能サービスの実装
```typescript
// src/services/newVRMFeature.test.ts
import { NewVRMFeature } from './newVRMFeature';
import * as THREE from 'three';

describe('NewVRMFeature', () => {
  let feature: NewVRMFeature;
  let mockScene: THREE.Scene;

  beforeEach(() => {
    mockScene = new THREE.Scene();
    feature = new NewVRMFeature(mockScene);
  });

  afterEach(() => {
    feature.dispose();
  });

  it('should initialize VRM feature', async () => {
    await feature.initialize();
    
    expect(feature.isInitialized()).toBe(true);
  });

  it('should apply VRM animation', async () => {
    await feature.initialize();
    
    const result = await feature.applyAnimation('wave');
    
    expect(result.success).toBe(true);
    expect(result.animationName).toBe('wave');
  });
});

// src/services/newVRMFeature.ts
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';

export class NewVRMFeature {
  private scene: THREE.Scene;
  private vrm: VRM | null = null;
  private initialized = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  async initialize(): Promise<void> {
    // VRMモデルの取得
    this.vrm = this.scene.getObjectByName('vrm') as VRM;
    
    if (!this.vrm) {
      throw new Error('VRM model not found in scene');
    }

    this.initialized = true;
  }

  async applyAnimation(animationName: string): Promise<{ success: boolean; animationName: string }> {
    if (!this.initialized) {
      throw new Error('Feature not initialized');
    }

    // アニメーション適用ロジック
    switch (animationName) {
      case 'wave':
        await this.applyWaveAnimation();
        break;
      default:
        throw new Error(`Unknown animation: ${animationName}`);
    }

    return { success: true, animationName };
  }

  private async applyWaveAnimation(): Promise<void> {
    // 実際のアニメーション実装
    if (this.vrm?.expressionManager) {
      this.vrm.expressionManager.setValue('happy', 0.8);
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  dispose(): void {
    this.initialized = false;
    this.vrm = null;
  }
}
```

## 🧪 テスト戦略

### テストの種類と実行方法

```bash
# 単体テスト（高速）
npm test                                    # 全テスト実行
npm test -- --watch                        # ウォッチモード
npm test -- --testPathPattern=services     # 特定ディレクトリ
npm test -- --testNamePattern="should"     # 特定テスト名

# 統合テスト
npm run test:integration                    # 統合テスト実行

# E2Eテスト
npm run test:e2e:headless                  # ヘッドレスE2E
npm run test:e2e:debug                     # デバッグモード

# パフォーマンステスト
npm run test:perf:ci                       # パフォーマンス検証

# アクセシビリティテスト
npm run test:accessibility:audit           # WCAG準拠確認

# 品質チェック
npm run quality                            # 型チェック+Lint+フォーマット
```

### テストベストプラクティス

#### 1. サービステストの書き方
```typescript
// Good: 責務が明確で独立性が高い
describe('CameraManager', () => {
  let cameraManager: CameraManager;
  let mockCamera: jest.Mocked<THREE.PerspectiveCamera>;

  beforeEach(() => {
    mockCamera = createMockCamera();
    cameraManager = new CameraManager(mockCamera);
  });

  describe('updatePosition', () => {
    it('should update camera position to specified coordinates', () => {
      const newPosition = new THREE.Vector3(1, 2, 3);
      
      cameraManager.updatePosition(newPosition);
      
      expect(mockCamera.position.copy).toHaveBeenCalledWith(newPosition);
    });

    it('should throw error for invalid position', () => {
      expect(() => cameraManager.updatePosition(null)).toThrow('Invalid position');
    });
  });
});
```

#### 2. Reactコンポーネントテストの書き方
```typescript
// Good: ユーザー観点でのテスト
describe('ChatSettingsTab', () => {
  it('should save settings when user fills form and clicks save', async () => {
    const mockSave = jest.fn();
    render(<ChatSettingsTab onSave={mockSave} />);
    
    // ユーザーアクション
    await user.type(screen.getByLabelText('Username'), 'John Doe');
    await user.selectOptions(screen.getByLabelText('Theme'), 'dark');
    await user.click(screen.getByRole('button', { name: 'Save Settings' }));
    
    // 期待結果
    expect(mockSave).toHaveBeenCalledWith({
      username: 'John Doe',
      theme: 'dark'
    });
  });
});
```

#### 3. E2Eテストの書き方
```typescript
// Good: 実際のユーザーシナリオ
describe('Chat Feature E2E', () => {
  it('should complete full chat interaction flow', async () => {
    // 1. アプリケーション起動
    const app = await startElectronApp();
    
    // 2. チャットウィンドウ開く
    await app.click('[data-testid="open-chat"]');
    await app.waitForSelector('[data-testid="chat-window"]');
    
    // 3. メッセージ送信
    await app.fill('[data-testid="message-input"]', 'Hello, mascot!');
    await app.click('[data-testid="send-button"]');
    
    // 4. AI応答確認
    await app.waitForSelector('[data-testid="ai-message"]');
    const response = await app.textContent('[data-testid="ai-message"]');
    expect(response).toBeTruthy();
    
    // 5. VRM表情変化確認
    const expression = await app.getAttribute('[data-testid="vrm-model"]', 'data-expression');
    expect(expression).not.toBe('neutral');
    
    await app.close();
  });
});
```

## 🎨 UI/UX開発

### React + Tailwind CSS開発

#### デザインシステムの使用
```typescript
// 共通コンポーネントの使用例
import { Button, Card, Input, Select } from '@/renderer/components/common';
import { cn } from '@/renderer/utils/cn';

const MyComponent: React.FC = () => {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <Input
          label="Username"
          placeholder="Enter your name"
          className="w-full"
        />
        
        <Select
          label="Theme"
          options={[
            { value: 'light', label: 'Light Theme' },
            { value: 'dark', label: 'Dark Theme' }
          ]}
        />
        
        <div className="flex gap-2">
          <Button variant="primary">Save</Button>
          <Button variant="secondary">Cancel</Button>
        </div>
      </div>
    </Card>
  );
};
```

#### カスタムコンポーネントの作成
```typescript
// src/renderer/components/common/Badge.tsx
import React from 'react';
import { cn } from '@/renderer/utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        {
          'bg-gray-100 text-gray-800': variant === 'default',
          'bg-green-100 text-green-800': variant === 'success',
          'bg-yellow-100 text-yellow-800': variant === 'warning',
          'bg-red-100 text-red-800': variant === 'error',
        },
        {
          'px-2 py-1 text-xs': size === 'sm',
          'px-3 py-1 text-sm': size === 'md',
          'px-4 py-2 text-base': size === 'lg',
        },
        className
      )}
    >
      {children}
    </span>
  );
};

// テストも同時に作成
// src/renderer/components/common/Badge.test.tsx
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('should render with default variant', () => {
    render(<Badge>Default</Badge>);
    
    const badge = screen.getByText('Default');
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  it('should render with success variant', () => {
    render(<Badge variant="success">Success</Badge>);
    
    const badge = screen.getByText('Success');
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });
});
```

### 状態管理（Zustand）

#### ストアの作成と使用
```typescript
// src/renderer/stores/chatStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      messages: [],
      isLoading: false,
      error: null,

      addMessage: (message) => {
        const newMessage: ChatMessage = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          ...message
        };
        
        set((state) => ({
          messages: [...state.messages, newMessage]
        }));
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearMessages: () => set({ messages: [] })
    }),
    { name: 'chat-store' }
  )
);

// コンポーネントでの使用
import { useChatStore } from '@/renderer/stores/chatStore';

const ChatWindow: React.FC = () => {
  const { messages, isLoading, addMessage, setLoading } = useChatStore();

  const handleSendMessage = async (content: string) => {
    addMessage({ content, role: 'user' });
    setLoading(true);
    
    try {
      const response = await window.electronAPI.sendChatMessage(content);
      addMessage({ content: response.content, role: 'assistant' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {messages.map((message) => (
          <div key={message.id} className={cn(
            'p-3 rounded-lg mb-2',
            message.role === 'user' ? 'bg-blue-100 ml-8' : 'bg-gray-100 mr-8'
          )}>
            {message.content}
          </div>
        ))}
      </div>
      
      {isLoading && <div>AI is typing...</div>}
      
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
};
```

## 🔧 IPC通信の開発

### 新しいIPC ハンドラーの追加

#### 1. 型定義の追加
```typescript
// src/types/ipc.ts
export interface IPCChannels {
  // 既存...
  
  // 新機能
  'get-new-feature-data': () => Promise<NewFeatureData>;
  'update-new-feature': (data: NewFeatureData) => Promise<boolean>;
  'new-feature-changed': (data: NewFeatureData) => void;
}

export interface NewFeatureData {
  id: string;
  name: string;
  enabled: boolean;
  settings: Record<string, unknown>;
}
```

#### 2. メインプロセスハンドラーの実装
```typescript
// src/main/ipc/handlers/NewFeatureHandler.ts
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { ApplicationService } from '@/application/ApplicationService';

export class NewFeatureHandler {
  constructor(private applicationService: ApplicationService) {}

  register(): void {
    ipcMain.handle('get-new-feature-data', this.getNewFeatureData.bind(this));
    ipcMain.handle('update-new-feature', this.updateNewFeature.bind(this));
  }

  private async getNewFeatureData(event: IpcMainInvokeEvent): Promise<NewFeatureData> {
    try {
      return await this.applicationService.getNewFeatureData();
    } catch (error) {
      console.error('Failed to get new feature data:', error);
      throw error;
    }
  }

  private async updateNewFeature(
    event: IpcMainInvokeEvent,
    data: NewFeatureData
  ): Promise<boolean> {
    try {
      await this.applicationService.updateNewFeature(data);
      
      // 他のウィンドウに変更を通知
      event.sender.webContents.getAllWebContents().forEach(webContents => {
        if (webContents !== event.sender) {
          webContents.send('new-feature-changed', data);
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to update new feature:', error);
      throw error;
    }
  }
}

// テスト
// src/main/ipc/handlers/NewFeatureHandler.test.ts
import { NewFeatureHandler } from './NewFeatureHandler';
import { ApplicationService } from '@/application/ApplicationService';

describe('NewFeatureHandler', () => {
  let handler: NewFeatureHandler;
  let mockApplicationService: jest.Mocked<ApplicationService>;

  beforeEach(() => {
    mockApplicationService = {
      getNewFeatureData: jest.fn(),
      updateNewFeature: jest.fn()
    } as any;
    
    handler = new NewFeatureHandler(mockApplicationService);
  });

  describe('getNewFeatureData', () => {
    it('should return feature data from application service', async () => {
      const mockData = { id: '1', name: 'test', enabled: true, settings: {} };
      mockApplicationService.getNewFeatureData.mockResolvedValue(mockData);

      const result = await handler['getNewFeatureData']({} as any);

      expect(result).toEqual(mockData);
      expect(mockApplicationService.getNewFeatureData).toHaveBeenCalled();
    });
  });
});
```

#### 3. preload.ts の更新
```typescript
// src/preload.ts に追加
const electronAPI = {
  // 既存...
  
  // 新機能
  getNewFeatureData: () => ipcRenderer.invoke('get-new-feature-data'),
  updateNewFeature: (data: NewFeatureData) => ipcRenderer.invoke('update-new-feature', data),
  onNewFeatureChanged: (callback: (data: NewFeatureData) => void) => {
    const subscription = (_event: any, data: NewFeatureData) => callback(data);
    ipcRenderer.on('new-feature-changed', subscription);
    
    return () => ipcRenderer.removeListener('new-feature-changed', subscription);
  }
};
```

#### 4. React側での使用
```typescript
// src/renderer/hooks/useNewFeature.ts
import { useState, useEffect } from 'react';
import { NewFeatureData } from '@/types/ipc';

export const useNewFeature = () => {
  const [data, setData] = useState<NewFeatureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const featureData = await window.electronAPI.getNewFeatureData();
        setData(featureData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // 変更の監視
    const unsubscribe = window.electronAPI.onNewFeatureChanged((newData) => {
      setData(newData);
    });

    return unsubscribe;
  }, []);

  const updateFeature = async (newData: NewFeatureData) => {
    try {
      setLoading(true);
      await window.electronAPI.updateNewFeature(newData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, updateFeature };
};
```

## 🚀 パフォーマンス最適化

### バンドル最適化
```typescript
// vite.renderer.config.ts での設定例
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'vrm': ['@pixiv/three-vrm'],
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@hookform/resolvers', 'react-hook-form', 'zod']
        }
      }
    }
  }
});

// 動的インポートの活用
// src/renderer/utils/dynamicLoader.ts
export const loadThreeJS = async () => {
  const [THREE, { VRM }] = await Promise.all([
    import('three'),
    import('@pixiv/three-vrm')
  ]);
  
  return { THREE, VRM };
};

// 使用例
const LazyThreeComponent: React.FC = () => {
  const [threeJS, setThreeJS] = useState<any>(null);

  useEffect(() => {
    loadThreeJS().then(setThreeJS);
  }, []);

  if (!threeJS) return <div>Loading 3D engine...</div>;

  return <ThreeJSRenderer {...threeJS} />;
};
```

### React パフォーマンス最適化
```typescript
// メモ化の活用
import React, { memo, useMemo, useCallback } from 'react';

interface ExpensiveComponentProps {
  data: ComplexData[];
  onItemClick: (id: string) => void;
}

export const ExpensiveComponent = memo<ExpensiveComponentProps>(({ data, onItemClick }) => {
  // 重い計算のメモ化
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      processedField: expensiveCalculation(item)
    }));
  }, [data]);

  // コールバックのメモ化
  const handleClick = useCallback((id: string) => {
    onItemClick(id);
  }, [onItemClick]);

  return (
    <div>
      {processedData.map(item => (
        <ItemComponent
          key={item.id}
          item={item}
          onClick={handleClick}
        />
      ))}
    </div>
  );
});

// カスタムフックでのパフォーマンス最適化
export const useOptimizedSettings = () => {
  const [settings, setSettings] = useState<Settings>({});
  
  // デバウンス処理
  const debouncedUpdate = useMemo(
    () => debounce((newSettings: Settings) => {
      window.electronAPI.updateSettings(newSettings);
    }, 300),
    []
  );

  const updateSetting = useCallback((key: string, value: unknown) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      debouncedUpdate(updated);
      return updated;
    });
  }, [debouncedUpdate]);

  return { settings, updateSetting };
};
```

## 🐛 デバッグとトラブルシューティング

### 開発ツール
```bash
# 開発者ツールの起動
npm start -- --enable-dev-tools

# ログレベル調整
DEBUG=* npm start                    # 全ログ
DEBUG=main:* npm start              # メインプロセスのみ
DEBUG=renderer:* npm start          # レンダラーのみ

# パフォーマンス解析
npm run analyze:bundle              # バンドル解析
npm run analyze:performance         # パフォーマンス解析
```

### ログ活用
```typescript
// src/services/logger.ts の使用
import { logger } from '@/services/logger';

class MyService {
  async processData(data: unknown) {
    logger.info('Starting data processing', { dataSize: data.length });
    
    try {
      const result = await this.heavyProcess(data);
      logger.info('Data processing completed', { resultSize: result.length });
      return result;
    } catch (error) {
      logger.error('Data processing failed', { error: error.message, data });
      throw error;
    }
  }
}

// React コンポーネントでのログ
const MyComponent: React.FC = () => {
  useEffect(() => {
    logger.debug('Component mounted', { component: 'MyComponent' });
    
    return () => {
      logger.debug('Component unmounted', { component: 'MyComponent' });
    };
  }, []);
};
```

### 一般的な問題と解決法

#### 1. IPC通信エラー
```typescript
// 問題: IPCメッセージが届かない
// 解決: ハンドラー登録とpreload設定確認

// main.ts でハンドラー登録確認
import { ChatHandler } from './main/ipc/handlers/ChatHandler';
const chatHandler = new ChatHandler(applicationService);
chatHandler.register(); // ←これを忘れがち

// preload.ts で API公開確認
contextBridge.exposeInMainWorld('electronAPI', {
  sendChatMessage: (message) => ipcRenderer.invoke('send-chat-message', message)
});
```

#### 2. React状態更新エラー
```typescript
// 問題: 状態更新が反映されない
// 解決: useEffect依存配列とkey設定

// Bad
useEffect(() => {
  loadData();
}, []); // data変更を検知しない

// Good
useEffect(() => {
  loadData();
}, [data.id]); // data.id変更時に再実行

// Bad
{items.map(item => <Item item={item} />)}

// Good
{items.map(item => <Item key={item.id} item={item} />)}
```

#### 3. Three.js メモリリーク
```typescript
// 問題: VRMモデルがメモリに残る
// 解決: 適切なクリーンアップ

class VRMManager {
  private vrm: VRM | null = null;

  async loadVRM(url: string) {
    // 既存VRMのクリーンアップ
    if (this.vrm) {
      this.disposeVRM();
    }

    this.vrm = await loadVRMFromURL(url);
  }

  dispose() {
    this.disposeVRM();
  }

  private disposeVRM() {
    if (this.vrm) {
      // ジオメトリとマテリアルの削除
      this.vrm.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      
      this.vrm = null;
    }
  }
}
```

## 📦 リリース手順

### 1. プロダクションビルド
```bash
# 品質チェック
npm run quality                     # 型チェック + Lint + フォーマット
npm test                           # 全テスト実行
npm run test:e2e:headless          # E2Eテスト

# パフォーマンス確認
npm run test:perf:ci               # パフォーマンステスト
npm run analyze:bundle             # バンドルサイズ確認

# ビルド
npm run package                    # パッケージ作成
npm run make                       # インストーラー作成
```

### 2. 版数管理
```bash
# バージョンアップ
npm version patch                  # パッチ版数 (1.0.0 → 1.0.1)
npm version minor                  # マイナー版数 (1.0.0 → 1.1.0)
npm version major                  # メジャー版数 (1.0.0 → 2.0.0)

# タグ作成とプッシュ
git push origin main --tags
```

## 🤝 コントリビューション

### コミット規約
```bash
# 形式: type(scope): description

git commit -m "feat(renderer): add new settings tab component"
git commit -m "fix(services): resolve camera position bug"
git commit -m "test(integration): add comprehensive chat flow test"
git commit -m "refactor(infrastructure): improve error handling"
git commit -m "docs(api): update IPC channel documentation"
```

### プルリクエスト要件
- [ ] **テスト**: 新機能・修正に対応するテストを追加
- [ ] **型安全性**: TypeScript エラーがないことを確認
- [ ] **品質**: `npm run quality` がパスすることを確認
- [ ] **パフォーマンス**: 大きな変更の場合、パフォーマンステストを実行
- [ ] **ドキュメント**: 必要に応じてドキュメントを更新

## 📚 参考資料

### 公式ドキュメント
- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev)
- [Three.js Documentation](https://threejs.org/docs)
- [VRM Specification](https://vrm.dev/)

### プロジェクト固有
- **[docs/fsd-migration/FSD_ARCHITECTURE_DESIGN.md](./docs/fsd-migration/FSD_ARCHITECTURE_DESIGN.md)** - 新FSDアーキテクチャ ⭐
- **[docs/fsd-migration/MIGRATION_PLAN.md](./docs/fsd-migration/MIGRATION_PLAN.md)** - FSD移行計画 ⭐
- **[docs/fsd-migration/COMPARISON_TABLE.md](./docs/fsd-migration/COMPARISON_TABLE.md)** - Before/After比較 ⭐
- [ARCHITECTURE_V2.md](./ARCHITECTURE_V2.md) - 旧Clean Architecture (参考)
- [API_SPECIFICATION.md](./API_SPECIFICATION.md) - API仕様書

### 開発ツール
- [VS Code Settings](./.vscode/settings.json) - 推奨エディタ設定
- [ESLint Config](./eslint.config.js) - コード品質設定
- [TypeScript Config](./tsconfig.json) - 型チェック設定

---

**🎉 開発を楽しんでください！**

このガイドは実装済みのコードベースに基づいて作成されています。質問や改善提案がある場合は、GitHubのIssueまたはPull Requestでお知らせください。