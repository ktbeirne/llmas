/**
 * Card.tsx - 共通Cardコンポーネント
 * 
 * Phase 3.5.2.1 Task 5: Card実装（設定セクション用コンテナ）
 * デザインシステム準拠、折りたたみ機能、アクセシビリティ対応
 */

import React, { forwardRef, useState, ReactNode, useRef, useEffect } from 'react';

import { cn } from '../../utils/cn';

/**
 * Cardのvariant型定義
 */
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';

/**
 * Cardのsize型定義
 */
export type CardSize = 'sm' | 'md' | 'lg';

/**
 * Cardのpadding型定義
 */
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

/**
 * Card Header型定義（Union Type）
 */
export type CardHeader = 
  | string 
  | {
      title: string;
      description?: string;
      actions?: ReactNode;
      icon?: ReactNode;
    }
  | ReactNode;

/**
 * Card Props型定義
 */
export interface CardProps {
  /** カードのバリアント */
  variant?: CardVariant;
  
  /** カードのサイズ */
  size?: CardSize;
  
  /** カードのパディング */
  padding?: CardPadding;
  
  /** ヘッダーコンテンツ */
  header?: CardHeader;
  
  /** フッターコンテンツ */
  footer?: ReactNode;
  
  /** カードの内容 */
  children?: ReactNode;
  
  /** 折りたたみ可能かどうか */
  collapsible?: boolean;
  
  /** デフォルトの折りたたみ状態 */
  defaultCollapsed?: boolean;
  
  /** 折りたたみ状態の制御（制御コンポーネント用） */
  collapsed?: boolean;
  
  /** 折りたたみ状態変更時のコールバック */
  onCollapsedChange?: (collapsed: boolean) => void;
  
  /** 全幅表示かどうか */
  fullWidth?: boolean;
  
  /** ローディング状態 */
  loading?: boolean;
  
  /** 無効状態 */
  disabled?: boolean;
  
  /** test-id */
  'data-testid'?: string;
  
  /** カスタムクラス */
  className?: string;
  
  /** ヘッダー用のカスタムクラス */
  headerClassName?: string;
  
  /** コンテンツ用のカスタムクラス */
  contentClassName?: string;
  
  /** フッター用のカスタムクラス */
  footerClassName?: string;
}

/**
 * ベーススタイル定義
 */
const baseStyles = [
  'rounded-lg',
  'transition-all',
  'duration-200',
  'ease-in-out',
].join(' ');

/**
 * Variant別スタイル（デザインシステム準拠）
 */
const variantStyles: Record<CardVariant, string> = {
  default: [
    'bg-white',
    'border',
    'border-gray-200',
  ].join(' '),
  
  elevated: [
    'bg-white',
    'border',
    'border-gray-200',
    'shadow-md',
    'hover:shadow-lg',
  ].join(' '),
  
  outlined: [
    'bg-white',
    'border-2',
    'border-gray-300',
    'hover:border-primary',
  ].join(' '),
  
  filled: [
    'bg-background',
    'border',
    'border-gray-200',
  ].join(' '),
};

/**
 * Size別スタイル
 */
const sizeStyles: Record<CardSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

/**
 * Padding別スタイル
 */
const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

/**
 * ヘッダーパディングスタイル
 */
const headerPaddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-6 py-4',
};

/**
 * 折りたたみアイコン
 */
const ChevronIcon: React.FC<{ isExpanded: boolean; disabled?: boolean }> = ({ isExpanded, disabled }) => (
  <svg
    className={cn(
      'w-4 h-4 transition-transform duration-200',
      isExpanded && 'rotate-180',
      disabled ? 'text-gray-400' : 'text-gray-600 hover:text-gray-800'
    )}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

/**
 * ローディングスピナー
 */
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center py-8">
    <svg
      className="animate-spin h-8 w-8 text-primary"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  </div>
);

/**
 * Card コンポーネント
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      size = 'md',
      padding = 'md',
      header,
      footer,
      children,
      collapsible = false,
      defaultCollapsed = false,
      collapsed,
      onCollapsedChange,
      fullWidth = false,
      loading = false,
      disabled = false,
      className,
      headerClassName,
      contentClassName,
      footerClassName,
      'data-testid': testId,
    },
    ref
  ) => {
    // 折りたたみ状態管理（制御/非制御コンポーネント対応）
    const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
    const isCollapsed = collapsed !== undefined ? collapsed : internalCollapsed;
    
    // コンテンツ要素の参照
    const contentRef = useRef<HTMLDivElement>(null);
    const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);
    
    // 一意なIDの生成
    const cardId = `card-${Math.random().toString(36).substr(2, 9)}`;
    const contentId = `${cardId}-content`;
    
    // 折りたたみ状態の変更処理
    const handleToggleCollapsed = () => {
      if (disabled) return;
      
      const newCollapsed = !isCollapsed;
      
      if (collapsed === undefined) {
        setInternalCollapsed(newCollapsed);
      }
      
      onCollapsedChange?.(newCollapsed);
    };
    
    // キーボードイベント処理
    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (!collapsible || disabled) return;
      
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggleCollapsed();
      }
    };
    
    // コンテンツの高さを計算（アニメーション用）
    useEffect(() => {
      if (collapsible && contentRef.current) {
        setContentHeight(contentRef.current.scrollHeight);
      }
    }, [children, collapsible]);
    
    // カードのスタイル統合
    const cardClasses = cn(
      baseStyles,
      variantStyles[variant],
      !fullWidth && sizeStyles[size],
      fullWidth && 'w-full',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    );
    
    // ヘッダーのレンダリング
    const renderHeader = () => {
      if (!header) return null;
      
      const headerContent = (() => {
        if (typeof header === 'string') {
          return (
            <h3 className="text-lg font-semibold text-gray-900">
              {header}
            </h3>
          );
        }
        
        if (React.isValidElement(header)) {
          return header;
        }
        
        if (typeof header === 'object' && 'title' in header) {
          const { title, description, actions, icon } = header;
          return (
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {icon && (
                  <div className="flex-shrink-0 mt-0.5">
                    {icon}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {title}
                  </h3>
                  {description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {description}
                    </p>
                  )}
                </div>
              </div>
              {actions && (
                <div className="flex-shrink-0 ml-4">
                  {actions}
                </div>
              )}
            </div>
          );
        }
        
        return null;
      })();
      
      return (
        <div
          className={cn(
            'border-b border-gray-200',
            headerPaddingStyles[padding],
            collapsible && !disabled && 'cursor-pointer hover:bg-gray-50',
            collapsible && 'select-none',
            headerClassName
          )}
          onClick={collapsible ? handleToggleCollapsed : undefined}
          onKeyDown={collapsible ? handleKeyDown : undefined}
          tabIndex={collapsible && !disabled ? 0 : undefined}
          role={collapsible ? 'button' : undefined}
          aria-expanded={collapsible ? !isCollapsed : undefined}
          aria-controls={collapsible ? contentId : undefined}
          data-testid={testId ? `${testId}-header` : undefined}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              {headerContent}
            </div>
            {collapsible && (
              <div className="flex-shrink-0 ml-4">
                <ChevronIcon isExpanded={!isCollapsed} disabled={disabled} />
              </div>
            )}
          </div>
        </div>
      );
    };
    
    // コンテンツのレンダリング
    const renderContent = () => {
      if (loading) {
        return <LoadingSpinner />;
      }
      
      return children;
    };
    
    // フッターのレンダリング
    const renderFooter = () => {
      if (!footer) return null;
      
      return (
        <div
          className={cn(
            'border-t border-gray-200',
            headerPaddingStyles[padding],
            footerClassName
          )}
          data-testid={testId ? `${testId}-footer` : undefined}
        >
          {footer}
        </div>
      );
    };
    
    return (
      <div
        ref={ref}
        className={cardClasses}
        data-testid={testId}
        aria-labelledby={header ? `${cardId}-header` : undefined}
      >
        {/* ヘッダー */}
        {renderHeader()}
        
        {/* コンテンツ */}
        <div
          ref={contentRef}
          id={contentId}
          className={cn(
            'transition-all duration-300 ease-in-out overflow-hidden',
            !collapsible && paddingStyles[padding],
            collapsible && (isCollapsed ? 'max-h-0' : 'max-h-none'),
            contentClassName
          )}
          style={
            collapsible
              ? {
                  maxHeight: isCollapsed ? 0 : contentHeight,
                  paddingTop: isCollapsed ? 0 : undefined,
                  paddingBottom: isCollapsed ? 0 : undefined,
                }
              : undefined
          }
          aria-hidden={collapsible ? isCollapsed : undefined}
          data-testid={testId ? `${testId}-content` : undefined}
        >
          <div className={collapsible ? paddingStyles[padding] : ''}>
            {renderContent()}
          </div>
        </div>
        
        {/* フッター */}
        {footer && !isCollapsed && renderFooter()}
      </div>
    );
  }
);

// displayNameを設定
Card.displayName = 'Card';

// デフォルトエクスポート
export default Card;

/**
 * Card関連の型定義エクスポート
 */
export type {
  CardProps,
  CardVariant,
  CardSize,
  CardPadding,
  CardHeader,
};