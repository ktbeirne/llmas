/**
 * TabManager Tests - FSD Phase 3
 * Settings Panel Widget のタブ管理テスト（TDD: RED Phase）
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TabManager } from './tab-manager';

type SettingsTab = 'display' | 'chat' | 'expression' | 'camera' | 'debug';

describe('TabManager', () => {
  let tabManager: TabManager;

  beforeEach(() => {
    tabManager = new TabManager();
  });

  afterEach(() => {
    tabManager.destroy();
  });

  describe('初期化', () => {
    it('正常に初期化される', () => {
      expect(tabManager).toBeInstanceOf(TabManager);
    });

    it('デフォルトでdisplayタブが選択されている', () => {
      const state = tabManager.getState();
      expect(state.activeTab).toBe('display');
    });

    it('利用可能なタブリストが正しく設定されている', () => {
      const state = tabManager.getState();
      expect(state.availableTabs).toEqual(['display', 'chat', 'expression', 'camera', 'debug']);
    });

    it('初期状態でタブ履歴が空である', () => {
      const state = tabManager.getState();
      expect(state.tabHistory).toEqual([]);
    });
  });

  describe('タブ切り替え', () => {
    it('有効なタブに切り替えができる', () => {
      tabManager.switchTab('chat');
      const state = tabManager.getState();
      expect(state.activeTab).toBe('chat');
    });

    it('無効なタブに切り替えしようとするとエラーが発生する', () => {
      expect(() => {
        tabManager.switchTab('invalid' as SettingsTab);
      }).toThrow('Invalid tab: invalid');
    });

    it('タブ切り替え時に履歴が更新される', () => {
      tabManager.switchTab('chat');
      tabManager.switchTab('expression');
      
      const state = tabManager.getState();
      expect(state.tabHistory).toEqual(['display', 'chat']);
    });

    it('同じタブに切り替えしても履歴は更新されない', () => {
      tabManager.switchTab('chat');
      tabManager.switchTab('chat');
      
      const state = tabManager.getState();
      expect(state.tabHistory).toEqual(['display']);
    });
  });

  describe('タブ履歴管理', () => {
    it('前のタブに戻ることができる', () => {
      tabManager.switchTab('chat');
      tabManager.switchTab('expression');
      
      const canGoBack = tabManager.goBack();
      expect(canGoBack).toBe(true);
      
      const state = tabManager.getState();
      expect(state.activeTab).toBe('chat');
    });

    it('履歴がない場合は前のタブに戻れない', () => {
      const canGoBack = tabManager.goBack();
      expect(canGoBack).toBe(false);
      
      const state = tabManager.getState();
      expect(state.activeTab).toBe('display');
    });

    it('履歴がクリアできる', () => {
      tabManager.switchTab('chat');
      tabManager.switchTab('expression');
      
      tabManager.clearHistory();
      
      const state = tabManager.getState();
      expect(state.tabHistory).toEqual([]);
    });

    it('履歴の最大長を制限できる', () => {
      // 履歴の最大長を3に設定
      tabManager = new TabManager({ maxHistoryLength: 3 });
      
      tabManager.switchTab('chat');      // history: ['display']
      tabManager.switchTab('expression'); // history: ['display', 'chat']
      tabManager.switchTab('camera');     // history: ['display', 'chat', 'expression']
      tabManager.switchTab('debug');      // history: ['chat', 'expression', 'camera'] (制限適用)
      
      const state = tabManager.getState();
      expect(state.tabHistory).toEqual(['chat', 'expression', 'camera']);
      expect(state.tabHistory.length).toBe(3);
    });
  });

  describe('状態管理', () => {
    it('状態変更を購読できる', () => {
      const callback = vi.fn();
      const unsubscribe = tabManager.subscribe(callback);
      
      tabManager.switchTab('chat');
      
      expect(callback).toHaveBeenCalledWith({
        activeTab: 'chat',
        availableTabs: ['display', 'chat', 'expression', 'camera', 'debug'],
        tabHistory: ['display']
      });
      
      unsubscribe();
    });

    it('購読解除が正常に動作する', () => {
      const callback = vi.fn();
      const unsubscribe = tabManager.subscribe(callback);
      
      unsubscribe();
      tabManager.switchTab('chat');
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('複数の購読者を管理できる', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      tabManager.subscribe(callback1);
      tabManager.subscribe(callback2);
      
      tabManager.switchTab('chat');
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('タブ有効性管理', () => {
    it('タブを無効化できる', () => {
      tabManager.setTabEnabled('debug', false);
      
      expect(() => {
        tabManager.switchTab('debug');
      }).toThrow('Tab is disabled: debug');
    });

    it('タブを再有効化できる', () => {
      tabManager.setTabEnabled('debug', false);
      tabManager.setTabEnabled('debug', true);
      
      expect(() => {
        tabManager.switchTab('debug');
      }).not.toThrow();
    });

    it('無効化されたタブは利用可能タブリストから除外される', () => {
      tabManager.setTabEnabled('debug', false);
      
      const state = tabManager.getState();
      expect(state.availableTabs).toEqual(['display', 'chat', 'expression', 'camera']);
    });

    it('現在アクティブなタブを無効化するとdisplayタブに自動切り替えされる', () => {
      tabManager.switchTab('debug');
      tabManager.setTabEnabled('debug', false);
      
      const state = tabManager.getState();
      expect(state.activeTab).toBe('display');
    });
  });

  describe('クリーンアップ', () => {
    it('destroyで正常にクリーンアップされる', () => {
      const callback = vi.fn();
      tabManager.subscribe(callback);
      
      expect(() => tabManager.destroy()).not.toThrow();
      
      // 破棄後は状態変更コールバックが呼ばれない
      tabManager.switchTab('chat');
      expect(callback).not.toHaveBeenCalled();
    });

    it('複数回destroyを呼んでもエラーが発生しない', () => {
      tabManager.destroy();
      expect(() => tabManager.destroy()).not.toThrow();
    });
  });

  describe('統計情報', () => {
    it('タブ切り替え回数が取得できる', () => {
      tabManager.switchTab('chat');
      tabManager.switchTab('expression');
      tabManager.switchTab('chat');
      
      const stats = tabManager.getStats();
      expect(stats.totalSwitches).toBe(3);
    });

    it('最も使用頻度の高いタブが取得できる', () => {
      tabManager.switchTab('chat');
      tabManager.switchTab('chat');
      tabManager.switchTab('expression');
      
      const stats = tabManager.getStats();
      expect(stats.mostUsedTab).toBe('chat');
    });

    it('タブ別使用回数が取得できる', () => {
      tabManager.switchTab('chat');
      tabManager.switchTab('expression');
      tabManager.switchTab('chat');
      
      const stats = tabManager.getStats();
      expect(stats.tabUsageCount).toEqual({
        display: 0, // 初期選択はカウントしない
        chat: 2,
        expression: 1,
        camera: 0,
        debug: 0
      });
    });
  });
});