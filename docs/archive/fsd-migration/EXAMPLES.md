# FSD実装例

## 1. 実装例: マウス追従機能

完全なFeature実装の例として、マウス追従機能を示します。

### ディレクトリ構造

```
src/features/mouse-follow/
├── model/
│   ├── mouse-follow-store.ts
│   └── mouse-follow-store.test.ts
├── lib/
│   ├── calculations.ts
│   ├── calculations.test.ts
│   └── screen-adapter.ts
├── types/
│   └── index.ts
├── __tests__/
│   └── integration.test.ts
└── index.ts
```

### 実装コード

#### types/index.ts
```typescript
export interface MousePosition {
  x: number;
  y: number;
  timestamp: number;
}

export interface HeadOrientation {
  pitch: number;  // 上下の回転
  yaw: number;    // 左右の回転
  roll: number;   // 傾き
}

export interface MouseFollowSettings {
  enabled: boolean;
  sensitivity: number;
  smoothing: number;
  deadZone: number;
}
```

#### lib/calculations.ts
```typescript
import { MousePosition, HeadOrientation } from '../types';

export const calculateHeadOrientation = (
  mousePos: MousePosition,
  sensitivity: number,
  deadZone: number
): HeadOrientation | null => {
  // 画面中央を基準点
  const screenCenter = {
    x: window.screen.width / 2,
    y: window.screen.height / 2
  };
  
  // 中央からの距離
  const deltaX = mousePos.x - screenCenter.x;
  const deltaY = mousePos.y - screenCenter.y;
  
  // デッドゾーン内なら null を返す
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  if (distance < deadZone) {
    return null;
  }
  
  // 正規化された座標（-1 to 1）
  const normalizedX = deltaX / (window.screen.width / 2);
  const normalizedY = deltaY / (window.screen.height / 2);
  
  // 角度計算（ラジアン）
  const maxAngle = Math.PI / 4; // 45度が最大
  const yaw = normalizedX * maxAngle * sensitivity;
  const pitch = -normalizedY * maxAngle * sensitivity; // Y軸反転
  
  return {
    pitch: Math.max(-maxAngle, Math.min(maxAngle, pitch)),
    yaw: Math.max(-maxAngle, Math.min(maxAngle, yaw)),
    roll: 0
  };
};

export const smoothOrientation = (
  current: HeadOrientation | null,
  target: HeadOrientation | null,
  smoothing: number
): HeadOrientation | null => {
  if (!target) return current;
  if (!current) return target;
  
  return {
    pitch: current.pitch + (target.pitch - current.pitch) * (1 - smoothing),
    yaw: current.yaw + (target.yaw - current.yaw) * (1 - smoothing),
    roll: 0
  };
};
```

#### model/mouse-follow-store.ts
```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { eventBus } from '@shared/lib/app-event-bus';
import { 
  MousePosition, 
  HeadOrientation, 
  MouseFollowSettings 
} from '../types';
import { calculateHeadOrientation, smoothOrientation } from '../lib/calculations';

interface MouseFollowState extends MouseFollowSettings {
  // Current state
  currentPosition: MousePosition | null;
  targetOrientation: HeadOrientation | null;
  smoothedOrientation: HeadOrientation | null;
  
  // Actions
  updateSettings: (settings: Partial<MouseFollowSettings>) => void;
  updateMousePosition: (position: MousePosition) => void;
  toggle: () => void;
  reset: () => void;
  
  // Internal
  _animationFrame: number | null;
}

export const useMouseFollowStore = create<MouseFollowState>()(
  subscribeWithSelector((set, get) => ({
    // Default settings
    enabled: true,
    sensitivity: 0.5,
    smoothing: 0.8,
    deadZone: 50,
    
    // State
    currentPosition: null,
    targetOrientation: null,
    smoothedOrientation: null,
    _animationFrame: null,
    
    updateSettings: (settings) => {
      set((state) => ({ ...state, ...settings }));
      
      eventBus.emit('settings:changed', {
        category: 'mouse-follow',
        key: 'bulk',
        value: settings
      });
    },
    
    updateMousePosition: (position) => {
      const state = get();
      if (!state.enabled) return;
      
      set({ currentPosition: position });
      
      // 新しい目標方向を計算
      const targetOrientation = calculateHeadOrientation(
        position,
        state.sensitivity,
        state.deadZone
      );
      
      if (targetOrientation) {
        set({ targetOrientation });
        
        // スムージング処理をアニメーションフレームで実行
        if (!state._animationFrame) {
          const animate = () => {
            const current = get();
            const smoothed = smoothOrientation(
              current.smoothedOrientation,
              current.targetOrientation,
              current.smoothing
            );
            
            set({ smoothedOrientation: smoothed });
            
            if (smoothed) {
              eventBus.emit('mouse-follow:orientation-changed', smoothed);
            }
            
            if (current.enabled && current.targetOrientation) {
              set({ _animationFrame: requestAnimationFrame(animate) });
            } else {
              set({ _animationFrame: null });
            }
          };
          
          set({ _animationFrame: requestAnimationFrame(animate) });
        }
      }
    },
    
    toggle: () => {
      const newState = !get().enabled;
      set({ enabled: newState });
      
      if (!newState && get()._animationFrame) {
        cancelAnimationFrame(get()._animationFrame!);
        set({ _animationFrame: null });
      }
      
      eventBus.emit('mouse-follow:enabled', { enabled: newState });
    },
    
    reset: () => {
      const frame = get()._animationFrame;
      if (frame) {
        cancelAnimationFrame(frame);
      }
      
      set({
        currentPosition: null,
        targetOrientation: null,
        smoothedOrientation: null,
        _animationFrame: null
      });
    }
  }))
);
```

#### index.ts (Public API)
```typescript
// Store
export { useMouseFollowStore } from './model/mouse-follow-store';

// Types
export type { 
  MousePosition, 
  HeadOrientation, 
  MouseFollowSettings 
} from './types';

// Utilities (公開が必要な場合のみ)
export { calculateHeadOrientation } from './lib/calculations';
```

---

## 2. 実装例: 設定管理機能

### ディレクトリ構造

```
src/features/settings/
├── model/
│   └── settings-store.ts
├── ui/
│   ├── SettingsPanel.tsx
│   └── SettingsForm.tsx
├── lib/
│   ├── validators.ts
│   └── persistence.ts
├── types/
│   └── index.ts
└── index.ts
```

### 実装コード（抜粋）

#### model/settings-store.ts
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { eventBus } from '@shared/lib/app-event-bus';
import { validateSettings } from '../lib/validators';
import { AppSettings, SettingsCategory } from '../types';

interface SettingsState {
  settings: AppSettings;
  isDirty: boolean;
  
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => void;
  updateCategory: (
    category: SettingsCategory,
    values: Partial<AppSettings>
  ) => void;
  save: () => Promise<void>;
  reset: () => void;
}

const defaultSettings: AppSettings = {
  // ... デフォルト設定
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      isDirty: false,
      
      updateSetting: (key, value) => {
        const newSettings = { ...get().settings, [key]: value };
        
        // バリデーション
        const errors = validateSettings(newSettings);
        if (errors.length > 0) {
          eventBus.emit('app:error', {
            error: new Error('Invalid settings'),
            context: 'settings-validation',
            details: errors
          });
          return;
        }
        
        set({ settings: newSettings, isDirty: true });
        
        // 変更を通知
        eventBus.emit('settings:changed', {
          category: 'general',
          key,
          value
        });
      },
      
      save: async () => {
        const { settings } = get();
        
        try {
          // IPCで設定を保存
          await window.electronAPI.saveSettings(settings);
          
          set({ isDirty: false });
          
          eventBus.emit('settings:saved', { settings });
        } catch (error) {
          eventBus.emit('app:error', {
            error,
            context: 'settings-save'
          });
        }
      },
      
      reset: () => {
        set({ settings: defaultSettings, isDirty: false });
        eventBus.emit('settings:reset', {});
      }
    }),
    {
      name: 'app-settings',
      partialize: (state) => ({ settings: state.settings })
    }
  )
);
```

---

## 3. Widget実装例: マスコットビュー

### ディレクトリ構造

```
src/widgets/mascot-view/
├── ui/
│   ├── MascotView.tsx
│   └── components/
│       ├── DebugOverlay.tsx
│       └── ControlPanel.tsx
├── lib/
│   └── feature-coordinator.ts
└── index.ts
```

### 実装コード

#### ui/MascotView.tsx
```typescript
import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useMouseFollowStore } from '@features/mouse-follow';
import { useVRMControlStore } from '@features/vrm-control';
import { useAnimationStore } from '@features/animation';
import { useSettingsStore } from '@features/settings';
import { eventBus } from '@shared/lib/event-bus';
import { DebugOverlay } from './components/DebugOverlay';

export const MascotView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Feature stores
  const mouseFollow = useMouseFollowStore();
  const vrmControl = useVRMControlStore();
  const animation = useAnimationStore();
  const settings = useSettingsStore();
  
  // Feature間の調整
  useEffect(() => {
    // アニメーション再生中はマウス追従を無効化
    const unsubAnimStart = eventBus.subscribe(
      'vrm:animation-started',
      ({ animationId, isIdle }) => {
        if (!isIdle) {
          mouseFollow.updateSettings({ enabled: false });
        }
      }
    );
    
    const unsubAnimEnd = eventBus.subscribe(
      'vrm:animation-ended',
      () => {
        // 設定に基づいて再有効化
        if (settings.settings.mouseFollowEnabled) {
          mouseFollow.updateSettings({ enabled: true });
        }
      }
    );
    
    return () => {
      unsubAnimStart();
      unsubAnimEnd();
    };
  }, [settings.settings.mouseFollowEnabled]);
  
  // マウス追従の方向をVRMに適用
  useEffect(() => {
    if (!mouseFollow.smoothedOrientation || !vrmControl.vrm) {
      return;
    }
    
    vrmControl.setHeadOrientation(mouseFollow.smoothedOrientation);
  }, [mouseFollow.smoothedOrientation, vrmControl.vrm]);
  
  return (
    <div className="mascot-view">
      <Canvas
        ref={canvasRef}
        camera={{ position: [0, 1.5, 3], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        {vrmControl.vrm && (
          <primitive object={vrmControl.vrm.scene} />
        )}
      </Canvas>
      
      {settings.settings.debugMode && (
        <DebugOverlay
          mousePosition={mouseFollow.currentPosition}
          orientation={mouseFollow.smoothedOrientation}
          animationState={animation.currentAnimation}
        />
      )}
    </div>
  );
};
```

#### lib/feature-coordinator.ts
```typescript
// Widget層でのFeature間調整ロジック
export class FeatureCoordinator {
  private unsubscribers: (() => void)[] = [];
  
  initialize() {
    // 優先度管理: アニメーション > 手動操作 > マウス追従
    this.setupPriorityManagement();
    
    // 状態同期
    this.setupStateSync();
  }
  
  private setupPriorityManagement() {
    // 高優先度イベントの処理
    const unsubManual = eventBus.subscribe(
      'vrm:manual-control-started',
      () => {
        eventBus.emit('feature:request-pause', {
          features: ['mouse-follow', 'idle-animation'],
          reason: 'manual-control'
        });
      }
    );
    
    this.unsubscribers.push(unsubManual);
  }
  
  private setupStateSync() {
    // 設定変更時の同期
    const unsubSettings = eventBus.subscribe(
      'settings:changed',
      ({ category, key, value }) => {
        if (category === 'mouse-follow') {
          // 関連機能に通知
          eventBus.emit('mouse-follow:settings-updated', value);
        }
      }
    );
    
    this.unsubscribers.push(unsubSettings);
  }
  
  cleanup() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }
}
```

---

これらの実装例を参考に、FSDアーキテクチャに沿った機能開発を進めてください。