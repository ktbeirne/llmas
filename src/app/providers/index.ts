/**
 * App Providers - FSD Phase 3
 * アプリケーション層のプロバイダー統合
 */

// Core providers
export { LazyLoadProvider, createLazyComponent, preloadComponent, useLazyLoad } from './LazyLoadProvider';
export { PerformanceProvider, usePerformance, withPerformanceOptimization, useMemoryManager } from './PerformanceProvider';

// Lazy widgets and features
export {
  LazyMascotView,
  LazySettingsPanel,
  LazyChatFeature,
  LazyVrmControlFeature,
  LazyMouseFollowFeature,
  LazySettingsFeature,
  LazyAnimationFeature,
  LazyMcpIntegrationFeature,
  preloadCriticalWidgets,
  preloadSecondaryWidgets,
  preloadOnDemandWidgets,
} from './LazyWidgets';

// Combined provider for easy setup
import React from 'react';
import { LazyLoadProvider } from './LazyLoadProvider';
import { PerformanceProvider } from './PerformanceProvider';

interface AppProvidersProps {
  children: React.ReactNode;
  enablePerformanceMonitoring?: boolean;
}

export const AppProviders: React.FC<AppProvidersProps> = ({
  children,
  enablePerformanceMonitoring = process.env.NODE_ENV === 'development',
}) => {
  return (
    <PerformanceProvider enableMonitoring={enablePerformanceMonitoring}>
      <LazyLoadProvider>
        {children}
      </LazyLoadProvider>
    </PerformanceProvider>
  );
};