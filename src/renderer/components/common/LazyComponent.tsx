/**
 * LazyComponent.tsx - 動的ローディング対応Reactコンポーネント
 * TDD実装: Code splittingとSuspenseの統合
 */

import React, { Suspense, ComponentType, lazy, ErrorInfo, Component } from 'react';

// ローディング状態のUIコンポーネント
interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = '読み込み中...', 
  size = 'medium' 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8', 
    large: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`animate-spin rounded-full border-4 border-primary border-t-transparent ${sizeClasses[size]}`} />
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{message}</p>
    </div>
  );
};

// エラー境界コンポーネント
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: ComponentType<{ error?: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

class LazyLoadErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[LazyLoadErrorBoundary] Component loading error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 border border-red-200 bg-red-50 rounded-lg">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">コンポーネントの読み込みに失敗しました</h3>
          <p className="text-sm text-red-600 mb-4">
            {this.state.error?.message || '不明なエラーが発生しました'}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            再試行
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// LazyComponentのプロパティ
interface LazyComponentProps {
  /** 遅延読み込みするコンポーネントのファクトリ関数 */
  componentFactory: () => Promise<{ default: ComponentType<any> } | ComponentType<any>>;
  
  /** ローディング中に表示するコンポーネント */
  loadingComponent?: ComponentType<any>;
  
  /** エラー時に表示するコンポーネント */
  errorComponent?: ComponentType<{ error?: Error; retry: () => void }>;
  
  /** ローディングメッセージ */
  loadingMessage?: string;
  
  /** エラーハンドリングコールバック */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  
  /** プリロードを有効にするか */
  enablePreload?: boolean;
  
  /** 渡すプロパティ */
  componentProps?: Record<string, any>;
}

/**
 * LazyComponent - 動的ローディング対応ラッパー
 */
export const LazyComponent: React.FC<LazyComponentProps> = ({
  componentFactory,
  loadingComponent: LoadingComponent,
  errorComponent,
  loadingMessage = '読み込み中...',
  onError,
  enablePreload = false,
  componentProps = {}
}) => {
  // lazy コンポーネントの作成
  const LazyLoadedComponent = React.useMemo(() => {
    return lazy(async () => {
      try {
        const module = await componentFactory();
        
        // モジュールの形式を統一
        if (module && typeof module === 'object' && 'default' in module) {
          return module as { default: ComponentType<any> };
        } else if (typeof module === 'function') {
          return { default: module as ComponentType<any> };
        } else {
          throw new Error('Invalid component module format');
        }
      } catch (error) {
        console.error('[LazyComponent] Failed to load component:', error);
        throw error;
      }
    });
  }, [componentFactory]);

  // プリロード実装
  React.useEffect(() => {
    if (enablePreload) {
      const timer = setTimeout(() => {
        componentFactory().catch(error => {
          console.warn('[LazyComponent] Preload failed:', error);
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [componentFactory, enablePreload]);

  // デフォルトのローディングコンポーネント
  const DefaultLoadingComponent = LoadingComponent || (() => (
    <LoadingSpinner message={loadingMessage} />
  ));

  return (
    <LazyLoadErrorBoundary fallback={errorComponent} onError={onError}>
      <Suspense fallback={<DefaultLoadingComponent />}>
        <LazyLoadedComponent {...componentProps} />
      </Suspense>
    </LazyLoadErrorBoundary>
  );
};

// 便利なヘルパー関数
export const createLazyComponent = (
  componentFactory: () => Promise<{ default: ComponentType<any> } | ComponentType<any>>,
  options: Partial<LazyComponentProps> = {}
) => {
  return React.forwardRef<any, any>((props, ref) => (
    <LazyComponent
      componentFactory={componentFactory}
      componentProps={{ ...props, ref }}
      {...options}
    />
  ));
};

// 特定コンポーネント用のLazyファクトリ関数
export const LazySettingsWindow = createLazyComponent(
  () => import('../settings/SettingsWindow'),
  { 
    loadingMessage: '設定画面を読み込み中...',
    enablePreload: true 
  }
);

export const LazyChatApp = createLazyComponent(
  () => import('../../apps/ChatApp'),
  { 
    loadingMessage: 'チャット画面を読み込み中...',
    enablePreload: false  // オンデマンドのみ
  }
);

// ローディング状態管理フック
export const useComponentLoading = () => {
  const [loadingStates, setLoadingStates] = React.useState<Record<string, boolean>>({});
  
  const setLoading = React.useCallback((componentName: string, isLoading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [componentName]: isLoading
    }));
  }, []);
  
  const isLoading = React.useCallback((componentName: string) => {
    return loadingStates[componentName] || false;
  }, [loadingStates]);
  
  const isAnyLoading = React.useMemo(() => {
    return Object.values(loadingStates).some(Boolean);
  }, [loadingStates]);
  
  return { setLoading, isLoading, isAnyLoading, loadingStates };
};

export default LazyComponent;