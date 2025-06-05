/**
 * SettingsPanel Tests - FSD Phase 3
 * Settings Panel Widget UI テスト（TDD: RED Phase）
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { SettingsPanel } from './SettingsPanel';

// TabManagerとSettingsCoordinatorのモック
const mockTabManager = {
  getState: vi.fn().mockReturnValue({
    activeTab: 'display',
    availableTabs: ['display', 'chat', 'expression', 'camera', 'debug'],
    tabHistory: []
  }),
  switchTab: vi.fn(),
  goBack: vi.fn(),
  clearHistory: vi.fn(),
  setTabEnabled: vi.fn(),
  subscribe: vi.fn().mockReturnValue(() => {}),
  getStats: vi.fn(),
  destroy: vi.fn()
};

const mockSettingsCoordinator = {
  getDisplaySettings: vi.fn().mockReturnValue({
    theme: 'dark',
    opacity: 0.8,
    alwaysOnTop: true
  }),
  getChatSettings: vi.fn().mockReturnValue({
    apiKey: 'test-key',
    maxTokens: 1000,
    temperature: 0.7
  }),
  getExpressionSettings: vi.fn().mockReturnValue({
    enableEmotions: true,
    intensityMultiplier: 1.2,
    transitionSpeed: 0.5
  }),
  getCameraSettings: vi.fn().mockReturnValue({
    position: { x: 0, y: 0, z: 5 },
    target: { x: 0, y: 0, z: 0 },
    fov: 45
  }),
  getDebugSettings: vi.fn().mockReturnValue({
    enableLogging: true,
    logLevel: 'info',
    showFPS: false
  }),
  updateDisplaySettings: vi.fn().mockResolvedValue(undefined),
  updateChatSettings: vi.fn().mockResolvedValue(undefined),
  updateExpressionSettings: vi.fn().mockResolvedValue(undefined),
  updateCameraSettings: vi.fn().mockResolvedValue(undefined),
  updateDebugSettings: vi.fn().mockResolvedValue(undefined),
  subscribeToChanges: vi.fn().mockReturnValue(() => {}),
  exportSettings: vi.fn().mockResolvedValue({
    version: '1.0.0',
    settings: {},
    timestamp: '2024-01-01T00:00:00.000Z'
  }),
  importSettings: vi.fn().mockResolvedValue(undefined),
  resetToDefaults: vi.fn().mockResolvedValue(undefined),
  validateSettings: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
  destroy: vi.fn()
};

// モジュールモック
vi.mock('../model/tab-manager', () => ({
  TabManager: vi.fn().mockImplementation(() => mockTabManager)
}));

vi.mock('../lib/settings-coordinator', () => ({
  SettingsCoordinator: vi.fn().mockImplementation(() => mockSettingsCoordinator)
}));

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // window.confirmをモック
    Object.defineProperty(window, 'confirm', {
      writable: true,
      value: vi.fn().mockReturnValue(true)
    });
  });

  describe('初期表示', () => {
    it('正常にレンダリングされる', () => {
      render(<SettingsPanel />);
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('タブナビゲーションが表示される', () => {
      render(<SettingsPanel />);
      
      expect(screen.getByRole('tab', { name: /display/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /chat/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /expression/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /camera/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /debug/i })).toBeInTheDocument();
    });

    it('デフォルトでDisplayタブが選択されている', () => {
      render(<SettingsPanel />);
      
      const displayTab = screen.getByRole('tab', { name: /display/i });
      expect(displayTab).toHaveAttribute('aria-selected', 'true');
    });

    it('Display設定が表示される', () => {
      render(<SettingsPanel />);
      
      expect(screen.getByDisplayValue('dark')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0.8')).toBeInTheDocument();
      expect(screen.getByLabelText(/always on top/i)).toBeChecked();
    });
  });

  describe('タブ切り替え', () => {
    it('タブをクリックして切り替えができる', async () => {
      render(<SettingsPanel />);
      
      const chatTab = screen.getByRole('tab', { name: /chat/i });
      fireEvent.click(chatTab);
      
      expect(mockTabManager.switchTab).toHaveBeenCalledWith('chat');
    });

    it('Chat設定が表示される', () => {
      mockTabManager.getState.mockReturnValue({
        activeTab: 'chat',
        availableTabs: ['display', 'chat', 'expression', 'camera', 'debug'],
        tabHistory: ['display']
      });
      
      render(<SettingsPanel />);
      
      expect(screen.getByDisplayValue('test-key')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0.7')).toBeInTheDocument();
    });

    it('Expression設定が表示される', () => {
      mockTabManager.getState.mockReturnValue({
        activeTab: 'expression',
        availableTabs: ['display', 'chat', 'expression', 'camera', 'debug'],
        tabHistory: ['display', 'chat']
      });
      
      render(<SettingsPanel />);
      
      expect(screen.getByLabelText(/enable emotions/i)).toBeChecked();
      expect(screen.getByDisplayValue('1.2')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0.5')).toBeInTheDocument();
    });

    it('Camera設定が表示される', () => {
      mockTabManager.getState.mockReturnValue({
        activeTab: 'camera',
        availableTabs: ['display', 'chat', 'expression', 'camera', 'debug'],
        tabHistory: ['display', 'chat', 'expression']
      });
      
      render(<SettingsPanel />);
      
      expect(screen.getByDisplayValue('0')).toBeInTheDocument(); // position.x
      expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // position.z
      expect(screen.getByDisplayValue('45')).toBeInTheDocument(); // fov
    });

    it('Debug設定が表示される', () => {
      mockTabManager.getState.mockReturnValue({
        activeTab: 'debug',
        availableTabs: ['display', 'chat', 'expression', 'camera', 'debug'],
        tabHistory: ['display', 'chat', 'expression', 'camera']
      });
      
      render(<SettingsPanel />);
      
      expect(screen.getByLabelText(/enable logging/i)).toBeChecked();
      expect(screen.getByDisplayValue('info')).toBeInTheDocument();
      expect(screen.getByLabelText(/show fps/i)).not.toBeChecked();
    });
  });

  describe('設定更新', () => {
    it('Display設定を更新できる', async () => {
      render(<SettingsPanel />);
      
      const themeSelect = screen.getByDisplayValue('dark');
      fireEvent.change(themeSelect, { target: { value: 'light' } });
      
      await waitFor(() => {
        expect(mockSettingsCoordinator.updateDisplaySettings).toHaveBeenCalledWith({
          theme: 'light'
        });
      });
    });

    it('Chat設定を更新できる', async () => {
      mockTabManager.getState.mockReturnValue({
        activeTab: 'chat',
        availableTabs: ['display', 'chat', 'expression', 'camera', 'debug'],
        tabHistory: ['display']
      });
      
      render(<SettingsPanel />);
      
      const temperatureInput = screen.getByDisplayValue('0.7');
      fireEvent.change(temperatureInput, { target: { value: '0.8' } });
      
      await waitFor(() => {
        expect(mockSettingsCoordinator.updateChatSettings).toHaveBeenCalledWith({
          temperature: 0.8
        });
      });
    });

    it('設定更新エラーを処理できる', async () => {
      mockSettingsCoordinator.updateDisplaySettings.mockRejectedValue(
        new Error('Update failed')
      );
      
      render(<SettingsPanel />);
      
      const themeSelect = screen.getByDisplayValue('dark');
      fireEvent.change(themeSelect, { target: { value: 'light' } });
      
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('リアルタイム反映が動作する', () => {
      render(<SettingsPanel />);
      
      // subscribeToChanges が呼ばれることを確認
      expect(mockSettingsCoordinator.subscribeToChanges).toHaveBeenCalled();
      
      // 変更通知コールバックをテスト
      const callback = mockSettingsCoordinator.subscribeToChanges.mock.calls[0][0];
      callback({
        type: 'settings',
        data: { display: { theme: 'light' } }
      });
      
      // UIが更新されることを確認（実装に依存）
    });
  });

  describe('バルク操作', () => {
    it('設定をエクスポートできる', async () => {
      render(<SettingsPanel />);
      
      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(mockSettingsCoordinator.exportSettings).toHaveBeenCalled();
      });
    });

    it('設定をインポートできる', async () => {
      const mockFile = new File(['{"settings":{}}'], 'settings.json', {
        type: 'application/json'
      });
      
      render(<SettingsPanel />);
      
      const importInput = screen.getByRole('button', { name: /import/i });
      fireEvent.click(importInput);
      
      // ファイル選択の処理をシミュレート
      const fileInput = screen.getByLabelText(/import/i);
      fireEvent.change(fileInput, { target: { files: [mockFile] } });
      
      await waitFor(() => {
        expect(mockSettingsCoordinator.importSettings).toHaveBeenCalled();
      });
    });

    it('設定をリセットできる', async () => {
      render(<SettingsPanel />);
      
      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);
      
      // window.confirmが呼ばれることを確認
      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalled();
        expect(mockSettingsCoordinator.resetToDefaults).toHaveBeenCalled();
      });
    });
  });

  describe('バリデーション', () => {
    it('無効な設定値の場合エラーメッセージを表示する', async () => {
      mockSettingsCoordinator.validateSettings.mockReturnValue({
        isValid: false,
        errors: ['Temperature must be between 0 and 2']
      });
      
      render(<SettingsPanel />);
      
      const temperatureInput = screen.getByDisplayValue('0.7');
      fireEvent.change(temperatureInput, { target: { value: '3' } });
      
      await waitFor(() => {
        expect(screen.getByText(/temperature must be between 0 and 2/i)).toBeInTheDocument();
      });
    });

    it('有効な設定値の場合エラーメッセージを非表示にする', async () => {
      // 最初に無効な値でエラーを表示
      mockSettingsCoordinator.validateSettings.mockReturnValue({
        isValid: false,
        errors: ['Temperature must be between 0 and 2']
      });
      
      render(<SettingsPanel />);
      
      const temperatureInput = screen.getByDisplayValue('0.7');
      fireEvent.change(temperatureInput, { target: { value: '3' } });
      
      await waitFor(() => {
        expect(screen.getByText(/temperature must be between 0 and 2/i)).toBeInTheDocument();
      });
      
      // 有効な値に変更
      mockSettingsCoordinator.validateSettings.mockReturnValue({
        isValid: true,
        errors: []
      });
      
      fireEvent.change(temperatureInput, { target: { value: '0.8' } });
      
      await waitFor(() => {
        expect(screen.queryByText(/temperature must be between 0 and 2/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIAラベルが設定されている', () => {
      render(<SettingsPanel />);
      
      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label', 'Settings categories');
      
      const tabpanel = screen.getByRole('tabpanel');
      expect(tabpanel).toHaveAttribute('aria-labelledby');
    });

    it('キーボードナビゲーションが動作する', () => {
      render(<SettingsPanel />);
      
      const tablist = screen.getByRole('tablist');
      
      // タブリストにフォーカス
      tablist.focus();
      
      // 右矢印キーで次のタブに移動（現在display、次はchat）
      fireEvent.keyDown(tablist, { key: 'ArrowRight' });
      expect(mockTabManager.switchTab).toHaveBeenCalledWith('chat');
      
      // 左矢印キーで前のタブに移動
      fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
      expect(mockTabManager.switchTab).toHaveBeenCalledWith('debug'); // 配列の最後に戻る
    });

    it('スクリーンリーダー用の説明が適切に設定されている', () => {
      render(<SettingsPanel />);
      
      const description = screen.getByText(/configure application settings/i);
      expect(description).toHaveAttribute('role', 'region');
      expect(description).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('パフォーマンス', () => {
    it('不要な再レンダリングを防ぐ', () => {
      const { rerender } = render(<SettingsPanel />);
      
      // propsが変わらない場合は再レンダリングされない
      rerender(<SettingsPanel />);
      
      // TabManagerとSettingsCoordinatorが1回だけ作成される
      expect(mockTabManager.subscribe).toHaveBeenCalledTimes(1);
      expect(mockSettingsCoordinator.subscribeToChanges).toHaveBeenCalledTimes(1);
    });

    it('コンポーネントアンマウント時にクリーンアップされる', () => {
      const { unmount } = render(<SettingsPanel />);
      
      unmount();
      
      expect(mockTabManager.destroy).toHaveBeenCalled();
      expect(mockSettingsCoordinator.destroy).toHaveBeenCalled();
    });
  });
});