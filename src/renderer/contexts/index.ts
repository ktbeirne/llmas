// React Context のエクスポート
// ElectronAPIとの統合、テーマ管理、設定管理などのグローバル状態：

// ElectronAPI統合（Phase 3.5.1 Task 4）
export {
  ElectronProvider,
  useElectron,
  useElectronAPI,
  useElectronMethod,
  useElectronState,
  type ElectronContextType,
} from './ElectronContext';

// 将来実装予定のContext:
// テーマ管理
// export { ThemeProvider, useTheme } from './ThemeContext';

// 設定管理
// export { SettingsProvider, useSettings } from './SettingsContext';

// エラー境界
// export { ErrorBoundaryProvider, useErrorBoundary } from './ErrorBoundaryContext';

// パフォーマンス監視
// export { PerformanceProvider, usePerformance } from './PerformanceContext';
