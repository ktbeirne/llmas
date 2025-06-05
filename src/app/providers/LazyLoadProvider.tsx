/**
 * LazyLoadProvider - FSD Phase 3 Performance Optimization
 * レイジーロード機能を提供するプロバイダー
 */

import React, { Suspense, lazy, ComponentType } from 'react';

// Loading fallback component
const LoadingFallback: React.FC<{ name?: string }> = ({ name }) => (
  <div className="loading-container" role="status" aria-live="polite">
    <div className="loading-spinner" />
    <span className="loading-text">
      {name ? `Loading ${name}...` : 'Loading...'}
    </span>
  </div>
);

// Error boundary for lazy loading
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class LazyLoadErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: ComponentType<{ error?: Error }> }>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{ fallback?: ComponentType<{ error?: Error }> }>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyLoad Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback ?? DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error?: Error }> = ({ error }) => (
  <div className="error-container" role="alert">
    <h3>Loading Error</h3>
    <p>Failed to load component. Please try again.</p>
    {error && <details>{error.message}</details>}
  </div>
);

// Lazy load wrapper with enhanced error handling and loading states
export const createLazyComponent = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options?: {
    name?: string;
    fallback?: ComponentType<{ name?: string }>;
    errorFallback?: ComponentType<{ error?: Error }>;
    preload?: boolean;
  }
) => {
  const LazyComponent = lazy(importFunc);

  // Preload if requested
  if (options?.preload) {
    importFunc().catch(console.error);
  }

  const WrappedComponent: React.FC<React.ComponentProps<T>> = (props) => {
    const LoadingComponent = options?.fallback ?? LoadingFallback;

    return (
      <LazyLoadErrorBoundary fallback={options?.errorFallback}>
        <Suspense fallback={<LoadingComponent name={options?.name} />}>
          <LazyComponent {...props} />
        </Suspense>
      </LazyLoadErrorBoundary>
    );
  };

  WrappedComponent.displayName = `LazyLoaded(${options?.name ?? 'Component'})`;

  return WrappedComponent;
};

// Preload function for manual preloading
export const preloadComponent = (importFunc: () => Promise<any>) => {
  return importFunc().catch(console.error);
};

// Hook for conditional lazy loading
export const useLazyLoad = (
  condition: boolean,
  importFunc: () => Promise<any>
) => {
  React.useEffect(() => {
    if (condition) {
      void preloadComponent(importFunc);
    }
  }, [condition, importFunc]);
};

// Main provider component
interface LazyLoadProviderProps {
  children: React.ReactNode;
  globalLoadingFallback?: ComponentType<{ name?: string }>;
  globalErrorFallback?: ComponentType<{ error?: Error }>;
}

export const LazyLoadProvider: React.FC<LazyLoadProviderProps> = ({
  children,
  globalLoadingFallback: _globalLoadingFallback,
  globalErrorFallback,
}) => {
  return (
    <LazyLoadErrorBoundary fallback={globalErrorFallback}>
      <div className="lazy-load-provider">
        {children}
      </div>
    </LazyLoadErrorBoundary>
  );
};

// Utility for batched preloading
export const preloadBatch = async (
  importFunctions: Array<() => Promise<any>>,
  options?: {
    sequential?: boolean;
    delay?: number;
  }
) => {
  if (options?.sequential) {
    for (const importFunc of importFunctions) {
      await preloadComponent(importFunc);
      if (options.delay) {
        await new Promise(resolve => setTimeout(resolve, options.delay));
      }
    }
  } else {
    await Promise.all(importFunctions.map(preloadComponent));
  }
};

// Performance monitoring hook
export const useLazyLoadPerformance = (componentName: string) => {
  const [loadTime, setLoadTime] = React.useState<number | null>(null);
  const startTimeRef = React.useRef<number>();

  React.useEffect(() => {
    startTimeRef.current = performance.now();
    
    return () => {
      if (startTimeRef.current) {
        const duration = performance.now() - startTimeRef.current;
        setLoadTime(duration);
        
        // Log performance metrics
        if (duration > 1000) {
          console.warn(`LazyLoad: ${componentName} took ${duration.toFixed(2)}ms to load`);
        }
      }
    };
  }, [componentName]);

  return { loadTime };
};