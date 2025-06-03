/**
 * Card.test.tsx - Cardコンポーネント単体テスト
 * 
 * Phase 3.5.2.1 Task 5: Cardコンポーネントテスト
 * 設定セクション用コンテナの包括的テスト
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// テスト対象
import Card, { 
  type CardProps, 
  type CardVariant, 
  type CardSize, 
  type CardPadding,
  type CardHeader 
} from './Card';

// テスト用のコンポーネント
const TestIcon: React.FC = () => (
  <svg data-testid="test-icon" width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="4" />
  </svg>
);

const TestButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <button onClick={onClick} data-testid="test-button">
    アクション
  </button>
);

describe('Card Component', () => {
  describe('基本的なレンダリング', () => {
    it('デフォルトのpropsで正常にレンダリングされる', () => {
      render(
        <Card data-testid="default-card">
          <div>テストコンテンツ</div>
        </Card>
      );
      
      const card = screen.getByTestId('default-card');
      expect(card).toBeInTheDocument();
      expect(screen.getByText('テストコンテンツ')).toBeInTheDocument();
    });

    it('ヘッダーなしでコンテンツのみ表示される', () => {
      render(
        <Card data-testid="content-only">
          <p>コンテンツのみ</p>
        </Card>
      );
      
      expect(screen.getByText('コンテンツのみ')).toBeInTheDocument();
      expect(screen.queryByTestId('content-only-header')).not.toBeInTheDocument();
    });
  });

  describe('バリアント（variant）', () => {
    const variants: CardVariant[] = ['default', 'elevated', 'outlined', 'filled'];

    variants.forEach(variant => {
      it(`variant="${variant}" が正しく適用される`, () => {
        render(
          <Card variant={variant} data-testid={`${variant}-card`}>
            テストコンテンツ
          </Card>
        );
        
        const card = screen.getByTestId(`${variant}-card`);
        expect(card).toBeInTheDocument();
        
        if (variant === 'elevated') {
          expect(card.className).toContain('shadow-md');
        } else if (variant === 'outlined') {
          expect(card.className).toContain('border-2');
        } else if (variant === 'filled') {
          expect(card.className).toContain('bg-background');
        }
      });
    });
  });

  describe('サイズ（size）', () => {
    const sizes: CardSize[] = ['sm', 'md', 'lg'];

    sizes.forEach(size => {
      it(`size="${size}" が正しく適用される`, () => {
        render(
          <Card size={size} data-testid={`${size}-card`}>
            テストコンテンツ
          </Card>
        );
        
        const card = screen.getByTestId(`${size}-card`);
        expect(card).toBeInTheDocument();
        
        if (size === 'sm') {
          expect(card.className).toContain('max-w-sm');
        } else if (size === 'md') {
          expect(card.className).toContain('max-w-md');
        } else if (size === 'lg') {
          expect(card.className).toContain('max-w-2xl');
        }
      });
    });

    it('fullWidth=trueで最大幅制限が解除される', () => {
      render(
        <Card fullWidth data-testid="full-width-card">
          フル幅コンテンツ
        </Card>
      );
      
      const card = screen.getByTestId('full-width-card');
      expect(card.className).toContain('w-full');
    });
  });

  describe('パディング（padding）', () => {
    const paddings: CardPadding[] = ['none', 'sm', 'md', 'lg'];

    paddings.forEach(padding => {
      it(`padding="${padding}" が正しく適用される`, () => {
        render(
          <Card padding={padding} data-testid={`${padding}-padding-card`}>
            パディングテスト
          </Card>
        );
        
        const card = screen.getByTestId(`${padding}-padding-card`);
        expect(card).toBeInTheDocument();
      });
    });
  });

  describe('ヘッダー機能', () => {
    it('文字列ヘッダーが正しく表示される', () => {
      const headerText = 'テストヘッダー';
      render(
        <Card header={headerText} data-testid="string-header">
          コンテンツ
        </Card>
      );
      
      expect(screen.getByText(headerText)).toBeInTheDocument();
      expect(screen.getByTestId('string-header-header')).toBeInTheDocument();
    });

    it('オブジェクト形式ヘッダーが正しく表示される', () => {
      const headerObj = {
        title: 'オブジェクトタイトル',
        description: 'オブジェクト説明',
        actions: <TestButton />,
        icon: <TestIcon />
      };
      
      render(
        <Card header={headerObj} data-testid="object-header">
          コンテンツ
        </Card>
      );
      
      expect(screen.getByText('オブジェクトタイトル')).toBeInTheDocument();
      expect(screen.getByText('オブジェクト説明')).toBeInTheDocument();
      expect(screen.getByTestId('test-button')).toBeInTheDocument();
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('ReactNodeヘッダーが正しく表示される', () => {
      const CustomHeader = (
        <div data-testid="custom-header">
          <h2>カスタムヘッダー</h2>
          <span>追加情報</span>
        </div>
      );
      
      render(
        <Card header={CustomHeader} data-testid="reactnode-header">
          コンテンツ
        </Card>
      );
      
      expect(screen.getByTestId('custom-header')).toBeInTheDocument();
      expect(screen.getByText('カスタムヘッダー')).toBeInTheDocument();
      expect(screen.getByText('追加情報')).toBeInTheDocument();
    });

    it('タイトルのみのオブジェクトヘッダー', () => {
      render(
        <Card header={{ title: 'タイトルのみ' }} data-testid="title-only">
          コンテンツ
        </Card>
      );
      
      expect(screen.getByText('タイトルのみ')).toBeInTheDocument();
    });
  });

  describe('フッター機能', () => {
    it('フッターが正しく表示される', () => {
      const footer = (
        <div data-testid="test-footer">
          <button>保存</button>
          <button>キャンセル</button>
        </div>
      );
      
      render(
        <Card footer={footer} data-testid="footer-card">
          コンテンツ
        </Card>
      );
      
      expect(screen.getByTestId('test-footer')).toBeInTheDocument();
      expect(screen.getByTestId('footer-card-footer')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
    });

    it('折りたたみ時にフッターが非表示になる', async () => {
      const user = userEvent.setup();
      
      render(
        <Card 
          header="折りたたみテスト"
          footer={<div data-testid="collapsible-footer">フッター</div>}
          collapsible
          data-testid="collapsible-footer-card"
        >
          コンテンツ
        </Card>
      );
      
      // 初期状態でフッターが表示される
      expect(screen.getByTestId('collapsible-footer')).toBeInTheDocument();
      
      // ヘッダーをクリックして折りたたむ
      await user.click(screen.getByTestId('collapsible-footer-card-header'));
      
      // フッターが非表示になる
      expect(screen.queryByTestId('collapsible-footer')).not.toBeInTheDocument();
    });
  });

  describe('折りたたみ機能', () => {
    it('collapsible=trueで折りたたみボタンが表示される', () => {
      render(
        <Card 
          header="折りたたみカード"
          collapsible
          data-testid="collapsible-card"
        >
          折りたたみ可能なコンテンツ
        </Card>
      );
      
      const header = screen.getByTestId('collapsible-card-header');
      expect(header).toHaveAttribute('role', 'button');
      expect(header).toHaveAttribute('aria-expanded', 'true');
      expect(header).toHaveAttribute('tabIndex', '0');
      
      // 折りたたみアイコンが表示される
      const chevron = header.querySelector('svg');
      expect(chevron).toBeInTheDocument();
    });

    it('ヘッダークリックで折りたたみが動作する', async () => {
      const user = userEvent.setup();
      
      render(
        <Card 
          header="クリックテスト"
          collapsible
          data-testid="click-test"
        >
          <div data-testid="collapsible-content">コンテンツ</div>
        </Card>
      );
      
      const header = screen.getByTestId('click-test-header');
      const content = screen.getByTestId('collapsible-content');
      
      // 初期状態で展開
      expect(header).toHaveAttribute('aria-expanded', 'true');
      expect(content).toBeVisible();
      
      // ヘッダーをクリック
      await user.click(header);
      
      // 折りたたまれる
      expect(header).toHaveAttribute('aria-expanded', 'false');
    });

    it('キーボード操作（Enter）で折りたたみが動作する', () => {
      render(
        <Card 
          header="キーボードテスト"
          collapsible
          data-testid="keyboard-test"
        >
          コンテンツ
        </Card>
      );
      
      const header = screen.getByTestId('keyboard-test-header');
      
      // Enterキーを押す
      fireEvent.keyDown(header, { key: 'Enter' });
      
      // 折りたたまれる
      expect(header).toHaveAttribute('aria-expanded', 'false');
    });

    it('キーボード操作（Space）で折りたたみが動作する', () => {
      render(
        <Card 
          header="スペースキーテスト"
          collapsible
          data-testid="space-test"
        >
          コンテンツ
        </Card>
      );
      
      const header = screen.getByTestId('space-test-header');
      
      // Spaceキーを押す
      fireEvent.keyDown(header, { key: ' ' });
      
      // 折りたたまれる
      expect(header).toHaveAttribute('aria-expanded', 'false');
    });

    it('defaultCollapsed=trueで初期状態が折りたたまれる', () => {
      render(
        <Card 
          header="デフォルト折りたたみ"
          collapsible
          defaultCollapsed
          data-testid="default-collapsed"
        >
          <div data-testid="initially-hidden">コンテンツ</div>
        </Card>
      );
      
      const header = screen.getByTestId('default-collapsed-header');
      expect(header).toHaveAttribute('aria-expanded', 'false');
    });

    it('制御コンポーネントとして動作する', async () => {
      const handleCollapsedChange = vi.fn();
      const user = userEvent.setup();
      
      const { rerender } = render(
        <Card 
          header="制御コンポーネント"
          collapsible
          collapsed={false}
          onCollapsedChange={handleCollapsedChange}
          data-testid="controlled-card"
        >
          コンテンツ
        </Card>
      );
      
      const header = screen.getByTestId('controlled-card-header');
      expect(header).toHaveAttribute('aria-expanded', 'true');
      
      // ヘッダーをクリック
      await user.click(header);
      
      // コールバックが呼ばれる
      expect(handleCollapsedChange).toHaveBeenCalledWith(true);
      
      // プロパティを更新
      rerender(
        <Card 
          header="制御コンポーネント"
          collapsible
          collapsed={true}
          onCollapsedChange={handleCollapsedChange}
          data-testid="controlled-card"
        >
          コンテンツ
        </Card>
      );
      
      expect(header).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('ローディング状態', () => {
    it('loading=trueでスピナーが表示される', () => {
      render(
        <Card loading data-testid="loading-card">
          <div data-testid="original-content">元のコンテンツ</div>
        </Card>
      );
      
      // スピナーが表示される
      const spinner = screen.getByRole('img', { hidden: true }); // SVGはimgとして認識される場合がある
      expect(spinner).toBeInTheDocument();
      
      // 元のコンテンツは表示されない
      expect(screen.queryByTestId('original-content')).not.toBeInTheDocument();
    });
  });

  describe('disabled状態', () => {
    it('disabled=trueでカードが無効化される', () => {
      render(
        <Card 
          header="無効カード"
          collapsible
          disabled
          data-testid="disabled-card"
        >
          コンテンツ
        </Card>
      );
      
      const card = screen.getByTestId('disabled-card');
      const header = screen.getByTestId('disabled-card-header');
      
      expect(card.className).toContain('opacity-50');
      expect(card.className).toContain('cursor-not-allowed');
      expect(header).not.toHaveAttribute('tabIndex', '0');
    });

    it('disabled状態で折りたたみ操作が無効化される', async () => {
      const handleCollapsedChange = vi.fn();
      const user = userEvent.setup();
      
      render(
        <Card 
          header="無効折りたたみ"
          collapsible
          disabled
          onCollapsedChange={handleCollapsedChange}
          data-testid="disabled-collapsible"
        >
          コンテンツ
        </Card>
      );
      
      const header = screen.getByTestId('disabled-collapsible-header');
      
      // クリックしてもコールバックが呼ばれない
      await user.click(header);
      expect(handleCollapsedChange).not.toHaveBeenCalled();
      
      // キーボード操作も無効
      fireEvent.keyDown(header, { key: 'Enter' });
      expect(handleCollapsedChange).not.toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定される', () => {
      render(
        <Card 
          header="アクセシビリティテスト"
          collapsible
          data-testid="a11y-card"
        >
          <div data-testid="a11y-content">コンテンツ</div>
        </Card>
      );
      
      const card = screen.getByTestId('a11y-card');
      const header = screen.getByTestId('a11y-card-header');
      const content = screen.getByTestId('a11y-card-content');
      
      // カードとヘッダーの関連付け
      expect(card).toHaveAttribute('aria-labelledby');
      
      // 折りたたみ関連のARIA属性
      expect(header).toHaveAttribute('role', 'button');
      expect(header).toHaveAttribute('aria-expanded', 'true');
      expect(header).toHaveAttribute('aria-controls', content.id);
      
      // コンテンツのARIA属性
      expect(content).toHaveAttribute('aria-hidden', 'false');
    });

    it('折りたたみ時にaria-hiddenが更新される', async () => {
      const user = userEvent.setup();
      
      render(
        <Card 
          header="ARIA更新テスト"
          collapsible
          data-testid="aria-update"
        >
          <div data-testid="aria-content">コンテンツ</div>
        </Card>
      );
      
      const header = screen.getByTestId('aria-update-header');
      const content = screen.getByTestId('aria-content');
      
      // 初期状態
      expect(content).toHaveAttribute('aria-hidden', 'false');
      
      // 折りたたむ
      await user.click(header);
      
      // aria-hiddenが更新される
      expect(content).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('カスタマイズ', () => {
    it('カスタムクラスが正しく適用される', () => {
      render(
        <Card 
          header="カスタムクラステスト"
          footer={<div>フッター</div>}
          className="custom-card"
          headerClassName="custom-header"
          contentClassName="custom-content"
          footerClassName="custom-footer"
          data-testid="custom-classes"
        >
          コンテンツ
        </Card>
      );
      
      const card = screen.getByTestId('custom-classes');
      const header = screen.getByTestId('custom-classes-header');
      const content = screen.getByTestId('custom-classes-content');
      const footer = screen.getByTestId('custom-classes-footer');
      
      expect(card.className).toContain('custom-card');
      expect(header.className).toContain('custom-header');
      expect(content.className).toContain('custom-content');
      expect(footer.className).toContain('custom-footer');
    });
  });

  describe('型安全性', () => {
    it('CardPropsの型が正しく適用される', () => {
      // 型チェックのみ（実行時エラーがないことを確認）
      const cardProps: CardProps = {
        variant: 'elevated',
        size: 'lg',
        padding: 'lg',
        header: {
          title: 'タイプセーフカード',
          description: '型安全なプロパティ',
          icon: <TestIcon />,
          actions: <TestButton />
        },
        footer: <div>フッター</div>,
        collapsible: true,
        defaultCollapsed: false,
        fullWidth: true,
        loading: false,
        disabled: false,
        'data-testid': 'type-safe-card'
      };
      
      render(<Card {...cardProps}>タイプセーフコンテンツ</Card>);
      
      expect(screen.getByTestId('type-safe-card')).toBeInTheDocument();
      expect(screen.getByText('タイプセーフカード')).toBeInTheDocument();
    });

    it('HeaderのUnion型が正しく動作する', () => {
      // 文字列ヘッダー
      const stringHeader: CardHeader = 'String Header';
      
      // オブジェクトヘッダー
      const objectHeader: CardHeader = {
        title: 'Object Header',
        description: 'Description'
      };
      
      // ReactNodeヘッダー
      const reactNodeHeader: CardHeader = <div>React Node Header</div>;
      
      // 型エラーがないことを確認
      expect(typeof stringHeader).toBe('string');
      expect(typeof objectHeader).toBe('object');
      expect(React.isValidElement(reactNodeHeader)).toBe(true);
    });
  });

  describe('設定画面での使用パターン', () => {
    it('設定セクションカードとして使用できる', () => {
      const settingsHeader = {
        title: 'ウィンドウ設定',
        description: 'アプリケーションウィンドウの外観と動作を設定します',
        actions: (
          <button data-testid="reset-button">
            リセット
          </button>
        )
      };
      
      const settingsFooter = (
        <div className="flex justify-end gap-2">
          <button data-testid="cancel-button">キャンセル</button>
          <button data-testid="save-button">保存</button>
        </div>
      );
      
      render(
        <Card 
          variant="elevated"
          header={settingsHeader}
          footer={settingsFooter}
          data-testid="settings-section"
        >
          <div data-testid="settings-form">
            {/* ここに設定フォームが入る */}
            <p>設定フォーム内容</p>
          </div>
        </Card>
      );
      
      expect(screen.getByText('ウィンドウ設定')).toBeInTheDocument();
      expect(screen.getByText('アプリケーションウィンドウの外観と動作を設定します')).toBeInTheDocument();
      expect(screen.getByTestId('reset-button')).toBeInTheDocument();
      expect(screen.getByTestId('save-button')).toBeInTheDocument();
      expect(screen.getByTestId('settings-form')).toBeInTheDocument();
    });

    it('詳細設定の折りたたみセクションとして使用できる', async () => {
      const user = userEvent.setup();
      
      render(
        <Card 
          header="詳細設定"
          collapsible
          defaultCollapsed
          data-testid="advanced-settings"
        >
          <div data-testid="advanced-options">
            <p>高度なオプション設定</p>
          </div>
        </Card>
      );
      
      const header = screen.getByTestId('advanced-settings-header');
      
      // 初期状態では折りたたまれている
      expect(header).toHaveAttribute('aria-expanded', 'false');
      
      // クリックして展開
      await user.click(header);
      
      // 詳細設定が表示される
      expect(header).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByTestId('advanced-options')).toBeInTheDocument();
    });
  });
});