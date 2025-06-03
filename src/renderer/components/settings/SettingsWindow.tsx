/**
 * SettingsWindow.tsx - メイン設定画面コンテナ
 * 
 * Phase 3.5.2.2 Task 1: SettingsWindow実装
 * タブナビゲーション、設定セクション統合、ElectronAPI連携
 */

import React, { useState, useCallback, memo, useMemo } from 'react';
import { cn } from '../../utils/cn';

// UI Components
import { Button, Card } from '../common';

// Settings Components
import DisplaySettingsTab from './DisplaySettingsTab';
import ChatSettingsTab from './ChatSettingsTab';
import ExpressionSettingsTab from './ExpressionSettingsTab';

// Types
export type SettingsTab = 'display' | 'chat' | 'expressions';

export interface SettingsWindowProps {
  /** 初期表示タブ */
  initialTab?: SettingsTab;
  
  /** 設定画面を閉じる時のコールバック */
  onClose?: () => void;
  
  /** カスタムクラス */
  className?: string;
  
  /** test-id */
  'data-testid'?: string;
}

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: string;
  description: string;
}

/**
 * タブ設定
 */
const TAB_CONFIGS: TabConfig[] = [
  {
    id: 'display',
    label: '画面表示設定',
    icon: '🎨',
    description: 'テーマ、ウィンドウサイズ、VRMモデルの設定'
  },
  {
    id: 'chat',
    label: '会話設定',
    icon: '💬',
    description: 'ユーザー名、システムプロンプト、会話履歴の設定'
  },
  {
    id: 'expressions',
    label: '表情・アニメーション',
    icon: '🎭',
    description: '表情制御、アニメーション設定'
  }
];

/**
 * タブナビゲーションコンポーネント
 */
interface TabNavigationProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  className?: string;
}

const TabNavigation: React.FC<TabNavigationProps> = memo(({
  activeTab,
  onTabChange,
  className
}) => {
  // パフォーマンス最適化: タブボタンクラス名のメモ化
  const getTabButtonClasses = useCallback((tab: TabConfig, isActive: boolean) => {
    return cn(
      'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md',
      'text-sm font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
      isActive
        ? 'bg-white text-primary shadow-sm border border-primary/20'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
    );
  }, []);

  return (
    <div className={cn('flex space-x-1 bg-gray-100 p-1 rounded-lg', className)}>
      {TAB_CONFIGS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={getTabButtonClasses(tab, activeTab === tab.id)}
          aria-selected={activeTab === tab.id}
          role="tab"
          data-testid={`tab-${tab.id}`}
        >
          <span className="text-lg" aria-hidden="true">{tab.icon}</span>
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
});

/**
 * タブコンテンツレンダリング
 */
const renderTabContent = (tab: SettingsTab) => {
  switch (tab) {
    case 'display':
      return <DisplaySettingsTab data-testid="display-settings-tab" />;
      
    case 'chat':
      return <ChatSettingsTab data-testid="chat-settings-tab" />;
      
    case 'expressions':
      return <ExpressionSettingsTab data-testid="expression-settings-tab" />;
      
    default:
      return <TabContentPlaceholder tab={tab} />;
  }
};

/**
 * タブコンテンツプレースホルダー（未実装タブ用）
 */
const TabContentPlaceholder: React.FC<{ tab: SettingsTab }> = memo(({ tab }) => {
  // パフォーマンス最適化: 設定のメモ化
  const config = useMemo(() => {
    return TAB_CONFIGS.find(t => t.id === tab);
  }, [tab]);
  
  return (
    <Card 
      variant="default" 
      padding="lg"
      className="min-h-[400px] flex items-center justify-center"
    >
      <div className="text-center space-y-4">
        <div className="text-6xl">{config?.icon}</div>
        <h2 className="text-2xl font-semibold text-gray-900">{config?.label}</h2>
        <p className="text-gray-600 max-w-md">{config?.description}</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            🚧 このセクションは実装中です。次のフェーズで完成予定です。
          </p>
        </div>
      </div>
    </Card>
  );
});

/**
 * SettingsWindowコンポーネント（パフォーマンス最適化済み）
 */
export const SettingsWindow: React.FC<SettingsWindowProps> = memo(({
  initialTab = 'display',
  onClose,
  className,
  'data-testid': testId
}) => {
  // Active tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  
  // Tab change handler（最適化: useCallback使用）
  const handleTabChange = useCallback((tab: SettingsTab) => {
    setActiveTab(tab);
  }, []);
  
  // Close handler（最適化: useCallback使用）
  const handleClose = useCallback(() => {
    onClose?.();
    
    // ElectronAPI経由でウィンドウを閉じる
    if (window.electronAPI?.closeSettingsWindow) {
      window.electronAPI.closeSettingsWindow();
    }
  }, [onClose]);
  
  // キーボードショートカット（最適化: useCallback使用）
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  }, [handleClose]);

  // CSS クラス名のメモ化
  const containerClasses = useMemo(() => cn(
    'h-screen bg-background flex flex-col',
    'overflow-hidden', // 画面全体のスクロールを防ぐ
    className
  ), [className]);

  // タブコンテンツのメモ化
  const currentTabContent = useMemo(() => {
    return renderTabContent(activeTab);
  }, [activeTab]);
  
  return (
    <div 
      className={containerClasses}
      onKeyDown={handleKeyDown}
      data-testid={testId}
    >
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">設定</h1>
            <p className="text-sm text-gray-600 mt-1">
              アプリケーションの動作と表示をカスタマイズ
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            data-testid="close-settings-button"
            aria-label="設定を閉じる"
          >
            ✕
          </Button>
        </div>
      </header>
      
      {/* Tab Navigation */}
      <nav 
        className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0"
        role="tablist"
        aria-label="設定タブ"
      >
        <TabNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
          className="max-w-2xl mx-auto"
        />
      </nav>
      
      {/* Main Content */}
      <main 
        className="flex-1 overflow-y-auto px-6 py-6"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Current tab content (メモ化済み) */}
          {currentTabContent}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex justify-end">
          <Button
            variant="secondary"
            onClick={handleClose}
            data-testid="footer-close-button"
          >
            閉じる
          </Button>
        </div>
      </footer>
    </div>
  );
});

// displayNameを設定（memo使用時に必要）
SettingsWindow.displayName = 'SettingsWindow';
TabNavigation.displayName = 'TabNavigation';
TabContentPlaceholder.displayName = 'TabContentPlaceholder';

// デフォルトエクスポート
export default SettingsWindow;

/**
 * SettingsWindow関連の型定義エクスポート
 */
export type {
  SettingsWindowProps,
  SettingsTab,
};