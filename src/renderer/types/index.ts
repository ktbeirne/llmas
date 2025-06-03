// React レンダラープロセス用の型定義

// コンポーネント共通の型
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

// ページコンポーネントの型
export interface PageProps extends BaseComponentProps {
  title?: string;
  loading?: boolean;
  error?: Error | null;
}

// ウィンドウ固有の型
export interface WindowProps {
  windowId: string;
  windowType: 'settings' | 'chat' | 'main' | 'speech_bubble';
}

// レイアウト関連の型
export interface LayoutProps extends BaseComponentProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
}

// フォーム関連の型
export interface FormFieldProps extends BaseComponentProps {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

// テーマ関連の型
export interface ThemeContextType {
  currentTheme: string;
  setTheme: (theme: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

// ElectronAPI関連の型（統合用）
export interface ElectronContextType {
  api: typeof window.electronAPI;
  isElectron: boolean;
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

// エラー境界の型
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

// パフォーマンス監視の型
export interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  memoryUsage: number;
  lastUpdate: Date;
}
