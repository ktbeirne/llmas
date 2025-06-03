/**
 * Input.test.tsx - Inputコンポーネント単体テスト
 * 
 * Phase 3.5.2.1 Task 2: Inputコンポーネントテスト
 * TypeScript厳密型定義、アクセシビリティ、バリアント動作のテスト
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// テスト対象
import Input, { type InputProps, type InputType, type InputSize, type InputVariant } from './Input';

// テスト用のアイコンコンポーネント
const TestIcon: React.FC = () => (
  <svg data-testid="test-icon" width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="4" />
  </svg>
);

describe('Input Component', () => {
  describe('基本的なレンダリング', () => {
    it('デフォルトのpropsで正常にレンダリングされる', () => {
      render(<Input data-testid="default-input" />);
      
      const input = screen.getByTestId('default-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    it('placeholderが正しく表示される', () => {
      const placeholder = 'テキストを入力してください';
      render(<Input placeholder={placeholder} data-testid="placeholder-input" />);
      
      const input = screen.getByTestId('placeholder-input');
      expect(input).toHaveAttribute('placeholder', placeholder);
    });

    it('valueが正しく設定される', () => {
      const value = 'テストテキスト';
      render(<Input value={value} onChange={() => {}} data-testid="value-input" />);
      
      const input = screen.getByTestId('value-input');
      expect(input).toHaveValue(value);
    });
  });

  describe('入力タイプ（type）', () => {
    const types: InputType[] = ['text', 'number', 'password', 'email', 'tel', 'url', 'search'];

    types.forEach(type => {
      it(`type="${type}" が正しく適用される`, () => {
        render(<Input type={type} data-testid={`${type}-input`} />);
        
        const input = screen.getByTestId(`${type}-input`);
        
        if (type === 'password') {
          // パスワードフィールドは初期状態でtype="password"
          expect(input).toHaveAttribute('type', 'password');
        } else {
          expect(input).toHaveAttribute('type', type);
        }
      });
    });

    it('デフォルトのtypeはtext', () => {
      render(<Input data-testid="default-type" />);
      
      const input = screen.getByTestId('default-type');
      expect(input).toHaveAttribute('type', 'text');
    });
  });

  describe('サイズ（size）', () => {
    const sizes: InputSize[] = ['sm', 'md', 'lg'];

    sizes.forEach(size => {
      it(`size="${size}" が正しく適用される`, () => {
        render(<Input size={size} data-testid={`${size}-input`} />);
        
        const input = screen.getByTestId(`${size}-input`);
        expect(input).toBeInTheDocument();
        
        // サイズ別のクラスがあることを確認
        if (size === 'sm') {
          expect(input.className).toContain('text-xs');
        } else if (size === 'lg') {
          expect(input.className).toContain('text-base');
        }
      });
    });

    it('デフォルトのsizeはmd', () => {
      render(<Input data-testid="default-size" />);
      
      const input = screen.getByTestId('default-size');
      expect(input.className).toContain('text-sm');
    });
  });

  describe('バリアント（variant）', () => {
    const variants: InputVariant[] = ['default', 'error', 'success'];

    variants.forEach(variant => {
      it(`variant="${variant}" が正しく適用される`, () => {
        render(<Input variant={variant} data-testid={`${variant}-input`} />);
        
        const input = screen.getByTestId(`${variant}-input`);
        expect(input).toBeInTheDocument();
        
        if (variant === 'error') {
          expect(input.className).toContain('border-red-500');
          expect(input).toHaveAttribute('aria-invalid', 'true');
        } else if (variant === 'success') {
          expect(input.className).toContain('border-green-500');
        }
      });
    });
  });

  describe('ラベル', () => {
    it('ラベルが正しく表示される', () => {
      const label = 'ユーザー名';
      render(<Input label={label} data-testid="labeled-input" />);
      
      const labelElement = screen.getByText(label);
      const input = screen.getByTestId('labeled-input');
      
      expect(labelElement).toBeInTheDocument();
      expect(labelElement).toHaveAttribute('for', input.id);
    });

    it('required=trueで必須マークが表示される', () => {
      render(<Input label="必須フィールド" required data-testid="required-input" />);
      
      const requiredMark = screen.getByLabelText('必須');
      expect(requiredMark).toBeInTheDocument();
      expect(requiredMark).toHaveTextContent('*');
    });

    it('ラベルにカスタムクラスが適用される', () => {
      render(
        <Input 
          label="カスタムラベル" 
          labelClassName="custom-label-class"
          data-testid="custom-label-input"
        />
      );
      
      const labelElement = screen.getByText('カスタムラベル');
      expect(labelElement.className).toContain('custom-label-class');
    });
  });

  describe('エラーメッセージ', () => {
    it('エラーメッセージが正しく表示される', () => {
      const errorMessage = 'このフィールドは必須です';
      render(<Input error={errorMessage} data-testid="error-input" />);
      
      const input = screen.getByTestId('error-input');
      const errorElement = screen.getByTestId('error-input-error');
      
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent(errorMessage);
      expect(errorElement).toHaveAttribute('role', 'alert');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('error'));
    });

    it('エラーがある場合はvariantがerrorに変更される', () => {
      render(<Input variant="success" error="エラーです" data-testid="error-override" />);
      
      const input = screen.getByTestId('error-override');
      expect(input.className).toContain('border-red-500');
    });
  });

  describe('ヘルプテキスト', () => {
    it('ヘルプテキストが正しく表示される', () => {
      const helpText = '半角英数字で入力してください';
      render(<Input helpText={helpText} data-testid="help-input" />);
      
      const input = screen.getByTestId('help-input');
      const helpElement = screen.getByTestId('help-input-help');
      
      expect(helpElement).toBeInTheDocument();
      expect(helpElement).toHaveTextContent(helpText);
      expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('help'));
    });

    it('エラーがある場合はヘルプテキストは表示されない', () => {
      render(
        <Input 
          helpText="ヘルプテキスト" 
          error="エラーメッセージ" 
          data-testid="error-help-input"
        />
      );
      
      expect(screen.queryByText('ヘルプテキスト')).not.toBeInTheDocument();
      expect(screen.getByText('エラーメッセージ')).toBeInTheDocument();
    });
  });

  describe('アイコン', () => {
    it('左アイコンが正しく表示される', () => {
      render(<Input leftIcon={<TestIcon />} data-testid="left-icon-input" />);
      
      const icon = screen.getByTestId('test-icon');
      expect(icon).toBeInTheDocument();
    });

    it('右アイコンが正しく表示される', () => {
      render(<Input rightIcon={<TestIcon />} data-testid="right-icon-input" />);
      
      const icon = screen.getByTestId('test-icon');
      expect(icon).toBeInTheDocument();
    });

    it('両方のアイコンが表示される', () => {
      render(
        <Input 
          leftIcon={<TestIcon />} 
          rightIcon={<TestIcon />} 
          data-testid="both-icons-input"
        />
      );
      
      const icons = screen.getAllByTestId('test-icon');
      expect(icons).toHaveLength(2);
    });
  });

  describe('パスワード表示切り替え', () => {
    it('type="password"でshowPasswordToggle=trueの場合、切り替えボタンが表示される', () => {
      render(
        <Input 
          type="password" 
          showPasswordToggle 
          data-testid="password-toggle-input"
        />
      );
      
      const toggleButton = screen.getByTestId('password-toggle-input-password-toggle');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-label', 'パスワードを表示する');
    });

    it('パスワード表示切り替えが正しく動作する', async () => {
      const user = userEvent.setup();
      
      render(
        <Input 
          type="password" 
          showPasswordToggle 
          data-testid="password-toggle-test"
        />
      );
      
      const input = screen.getByTestId('password-toggle-test');
      const toggleButton = screen.getByTestId('password-toggle-test-password-toggle');
      
      // 初期状態ではtype="password"
      expect(input).toHaveAttribute('type', 'password');
      
      // ボタンをクリック
      await user.click(toggleButton);
      
      // type="text"に変更される
      expect(input).toHaveAttribute('type', 'text');
      expect(toggleButton).toHaveAttribute('aria-label', 'パスワードを隠す');
      
      // 再度クリック
      await user.click(toggleButton);
      
      // type="password"に戻る
      expect(input).toHaveAttribute('type', 'password');
      expect(toggleButton).toHaveAttribute('aria-label', 'パスワードを表示する');
    });

    it('type="password"以外ではパスワード切り替えボタンは表示されない', () => {
      render(
        <Input 
          type="text" 
          showPasswordToggle 
          data-testid="text-no-toggle"
        />
      );
      
      expect(screen.queryByTestId('text-no-toggle-password-toggle')).not.toBeInTheDocument();
    });
  });

  describe('disabled状態', () => {
    it('disabled=trueで入力フィールドが無効化される', () => {
      render(<Input disabled data-testid="disabled-input" />);
      
      const input = screen.getByTestId('disabled-input');
      expect(input).toBeDisabled();
    });

    it('disabled状態でパスワード切り替えボタンも無効化される', () => {
      render(
        <Input 
          type="password" 
          showPasswordToggle 
          disabled 
          data-testid="disabled-password"
        />
      );
      
      const toggleButton = screen.getByTestId('disabled-password-password-toggle');
      expect(toggleButton).toBeDisabled();
    });
  });

  describe('fullWidth', () => {
    it('fullWidth=falseで幅が制限される', () => {
      render(<Input fullWidth={false} data-testid="limited-width" />);
      
      const container = screen.getByTestId('limited-width').parentElement;
      expect(container?.className).toContain('w-auto');
    });

    it('デフォルトはfullWidth=true', () => {
      render(<Input data-testid="default-width" />);
      
      const input = screen.getByTestId('default-width');
      expect(input.className).toContain('w-full');
    });
  });

  describe('イベントハンドリング', () => {
    it('onChangeが正しく呼び出される', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      
      render(<Input onChange={handleChange} data-testid="change-input" />);
      
      const input = screen.getByTestId('change-input');
      await user.type(input, 'テスト');
      
      expect(handleChange).toHaveBeenCalled();
    });

    it('onFocusとonBlurが正しく呼び出される', async () => {
      const handleFocus = vi.fn();
      const handleBlur = vi.fn();
      const user = userEvent.setup();
      
      render(
        <Input 
          onFocus={handleFocus} 
          onBlur={handleBlur} 
          data-testid="focus-blur-input"
        />
      );
      
      const input = screen.getByTestId('focus-blur-input');
      
      await user.click(input);
      expect(handleFocus).toHaveBeenCalledTimes(1);
      
      await user.tab();
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('disabled状態でイベントが発火しない', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      
      render(<Input disabled onChange={handleChange} data-testid="disabled-events" />);
      
      const input = screen.getByTestId('disabled-events');
      await user.type(input, 'テスト');
      
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('ラベルと入力フィールドが正しく関連付けられる', () => {
      render(<Input label="アクセシブルラベル" data-testid="accessible-input" />);
      
      const input = screen.getByTestId('accessible-input');
      const label = screen.getByText('アクセシブルラベル');
      
      expect(label).toHaveAttribute('for', input.id);
    });

    it('aria-invalid属性が正しく設定される', () => {
      const { rerender } = render(<Input data-testid="aria-input" />);
      
      let input = screen.getByTestId('aria-input');
      expect(input).toHaveAttribute('aria-invalid', 'false');
      
      rerender(<Input error="エラー" data-testid="aria-input" />);
      
      input = screen.getByTestId('aria-input');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('aria-describedby属性が正しく設定される', () => {
      render(
        <Input 
          helpText="ヘルプ" 
          error="エラー" 
          data-testid="described-input"
        />
      );
      
      const input = screen.getByTestId('described-input');
      const describedBy = input.getAttribute('aria-describedby');
      
      expect(describedBy).toContain('error');
    });

    it('required属性が正しく設定される', () => {
      render(<Input required data-testid="required-input" />);
      
      const input = screen.getByTestId('required-input');
      expect(input).toHaveAttribute('required');
    });
  });

  describe('カスタムプロパティ', () => {
    it('カスタムclassNameが正しく適用される', () => {
      render(<Input className="custom-input" data-testid="custom-class-input" />);
      
      const input = screen.getByTestId('custom-class-input');
      expect(input.className).toContain('custom-input');
    });

    it('その他のHTMLAttributesが正しく渡される', () => {
      render(
        <Input 
          id="custom-id"
          name="custom-name"
          autoComplete="off"
          data-testid="custom-attrs-input"
        />
      );
      
      const input = screen.getByTestId('custom-attrs-input');
      expect(input).toHaveAttribute('id', 'custom-id');
      expect(input).toHaveAttribute('name', 'custom-name');
      expect(input).toHaveAttribute('autoComplete', 'off');
    });
  });

  describe('型安全性', () => {
    it('InputPropsの型が正しく適用される', () => {
      // 型チェックのみ（実行時エラーがないことを確認）
      const inputProps: InputProps = {
        type: 'email',
        size: 'lg',
        variant: 'success',
        label: 'メールアドレス',
        placeholder: 'example@domain.com',
        required: true,
        fullWidth: true,
        'data-testid': 'type-safe-input'
      };
      
      render(<Input {...inputProps} />);
      
      expect(screen.getByTestId('type-safe-input')).toBeInTheDocument();
    });
  });
});