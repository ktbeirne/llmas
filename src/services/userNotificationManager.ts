/**
 * User Notification Manager
 * ユーザーフレンドリーエラーメッセージとUI通知システム
 */
import { ErrorReport, ErrorSeverity, ErrorCategory, errorHandler } from './errorHandler';
import { logger } from './logger';
import { recoveryManager } from './recoveryManager';

export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success'
}

export interface UserNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
  timestamp: Date;
  dismissed: boolean;
}

export interface NotificationAction {
  label: string;
  action: () => Promise<void> | void;
  style?: 'primary' | 'secondary' | 'danger';
}

export class UserNotificationManager {
  private static instance: UserNotificationManager | null = null;
  private notifications: UserNotification[] = [];
  private container: HTMLElement | null = null;
  private maxNotifications = 5;
  private defaultDuration = 5000;

  private constructor() {
    this.setupNotificationContainer();
    this.setupErrorListener();
  }

  static getInstance(): UserNotificationManager {
    if (!this.instance) {
      this.instance = new UserNotificationManager();
    }
    return this.instance;
  }

  /**
   * 一般的な通知表示
   */
  show(notification: Partial<UserNotification>): string {
    const fullNotification: UserNotification = {
      id: this.generateId(),
      type: NotificationType.INFO,
      title: 'お知らせ',
      message: '',
      duration: this.defaultDuration,
      actions: [],
      timestamp: new Date(),
      dismissed: false,
      ...notification
    };

    this.addNotification(fullNotification);
    this.renderNotification(fullNotification);

    logger.info('UserNotificationManager', 'show', `Notification displayed: ${fullNotification.title}`, {
      type: fullNotification.type,
      id: fullNotification.id
    });

    return fullNotification.id;
  }

  /**
   * 成功通知
   */
  showSuccess(title: string, message: string, duration?: number): string {
    return this.show({
      type: NotificationType.SUCCESS,
      title,
      message,
      duration
    });
  }

  /**
   * 情報通知
   */
  showInfo(title: string, message: string, duration?: number): string {
    return this.show({
      type: NotificationType.INFO,
      title,
      message,
      duration
    });
  }

  /**
   * 警告通知
   */
  showWarning(title: string, message: string, duration?: number): string {
    return this.show({
      type: NotificationType.WARNING,
      title,
      message,
      duration
    });
  }

  /**
   * エラー通知
   */
  showError(title: string, message: string, actions?: NotificationAction[]): string {
    return this.show({
      type: NotificationType.ERROR,
      title,
      message,
      duration: 0, // エラーは手動で閉じるまで表示
      actions
    });
  }

  /**
   * 通知削除
   */
  dismiss(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.dismissed = true;
      this.removeNotificationFromDOM(notificationId);
      logger.debug('UserNotificationManager', 'dismiss', `Notification dismissed: ${notificationId}`);
    }
  }

  /**
   * 全通知削除
   */
  dismissAll(): void {
    this.notifications.forEach(n => n.dismissed = true);
    if (this.container) {
      this.container.innerHTML = '';
    }
    logger.info('UserNotificationManager', 'dismissAll', 'All notifications dismissed');
  }

  /**
   * アクティブな通知取得
   */
  getActiveNotifications(): UserNotification[] {
    return this.notifications.filter(n => !n.dismissed);
  }

  /**
   * エラーレポートからユーザーフレンドリーメッセージ生成
   */
  showErrorFromReport(errorReport: ErrorReport): string {
    const userMessage = this.generateUserFriendlyMessage(errorReport);
    const actions = this.generateRecoveryActions(errorReport);

    return this.showError(
      this.getErrorTitle(errorReport),
      userMessage,
      actions
    );
  }

  private setupNotificationContainer(): void {
    // 通知コンテナが存在しない場合は作成
    this.container = document.getElementById('notification-container');
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.className = 'notification-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        width: 350px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }
  }

  private setupErrorListener(): void {
    errorHandler.onError((report) => {
      // クリティカルエラーまたはユーザーメッセージがある場合は通知表示
      if (report.context.severity >= ErrorSeverity.HIGH || report.context.userMessage) {
        this.showErrorFromReport(report);
      }
    });
  }

  private generateUserFriendlyMessage(errorReport: ErrorReport): string {
    const { context, error } = errorReport;
    
    // カスタムユーザーメッセージがある場合はそれを使用
    if (context.userMessage) {
      return context.userMessage;
    }

    // カテゴリ別のデフォルトメッセージ
    switch (context.category) {
      case ErrorCategory.VRM:
        return 'キャラクターの読み込みでエラーが発生しました。しばらくお待ちください。';
      
      case ErrorCategory.RENDERING:
        return '画面表示でエラーが発生しました。画面を更新してみてください。';
      
      case ErrorCategory.UI:
        return 'ユーザーインターフェースでエラーが発生しました。操作をやり直してください。';
      
      case ErrorCategory.NETWORK:
        return 'ネットワーク接続でエラーが発生しました。インターネット接続を確認してください。';
      
      case ErrorCategory.STORAGE:
        return 'データの保存でエラーが発生しました。ディスク容量を確認してください。';
      
      case ErrorCategory.ELECTRON_API:
        return 'アプリケーション機能でエラーが発生しました。アプリを再起動してみてください。';
      
      case ErrorCategory.SYSTEM:
        return 'システムエラーが発生しました。アプリを再起動してください。';
      
      default:
        return '予期しないエラーが発生しました。問題が続く場合は再起動してください。';
    }
  }

  private getErrorTitle(errorReport: ErrorReport): string {
    const { context } = errorReport;
    
    switch (context.severity) {
      case ErrorSeverity.LOW:
        return '軽微なエラー';
      case ErrorSeverity.MEDIUM:
        return 'エラーが発生しました';
      case ErrorSeverity.HIGH:
        return '重要なエラー';
      case ErrorSeverity.CRITICAL:
        return '致命的なエラー';
      default:
        return 'エラー';
    }
  }

  private generateRecoveryActions(errorReport: ErrorReport): NotificationAction[] {
    const actions: NotificationAction[] = [];

    // リカバリー可能な場合は自動修復ボタンを追加
    if (errorReport.context.recoverable) {
      actions.push({
        label: '自動修復を試す',
        style: 'primary',
        action: async () => {
          const success = await recoveryManager.attemptRecovery(errorReport);
          if (success) {
            this.showSuccess('修復完了', '問題が自動的に修復されました。');
          } else {
            this.showWarning('修復失敗', '自動修復に失敗しました。手動で対処してください。');
          }
        }
      });
    }

    // カテゴリ別の推奨アクション
    switch (errorReport.context.category) {
      case ErrorCategory.VRM:
        actions.push({
          label: 'VRM再読み込み',
          style: 'secondary',
          action: async () => {
            await recoveryManager.executeManualRecovery('vrm-reload');
          }
        });
        break;

      case ErrorCategory.RENDERING:
        actions.push({
          label: '画面更新',
          style: 'secondary',
          action: () => {
            window.location.reload();
          }
        });
        break;

      case ErrorCategory.SYSTEM:
        actions.push({
          label: 'アプリ再起動',
          style: 'danger',
          action: async () => {
            if (window.electronAPI?.quitApp) {
              window.electronAPI.quitApp();
            }
          }
        });
        break;
    }

    // デバッグ情報表示（開発時のみ）
    if (process.env.NODE_ENV === 'development') {
      actions.push({
        label: 'デバッグ情報',
        style: 'secondary',
        action: () => {
          console.group('Error Debug Information');
          console.log('Error Report:', errorReport);
          console.log('Error Stack:', errorReport.error.stack);
          console.groupEnd();
        }
      });
    }

    return actions;
  }

  private addNotification(notification: UserNotification): void {
    this.notifications.push(notification);

    // 最大数を超えた場合、古い通知を削除
    if (this.notifications.length > this.maxNotifications) {
      const oldNotifications = this.notifications.slice(0, this.notifications.length - this.maxNotifications);
      oldNotifications.forEach(n => this.dismiss(n.id));
      this.notifications = this.notifications.slice(-this.maxNotifications);
    }
  }

  private renderNotification(notification: UserNotification): void {
    if (!this.container) return;

    const element = this.createNotificationElement(notification);
    this.container.appendChild(element);

    // アニメーション
    requestAnimationFrame(() => {
      element.style.transform = 'translateX(0)';
      element.style.opacity = '1';
    });

    // 自動削除
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.dismiss(notification.id);
      }, notification.duration);
    }
  }

  private createNotificationElement(notification: UserNotification): HTMLElement {
    const element = document.createElement('div');
    element.className = `notification notification-${notification.type}`;
    element.dataset.id = notification.id;
    element.style.cssText = `
      background: ${this.getBackgroundColor(notification.type)};
      border: 1px solid ${this.getBorderColor(notification.type)};
      border-radius: 8px;
      margin-bottom: 10px;
      padding: 15px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s ease;
      pointer-events: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const icon = this.getIcon(notification.type);
    const closeButton = this.createCloseButton(notification.id);

    element.innerHTML = `
      <div style="display: flex; align-items: flex-start;">
        <span style="font-size: 20px; margin-right: 10px;">${icon}</span>
        <div style="flex: 1;">
          <div style="font-weight: bold; margin-bottom: 5px; color: #333;">${notification.title}</div>
          <div style="color: #666; font-size: 14px; line-height: 1.4;">${notification.message}</div>
          ${this.renderActions(notification.actions || [])}
        </div>
        ${closeButton}
      </div>
    `;

    return element;
  }

  private renderActions(actions: NotificationAction[]): string {
    if (actions.length === 0) return '';

    const actionButtons = actions.map(action => `
      <button 
        class="notification-action"
        data-style="${action.style || 'secondary'}"
        style="
          margin-right: 8px;
          margin-top: 8px;
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          background: ${this.getActionButtonColor(action.style)};
          color: white;
          transition: opacity 0.2s;
        "
        onmouseover="this.style.opacity='0.8'"
        onmouseout="this.style.opacity='1'"
      >
        ${action.label}
      </button>
    `).join('');

    setTimeout(() => {
      actions.forEach((action, index) => {
        const button = document.querySelectorAll('.notification-action')[index] as HTMLButtonElement;
        if (button) {
          button.addEventListener('click', async () => {
            try {
              await action.action();
            } catch (error) {
              logger.error('UserNotificationManager', 'actionClick', 'Notification action failed', { error });
            }
          });
        }
      });
    }, 0);

    return `<div style="margin-top: 8px;">${actionButtons}</div>`;
  }

  private createCloseButton(notificationId: string): string {
    setTimeout(() => {
      const closeBtn = document.querySelector(`[data-id="${notificationId}"] .close-btn`) as HTMLButtonElement;
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.dismiss(notificationId));
      }
    }, 0);

    return `
      <button 
        class="close-btn"
        style="
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #999;
          padding: 0;
          margin-left: 10px;
          transition: color 0.2s;
        "
        onmouseover="this.style.color='#333'"
        onmouseout="this.style.color='#999'"
      >
        ×
      </button>
    `;
  }

  private removeNotificationFromDOM(notificationId: string): void {
    const element = document.querySelector(`[data-id="${notificationId}"]`) as HTMLElement;
    if (element) {
      element.style.transform = 'translateX(100%)';
      element.style.opacity = '0';
      setTimeout(() => {
        element.remove();
      }, 300);
    }
  }

  private getBackgroundColor(type: NotificationType): string {
    switch (type) {
      case NotificationType.SUCCESS: return '#FFF6E3';
      case NotificationType.INFO: return '#BFECFF';
      case NotificationType.WARNING: return '#CDC1FF';
      case NotificationType.ERROR: return '#FFCCEA';
      default: return '#ffffff';
    }
  }

  private getBorderColor(type: NotificationType): string {
    switch (type) {
      case NotificationType.SUCCESS: return '#4CAF50';
      case NotificationType.INFO: return '#2196F3';
      case NotificationType.WARNING: return '#FF9800';
      case NotificationType.ERROR: return '#F44336';
      default: return '#ddd';
    }
  }

  private getIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.SUCCESS: return '✅';
      case NotificationType.INFO: return 'ℹ️';
      case NotificationType.WARNING: return '⚠️';
      case NotificationType.ERROR: return '❌';
      default: return '📝';
    }
  }

  private getActionButtonColor(style?: string): string {
    switch (style) {
      case 'primary': return '#2196F3';
      case 'danger': return '#F44336';
      case 'secondary':
      default: return '#666';
    }
  }

  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const userNotificationManager = UserNotificationManager.getInstance();