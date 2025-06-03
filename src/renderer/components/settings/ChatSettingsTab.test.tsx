/**
 * ChatSettingsTab.test.tsx - ChatSettingsTab単体テスト
 * 
 * Phase 3.5.2.2: 会話設定タブのテスト
 * ユーザー名、マスコット名、システムプロンプト、会話履歴の設定テスト
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// テスト対象
import ChatSettingsTab, { type ChatSettingsTabProps } from './ChatSettingsTab';

// Window.confirm のモック
global.confirm = vi.fn();

describe('ChatSettingsTab Component', () => {
  describe('基本的なレンダリング', () => {
    it('デフォルトのpropsで正常にレンダリングされる', () => {
      render(<ChatSettingsTab data-testid="chat-settings-tab" />);
      
      expect(screen.getByTestId('chat-settings-tab')).toBeInTheDocument();
      expect(screen.getByTestId('names-section')).toBeInTheDocument();
      expect(screen.getByTestId('system-prompt-section')).toBeInTheDocument();
      expect(screen.getByTestId('chat-history-section')).toBeInTheDocument();
    });

    it('各セクションのタイトルが表示される', () => {
      render(<ChatSettingsTab />);
      
      expect(screen.getByText('ユーザーとマスコットの名前')).toBeInTheDocument();
      expect(screen.getByText('システムプロンプト（キャラクターの性格・役割）')).toBeInTheDocument();
      expect(screen.getByText('会話履歴')).toBeInTheDocument();
    });
  });

  describe('名前設定', () => {
    it('ユーザー名の初期値が正しく設定される', () => {
      render(<ChatSettingsTab />);
      
      const userNameInput = screen.getByTestId('user-name-field-field');
      expect(userNameInput).toHaveValue('User');
    });

    it('マスコット名の初期値が正しく設定される', () => {
      render(<ChatSettingsTab />);
      
      const mascotNameInput = screen.getByTestId('mascot-name-field-field');
      expect(mascotNameInput).toHaveValue('Mascot');
    });

    it('ユーザー名を変更できる', async () => {
      const user = userEvent.setup();
      render(<ChatSettingsTab />);
      
      const userNameInput = screen.getByTestId('user-name-field-field');
      
      await user.clear(userNameInput);
      await user.type(userNameInput, 'テストユーザー');
      
      expect(userNameInput).toHaveValue('テストユーザー');
    });

    it('マスコット名を変更できる', async () => {
      const user = userEvent.setup();
      render(<ChatSettingsTab />);
      
      const mascotNameInput = screen.getByTestId('mascot-name-field-field');
      
      await user.clear(mascotNameInput);
      await user.type(mascotNameInput, 'テストマスコット');
      
      expect(mascotNameInput).toHaveValue('テストマスコット');
    });

    it('名前の文字数制限が機能する', async () => {
      const user = userEvent.setup();
      render(<ChatSettingsTab />);
      
      const userNameInput = screen.getByTestId('user-name-field-field');
      const longName = 'a'.repeat(51); // 50文字制限を超える
      
      await user.clear(userNameInput);
      await user.type(userNameInput, longName);
      
      // 50文字でカットされる
      expect(userNameInput).toHaveValue('a'.repeat(50));
    });

    it('文字数カウンターが正しく表示される', async () => {
      const user = userEvent.setup();
      render(<ChatSettingsTab />);
      
      const userNameInput = screen.getByTestId('user-name-field-field');
      
      await user.clear(userNameInput);
      await user.type(userNameInput, 'Test');
      
      expect(screen.getByText('4/50文字')).toBeInTheDocument();
    });
  });

  describe('システムプロンプト', () => {
    it('デフォルトシステムプロンプトが設定される', () => {
      render(<ChatSettingsTab />);
      
      const promptTextarea = screen.getByTestId('system-prompt-field-field');
      expect(promptTextarea).toHaveValue(expect.stringContaining('親しみやすく愛らしいAIアシスタント'));
    });

    it('システムプロンプトを変更できる', async () => {
      const user = userEvent.setup();
      render(<ChatSettingsTab />);
      
      const promptTextarea = screen.getByTestId('system-prompt-field-field');
      const customPrompt = 'カスタムプロンプトです';
      
      await user.clear(promptTextarea);
      await user.type(promptTextarea, customPrompt);
      
      expect(promptTextarea).toHaveValue(customPrompt);
    });

    it('文字数カウンターが正しく動作する', async () => {
      const user = userEvent.setup();
      render(<ChatSettingsTab />);
      
      const promptTextarea = screen.getByTestId('system-prompt-field-field');
      
      await user.clear(promptTextarea);
      await user.type(promptTextarea, 'Test');
      
      const characterCount = screen.getByTestId('prompt-character-count');
      expect(characterCount).toHaveTextContent('4');
    });

    it('長いプロンプトでパフォーマンス警告が表示される', async () => {
      const user = userEvent.setup();
      render(<ChatSettingsTab />);
      
      const promptTextarea = screen.getByTestId('system-prompt-field-field');
      const longPrompt = 'a'.repeat(2001); // 2000文字を超える
      
      await user.clear(promptTextarea);
      await user.type(promptTextarea, longPrompt);
      
      expect(screen.getByTestId('performance-warning')).toBeInTheDocument();
      expect(screen.getByText(/パフォーマンスに影響が出る可能性があります/)).toBeInTheDocument();
    });

    it('デフォルトに戻すボタンが機能する', async () => {
      const user = userEvent.setup();
      render(<ChatSettingsTab />);
      
      const promptTextarea = screen.getByTestId('system-prompt-field-field');
      const resetButton = screen.getByTestId('reset-system-prompt-button');
      
      // プロンプトを変更
      await user.clear(promptTextarea);
      await user.type(promptTextarea, 'カスタムプロンプト');
      
      // リセットボタンをクリック
      await user.click(resetButton);
      
      // デフォルトプロンプトに戻る
      expect(promptTextarea).toHaveValue(expect.stringContaining('親しみやすく愛らしいAIアシスタント'));
    });
  });

  describe('会話履歴管理', () => {
    it('会話履歴リセットボタンが表示される', () => {
      render(<ChatSettingsTab />);
      
      const clearButton = screen.getByTestId('clear-chat-history-button');
      expect(clearButton).toBeInTheDocument();
      expect(clearButton).toHaveTextContent('会話履歴をリセット');
    });

    it('注意事項が表示される', () => {
      render(<ChatSettingsTab />);
      
      expect(screen.getByText('重要な注意事項')).toBeInTheDocument();
      expect(screen.getByText(/この操作は元に戻すことができません/)).toBeInTheDocument();
    });

    it('確認ダイアログでOKした場合に履歴がクリアされる', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.mocked(global.confirm).mockReturnValue(true);
      
      render(<ChatSettingsTab />);
      
      const clearButton = screen.getByTestId('clear-chat-history-button');
      await user.click(clearButton);
      
      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('会話履歴をリセットしてもよろしいですか？')
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('会話履歴をクリア'));
      
      consoleSpy.mockRestore();
    });

    it('確認ダイアログでキャンセルした場合に履歴がクリアされない', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.mocked(global.confirm).mockReturnValue(false);
      
      render(<ChatSettingsTab />);
      
      const clearButton = screen.getByTestId('clear-chat-history-button');
      await user.click(clearButton);
      
      expect(global.confirm).toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('会話履歴をクリア'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('設定プレビュー', () => {
    it('プレビューセクションが表示される', () => {
      render(<ChatSettingsTab />);
      
      expect(screen.getByTestId('settings-preview-section')).toBeInTheDocument();
      expect(screen.getByText('💡 設定プレビュー')).toBeInTheDocument();
    });

    it('名前変更がプレビューに反映される', async () => {
      const user = userEvent.setup();
      render(<ChatSettingsTab />);
      
      const userNameInput = screen.getByTestId('user-name-field-field');
      const mascotNameInput = screen.getByTestId('mascot-name-field-field');
      
      await user.clear(userNameInput);
      await user.type(userNameInput, 'テストユーザー');
      
      await user.clear(mascotNameInput);
      await user.type(mascotNameInput, 'テストマスコット');
      
      // プレビューで名前が更新される
      expect(screen.getByText('テストユーザー')).toBeInTheDocument();
      expect(screen.getByText('テストマスコット')).toBeInTheDocument();
    });
  });

  describe('アクションボタン', () => {
    it('適用ボタンとリセットボタンが表示される', () => {
      render(<ChatSettingsTab />);
      
      expect(screen.getByTestId('apply-chat-settings')).toBeInTheDocument();
      expect(screen.getByTestId('reset-chat-settings')).toBeInTheDocument();
    });

    it('名前が空の場合に適用ボタンが無効化される', async () => {
      const user = userEvent.setup();
      render(<ChatSettingsTab />);
      
      const userNameInput = screen.getByTestId('user-name-field-field');
      const applyButton = screen.getByTestId('apply-chat-settings');
      
      // ユーザー名を空にする
      await user.clear(userNameInput);
      
      expect(applyButton).toBeDisabled();
    });

    it('リセットボタンが全設定をリセットする', async () => {
      const user = userEvent.setup();
      render(<ChatSettingsTab />);
      
      const userNameInput = screen.getByTestId('user-name-field-field');
      const mascotNameInput = screen.getByTestId('mascot-name-field-field');
      const promptTextarea = screen.getByTestId('system-prompt-field-field');
      const resetButton = screen.getByTestId('reset-chat-settings');
      
      // 設定を変更
      await user.clear(userNameInput);
      await user.type(userNameInput, 'テストユーザー');
      
      await user.clear(mascotNameInput);
      await user.type(mascotNameInput, 'テストマスコット');
      
      await user.clear(promptTextarea);
      await user.type(promptTextarea, 'カスタムプロンプト');
      
      // リセットボタンをクリック
      await user.click(resetButton);
      
      // 初期値に戻る
      expect(userNameInput).toHaveValue('User');
      expect(mascotNameInput).toHaveValue('Mascot');
      expect(promptTextarea).toHaveValue(expect.stringContaining('親しみやすく愛らしいAIアシスタント'));
    });
  });

  describe('バリデーション', () => {
    it('空のユーザー名でエラーメッセージが表示される', async () => {
      const user = userEvent.setup();
      render(<ChatSettingsTab />);
      
      const userNameInput = screen.getByTestId('user-name-field-field');
      
      await user.clear(userNameInput);
      await user.tab(); // フォーカスを移動してバリデーション発生
      
      expect(screen.getByText('ユーザー名を入力してください')).toBeInTheDocument();
    });

    it('空のマスコット名でエラーメッセージが表示される', async () => {
      const user = userEvent.setup();
      render(<ChatSettingsTab />);
      
      const mascotNameInput = screen.getByTestId('mascot-name-field-field');
      
      await user.clear(mascotNameInput);
      await user.tab(); // フォーカスを移動してバリデーション発生
      
      expect(screen.getByText('マスコット名を入力してください')).toBeInTheDocument();
    });
  });

  describe('型安全性', () => {
    it('ChatSettingsTabPropsの型が正しく適用される', () => {
      // 型チェックのみ（実行時エラーがないことを確認）
      const props: ChatSettingsTabProps = {
        className: 'custom-chat-settings',
        'data-testid': 'type-safe-chat-tab'
      };
      
      render(<ChatSettingsTab {...props} />);
      
      expect(screen.getByTestId('type-safe-chat-tab')).toBeInTheDocument();
    });
  });
});

describe('ChatSettingsTab Integration', () => {
  it('設定変更の統合フローが正しく動作する', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    render(<ChatSettingsTab />);
    
    // 設定を変更
    const userNameInput = screen.getByTestId('user-name-field-field');
    const mascotNameInput = screen.getByTestId('mascot-name-field-field');
    const promptTextarea = screen.getByTestId('system-prompt-field-field');
    
    await user.clear(userNameInput);
    await user.type(userNameInput, 'IntegrationUser');
    
    await user.clear(mascotNameInput);
    await user.type(mascotNameInput, 'IntegrationMascot');
    
    await user.clear(promptTextarea);
    await user.type(promptTextarea, 'Integration test prompt');
    
    // 適用ボタンをクリック
    const applyButton = screen.getByTestId('apply-chat-settings');
    await user.click(applyButton);
    
    // ログに適用内容が出力される
    expect(consoleSpy).toHaveBeenCalledWith(
      '会話設定を適用（実装予定）',
      expect.objectContaining({
        userName: 'IntegrationUser',
        mascotName: 'IntegrationMascot',
        systemPrompt: 'Integration test prompt'
      })
    );
    
    consoleSpy.mockRestore();
  });
});