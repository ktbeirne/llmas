# Feature-Sliced Design 開発ガイドライン

**作成日**: 2025年6月5日  
**バージョン**: 1.0  
**対象**: 本プロジェクトの開発者

---

## 1. 概要

Feature-Sliced Design (FSD) は、大規模なフロントエンドアプリケーションのための標準化されたアーキテクチャです。本ガイドラインでは、Desktop Mascotプロジェクトでの実装方法を説明します。

### 主な利点
- **保守性**: 機能単位での明確な境界
- **拡張性**: 新機能の追加が容易
- **テスタビリティ**: 独立したテストが可能
- **開発効率**: 並行開発が容易

---

## 2. ディレクトリ構造

```
src/
├── app/            # アプリケーション初期化層
├── features/       # ビジネスロジック層（Feature単位）
├── widgets/        # 複合UI層（Feature組み合わせ）
├── entities/       # ビジネスエンティティ層
└── shared/         # 共通リソース層
```

### 層の責務

#### App層 (`src/app/`)
- アプリケーション全体の初期化
- グローバルプロバイダー
- ルーティング設定（該当する場合）

#### Features層 (`src/features/`)
- **最重要層**: ビジネスロジックの実装
- 機能単位で完全に独立
- 他のFeatureへの直接依存禁止

#### Widgets層 (`src/widgets/`)
- 複数のFeatureを組み合わせた複合UI
- Feature間の調整ロジック
- ページレベルのコンポーネント

#### Entities層 (`src/entities/`)
- ビジネスドメインの基本モデル
- Feature間で共有される概念

#### Shared層 (`src/shared/`)
- UI基本コンポーネント
- ユーティリティ関数
- 型定義
- 定数

---

## 3. Feature実装パターン

### 3.1 必須ディレクトリ構造

```
src/features/[feature-name]/
├── model/          # 状態管理
├── ui/             # UIコンポーネント
├── api/            # API通信
├── lib/            # Feature固有のユーティリティ
├── types/          # 型定義
├── __tests__/      # テスト
└── index.ts        # Public API（必須）
```

### 3.2 実装例: マウス追従機能

```typescript
// src/features/mouse-follow/types/index.ts
export interface MousePosition {
  x: number;
  y: number;
  timestamp: number;
}

// src/features/mouse-follow/model/mouse-follow-store.ts
import { create } from 'zustand';
import { eventBus } from '@shared/lib/app-event-bus';

interface MouseFollowState {
  isEnabled: boolean;
  currentPosition: MousePosition | null;
  
  // Actions
  toggle: () => void;
  updatePosition: (position: MousePosition) => void;
}

export const useMouseFollowStore = create<MouseFollowState>((set, get) => ({
  isEnabled: true,
  currentPosition: null,
  
  toggle: () => {
    const newState = !get().isEnabled;
    set({ isEnabled: newState });
    
    // イベント発火で他Featureに通知
    eventBus.emit('mouse-follow:enabled', { enabled: newState });
  },
  
  updatePosition: (position) => {
    if (!get().isEnabled) return;
    set({ currentPosition: position });
  }
}));

// src/features/mouse-follow/index.ts (Public API)
export { useMouseFollowStore } from './model/mouse-follow-store';
export type { MousePosition } from './types';
// 内部実装は公開しない
```

---

## 4. 命名規則

### ファイル・ディレクトリ名
- Feature名: `kebab-case` (例: `mouse-follow`, `vrm-control`)
- ファイル名: `kebab-case` (例: `mouse-follow-store.ts`)

### コード内の命名
- コンポーネント: `PascalCase` (例: `MouseFollowSettings`)
- Hooks: `camelCase` with `use` prefix (例: `useMouseFollow`)
- Store: `camelCase` with `use` prefix (例: `useMouseFollowStore`)
- 型・インターフェース: `PascalCase` (例: `MousePosition`)

---

## 5. Import/Export規則

### ✅ 正しい例

```typescript
// Feature間の通信（Public API経由）
import { useMouseFollowStore } from '@features/mouse-follow';

// Shared層の利用
import { Button } from '@shared/ui';
import { eventBus } from '@shared/lib/app-event-bus';
```

### ❌ 間違った例

```typescript
// Feature内部への直接アクセス（禁止）
import { mouseStore } from '@features/mouse-follow/model/store';

// 相対パスでの他Feature参照（禁止）
import { something } from '../vrm-control/lib/utils';
```

---

## 6. Feature間の通信パターン

### 重要: イベントリスナーの設定タイミング

**特にIPC通信を伴うイベントリスナーは、初期化時に必ず設定すること**

```typescript
// ✅ 正しい例: Widget/Integrationの初期化時にリスナー設定
export class MascotIntegration {
  constructor() {
    // リスナーを先に設定（VRMロード前でもOK）
    this.setupEventListeners();
    this.setupLipSyncListener(); // リップシンクIPCリスナー
  }
  
  private setupLipSyncListener(): void {
    // IPCリスナーは初期化時に設定
    if (window.electronAPI?.onLipSyncUpdate) {
      this.lipSyncUnsubscribe = window.electronAPI.onLipSyncUpdate(
        async (data) => {
          // VRMが未ロードでもイベントを受信できる
          if (this.lipSyncManager) {
            await this.lipSyncManager.processLipSyncData(data);
          }
        }
      );
    }
  }
}

// ❌ 間違った例: VRMロード後にリスナー設定
async loadVRM(path: string) {
  this.vrm = await loadVRMModel(path);
  // このタイミングでは既にイベントを取り逃している可能性
  this.setupLipSyncListener();
}
```

### 6.1 イベント駆動通信

```typescript
// 送信側 Feature
eventBus.emit('mouse-follow:position-changed', { x: 100, y: 200 });

// 受信側 Feature
useEffect(() => {
  const unsubscribe = eventBus.subscribe(
    'mouse-follow:position-changed',
    (position) => {
      // 処理
    }
  );
  
  return unsubscribe;
}, []);
```

### 6.2 Widget経由の調整

```typescript
// src/widgets/mascot-view/ui/MascotView.tsx
export const MascotView = () => {
  const mouseFollow = useMouseFollowStore();
  const vrmControl = useVRMControlStore();
  
  // Widget層でFeature間を調整
  useEffect(() => {
    if (mouseFollow.currentPosition && vrmControl.isReady) {
      vrmControl.lookAt(mouseFollow.currentPosition);
    }
  }, [mouseFollow.currentPosition]);
};
```

---

## 7. テスト戦略

### 7.1 TDD（Test-Driven Development）必須

1. **RED**: 失敗するテストを先に書く
2. **GREEN**: テストを通す最小限の実装
3. **REFACTOR**: コードを改善

### 7.2 テストの配置

```
src/features/mouse-follow/
├── model/
│   └── mouse-follow-store.test.ts
├── lib/
│   └── calculations.test.ts
└── __tests__/
    └── integration.test.ts
```

### 7.3 テスト例

```typescript
// Unit Test
describe('MouseFollowStore', () => {
  it('should toggle enabled state', () => {
    const { toggle } = useMouseFollowStore.getState();
    
    expect(useMouseFollowStore.getState().isEnabled).toBe(true);
    toggle();
    expect(useMouseFollowStore.getState().isEnabled).toBe(false);
  });
});

// Integration Test (Feature間)
describe('Mouse Follow Integration', () => {
  it('should emit event when position changes', async () => {
    const handler = vi.fn();
    eventBus.subscribe('mouse-follow:position-changed', handler);
    
    const { updatePosition } = useMouseFollowStore.getState();
    updatePosition({ x: 100, y: 200, timestamp: Date.now() });
    
    expect(handler).toHaveBeenCalled();
  });
});
```

---

## 8. トラブルシューティング

### 問題: Import違反エラー
**原因**: Feature内部への直接アクセス  
**解決**: Public API (index.ts) 経由でインポート

### 問題: Circular Dependency
**原因**: Feature間の相互依存  
**解決**: イベントバスまたはEntities層を使用

### 問題: テストが複雑
**原因**: Feature間の密結合  
**解決**: モックとイベントバスを活用

---

## 9. ベストプラクティス

1. **Small is Better**: Featureは小さく保つ
2. **Single Responsibility**: 1つのFeatureは1つの責務
3. **Event-First**: Feature間通信はイベント優先
4. **Test Coverage**: 新機能には必ずテスト
5. **Documentation**: Public APIには必ずコメント

---

## 10. 移行チェックリスト

既存コードをFSDに移行する際のチェックリスト：

- [ ] Featureの境界を明確に定義
- [ ] 内部構造を整理（model/ui/api/lib/types）
- [ ] Public API (index.ts) を作成
- [ ] テストを作成（TDD）
- [ ] イベント通信に置き換え
- [ ] ドキュメントを更新

---

## 参考リンク

- [Feature-Sliced Design 公式](https://feature-sliced.design/)
- [プロジェクト移行計画](./MIGRATION_PLAN.md)
- [アーキテクチャ設計書](./FSD_ARCHITECTURE_DESIGN.md)