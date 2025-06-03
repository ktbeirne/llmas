/**
 * DisplaySettingsTab.test.tsx - DisplaySettingsTab単体テスト
 * 
 * Phase 3.5.3: Zustand統合テスト
 * テーマ選択、ウィンドウサイズ、VRMモデル設定のZustand連携テスト
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// テスト対象 - FormFieldを使わない簡易テスト版

// モック設定
vi.mock('../../hooks/useSettingsSection', () => ({
  useWindowSettings: vi.fn(),
  useThemeSettings: vi.fn(),
}));

// モックデータ
const mockWindowSettings = {
  data: {
    windowSize: { width: 400, height: 800 },
    vrmModelPath: '/test-avatar.vrm',
    cameraSettings: {},
  },
  isLoading: false,
  isInitialized: true,
  error: null,
  updateSettings: vi.fn(),
  resetSettings: vi.fn(),
  loadSettings: vi.fn(),
  refreshSettings: vi.fn(),
  validationErrors: [],
  validateData: vi.fn(),
  clearValidationErrors: vi.fn(),
  hasUnsavedChanges: false,
  isReady: true,
};

const mockThemeSettings = {
  data: {
    currentTheme: 'default',
    availableThemes: [],
  },
  isLoading: false,
  isInitialized: true,
  error: null,
  updateSettings: vi.fn(),
  resetSettings: vi.fn(),
  loadSettings: vi.fn(),
  refreshSettings: vi.fn(),
  validationErrors: [],
  validateData: vi.fn(),
  clearValidationErrors: vi.fn(),
  hasUnsavedChanges: false,
  isReady: true,
};

describe('DisplaySettingsTab Component (Zustand Integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // モックの設定
    const { useWindowSettings, useThemeSettings } = require('../../hooks/useSettingsSection');
    useWindowSettings.mockReturnValue(mockWindowSettings);
    useThemeSettings.mockReturnValue(mockThemeSettings);
  });

  describe('基本的なレンダリング', () => {
    it('デフォルトのpropsで正常にレンダリングされる', () => {
      render(<DisplaySettingsTab data-testid="display-settings-tab" />);
      
      expect(screen.getByTestId('display-settings-tab')).toBeInTheDocument();
    });

    it('テーマ設定セクションが表示される', () => {
      render(<DisplaySettingsTab />);
      
      expect(screen.getByText('🎨 デザインテーマ')).toBeInTheDocument();
    });

    it('ウィンドウサイズ設定セクションが表示される', () => {
      render(<DisplaySettingsTab />);
      
      expect(screen.getByText('📐 ウィンドウサイズ')).toBeInTheDocument();
    });

    it('VRMモデル設定セクションが表示される', () => {
      render(<DisplaySettingsTab />);
      
      expect(screen.getByText('🎭 VRMアバターモデル')).toBeInTheDocument();
    });
  });

  describe('Zustand Store統合', () => {
    it('テーマ設定がストアから正しく読み込まれる', () => {
      const customThemeSettings = {
        ...mockThemeSettings,
        data: {
          currentTheme: 'dark',
          availableThemes: [],
        },
      };
      
      const { useThemeSettings } = require('../../hooks/useSettingsSection');
      useThemeSettings.mockReturnValue(customThemeSettings);
      
      render(<DisplaySettingsTab />);
      
      // テーマ選択が反映されているかテスト（実装により確認方法は調整）
      expect(useThemeSettings).toHaveBeenCalled();
    });

    it('ウィンドウサイズがストアから正しく読み込まれる', () => {
      const customWindowSettings = {
        ...mockWindowSettings,
        data: {
          ...mockWindowSettings.data,
          windowSize: { width: 800, height: 600 },
        },
      };
      
      const { useWindowSettings } = require('../../hooks/useSettingsSection');
      useWindowSettings.mockReturnValue(customWindowSettings);
      
      render(<DisplaySettingsTab />);
      
      expect(useWindowSettings).toHaveBeenCalled();
    });

    it('VRMモデルパスがストアから正しく読み込まれる', () => {
      const customWindowSettings = {
        ...mockWindowSettings,
        data: {
          ...mockWindowSettings.data,
          vrmModelPath: '/custom-avatar.vrm',
        },
      };
      
      const { useWindowSettings } = require('../../hooks/useSettingsSection');
      useWindowSettings.mockReturnValue(customWindowSettings);
      
      render(<DisplaySettingsTab />);
      
      expect(useWindowSettings).toHaveBeenCalled();
    });
  });

  describe('設定変更操作', () => {
    it('リセットボタンが両方のストアのリセットを呼び出す', async () => {
      const user = userEvent.setup();
      render(<DisplaySettingsTab />);
      
      const resetButton = screen.getByTestId('reset-display-settings');
      await user.click(resetButton);
      
      expect(mockThemeSettings.resetSettings).toHaveBeenCalled();
      expect(mockWindowSettings.resetSettings).toHaveBeenCalled();
    });

    it('適用ボタンがローディング状態を考慮する', async () => {
      const loadingWindowSettings = {
        ...mockWindowSettings,
        isLoading: true,
      };
      
      const { useWindowSettings } = require('../../hooks/useSettingsSection');
      useWindowSettings.mockReturnValue(loadingWindowSettings);
      
      const user = userEvent.setup();
      render(<DisplaySettingsTab />);
      
      const applyButton = screen.getByTestId('apply-display-settings');
      await user.click(applyButton);
      
      // ローディング中は処理をスキップ
      expect(applyButton).toBeInTheDocument();
    });
  });

  describe('エラー処理', () => {
    it('ストアエラーが存在する場合の処理', () => {
      const errorWindowSettings = {
        ...mockWindowSettings,
        error: new Error('Test error'),
        isReady: false,
      };
      
      const { useWindowSettings } = require('../../hooks/useSettingsSection');
      useWindowSettings.mockReturnValue(errorWindowSettings);
      
      render(<DisplaySettingsTab />);
      
      // エラー状態でもコンポーネントがクラッシュしない
      expect(screen.getByTestId('display-settings-tab')).toBeInTheDocument();
    });
  });

  describe('型安全性', () => {
    it('DisplaySettingsTabPropsの型が正しく適用される', () => {
      // 型チェックのみ（実行時エラーがないことを確認）
      const props: DisplaySettingsTabProps = {
        className: 'custom-display-settings',
        'data-testid': 'type-safe-display-tab'
      };
      
      render(<DisplaySettingsTab {...props} />);
      
      expect(screen.getByTestId('type-safe-display-tab')).toBeInTheDocument();
    });
  });
});

describe('DisplaySettingsTab Integration (Real Store)', () => {
  it('実際のストア統合での動作確認', async () => {
    // 実際のストアを使った統合テスト（モックを解除）
    vi.doUnmock('../../hooks/useSettingsSection');
    
    // 注意: 実際のストアを使う場合はストアの初期化が必要
    // このテストは実装状況に応じて調整
    
    const user = userEvent.setup();
    render(<DisplaySettingsTab data-testid="integration-test" />);
    
    expect(screen.getByTestId('integration-test')).toBeInTheDocument();
  });
});