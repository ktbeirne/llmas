/**
 * TitleBarMonitor Service
 * MainWindow title bar monitoring and forced hiding system
 */
import { errorHandler, ErrorCategory, ErrorSeverity } from './errorHandler';
import { logger } from './logger';

export class TitleBarMonitor {
    private isRunning = false;
    private monitorInterval: number | null = null;
    private frameCount = 0;
    
    // Event listener references to prevent memory leaks
    private focusHandler: () => void;
    private blurHandler: () => void;
    private resizeHandler: () => void;

    constructor() {
        // Bind event handlers to prevent memory leaks
        this.focusHandler = this.forceTitleBarHiding.bind(this);
        this.blurHandler = this.forceTitleBarHiding.bind(this);
        this.resizeHandler = this.forceTitleBarHiding.bind(this);
    }
    
    start() {
        try {
            if (this.isRunning) {
                logger.warn('TitleBarMonitor', 'start', 'Monitor already running, ignoring start request');
                return;
            }

            this.isRunning = true;
            this.setupTitleBarMonitoring();
            logger.info('TitleBarMonitor', 'start', 'Title bar monitoring started successfully');
        } catch (error) {
            this.handleError(error, 'start');
        }
    }

    stop() {
        try {
            if (!this.isRunning) {
                logger.warn('TitleBarMonitor', 'stop', 'Monitor not running, ignoring stop request');
                return;
            }

            this.cleanup();
            logger.info('TitleBarMonitor', 'stop', 'Title bar monitoring stopped successfully');
        } catch (error) {
            this.handleError(error, 'stop');
        }
    }

    private setupTitleBarMonitoring() {
        this.monitorInterval = window.setInterval(() => {
            this.forceTitleBarHiding();
        }, 100) as unknown as number;

        // Add event listeners with bound handlers
        window.addEventListener('focus', this.focusHandler);
        window.addEventListener('blur', this.blurHandler);
        window.addEventListener('resize', this.resizeHandler);
    }

    private forceTitleBarHiding() {
        try {
            this.frameCount++;
            
            // Force titlebar hiding logic here
            if (this.frameCount % 10 === 0) {
                logger.debug('TitleBarMonitor', 'forceTitleBarHiding', `Frame count: ${this.frameCount}`);
            }
        } catch (error) {
            this.handleError(error, 'forceTitleBarHiding');
        }
    }

    private cleanup() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }

        // Remove event listeners using bound handlers
        window.removeEventListener('focus', this.focusHandler);
        window.removeEventListener('blur', this.blurHandler);
        window.removeEventListener('resize', this.resizeHandler);

        this.isRunning = false;
        this.frameCount = 0;
    }

    private handleError(error: unknown, method: string) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('TitleBarMonitor', method, `Error occurred: ${errorMessage}`);
        
        errorHandler({
            error: error instanceof Error ? error : new Error(errorMessage),
            context: { service: 'TitleBarMonitor', method },
            category: ErrorCategory.SERVICE,
            severity: ErrorSeverity.MEDIUM
        });
    }
}

// Factory function for dependency injection
export function createTitleBarMonitor(): TitleBarMonitor {
    return new TitleBarMonitor();
}