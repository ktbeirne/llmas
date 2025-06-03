/**
 * Recovery Manager Service
 * エラーリカバリーメカニズムの実装
 */
import { errorHandler, ErrorCategory, ErrorReport } from './errorHandler';
import { logger } from './logger';

export interface RecoveryStrategy {
  name: string;
  category: ErrorCategory;
  priority: number;
  maxAttempts: number;
  cooldownMs: number;
  handler: () => Promise<boolean>;
  validator?: () => Promise<boolean>;
  description: string;
}

export interface RecoveryAttempt {
  strategyName: string;
  timestamp: Date;
  success: boolean;
  errorId?: string;
  duration: number;
}

export class RecoveryManager {
  private static instance: RecoveryManager | null = null;
  private strategies: Map<ErrorCategory, RecoveryStrategy[]> = new Map();
  private attempts: RecoveryAttempt[] = [];
  private cooldowns: Map<string, number> = new Map();
  private maxAttemptsPerStrategy = 3;
  private maxAttemptsHistory = 100;

  private constructor() {
    this.registerDefaultStrategies();
    this.setupErrorListener();
  }

  static getInstance(): RecoveryManager {
    if (!this.instance) {
      this.instance = new RecoveryManager();
    }
    return this.instance;
  }

  /**
   * リカバリー戦略登録
   */
  registerStrategy(strategy: RecoveryStrategy): void {
    const category = strategy.category;
    if (!this.strategies.has(category)) {
      this.strategies.set(category, []);
    }
    
    const strategies = this.strategies.get(category)!;
    strategies.push(strategy);
    
    // 優先度順にソート
    strategies.sort((a, b) => b.priority - a.priority);
    
    logger.info('RecoveryManager', 'registerStrategy', `Recovery strategy registered: ${strategy.name}`, {
      category: strategy.category,
      priority: strategy.priority
    });
  }

  /**
   * エラーレポートに基づく自動リカバリー実行
   */
  async attemptRecovery(errorReport: ErrorReport): Promise<boolean> {
    const { category } = errorReport.context;
    const strategies = this.strategies.get(category);
    
    if (!strategies || strategies.length === 0) {
      logger.warn('RecoveryManager', 'attemptRecovery', `No recovery strategies found for category: ${category}`);
      return false;
    }

    logger.info('RecoveryManager', 'attemptRecovery', `Starting recovery for ${category} error`, {
      errorId: errorReport.id,
      availableStrategies: strategies.length
    });

    for (const strategy of strategies) {
      if (this.shouldSkipStrategy(strategy)) {
        logger.debug('RecoveryManager', 'attemptRecovery', `Skipping strategy ${strategy.name} due to cooldown or max attempts`);
        continue;
      }

      const success = await this.executeStrategy(strategy, errorReport.id);
      if (success) {
        logger.info('RecoveryManager', 'attemptRecovery', `Recovery successful with strategy: ${strategy.name}`);
        return true;
      }
    }

    logger.warn('RecoveryManager', 'attemptRecovery', `All recovery strategies failed for ${category} error`);
    return false;
  }

  /**
   * 手動リカバリー実行
   */
  async executeManualRecovery(categoryOrStrategyName: ErrorCategory | string): Promise<boolean> {
    let strategies: RecoveryStrategy[] = [];

    if (typeof categoryOrStrategyName === 'string') {
      // 戦略名で検索
      for (const categoryStrategies of this.strategies.values()) {
        const found = categoryStrategies.find(s => s.name === categoryOrStrategyName);
        if (found) {
          strategies = [found];
          break;
        }
      }
    } else {
      // カテゴリで検索
      strategies = this.strategies.get(categoryOrStrategyName) || [];
    }

    if (strategies.length === 0) {
      logger.error('RecoveryManager', 'executeManualRecovery', `No strategies found for: ${categoryOrStrategyName}`);
      return false;
    }

    for (const strategy of strategies) {
      const success = await this.executeStrategy(strategy);
      if (success) {
        logger.info('RecoveryManager', 'executeManualRecovery', `Manual recovery successful: ${strategy.name}`);
        return true;
      }
    }

    return false;
  }

  /**
   * リカバリー統計取得
   */
  getRecoveryStats(): Record<string, any> {
    const stats = {
      totalAttempts: this.attempts.length,
      successfulAttempts: this.attempts.filter(a => a.success).length,
      failedAttempts: this.attempts.filter(a => !a.success).length,
      averageDuration: 0,
      byStrategy: {} as Record<string, any>,
      recentAttempts: this.attempts.slice(-10)
    };

    if (this.attempts.length > 0) {
      stats.averageDuration = this.attempts.reduce((sum, a) => sum + a.duration, 0) / this.attempts.length;
    }

    // 戦略別統計
    const strategyStats = new Map<string, { attempts: number; successes: number; avgDuration: number }>();
    
    for (const attempt of this.attempts) {
      if (!strategyStats.has(attempt.strategyName)) {
        strategyStats.set(attempt.strategyName, { attempts: 0, successes: 0, avgDuration: 0 });
      }
      
      const stat = strategyStats.get(attempt.strategyName)!;
      stat.attempts++;
      if (attempt.success) stat.successes++;
      stat.avgDuration = (stat.avgDuration * (stat.attempts - 1) + attempt.duration) / stat.attempts;
    }

    stats.byStrategy = Object.fromEntries(strategyStats);
    return stats;
  }

  /**
   * 利用可能な戦略一覧取得
   */
  getAvailableStrategies(): Record<ErrorCategory, RecoveryStrategy[]> {
    return Object.fromEntries(this.strategies);
  }

  /**
   * リカバリー履歴クリア
   */
  clearHistory(): void {
    this.attempts = [];
    this.cooldowns.clear();
    logger.info('RecoveryManager', 'clearHistory', 'Recovery history cleared');
  }

  private setupErrorListener(): void {
    errorHandler.onError(async (report) => {
      if (report.context.recoverable) {
        logger.info('RecoveryManager', 'onError', `Auto-recovery triggered for ${report.context.category} error`);
        await this.attemptRecovery(report);
      }
    });
  }

  private shouldSkipStrategy(strategy: RecoveryStrategy): boolean {
    const now = Date.now();
    const cooldownKey = strategy.name;
    
    // クールダウンチェック
    const lastAttempt = this.cooldowns.get(cooldownKey);
    if (lastAttempt && (now - lastAttempt) < strategy.cooldownMs) {
      return true;
    }

    // 最大試行回数チェック
    const recentAttempts = this.attempts
      .filter(a => a.strategyName === strategy.name)
      .filter(a => (now - a.timestamp.getTime()) < strategy.cooldownMs);
    
    return recentAttempts.length >= strategy.maxAttempts;
  }

  private async executeStrategy(strategy: RecoveryStrategy, errorId?: string): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      logger.info('RecoveryManager', 'executeStrategy', `Executing recovery strategy: ${strategy.name}`);
      
      // バリデーション実行（事前チェック）
      if (strategy.validator) {
        const isValid = await strategy.validator();
        if (!isValid) {
          logger.warn('RecoveryManager', 'executeStrategy', `Strategy ${strategy.name} validation failed`);
          return false;
        }
      }

      // リカバリー実行
      const success = await strategy.handler();
      const duration = performance.now() - startTime;
      
      // 試行履歴記録
      this.recordAttempt({
        strategyName: strategy.name,
        timestamp: new Date(),
        success,
        errorId,
        duration
      });

      // クールダウン設定
      this.cooldowns.set(strategy.name, Date.now());

      if (success) {
        logger.info('RecoveryManager', 'executeStrategy', `Strategy ${strategy.name} completed successfully`, {
          duration: `${duration.toFixed(2)}ms`
        });
      } else {
        logger.warn('RecoveryManager', 'executeStrategy', `Strategy ${strategy.name} failed`, {
          duration: `${duration.toFixed(2)}ms`
        });
      }

      return success;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      logger.error('RecoveryManager', 'executeStrategy', `Strategy ${strategy.name} threw error`, {
        error: (error as Error).message,
        duration: `${duration.toFixed(2)}ms`
      });

      this.recordAttempt({
        strategyName: strategy.name,
        timestamp: new Date(),
        success: false,
        errorId,
        duration
      });

      return false;
    }
  }

  private recordAttempt(attempt: RecoveryAttempt): void {
    this.attempts.push(attempt);
    
    // 履歴サイズ制限
    if (this.attempts.length > this.maxAttemptsHistory) {
      this.attempts = this.attempts.slice(-this.maxAttemptsHistory);
    }
  }

  private registerDefaultStrategies(): void {
    // VRMリカバリー戦略
    this.registerStrategy({
      name: 'vrm-reload',
      category: ErrorCategory.VRM,
      priority: 100,
      maxAttempts: 3,
      cooldownMs: 30000, // 30秒
      description: 'VRMモデルの再読み込み',
      handler: async () => {
        // VRM再読み込みロジック（実装は後で）
        logger.info('RecoveryManager', 'vrm-reload', 'Attempting VRM reload...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // 模擬処理
        return Math.random() > 0.3; // 70%の成功率
      },
      validator: async () => {
        // VRMファイルの存在チェックなど
        return true;
      }
    });

    // レンダリングリカバリー戦略
    this.registerStrategy({
      name: 'renderer-reset',
      category: ErrorCategory.RENDERING,
      priority: 90,
      maxAttempts: 2,
      cooldownMs: 15000, // 15秒
      description: 'レンダラーのリセット',
      handler: async () => {
        logger.info('RecoveryManager', 'renderer-reset', 'Attempting renderer reset...');
        await new Promise(resolve => setTimeout(resolve, 500));
        return Math.random() > 0.2; // 80%の成功率
      }
    });

    // UIリカバリー戦略
    this.registerStrategy({
      name: 'ui-refresh',
      category: ErrorCategory.UI,
      priority: 80,
      maxAttempts: 5,
      cooldownMs: 5000, // 5秒
      description: 'UIコンポーネントの再初期化',
      handler: async () => {
        logger.info('RecoveryManager', 'ui-refresh', 'Attempting UI refresh...');
        await new Promise(resolve => setTimeout(resolve, 200));
        return Math.random() > 0.1; // 90%の成功率
      }
    });

    // システムリカバリー戦略
    this.registerStrategy({
      name: 'system-gc',
      category: ErrorCategory.SYSTEM,
      priority: 70,
      maxAttempts: 1,
      cooldownMs: 60000, // 60秒
      description: 'ガベージコレクション強制実行',
      handler: async () => {
        logger.info('RecoveryManager', 'system-gc', 'Attempting garbage collection...');
        if ((window as any).gc) {
          (window as any).gc();
        }
        return true;
      }
    });

    logger.info('RecoveryManager', 'registerDefaultStrategies', 'Default recovery strategies registered');
  }
}

// Export singleton instance
export const recoveryManager = RecoveryManager.getInstance();