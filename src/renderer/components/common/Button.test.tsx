/**
 * Button.test.tsx - Buttonコンポーネント単体テスト
 * 
 * Phase 3.5.2.1 Task 1: Buttonコンポーネントテスト
 * TypeScript厳密型定義、アクセシビリティ、バリアント動作のテスト
 */

import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

// テスト対象
import Button, { type ButtonProps, type ButtonVariant, type ButtonSize } from './Button';

// テスト用のアイコンコンポーネント
const TestIcon: React.FC = () => (
  <svg data-testid="test-icon" width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="4" />
  </svg>
);

describe('Button Component', () => {
  describe('基本的なレンダリング', () => {
    it('デフォルトのpropsで正常にレンダリングされる', () => {
      render(<Button>テストボタン</Button>);
      
      const button = screen.getByRole('button', { name: 'テストボタン' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('テストボタン');
    });

    it('childrenが正しく表示される', () => {
      const buttonText = 'クリックしてください';
      render(<Button>{buttonText}</Button>);
      
      expect(screen.getByText(buttonText)).toBeInTheDocument();
    });

    it('data-testidが正しく設定される', () => {
      render(<Button data-testid="custom-button">ボタン</Button>);
      
      expect(screen.getByTestId('custom-button')).toBeInTheDocument();
    });
  });

  describe('バリアント（variant）', () => {
    const variants: ButtonVariant[] = ['primary', 'secondary', 'danger', 'ghost', 'outline'];

    variants.forEach(variant => {
      it(`variant="${variant}" が正しく適用される`, () => {
        render(<Button variant={variant} data-testid={`${variant}-button`}>
          {variant} ボタン
        </Button>);
        
        const button = screen.getByTestId(`${variant}-button`);
        expect(button).toBeInTheDocument();
        expect(button).toHaveTextContent(`${variant} ボタン`);
      });
    });

    it('デフォルトのvariantはprimary', () => {
      render(<Button data-testid="default-button">デフォルト</Button>);
      
      const button = screen.getByTestId('default-button');
      // primary variantのクラスが適用されているかチェック
      expect(button.className).toContain('bg-primary');
    });
  });

  describe('サイズ（size）', () => {
    const sizes: ButtonSize[] = ['sm', 'md', 'lg', 'xl'];

    sizes.forEach(size => {
      it(`size="${size}" が正しく適用される`, () => {
        render(<Button size={size} data-testid={`${size}-button`}>
          {size} サイズ
        </Button>);
        
        const button = screen.getByTestId(`${size}-button`);
        expect(button).toBeInTheDocument();
      });
    });

    it('デフォルトのsizeはmd', () => {
      render(<Button data-testid="default-size">デフォルト</Button>);
      
      const button = screen.getByTestId('default-size');
      // md sizeのクラスが適用されているかチェック
      expect(button.className).toContain('px-4 py-2');
    });
  });

  describe('ローディング状態', () => {
    it('isLoading=trueでスピナーが表示される', () => {
      render(<Button isLoading data-testid="loading-button">
        読み込み中
      </Button>);
      
      const button = screen.getByTestId('loading-button');
      const spinner = button.querySelector('svg[aria-hidden=\"true\"]');
      
      expect(spinner).toBeInTheDocument();
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('isLoading=trueでloadingTextが表示される', () => {
      render(
        <Button isLoading loadingText="処理中..." data-testid="loading-text-button">
          送信
        </Button>
      );
      
      expect(screen.getByText('処理中...')).toBeInTheDocument();
    });

    it('isLoading=trueでloadingTextがない場合はchildrenが表示される', () => {
      render(<Button isLoading data-testid="loading-children">
        送信中
      </Button>);
      
      expect(screen.getByText('送信中')).toBeInTheDocument();
    });

    it('isLoading=trueで右アイコンが非表示になる', () => {
      render(
        <Button isLoading rightIcon={<TestIcon />} data-testid="loading-no-right-icon">
          送信
        </Button>
      );
      
      const button = screen.getByTestId('loading-no-right-icon');
      const rightIcon = button.querySelector('[data-testid=\"test-icon\"]');
      
      expect(rightIcon).not.toBeInTheDocument();
    });
  });

  describe('アイコン', () => {
    it('leftIconが正しく表示される', () => {
      render(
        <Button leftIcon={<TestIcon />} data-testid="left-icon-button">
          左アイコン付き
        </Button>
      );
      
      const button = screen.getByTestId('left-icon-button');
      const leftIcon = button.querySelector('[data-testid=\"test-icon\"]');
      
      expect(leftIcon).toBeInTheDocument();
    });

    it('rightIconが正しく表示される', () => {
      render(
        <Button rightIcon={<TestIcon />} data-testid="right-icon-button">
          右アイコン付き
        </Button>
      );
      
      const button = screen.getByTestId('right-icon-button');
      const rightIcon = button.querySelector('[data-testid=\"test-icon\"]');
      
      expect(rightIcon).toBeInTheDocument();
    });

    it('両方のアイコンが表示される', () => {
      render(
        <Button 
          leftIcon={<TestIcon />} 
          rightIcon={<TestIcon />} 
          data-testid="both-icons-button"
        >
          両方のアイコン
        </Button>
      );
      
      const button = screen.getByTestId('both-icons-button');
      const icons = button.querySelectorAll('[data-testid=\"test-icon\"]');
      
      expect(icons).toHaveLength(2);
    });
  });

  describe('disabled状態', () => {
    it('disabled=trueでボタンが無効化される', () => {
      render(<Button disabled data-testid="disabled-button">
        無効ボタン
      </Button>);
      
      const button = screen.getByTestId('disabled-button');
      
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('isLoading=trueでも無効化される', () => {
      render(<Button isLoading data-testid="loading-disabled">
        読み込み中
      </Button>);
      
      const button = screen.getByTestId('loading-disabled');
      
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('fullWidth', () => {
    it('fullWidth=trueで幅100%のクラスが適用される', () => {
      render(<Button fullWidth data-testid="full-width-button">
        フル幅ボタン
      </Button>);
      
      const button = screen.getByTestId('full-width-button');
      
      expect(button.className).toContain('w-full');
    });
  });

  describe('イベントハンドリング', () => {
    it('onClickが正しく呼び出される', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(<Button onClick={handleClick} data-testid="clickable-button">
        クリック
      </Button>);
      
      const button = screen.getByTestId('clickable-button');
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('disabled状態でonClickが呼び出されない', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(<Button disabled onClick={handleClick} data-testid="disabled-click">
        無効ボタン
      </Button>);
      
      const button = screen.getByTestId('disabled-click');
      await user.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('loading状態でonClickが呼び出されない', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(<Button isLoading onClick={handleClick} data-testid="loading-click">
        読み込み中
      </Button>);
      
      const button = screen.getByTestId('loading-click');
      await user.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('キーボードイベント（Space）が正しく動作する', () => {
      const handleClick = vi.fn();
      
      render(<Button onClick={handleClick} data-testid="keyboard-button">
        キーボード
      </Button>);
      
      const button = screen.getByTestId('keyboard-button');
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });
      
      // スペースキーでもクリックイベントが発火することを確認
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('カスタムプロパティ', () => {
    it('カスタムclassNameが正しく適用される', () => {
      render(<Button className="custom-class" data-testid="custom-class-button">
        カスタムクラス
      </Button>);
      
      const button = screen.getByTestId('custom-class-button');
      
      expect(button.className).toContain('custom-class');
    });

    it('その他のHTMLAttributesが正しく渡される', () => {
      render(
        <Button 
          id="custom-id" 
          title="カスタムタイトル"
          data-testid="custom-attrs-button"
        >
          カスタム属性
        </Button>
      );
      
      const button = screen.getByTestId('custom-attrs-button');
      
      expect(button).toHaveAttribute('id', 'custom-id');
      expect(button).toHaveAttribute('title', 'カスタムタイトル');
    });
  });

  describe('アクセシビリティ', () => {
    it('button roleが正しく設定される', () => {
      render(<Button>アクセシブルボタン</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('aria-disabled属性が正しく設定される', () => {
      render(<Button disabled data-testid="aria-disabled">
        無効ボタン
      </Button>);
      
      const button = screen.getByTestId('aria-disabled');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('loading中のスピナーにaria-hidden属性が設定される', () => {
      render(<Button isLoading data-testid="aria-spinner">
        読み込み中
      </Button>);
      
      const button = screen.getByTestId('aria-spinner');
      const spinner = button.querySelector('svg[aria-hidden=\"true\"]');
      
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('型安全性', () => {
    it('ButtonPropsの型が正しく適用される', () => {
      // 型チェックのみ（実行時エラーがないことを確認）
      const buttonProps: ButtonProps = {
        variant: 'primary',
        size: 'md',
        isLoading: false,
        disabled: false,
        fullWidth: false,
        children: 'タイプセーフボタン',
        onClick: () => {},
        'data-testid': 'type-safe-button'
      };
      
      render(<Button {...buttonProps} />);
      
      expect(screen.getByTestId('type-safe-button')).toBeInTheDocument();
    });
  });
});