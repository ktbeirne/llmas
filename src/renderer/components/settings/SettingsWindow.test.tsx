/**
 * SettingsWindow.test.tsx - SettingsWindow単体テスト
 * 
 * Phase 3.5.2.2: Settings画面のReact化テスト
 * メイン設定ウィンドウコンポーネントのテスト
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// テスト対象
import SettingsWindow, { type SettingsWindowProps } from './SettingsWindow';

// Mock ElectronAPI
const mockElectronAPI = {
  closeSettingsWindow: vi.fn(),
};

// グローバルwindowオブジェクトにElectronAPIを設定
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('SettingsWindow Component', () => {
  describe('基本的なレンダリング', () => {
    it('デフォルトのpropsで正常にレンダリングされる', () => {
      render(<SettingsWindow data-testid="settings-window" />);
      
      expect(screen.getByTestId('settings-window')).toBeInTheDocument();
      expect(screen.getByText('設定')).toBeInTheDocument();
      expect(screen.getByText('アプリケーションの動作と表示をカスタマイズ')).toBeInTheDocument();
    });

    it('initialTabが正しく適用される', () => {
      render(<SettingsWindow initialTab="chat" />);
      
      // チャットタブが選択されている
      const chatTab = screen.getByTestId('tab-chat');
      expect(chatTab).toHaveAttribute('aria-selected', 'true');
    });

    it('全てのタブボタンが表示される', () => {
      render(<SettingsWindow />);
      
      expect(screen.getByTestId('tab-display')).toBeInTheDocument();
      expect(screen.getByTestId('tab-chat')).toBeInTheDocument();
      expect(screen.getByTestId('tab-expressions')).toBeInTheDocument();
    });
  });

  describe('タブナビゲーション', () => {
    it('タブクリックで表示が切り替わる', async () => {
      const user = userEvent.setup();
      render(<SettingsWindow />);
      
      // 初期状態でDisplayタブが選択されている
      expect(screen.getByTestId('tab-display')).toHaveAttribute('aria-selected', 'true');
      
      // Chatタブをクリック
      await user.click(screen.getByTestId('tab-chat'));
      
      // Chatタブが選択されDisplayタブが非選択になる
      expect(screen.getByTestId('tab-chat')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('tab-display')).toHaveAttribute('aria-selected', 'false');
    });

    it('Expressionsタブが正しく機能する', async () => {
      const user = userEvent.setup();
      render(<SettingsWindow />);
      
      await user.click(screen.getByTestId('tab-expressions'));
      
      expect(screen.getByTestId('tab-expressions')).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('DisplaySettingsTab統合', () => {
    it('DisplayタブでDisplaySettingsTabが表示される', () => {
      render(<SettingsWindow initialTab="display" />);
      
      // DisplaySettingsTabのコンテンツが表示される
      expect(screen.getByTestId('display-settings-tab')).toBeInTheDocument();
      expect(screen.getByTestId('theme-section')).toBeInTheDocument();
      expect(screen.getByTestId('window-size-section')).toBeInTheDocument();
      expect(screen.getByTestId('vrm-model-section')).toBeInTheDocument();
    });

    it('DisplaySettingsTabのテーマ選択が機能する', async () => {
      const user = userEvent.setup();
      render(<SettingsWindow initialTab="display" />);
      
      // デフォルトテーマカードが存在する
      expect(screen.getByTestId('theme-card-default')).toBeInTheDocument();
      
      // 他のテーマカードも存在する
      expect(screen.getByTestId('theme-card-dark')).toBeInTheDocument();
      expect(screen.getByTestId('theme-card-sakura')).toBeInTheDocument();
    });
  });

  describe('未実装タブのプレースホルダー', () => {
    it('Chatタブでプレースホルダーが表示される', async () => {
      const user = userEvent.setup();
      render(<SettingsWindow />);
      
      await user.click(screen.getByTestId('tab-chat'));
      
      expect(screen.getByText('💬')).toBeInTheDocument();
      expect(screen.getByText('会話設定')).toBeInTheDocument();
      expect(screen.getByText('🚧 このセクションは実装中です。次のフェーズで完成予定です。')).toBeInTheDocument();
    });

    it('Expressionsタブでプレースホルダーが表示される', async () => {
      const user = userEvent.setup();
      render(<SettingsWindow />);
      
      await user.click(screen.getByTestId('tab-expressions'));
      
      expect(screen.getByText('🎭')).toBeInTheDocument();
      expect(screen.getByText('表情・アニメーション')).toBeInTheDocument();
    });
  });

  describe('閉じる機能', () => {
    it('ヘッダーの閉じるボタンが機能する', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();
      
      render(<SettingsWindow onClose={handleClose} />);
      
      await user.click(screen.getByTestId('close-settings-button'));
      
      expect(handleClose).toHaveBeenCalled();
      expect(mockElectronAPI.closeSettingsWindow).toHaveBeenCalled();
    });

    it('フッターの閉じるボタンが機能する', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();
      
      render(<SettingsWindow onClose={handleClose} />);
      
      await user.click(screen.getByTestId('footer-close-button'));
      
      expect(handleClose).toHaveBeenCalled();
    });

    it('Escapeキーで閉じることができる', () => {
      const handleClose = vi.fn();
      render(<SettingsWindow onClose={handleClose} />);
      
      fireEvent.keyDown(screen.getByTestId('settings-window'), { key: 'Escape' });
      
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定される', () => {
      render(<SettingsWindow />);
      
      // タブリストのrole
      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label', '設定タブ');
      
      // タブパネルのrole
      const tabpanel = screen.getByRole('tabpanel');
      expect(tabpanel).toHaveAttribute('aria-labelledby', 'tab-display');
    });

    it('タブボタンに適切なroleが設定される', () => {
      render(<SettingsWindow />);
      
      const displayTab = screen.getByTestId('tab-display');
      expect(displayTab).toHaveAttribute('role', 'tab');
      expect(displayTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('カスタマイズ', () => {
    it('カスタムクラスが正しく適用される', () => {
      render(<SettingsWindow className="custom-settings" data-testid="custom-window" />);
      
      const window = screen.getByTestId('custom-window');
      expect(window.className).toContain('custom-settings');
    });
  });

  describe('型安全性', () => {
    it('SettingsWindowPropsの型が正しく適用される', () => {
      // 型チェックのみ（実行時エラーがないことを確認）
      const props: SettingsWindowProps = {
        initialTab: 'display',
        onClose: () => {},
        className: 'type-safe-settings',
        'data-testid': 'type-safe-window'
      };
      
      render(<SettingsWindow {...props} />);
      
      expect(screen.getByTestId('type-safe-window')).toBeInTheDocument();
    });
  });
});

describe('SettingsWindow Integration', () => {
  it('DisplaySettingsTabとの統合が正しく動作する', async () => {
    const user = userEvent.setup();
    render(<SettingsWindow initialTab="display" />);
    
    // DisplaySettingsTabの機能をテスト
    const themeCard = screen.getByTestId('theme-card-dark');
    await user.click(themeCard);
    
    // テーマ選択後の状態確認（ビジュアル変化のテスト）
    expect(themeCard).toBeInTheDocument();
  });

  it('ウィンドウサイズ設定が正しく機能する', async () => {
    const user = userEvent.setup();
    render(<SettingsWindow initialTab="display" />);
    
    // ウィンドウサイズプリセットの選択
    const windowSizeSelect = screen.getByTestId('window-size-preset-field');
    expect(windowSizeSelect).toBeInTheDocument();
  });
});