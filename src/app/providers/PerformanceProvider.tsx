/**
 * PerformanceProvider - FSD Phase 3 Performance Optimization
 * メモリ使用量とレンダリングパフォーマンス最適化
 */

import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';

// Performance monitoring interface
interface PerformanceMetrics {
  memoryUsage: number;
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
}

interface PerformanceContextType {
  metrics: PerformanceMetrics;
  trackRender: (componentName: string) => void;
  trackMemory: () => void;
  optimizeComponent: <T>(component: React.ComponentType<T>) => React.ComponentType<T>;
  createMemoizedCallback: <T extends any[], R>(
    callback: (...args: T) => R,
    deps: React.DependencyList
  ) => (...args: T) => R;
  createMemoizedValue: <T>(factory: () => T, deps: React.DependencyList) => T;
}

const PerformanceContext = createContext<PerformanceContextType | null>(null);

// Memory cleanup utilities
class MemoryManager {
  private cleanupTasks: Set<() => void> = new Set();
  private intervalIds: Set<NodeJS.Timeout> = new Set();
  private timeoutIds: Set<NodeJS.Timeout> = new Set();
  private eventListeners: Set<{ element: EventTarget; type: string; listener: EventListener }> = new Set();

  addCleanupTask(task: () => void): void {
    this.cleanupTasks.add(task);
  }

  removeCleanupTask(task: () => void): void {
    this.cleanupTasks.delete(task);
  }

  registerInterval(id: NodeJS.Timeout): void {
    this.intervalIds.add(id);
  }

  registerTimeout(id: NodeJS.Timeout): void {
    this.timeoutIds.add(id);
  }

  registerEventListener(element: EventTarget, type: string, listener: EventListener): void {
    this.eventListeners.add({ element, type, listener });
    element.addEventListener(type, listener);
  }

  cleanup(): void {
    // Clear all intervals
    this.intervalIds.forEach(id => clearInterval(id));
    this.intervalIds.clear();

    // Clear all timeouts
    this.timeoutIds.forEach(id => clearTimeout(id));
    this.timeoutIds.clear();

    // Remove all event listeners
    this.eventListeners.forEach(({ element, type, listener }) => {
      element.removeEventListener(type, listener);
    });
    this.eventListeners.clear();

    // Run cleanup tasks
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('Cleanup task error:', error);
      }
    });
    this.cleanupTasks.clear();
  }
}

// Performance optimization HOC
export const withPerformanceOptimization = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    memo?: boolean;
    displayName?: string;
    areEqual?: (prevProps: P, nextProps: P) => boolean;
  }
) => {
  const OptimizedComponent = options?.memo !== false 
    ? React.memo(Component, options?.areEqual)
    : Component;

  const PerformanceWrappedComponent: React.FC<P> = (props) => {
    const { trackRender } = usePerformance();
    const renderStart = useRef<number>();

    useEffect(() => {
      renderStart.current = performance.now();
    });

    useEffect(() => {
      if (renderStart.current) {
        const renderTime = performance.now() - renderStart.current;
        trackRender(options?.displayName || Component.displayName || Component.name);
        
        if (renderTime > 16) { // 60fps threshold
          console.warn(`Slow render detected: ${Component.name} took ${renderTime.toFixed(2)}ms`);
        }
      }
    });

    return <OptimizedComponent {...props} />;
  };

  PerformanceWrappedComponent.displayName = `PerformanceOptimized(${
    options?.displayName || Component.displayName || Component.name
  })`;

  return PerformanceWrappedComponent;
};

// Custom hooks for performance optimization
export const usePerformanceOptimizedCallback = <T extends any[], R>(
  callback: (...args: T) => R,
  deps: React.DependencyList
): ((...args: T) => R) => {
  return useCallback(callback, deps);
};

export const usePerformanceOptimizedMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  return React.useMemo(factory, deps);
};

export const useMemoryManager = (): MemoryManager => {
  const managerRef = useRef<MemoryManager>();
  
  if (!managerRef.current) {
    managerRef.current = new MemoryManager();
  }

  useEffect(() => {
    return () => {
      managerRef.current?.cleanup();
    };
  }, []);

  return managerRef.current;
};

// Performance monitoring hook
export const useRenderPerformance = (componentName: string) => {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const lastRenderTime = useRef<number>();

  useEffect(() => {
    renderCount.current += 1;
    const now = performance.now();
    
    if (lastRenderTime.current) {
      const renderTime = now - lastRenderTime.current;
      renderTimes.current.push(renderTime);
      
      // Keep only last 10 render times
      if (renderTimes.current.length > 10) {
        renderTimes.current.shift();
      }
    }
    
    lastRenderTime.current = now;
  });

  const getAverageRenderTime = useCallback(() => {
    if (renderTimes.current.length === 0) return 0;
    return renderTimes.current.reduce((sum, time) => sum + time, 0) / renderTimes.current.length;
  }, []);

  return {
    renderCount: renderCount.current,
    averageRenderTime: getAverageRenderTime(),
    lastRenderTime: lastRenderTime.current || 0,
  };
};

// Main provider component
interface PerformanceProviderProps {
  children: React.ReactNode;
  enableMonitoring?: boolean;
}

export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({
  children,
  enableMonitoring = true,
}) => {
  const metricsRef = useRef<PerformanceMetrics>({
    memoryUsage: 0,
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
  });

  const renderTimesRef = useRef<number[]>([]);
  const memoryManager = useRef(new MemoryManager());

  const trackRender = useCallback((componentName: string) => {
    if (!enableMonitoring) return;

    metricsRef.current.renderCount += 1;
    const now = performance.now();
    
    if (metricsRef.current.lastRenderTime) {
      const renderTime = now - metricsRef.current.lastRenderTime;
      renderTimesRef.current.push(renderTime);
      
      if (renderTimesRef.current.length > 50) {
        renderTimesRef.current.shift();
      }
      
      metricsRef.current.averageRenderTime = 
        renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length;
    }
    
    metricsRef.current.lastRenderTime = now;
  }, [enableMonitoring]);

  const trackMemory = useCallback(() => {
    if (!enableMonitoring || !(performance as any).memory) return;

    const memory = (performance as any).memory;
    metricsRef.current.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
    
    if (metricsRef.current.memoryUsage > 100) { // 100MB threshold
      console.warn(`High memory usage detected: ${metricsRef.current.memoryUsage.toFixed(2)}MB`);
    }
  }, [enableMonitoring]);

  const optimizeComponent = useCallback(<T extends object>(
    component: React.ComponentType<T>
  ): React.ComponentType<T> => {
    return withPerformanceOptimization(component);
  }, []);

  const createMemoizedCallback = useCallback(<T extends any[], R>(
    callback: (...args: T) => R,
    deps: React.DependencyList
  ) => {
    return usePerformanceOptimizedCallback(callback, deps);
  }, []);

  const createMemoizedValue = useCallback(<T>(
    factory: () => T,
    deps: React.DependencyList
  ) => {
    return usePerformanceOptimizedMemo(factory, deps);
  }, []);

  // Memory monitoring
  useEffect(() => {
    if (!enableMonitoring) return;

    const interval = setInterval(() => {
      trackMemory();
    }, 5000); // Check every 5 seconds

    memoryManager.current.registerInterval(interval);

    return () => {
      memoryManager.current.cleanup();
    };
  }, [enableMonitoring, trackMemory]);

  const contextValue: PerformanceContextType = {
    metrics: metricsRef.current,
    trackRender,
    trackMemory,
    optimizeComponent,
    createMemoizedCallback,
    createMemoizedValue,
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
};

// Hook to use performance context
export const usePerformance = (): PerformanceContextType => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};

// Development-only performance debugging
export const usePerformanceDebug = (componentName: string) => {
  const { metrics } = usePerformance();
  const renderPerf = useRenderPerformance(componentName);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance Debug [${componentName}]:`, {
        ...renderPerf,
        globalMetrics: metrics,
      });
    }
  }, [componentName, renderPerf, metrics]);
};