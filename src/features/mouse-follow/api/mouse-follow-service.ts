/**
 * Mouse Follow Service - FSD Phase 2
 * マウス追従機能の統合サービス
 */

import { ScreenAdapter } from './screen-adapter';
import { useMouseFollowStore } from '../model/mouse-follow-store';
import { eventBus } from '@shared/lib/app-event-bus';
import { MouseFollowSettings } from '../types';

export class MouseFollowService {
  private screenAdapter: ScreenAdapter;
  private trackingInterval: NodeJS.Timer | null = null;
  private unsubscribe: (() => void) | null = null;
  private eventListeners: Array<() => void> = [];

  constructor() {
    this.screenAdapter = new ScreenAdapter();
  }

  async initialize(): Promise<void> {
    try {
      // スクリーンアダプターの初期化（権限チェック含む）
      await this.screenAdapter.initialize();
      
      const store = useMouseFollowStore.getState();
      store.setPermission(true);
      
      // イベントリスナーの設定
      this.setupEventListeners();
      
      // ストアの購読
      this.unsubscribe = useMouseFollowStore.subscribe(
        (state) => state.updateFrequency,
        (updateFrequency, prevUpdateFrequency) => {
          if (updateFrequency !== prevUpdateFrequency && this.isTracking()) {
            this.stop();
            this.start();
          }
        }
      );
    } catch (error) {
      const store = useMouseFollowStore.getState();
      store.setPermission(false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private setupEventListeners(): void {
    // Start event
    const startHandler = () => this.start();
    eventBus.on('mouse-follow:start', startHandler);
    this.eventListeners.push(() => eventBus.off('mouse-follow:start', startHandler));

    // Stop event
    const stopHandler = () => this.stop();
    eventBus.on('mouse-follow:stop', stopHandler);
    this.eventListeners.push(() => eventBus.off('mouse-follow:stop', stopHandler));

    // Toggle event
    const toggleHandler = () => {
      const store = useMouseFollowStore.getState();
      store.toggle();
    };
    eventBus.on('mouse-follow:toggle', toggleHandler);
    this.eventListeners.push(() => eventBus.off('mouse-follow:toggle', toggleHandler));
  }

  async start(): Promise<boolean> {
    const store = useMouseFollowStore.getState();
    
    if (!store.hasPermission || !store.enabled) {
      return false;
    }

    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }

    store.startTracking();
    
    // トラッキング開始
    const intervalMs = store.updateFrequency;
    this.trackingInterval = setInterval(() => {
      this.trackMouse();
    }, intervalMs);

    return true;
  }

  async stop(): Promise<void> {
    const store = useMouseFollowStore.getState();
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    store.stopTracking();
  }

  private trackMouse(): void {
    const store = useMouseFollowStore.getState();
    
    if (!store.enabled || !store.isTracking) {
      return;
    }

    try {
      const position = this.screenAdapter.getMousePosition();
      store.updateMousePosition(position);
    } catch (error) {
      console.error('Failed to track mouse:', error);
      eventBus.emit('mouse-follow:error', { error });
    }
  }

  updateSettings(settings: Partial<MouseFollowSettings>): void {
    const store = useMouseFollowStore.getState();
    store.updateSettings(settings);
  }

  async checkPermission(): Promise<boolean> {
    return this.screenAdapter.checkPermission();
  }

  async requestPermission(): Promise<boolean> {
    return this.screenAdapter.requestPermission();
  }

  isTracking(): boolean {
    const store = useMouseFollowStore.getState();
    return store.isTracking;
  }

  getScreenBounds() {
    return this.screenAdapter.getScreenBounds();
  }

  async dispose(): Promise<void> {
    await this.stop();
    
    // イベントリスナーの解除
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
    
    // ストアの購読解除
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    
    // ストアのリセット
    const store = useMouseFollowStore.getState();
    store.reset();
  }
}