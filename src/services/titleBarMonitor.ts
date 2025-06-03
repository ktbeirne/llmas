/**
 * TitleBarMonitor Service
 * MainWindow のタイトルバー監視・強制非表示システム
 */
import { errorHandler, ErrorCategory, ErrorSeverity } from './errorHandler';
import { logger, LogMethod } from './logger';

export class TitleBarMonitor {
    private isRunning = false;
    private monitorInterval: number | null = null;
    private frameCount = 0;
    
    // イベントリスナーの参照を保持（メモリリーク修正）
    private focusHandler: () => void;
    private blurHandler: () => void;
    private resizeHandler: () => void;
    
    constructor() {
        // イベントハンドラーをバインド（メモリリーク修正）
        this.focusHandler = this.forceTitleBarHiding.bind(this);
        this.blurHandler = this.forceTitleBarHiding.bind(this);
        this.resizeHandler = this.forceTitleBarHiding.bind(this);
    }
    
    @LogMethod('TitleBarMonitor')
    start() {
        try {
            if (this.isRunning) {
                logger.warn('TitleBarMonitor', 'start', 'Monitor already running, ignoring start request');
                return;
            }
            
            this.isRunning = true;
            logger.info('TitleBarMonitor', 'start', 'Starting titlebar monitoring...');
            
            // 軽量な監視（2秒間隔）
            this.monitorInterval = window.setInterval(() => {
                this.checkAndHideTitleBar();
            }, 2000);
            
            // フォーカス・ブラーイベントでも強制実行（メモリリーク修正：参照を保存）
            window.addEventListener('focus', this.focusHandler);
            window.addEventListener('blur', this.blurHandler);
            window.addEventListener('resize', this.resizeHandler);
            
            logger.info('TitleBarMonitor', 'start', 'Titlebar monitoring started successfully');
        } catch (error) {
            this.isRunning = false;
            errorHandler.reportUIError(error as Error, 'TitleBarMonitor', 'start', {
                monitorInterval: this.monitorInterval
            });
            throw error;
        }
    }
    
    private checkAndHideTitleBar() {
        this.frameCount++;
        
        // DOMとウィンドウタイトルの確認・修正
        this.hideTitleElements();
        
        // 定期的にログ出力（デバッグ用）
        if (this.frameCount % 3600 === 0) { // 60秒に1回
            console.log(`[TitleBarMonitor] Active for ${this.frameCount} frames (${Math.round(this.frameCount / 60)} seconds)`);
        }
    }
    
    private hideTitleElements() {
        // document.title を空に
        if (document.title !== '') {
            document.title = '';
        }
        
        // 可能性のあるタイトルバー要素を非表示
        const titleElements = [
            'title',
            '[role="banner"]',
            '.titlebar',
            '.title-bar',
            '.window-title',
            'header'
        ];
        
        titleElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                const htmlElement = element as HTMLElement;
                if (htmlElement.style.display !== 'none') {
                    htmlElement.style.display = 'none';
                }
            });
        });
        
        // body やhtml の余計なマージン・パディングを削除
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.documentElement.style.margin = '0';
        document.documentElement.style.padding = '0';
        
        // -webkit-app-region を no-drag に強制設定
        document.body.style.webkitAppRegion = 'no-drag';
        document.documentElement.style.webkitAppRegion = 'no-drag';
    }
    
    private forceTitleBarHiding() {
        console.log('[TitleBarMonitor] Force hiding titlebar...');
        
        // より強力な非表示処理
        this.hideTitleElements();
        
        // Electron API経由でもタイトルを強制リセット
        if (window.electronAPI && window.electronAPI.logRendererMessage) {
            window.electronAPI.logRendererMessage('Force titlebar hiding requested from renderer');
        }
        
        // CSS強制適用
        const style = document.createElement('style');
        style.textContent = `
            * { -webkit-app-region: no-drag !important; }
            title, [role="banner"], .titlebar, .title-bar, .window-title { display: none !important; }
            body, html { margin: 0 !important; padding: 0 !important; }
        `;
        style.id = 'titlebar-killer';
        
        // 既存のスタイルがあれば削除してから追加
        const existingStyle = document.getElementById('titlebar-killer');
        if (existingStyle) {
            existingStyle.remove();
        }
        document.head.appendChild(style);
    }
    
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        // インターバルのクリア
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        
        // イベントリスナーの削除（メモリリーク修正）
        window.removeEventListener('focus', this.focusHandler);
        window.removeEventListener('blur', this.blurHandler);
        window.removeEventListener('resize', this.resizeHandler);
        
        console.log('[TitleBarMonitor] Titlebar monitoring stopped and event listeners removed.');
    }
}

export function createTitleBarMonitor(): TitleBarMonitor {
    return new TitleBarMonitor();
}