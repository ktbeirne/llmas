/**
 * Unified Logging System
 * アプリケーション全体のログ出力統一化とパフォーマンス監視
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  service: string;
  method: string;
  message: string;
  metadata?: Record<string, any>;
  performance?: PerformanceMetric;
  stack?: string;
}

export interface PerformanceMetric {
  duration: number;
  memoryUsage?: number;
  renderTime?: number;
  fps?: number;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxEntries: number;
  enablePerformanceTracking: boolean;
}

export class UnifiedLogger {
  private static instance: UnifiedLogger | null = null;
  private logEntries: LogEntry[] = [];
  private config: LoggerConfig;
  private performanceMarks: Map<string, number> = new Map();

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableStorage: true,
      maxEntries: 1000,
      enablePerformanceTracking: true,
      ...config
    };
  }

  static getInstance(config?: Partial<LoggerConfig>): UnifiedLogger {
    if (!this.instance) {
      this.instance = new UnifiedLogger(config);
    }
    return this.instance;
  }

  /**
   * デバッグレベルログ
   */
  debug(service: string, method: string, message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, service, method, message, metadata);
  }

  /**
   * 情報レベルログ
   */
  info(service: string, method: string, message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, service, method, message, metadata);
  }

  /**
   * 警告レベルログ
   */
  warn(service: string, method: string, message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, service, method, message, metadata);
  }

  /**
   * エラーレベルログ
   */
  error(service: string, method: string, message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, service, method, message, metadata);
  }

  /**
   * クリティカルレベルログ
   */
  critical(service: string, method: string, message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.CRITICAL, service, method, message, metadata);
  }

  /**
   * パフォーマンス測定開始
   */
  startPerformanceTrack(service: string, method: string): string {
    if (!this.config.enablePerformanceTracking) return '';
    
    const key = `${service}:${method}:${Date.now()}`;
    this.performanceMarks.set(key, performance.now());
    return key;
  }

  /**
   * パフォーマンス測定終了
   */
  endPerformanceTrack(trackId: string, service: string, method: string, message?: string): void {
    if (!this.config.enablePerformanceTracking || !trackId) return;

    const startTime = this.performanceMarks.get(trackId);
    if (!startTime) return;

    const duration = performance.now() - startTime;
    this.performanceMarks.delete(trackId);

    const performanceMetric: PerformanceMetric = {
      duration,
      memoryUsage: this.getMemoryUsage(),
      fps: this.getCurrentFPS()
    };

    this.log(LogLevel.INFO, service, method, message || 'Performance tracking', undefined, performanceMetric);
  }

  /**
   * パフォーマンス測定付きメソッド実行
   */
  async trackPerformance<T>(
    service: string,
    method: string,
    fn: () => Promise<T>,
    message?: string
  ): Promise<T> {
    const trackId = this.startPerformanceTrack(service, method);
    try {
      const result = await fn();
      this.endPerformanceTrack(trackId, service, method, message || `${method} completed`);
      return result;
    } catch (error) {
      this.endPerformanceTrack(trackId, service, method, message || `${method} failed`);
      throw error;
    }
  }

  /**
   * 同期メソッドのパフォーマンス測定
   */
  trackSyncPerformance<T>(
    service: string,
    method: string,
    fn: () => T,
    message?: string
  ): T {
    const trackId = this.startPerformanceTrack(service, method);
    try {
      const result = fn();
      this.endPerformanceTrack(trackId, service, method, message || `${method} completed`);
      return result;
    } catch (error) {
      this.endPerformanceTrack(trackId, service, method, message || `${method} failed`);
      throw error;
    }
  }

  /**
   * FPS監視
   */
  trackFPS(callback?: (fps: number) => void): () => void {
    let lastTime = performance.now();
    let frameCount = 0;
    let running = true;

    const track = () => {
      if (!running) return;
      
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        this.log(LogLevel.DEBUG, 'PerformanceMonitor', 'FPS', 'Frame rate measurement', { fps });
        
        if (callback) callback(fps);
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(track);
    };

    requestAnimationFrame(track);
    
    return () => { running = false; };
  }

  /**
   * メモリ使用量監視
   */
  trackMemoryUsage(): void {
    const memoryInfo = this.getMemoryUsage();
    if (memoryInfo) {
      this.log(LogLevel.DEBUG, 'PerformanceMonitor', 'Memory', 'Memory usage measurement', memoryInfo);
    }
  }

  /**
   * ログエントリ取得
   */
  getLogs(
    level?: LogLevel,
    service?: string,
    limit?: number
  ): LogEntry[] {
    let logs = [...this.logEntries];

    if (level !== undefined) {
      logs = logs.filter(entry => entry.level >= level);
    }

    if (service) {
      logs = logs.filter(entry => entry.service === service);
    }

    logs = logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (limit) {
      logs = logs.slice(0, limit);
    }

    return logs;
  }

  /**
   * パフォーマンス統計取得
   */
  getPerformanceStats(service?: string): Record<string, any> {
    const performanceLogs = this.logEntries.filter(entry => 
      entry.performance && (!service || entry.service === service)
    );

    if (performanceLogs.length === 0) return {};

    const durations = performanceLogs.map(entry => entry.performance!.duration);
    const memoryUsages = performanceLogs
      .map(entry => entry.performance!.memoryUsage)
      .filter(Boolean) as number[];

    return {
      totalMeasurements: performanceLogs.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      averageMemoryUsage: memoryUsages.length > 0 
        ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length 
        : null,
      service: service || 'all'
    };
  }

  /**
   * ログレベル設定
   */
  setLogLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * ログクリア
   */
  clearLogs(): void {
    this.logEntries = [];
  }

  /**
   * ログエクスポート
   */
  exportLogs(): string {
    return JSON.stringify(this.logEntries, null, 2);
  }

  private log(
    level: LogLevel,
    service: string,
    method: string,
    message: string,
    metadata?: Record<string, any>,
    performance?: PerformanceMetric
  ): void {
    // レベルフィルタリング
    if (level < this.config.level) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      service,
      method,
      message,
      metadata,
      performance,
      stack: level >= LogLevel.ERROR ? new Error().stack : undefined
    };

    this.addLogEntry(entry);

    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    if (this.config.enableStorage) {
      this.logToStorage(entry);
    }
  }

  private addLogEntry(entry: LogEntry): void {
    this.logEntries.push(entry);

    // 最大エントリ数制限
    if (this.logEntries.length > this.config.maxEntries) {
      this.logEntries = this.logEntries.slice(-this.config.maxEntries);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const prefix = `[${entry.service}:${entry.method}]`;
    const timestamp = entry.timestamp.toISOString();
    const levelIcon = this.getLevelIcon(entry.level);
    
    const logMessage = `${levelIcon} ${timestamp} ${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, entry.metadata);
        break;
      case LogLevel.INFO:
        console.info(logMessage, entry.metadata);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, entry.metadata);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(logMessage, entry.metadata);
        break;
    }

    if (entry.performance) {
      console.groupCollapsed(`${prefix} Performance`);
      console.table(entry.performance);
      console.groupEnd();
    }
  }

  private logToStorage(entry: LogEntry): void {
    try {
      const key = `app_logs_${new Date().toDateString()}`;
      const existing = localStorage.getItem(key);
      const logs = existing ? JSON.parse(existing) : [];
      logs.push(entry);
      
      // 1日分のログのみ保持
      if (logs.length > 500) {
        logs.splice(0, logs.length - 500);
      }
      
      localStorage.setItem(key, JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to store log to localStorage:', error);
    }
  }

  private getLevelIcon(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '🔍';
      case LogLevel.INFO: return 'ℹ️';
      case LogLevel.WARN: return '⚠️';
      case LogLevel.ERROR: return '❌';
      case LogLevel.CRITICAL: return '💥';
      default: return '📝';
    }
  }

  private getMemoryUsage(): number | undefined {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize;
    }
    return undefined;
  }

  private getCurrentFPS(): number | undefined {
    // FPSは別途trackFPSで測定される
    return undefined;
  }
}

// Export singleton instance
export const logger = UnifiedLogger.getInstance();

// Helper decorators for automatic logging
export function LogMethod(service: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const trackId = logger.startPerformanceTrack(service, propertyName);
      
      try {
        const result = method.apply(this, args);
        
        if (result instanceof Promise) {
          return result
            .then((value) => {
              logger.endPerformanceTrack(trackId, service, propertyName, `${propertyName} completed successfully`);
              return value;
            })
            .catch((error) => {
              logger.error(service, propertyName, `${propertyName} failed`, { error: error.message, args });
              logger.endPerformanceTrack(trackId, service, propertyName, `${propertyName} failed`);
              throw error;
            });
        } else {
          logger.endPerformanceTrack(trackId, service, propertyName, `${propertyName} completed successfully`);
          return result;
        }
      } catch (error) {
        logger.error(service, propertyName, `${propertyName} failed`, { error: (error as Error).message, args });
        logger.endPerformanceTrack(trackId, service, propertyName, `${propertyName} failed`);
        throw error;
      }
    };
  };
}