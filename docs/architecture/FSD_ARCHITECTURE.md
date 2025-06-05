# Feature-Sliced Design アーキテクチャ設計書

**作成日**: 2025年6月5日  
**最終更新**: 2025年6月5日（セルフレビュー後改善版）  
**バージョン**: 1.1  
**対象**: LLM Desktop Mascot FSD移行

### ⚠️ 設計原則
- **段階的適用**: 理想形を示すが、実際は段階的に移行
- **実用性重視**: 理論より実装可能性を優先
- **既存資産活用**: Three.js、React、Electronの既存統合を最大限活用

---

## 🎯 アーキテクチャ概要

### Feature-Sliced Design原則

```
🍰 Layer-first → Feature-first
📦 Monolith → Composition  
🔗 Tight coupling → Loose coupling
🧩 Complex abstraction → Simple structure
```

### 新しいフォルダ構造

```
src/
├── app/                    # アプリケーション初期化層
│   ├── providers/          # Context Providers
│   ├── stores/            # グローバル状態管理
│   └── main.tsx           # アプリエントリーポイント
│
├── features/              # 機能別スライス（核心）
│   ├── mouse-follow/      # マウス追従機能
│   │   ├── model/         # ビジネスロジック・状態管理
│   │   ├── ui/            # UIコンポーネント
│   │   ├── lib/           # ユーティリティ・計算ロジック
│   │   ├── api/           # 外部API通信（該当時）
│   │   └── index.ts       # Public API
│   │
│   ├── vrm-control/       # VRM制御機能
│   │   ├── model/         # VRM状態管理・制御ロジック
│   │   ├── lib/           # Three.js統合・ボーン操作
│   │   ├── types/         # VRM固有型定義
│   │   └── index.ts
│   │
│   ├── chat/              # チャット機能
│   │   ├── model/         # チャット状態・履歴管理
│   │   ├── ui/            # チャットUI
│   │   ├── api/           # Gemini API通信
│   │   └── index.ts
│   │
│   ├── settings/          # 設定管理機能
│   │   ├── model/         # 設定状態・永続化
│   │   ├── ui/            # 設定UI
│   │   ├── lib/           # 設定バリデーション
│   │   └── index.ts
│   │
│   ├── animation/         # アニメーション管理
│   │   ├── model/         # アニメーション状態
│   │   ├── lib/           # カテゴリ判定・制御
│   │   └── index.ts
│   │
│   └── mcp-integration/   # MCP機能（未来）
│       ├── model/         # MCP状態管理
│       ├── api/           # MCPプロトコル通信
│       ├── lib/           # プロトコル処理
│       └── index.ts
│
├── shared/                # 共有リソース
│   ├── ui/                # 共通UIコンポーネント
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Card/
│   │   └── index.ts
│   │
│   ├── lib/               # 共通ユーティリティ
│   │   ├── event-bus.ts   # イベント駆動システム
│   │   ├── validation.ts  # 共通バリデーション
│   │   ├── storage.ts     # ローカルストレージ
│   │   └── index.ts
│   │
│   ├── types/             # 共通型定義
│   │   ├── events.ts      # イベント型
│   │   ├── common.ts      # 共通型
│   │   └── index.ts
│   │
│   └── constants/         # 定数・設定
│       ├── app.ts
│       ├── urls.ts
│       └── index.ts
│
├── widgets/               # 複合ウィジェット（Features組み合わせ）
│   ├── mascot-view/       # メインビューウィジェット
│   │   ├── ui/            # 統合UI
│   │   ├── model/         # Feature間調整ロジック
│   │   └── index.ts
│   │
│   └── settings-panel/    # 設定パネルウィジェット
│       ├── ui/
│       ├── model/
│       └── index.ts
│
└── entities/              # ビジネスエンティティ（簡素化）
    ├── mascot/            # マスコット基本エンティティ
    ├── user/              # ユーザーエンティティ
    └── index.ts
```

---

## 🏗️ レイヤー詳細設計

### 1. App層（アプリケーション初期化）

```typescript
// src/app/providers/FeatureProvider.tsx
export const FeatureProvider: FC<PropsWithChildren> = ({ children }) => {
  // Features初期化・管理
  // イベントバス提供
  // グローバル状態管理
}

// src/app/stores/global-store.ts
export const useGlobalStore = create<GlobalState>((set) => ({
  // クロスFeature状態のみ
  isAppReady: false,
  currentTheme: 'auto',
}))
```

### 2. Features層（機能実装）

#### Feature内部構造の原則

```typescript
// src/features/{feature-name}/index.ts
export { FeatureName } from './ui'
export { useFeatureStore } from './model'
export type { FeatureEvent, FeatureState } from './types'

// Public APIのみエクスポート、内部実装は隠蔽
```

#### モデル層設計（状態管理）

```typescript
// src/features/mouse-follow/model/mouse-follow-store.ts
export const useMouseFollowStore = create<MouseFollowState>((set, get) => ({
  isEnabled: true,
  sensitivity: 0.5,
  smoothing: 0.8,
  
  // アクション
  toggleEnabled: () => set(state => ({ isEnabled: !state.isEnabled })),
  updateSettings: (settings) => set(settings),
  
  // ビジネスロジック
  calculateHeadRotation: (mousePosition: MousePosition) => {
    // 計算ロジック
  }
}))
```

#### UI層設計（コンポーネント）

```typescript
// src/features/mouse-follow/ui/MouseFollowSettings.tsx
export const MouseFollowSettings: FC = () => {
  const { isEnabled, sensitivity, toggleEnabled } = useMouseFollowStore()
  
  return (
    <Card>
      <Switch checked={isEnabled} onChange={toggleEnabled} />
      <Slider value={sensitivity} onChange={updateSensitivity} />
    </Card>
  )
}
```

#### Lib層設計（ユーティリティ）

```typescript
// src/features/mouse-follow/lib/calculations.ts
export const calculateHeadOrientation = (
  mousePos: MousePosition,
  screenBounds: ScreenBounds
): HeadOrientation => {
  // 純粋関数による計算ロジック
}

export const smoothRotation = (
  current: Quaternion,
  target: Quaternion,
  smoothing: number
): Quaternion => {
  // スムージング処理
}
```

### 3. Shared層（共有リソース）

#### イベントバス設計

```typescript
// src/shared/lib/event-bus.ts
type EventMap = {
  'mouse-follow:position-changed': MousePosition
  'vrm:expression-changed': Expression  
  'chat:message-received': ChatMessage
  'settings:changed': SettingsChangeEvent
}

export const eventBus = createEventBus<EventMap>()

// 型安全なイベント送信・受信
eventBus.emit('mouse-follow:position-changed', { x: 100, y: 200 })
eventBus.subscribe('vrm:expression-changed', (expression) => {
  // ハンドラー
})
```

#### 共通UI設計

```typescript
// src/shared/ui/Button/Button.tsx
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
}

export const Button: FC<ButtonProps> = ({ variant = 'primary', ...props }) => {
  // Tailwind + 一貫したデザインシステム
}
```

### 4. Widgets層（Feature組み合わせ）

```typescript
// src/widgets/mascot-view/ui/MascotView.tsx
export const MascotView: FC = () => {
  // 複数Featureの統合
  const mouseFollow = useMouseFollowStore()
  const vrmControl = useVRMControlStore()
  const animation = useAnimationStore()
  
  useEffect(() => {
    // Feature間の調整ロジック
    if (animation.isPlaying && !animation.isIdle) {
      mouseFollow.disable()
    } else {
      mouseFollow.enable()
    }
  }, [animation.isPlaying, animation.isIdle])
  
  return (
    <Canvas>
      {/* Three.js + VRM統合 */}
    </Canvas>
  )
}
```

---

## 🔄 イベント駆動アーキテクチャ

### 通信パターン

#### 1. Feature内通信
```typescript
// 同一Feature内ではdirect import可能
import { calculateHeadOrientation } from '../lib/calculations'
```

#### 2. Feature間通信
```typescript
// イベントバス経由での疎結合通信
eventBus.emit('mouse-follow:disabled', { reason: 'animation-playing' })
```

#### 3. Electron IPC統合
```typescript
// src/shared/lib/electron-events.ts
export const electronBridge = {
  onSettingsChanged: (callback: (settings: Settings) => void) => {
    // Electron IPC → イベントバス変換
    ipcRenderer.on('settings-changed', (_, settings) => {
      eventBus.emit('settings:changed', settings)
      callback(settings)
    })
  }
}
```

### イベント設計原則

```typescript
// src/shared/types/events.ts
export interface EventPayload {
  timestamp: number
  source: string
  data: unknown
}

export type AppEvent<T = unknown> = EventPayload & {
  data: T
}

// 型安全なイベント定義
export interface EventMap {
  'mouse-follow:enabled': AppEvent<{ sensitivity: number }>
  'vrm:expression-set': AppEvent<{ expression: string }>
  'chat:message-sent': AppEvent<{ message: string }>
}
```

---

## 🧪 テスト戦略

### Feature単位テスト

```typescript
// src/features/mouse-follow/model/__tests__/mouse-follow-store.test.ts
describe('MouseFollowStore', () => {
  it('should calculate head orientation correctly', () => {
    const store = useMouseFollowStore.getState()
    const result = store.calculateHeadRotation({ x: 100, y: 100 })
    expect(result.pitch).toBeCloseTo(0.5)
  })
})
```

### 統合テスト

```typescript
// src/widgets/mascot-view/__tests__/integration.test.tsx
describe('MascotView Integration', () => {
  it('should disable mouse follow when animation plays', async () => {
    render(<MascotView />)
    
    // アニメーション開始をシミュレート
    act(() => {
      eventBus.emit('animation:started', { name: 'wave', isIdle: false })
    })
    
    // マウス追従が無効化されることを確認
    expect(screen.getByTestId('mouse-follow')).toHaveAttribute('data-enabled', 'false')
  })
})
```

---

## 📊 パフォーマンス設計

### バンドル分割

```typescript
// vite.config.ts でのFeature分割
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'feature-mouse-follow': ['src/features/mouse-follow'],
          'feature-chat': ['src/features/chat'],
          'feature-vrm': ['src/features/vrm-control'],
          'shared-ui': ['src/shared/ui'],
        }
      }
    }
  }
})
```

### レイジーロード

```typescript
// src/widgets/mascot-view/ui/MascotView.tsx
const ChatPanel = lazy(() => import('../../features/chat/ui/ChatPanel'))
const SettingsPanel = lazy(() => import('../../features/settings/ui/SettingsPanel'))
```

---

## 🔒 型安全性の確保

### 厳格な型定義

```typescript
// src/features/mouse-follow/types/index.ts
export interface MousePosition {
  readonly x: number
  readonly y: number
  readonly timestamp: number
}

export interface HeadOrientation {
  readonly pitch: number
  readonly yaw: number
  readonly roll: number
}

// Branded Types for type safety
export type MouseSensitivity = number & { readonly brand: unique symbol }
export type SmoothingFactor = number & { readonly brand: unique symbol }
```

### 実行時型検証

```typescript
// src/shared/lib/validation.ts
import { z } from 'zod'

export const MousePositionSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  timestamp: z.number()
})

export const validateMousePosition = (data: unknown): MousePosition => {
  return MousePositionSchema.parse(data)
}
```

---

## 🚀 移行時の互換性設計

### レガシー互換レイヤー

```typescript
// src/shared/lib/legacy-adapter.ts
export class LegacyMascotStateManager {
  // 既存APIを維持しつつ、内部でイベントバスに変換
  setExpression(expression: string) {
    eventBus.emit('vrm:expression-set', { expression })
  }
  
  setAnimation(animation: string) {
    eventBus.emit('animation:set', { animation })
  }
}

// 段階的に削除予定
export const mascotStateManager = new LegacyMascotStateManager()
```

---

## 📋 品質ゲート

### ESLint設定（FSD専用）

```javascript
// .eslintrc.features.js
module.exports = {
  rules: {
    // Feature間の直接import禁止
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          '../*/features/*', // 他Featureへの直接アクセス禁止
          '../../features/*' // 上位階層からのFeature直接アクセス禁止
        ]
      }
    ],
    
    // Public API経由のみ許可
    'import/no-internal-modules': [
      'error',
      {
        allow: ['**/index.ts', '**/index.tsx']
      }
    ]
  }
}
```

### アーキテクチャテスト

```typescript
// src/__tests__/architecture.test.ts
describe('Architecture Rules', () => {
  it('should not import features directly', () => {
    // ファイルスキャンによるアーキテクチャ違反検出
  })
  
  it('should use event bus for cross-feature communication', () => {
    // イベントバス使用の強制
  })
})
```

---

## 🎯 次の段階

この設計書に基づいて：
1. **移行計画**: 段階的移行戦略
2. **移行チェックリスト**: 実装確認項目
3. **移行チケット**: 具体的実装タスク

の詳細化を行います。