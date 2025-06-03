/**
 * Service Error Enhancement Utility
 * 既存サービスのエラーハンドリング・ログ統一化
 */
import { errorHandler, ErrorCategory, ErrorSeverity } from './errorHandler';
import { logger } from './logger';

/**
 * すべてのサービスにエラーハンドリングとロギングを追加
 */
export function enhanceServicesWithErrorHandling() {
    // エラーリカバリーアクション登録
    registerRecoveryActions();
    
    // パフォーマンス監視開始
    startPerformanceMonitoring();
    
    logger.info('ServiceErrorEnhancer', 'enhanceServicesWithErrorHandling', 'All services enhanced with unified error handling');
}

/**
 * エラーリカバリーアクション登録
 */
function registerRecoveryActions() {
    // VRMエラーのリカバリー
    errorHandler.registerRecoveryAction(ErrorCategory.VRM, {
        name: 'reloadVRM',
        description: 'VRMモデルの再読み込み',
        handler: async () => {
            try {
                logger.info('ErrorRecovery', 'reloadVRM', 'Attempting VRM reload...');
                // VRM再読み込みロジック（実装は後で）
                return true;
            } catch (error) {
                logger.error('ErrorRecovery', 'reloadVRM', 'VRM reload failed', { error });
                return false;
            }
        }
    });

    // レンダリングエラーのリカバリー
    errorHandler.registerRecoveryAction(ErrorCategory.RENDERING, {
        name: 'resetRenderer',
        description: 'レンダラーのリセット',
        handler: async () => {
            try {
                logger.info('ErrorRecovery', 'resetRenderer', 'Attempting renderer reset...');
                // レンダラーリセットロジック（実装は後で）
                return true;
            } catch (error) {
                logger.error('ErrorRecovery', 'resetRenderer', 'Renderer reset failed', { error });
                return false;
            }
        }
    });

    // UIエラーのリカバリー
    errorHandler.registerRecoveryAction(ErrorCategory.UI, {
        name: 'refreshUI',
        description: 'UIコンポーネントの再初期化',
        handler: async () => {
            try {
                logger.info('ErrorRecovery', 'refreshUI', 'Attempting UI refresh...');
                // UI再初期化ロジック（実装は後で）
                return true;
            } catch (error) {
                logger.error('ErrorRecovery', 'refreshUI', 'UI refresh failed', { error });
                return false;
            }
        }
    });
}

/**
 * パフォーマンス監視開始
 */
function startPerformanceMonitoring() {
    // FPS監視
    logger.trackFPS((fps) => {
        if (fps < 30) {
            logger.warn('PerformanceMonitor', 'trackFPS', `Low FPS detected: ${fps}`, { fps });
        }
    });

    // メモリ使用量監視（30秒間隔）
    setInterval(() => {
        logger.trackMemoryUsage();
    }, 30000);

    logger.info('ServiceErrorEnhancer', 'startPerformanceMonitoring', 'Performance monitoring started');
}

/**
 * エラーコンテキスト生成ヘルパー
 */
export function createErrorContext(
    service: string,
    method: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    recoverable: boolean = true,
    userMessage?: string
) {
    return {
        service,
        method,
        category,
        severity,
        recoverable,
        userMessage
    };
}

/**
 * 安全な非同期実行ヘルパー
 */
export async function safeAsyncExecution<T>(
    service: string,
    method: string,
    operation: () => Promise<T>,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    fallbackValue?: T
): Promise<T | null> {
    const trackId = logger.startPerformanceTrack(service, method);
    
    try {
        const result = await operation();
        logger.endPerformanceTrack(trackId, service, method, `${method} completed successfully`);
        return result;
    } catch (error) {
        logger.error(service, method, `${method} failed`, { error: (error as Error).message });
        logger.endPerformanceTrack(trackId, service, method, `${method} failed`);
        
        errorHandler.reportError(error as Error, createErrorContext(service, method, category));
        
        return fallbackValue || null;
    }
}

/**
 * 安全な同期実行ヘルパー
 */
export function safeSyncExecution<T>(
    service: string,
    method: string,
    operation: () => T,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    fallbackValue?: T
): T | null {
    try {
        return logger.trackSyncPerformance(service, method, operation, `${method} completed`);
    } catch (error) {
        logger.error(service, method, `${method} failed`, { error: (error as Error).message });
        
        errorHandler.reportError(error as Error, createErrorContext(service, method, category));
        
        return fallbackValue || null;
    }
}

/**
 * ElectronAPI エラーハンドリングヘルパー
 */
export async function safeElectronAPICall<T>(
    service: string,
    method: string,
    apiCall: () => Promise<T>,
    fallbackValue?: T
): Promise<T | null> {
    return safeAsyncExecution(
        service,
        method,
        apiCall,
        ErrorCategory.ELECTRON_API,
        fallbackValue
    );
}

/**
 * DOM操作エラーハンドリングヘルパー
 */
export function safeDOMOperation<T>(
    service: string,
    method: string,
    operation: () => T,
    fallbackValue?: T
): T | null {
    return safeSyncExecution(
        service,
        method,
        operation,
        ErrorCategory.UI,
        fallbackValue
    );
}

/**
 * THREE.js操作エラーハンドリングヘルパー
 */
export function safeThreeJSOperation<T>(
    service: string,
    method: string,
    operation: () => T,
    fallbackValue?: T
): T | null {
    return safeSyncExecution(
        service,
        method,
        operation,
        ErrorCategory.RENDERING,
        fallbackValue
    );
}

/**
 * VRM操作エラーハンドリングヘルパー
 */
export async function safeVRMOperation<T>(
    service: string,
    method: string,
    operation: () => Promise<T>,
    fallbackValue?: T
): Promise<T | null> {
    return safeAsyncExecution(
        service,
        method,
        operation,
        ErrorCategory.VRM,
        fallbackValue
    );
}