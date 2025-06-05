/**
 * Animation Store - FSD Phase 2
 * アニメーションストアの実装（TDD: GREEN Phase）
 */

import type {
  AnimationInfo,
  AnimationState,
  AnimationPlayOptions,
  AnimationSettings,
  AnimationStats,
  AnimationCategory,
  AnimationPriority
} from '../types';

interface InternalAnimationState extends AnimationState {
  settings: AnimationSettings;
  stats: Record<AnimationCategory, number>;
  totalPlayed: number;
  currentPlayOptions: AnimationPlayOptions | null;
}

type AnimationListener = (state: AnimationState) => void;

class AnimationStore {
  private state: InternalAnimationState;
  private listeners = new Set<AnimationListener>();
  private idleTimeout = 30000; // 30秒のデフォルトアイドルタイムアウト

  constructor() {
    this.state = this.getInitialState();
  }

  /**
   * 初期状態を取得
   */
  private getInitialState(): InternalAnimationState {
    return {
      currentAnimation: null,
      isPlaying: false,
      isPaused: false,
      queue: [],
      history: [],
      lastActivityTime: Date.now(),
      settings: this.getDefaultSettings(),
      stats: {
        idle: 0,
        gesture: 0,
        emotion: 0,
        interaction: 0,
        transition: 0,
        custom: 0,
        unknown: 0
      },
      totalPlayed: 0,
      currentPlayOptions: null
    };
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultSettings(): AnimationSettings {
    return {
      enableAutoPlay: true,
      defaultSpeed: 1.0,
      maxQueueLength: 3,
      idleTimeout: 30000,
      enableSmoothing: true,
      classification: {
        rules: [],
        defaultCategory: 'unknown',
        defaultPriority: 'normal',
        idleDetectionPatterns: []
      }
    };
  }

  /**
   * 現在の状態を取得
   */
  getState(): AnimationState {
    return {
      currentAnimation: this.state.currentAnimation,
      isPlaying: this.state.isPlaying,
      isPaused: this.state.isPaused,
      queue: [...this.state.queue],
      history: [...this.state.history],
      lastActivityTime: this.state.lastActivityTime
    };
  }

  /**
   * アニメーションを再生
   */
  playAnimation(animation: AnimationInfo, options?: AnimationPlayOptions): boolean {
    // 同じアニメーションが既に再生中の場合は無視
    if (this.state.currentAnimation?.name === animation.name) {
      return false;
    }

    // 現在のアニメーションが割り込み不可の場合はチェック
    if (this.state.currentAnimation && !this.state.currentAnimation.canBeInterrupted) {
      // 割り込み不可のアニメーションは優先度に関係なく保護
      return false;
    }

    // 再生中のアニメーションがあれば履歴に追加
    if (this.state.currentAnimation) {
      this.addToHistory(this.state.currentAnimation);
    }

    // 新しいアニメーションを設定
    this.setState({
      currentAnimation: animation,
      isPlaying: true,
      isPaused: false,
      lastActivityTime: Date.now(),
      currentPlayOptions: options || null,
      totalPlayed: this.state.totalPlayed + 1
    });

    // 統計更新
    this.updateStats(animation.category);

    return true;
  }

  /**
   * アニメーションを停止
   */
  stopAnimation(): void {
    if (this.state.currentAnimation) {
      this.addToHistory(this.state.currentAnimation);
    }

    this.setState({
      currentAnimation: null,
      isPlaying: false,
      isPaused: false,
      lastActivityTime: Date.now(),
      currentPlayOptions: null
    });
  }

  /**
   * アニメーションを一時停止
   */
  pauseAnimation(): void {
    if (this.state.isPlaying) {
      this.setState({
        isPlaying: false,
        isPaused: true,
        lastActivityTime: Date.now()
      });
    }
  }

  /**
   * アニメーションを再開
   */
  resumeAnimation(): void {
    if (this.state.isPaused && this.state.currentAnimation) {
      this.setState({
        isPlaying: true,
        isPaused: false,
        lastActivityTime: Date.now()
      });
    }
  }

  /**
   * アニメーションをキューに追加
   */
  queueAnimation(animation: AnimationInfo): boolean {
    if (this.state.queue.length >= this.state.settings.maxQueueLength) {
      // キューが満杯の場合は古いものを削除
      this.state.queue.shift();
    }

    this.setState({
      queue: [...this.state.queue, animation]
    });

    return true;
  }

  /**
   * キューの次のアニメーションを再生
   */
  playNext(): boolean {
    if (this.state.queue.length === 0) {
      return false;
    }

    const nextAnimation = this.state.queue[0];
    const newQueue = this.state.queue.slice(1);

    this.setState({
      queue: newQueue
    });

    return this.playAnimation(nextAnimation);
  }

  /**
   * キューをクリア
   */
  clearQueue(): void {
    this.setState({
      queue: []
    });
  }

  /**
   * 履歴をクリア
   */
  clearHistory(): void {
    this.setState({
      history: []
    });
  }

  /**
   * アイドル状態かどうかを判定
   */
  isIdle(): boolean {
    // 何も再生していない場合はアイドル
    if (!this.state.currentAnimation || !this.state.isPlaying) {
      return true;
    }

    // アイドルカテゴリのアニメーションはアイドル状態
    if (this.state.currentAnimation.category === 'idle') {
      return true;
    }

    return false;
  }

  /**
   * アイドルタイムアウトを設定
   */
  setIdleTimeout(timeout: number): void {
    this.idleTimeout = timeout;
    this.setState({
      settings: {
        ...this.state.settings,
        idleTimeout: timeout
      }
    });
  }

  /**
   * 現在の再生オプションを取得
   */
  getCurrentPlayOptions(): AnimationPlayOptions | null {
    return this.state.currentPlayOptions;
  }

  /**
   * 統計情報を取得
   */
  getStats(): AnimationStats {
    return {
      totalAnimations: this.state.totalPlayed,
      byCategory: { ...this.state.stats },
      byPriority: this.calculatePriorityStats(),
      averageDuration: 0, // TODO: 実装時に追加
      mostUsedAnimation: this.getMostUsedAnimation(),
      lastPlayedAnimation: this.state.history.length > 0 ? this.state.history[this.state.history.length - 1].name : null,
      totalPlayed: this.state.totalPlayed,
      currentAnimation: this.state.currentAnimation?.name || null
    };
  }

  /**
   * 設定を取得
   */
  getSettings(): AnimationSettings {
    return { ...this.state.settings };
  }

  /**
   * 設定を更新
   */
  updateSettings(updates: Partial<AnimationSettings>): void {
    this.setState({
      settings: {
        ...this.state.settings,
        ...updates
      }
    });
  }

  /**
   * 設定をリセット
   */
  resetSettings(): void {
    this.setState({
      settings: this.getDefaultSettings()
    });
  }

  /**
   * 状態変更を購読
   */
  subscribe(listener: AnimationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * ストアをリセット
   */
  reset(): void {
    this.state = this.getInitialState();
    this.notifyListeners();
  }

  // プライベートメソッド

  /**
   * 状態を更新
   */
  private setState(updates: Partial<InternalAnimationState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * リスナーに通知
   */
  private notifyListeners(): void {
    const publicState = this.getState();
    this.listeners.forEach(listener => listener(publicState));
  }

  /**
   * 履歴に追加
   */
  private addToHistory(animation: AnimationInfo): void {
    const maxHistoryLength = 10;
    let newHistory = [...this.state.history, animation];
    
    // 履歴の長さを制限
    if (newHistory.length > maxHistoryLength) {
      newHistory = newHistory.slice(-maxHistoryLength);
    }

    this.setState({
      history: newHistory
    });
  }

  /**
   * 統計を更新
   */
  private updateStats(category: AnimationCategory): void {
    this.setState({
      stats: {
        ...this.state.stats,
        [category]: this.state.stats[category] + 1
      }
    });
  }

  /**
   * 優先度の数値を取得
   */
  private getPriorityValue(priority: AnimationPriority): number {
    const priorityMap: Record<AnimationPriority, number> = {
      background: 0,
      normal: 1,
      high: 2,
      critical: 3
    };
    return priorityMap[priority];
  }

  /**
   * 優先度別統計を計算
   */
  private calculatePriorityStats(): Record<AnimationPriority, number> {
    // 簡易実装: カテゴリから優先度を推定
    return {
      background: this.state.stats.idle,
      normal: this.state.stats.gesture + this.state.stats.interaction,
      high: this.state.stats.emotion,
      critical: this.state.stats.custom
    };
  }

  /**
   * 最も使用されたアニメーションを取得
   */
  private getMostUsedAnimation(): string | null {
    if (this.state.history.length === 0) return null;

    // 履歴から使用回数をカウント
    const usage: Record<string, number> = {};
    this.state.history.forEach(anim => {
      usage[anim.name] = (usage[anim.name] || 0) + 1;
    });

    // 最大使用回数のアニメーションを取得
    let mostUsed = '';
    let maxCount = 0;
    for (const [name, count] of Object.entries(usage)) {
      if (count > maxCount) {
        maxCount = count;
        mostUsed = name;
      }
    }

    return mostUsed || null;
  }
}

// シングルトンインスタンス
export const animationStore = new AnimationStore();