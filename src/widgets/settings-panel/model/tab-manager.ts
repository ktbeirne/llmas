/**
 * TabManager - Settings Panel Widget
 * FSD Phase 3: タブ管理機能（TDD: GREEN Phase）
 */

type SettingsTab = 'display' | 'chat' | 'expression' | 'camera' | 'debug';

interface TabManagerState {
  activeTab: SettingsTab;
  availableTabs: SettingsTab[];
  tabHistory: SettingsTab[];
}

interface TabManagerConfig {
  maxHistoryLength?: number;
  defaultTab?: SettingsTab;
}

interface TabManagerStats {
  totalSwitches: number;
  mostUsedTab: SettingsTab;
  tabUsageCount: Record<SettingsTab, number>;
}

type StateChangeCallback = (state: TabManagerState) => void;

export class TabManager {
  private state: TabManagerState;
  private config: Required<TabManagerConfig>;
  private subscribers: Set<StateChangeCallback> = new Set();
  private tabUsageCount: Record<SettingsTab, number>;
  private totalSwitches: number = 0;
  private disabledTabs: Set<SettingsTab> = new Set();
  private isDestroyed: boolean = false;

  constructor(config: TabManagerConfig = {}) {
    this.config = {
      maxHistoryLength: config.maxHistoryLength ?? 10,
      defaultTab: config.defaultTab ?? 'display'
    };

    this.state = {
      activeTab: this.config.defaultTab,
      availableTabs: ['display', 'chat', 'expression', 'camera', 'debug'],
      tabHistory: []
    };

    this.tabUsageCount = {
      display: 0,
      chat: 0,
      expression: 0,
      camera: 0,
      debug: 0
    };
  }

  /**
   * 現在の状態を取得
   */
  getState(): TabManagerState {
    return {
      ...this.state,
      availableTabs: this.state.availableTabs.filter(tab => !this.disabledTabs.has(tab))
    };
  }

  /**
   * タブを切り替え
   */
  switchTab(tab: SettingsTab): void {
    if (this.isDestroyed) return;

    if (!this.state.availableTabs.includes(tab)) {
      throw new Error(`Invalid tab: ${tab}`);
    }

    if (this.disabledTabs.has(tab)) {
      throw new Error(`Tab is disabled: ${tab}`);
    }

    if (this.state.activeTab === tab) {
      return; // 同じタブの場合は何もしない
    }

    // 履歴に現在のタブを追加
    this.state.tabHistory.push(this.state.activeTab);

    // 履歴の長さを制限
    if (this.state.tabHistory.length > this.config.maxHistoryLength) {
      this.state.tabHistory = this.state.tabHistory.slice(-this.config.maxHistoryLength);
    }

    // タブを切り替え
    this.state.activeTab = tab;

    // 統計情報を更新
    this.tabUsageCount[tab]++;
    this.totalSwitches++;

    // 購読者に通知
    this.notifySubscribers();
  }

  /**
   * 前のタブに戻る
   */
  goBack(): boolean {
    if (this.isDestroyed) return false;

    if (this.state.tabHistory.length === 0) {
      return false;
    }

    const previousTab = this.state.tabHistory.pop()!;
    this.state.activeTab = previousTab;

    this.notifySubscribers();
    return true;
  }

  /**
   * 履歴をクリア
   */
  clearHistory(): void {
    if (this.isDestroyed) return;

    this.state.tabHistory = [];
    this.notifySubscribers();
  }

  /**
   * タブの有効性を設定
   */
  setTabEnabled(tab: SettingsTab, enabled: boolean): void {
    if (this.isDestroyed) return;

    if (enabled) {
      this.disabledTabs.delete(tab);
    } else {
      this.disabledTabs.add(tab);

      // 現在アクティブなタブが無効化された場合、デフォルトタブに切り替え
      if (this.state.activeTab === tab) {
        this.state.activeTab = this.config.defaultTab;
        this.notifySubscribers();
      }
    }

    this.notifySubscribers();
  }

  /**
   * 状態変更を購読
   */
  subscribe(callback: StateChangeCallback): () => void {
    if (this.isDestroyed) return () => {};

    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * 統計情報を取得
   */
  getStats(): TabManagerStats {
    const mostUsedTab = Object.entries(this.tabUsageCount).reduce(
      (max, [tab, count]) => count > max.count ? { tab: tab as SettingsTab, count } : max,
      { tab: 'display' as SettingsTab, count: 0 }
    ).tab;

    return {
      totalSwitches: this.totalSwitches,
      mostUsedTab,
      tabUsageCount: { ...this.tabUsageCount }
    };
  }

  /**
   * リソースをクリーンアップ
   */
  destroy(): void {
    if (this.isDestroyed) return;

    this.subscribers.clear();
    this.isDestroyed = true;
  }

  /**
   * 購読者に状態変更を通知
   */
  private notifySubscribers(): void {
    if (this.isDestroyed) return;

    const currentState = this.getState();
    this.subscribers.forEach(callback => {
      try {
        callback(currentState);
      } catch (error) {
        console.error('Error in TabManager subscriber:', error);
      }
    });
  }
}