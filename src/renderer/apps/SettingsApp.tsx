/**
 * SettingsApp.tsx - React設定画面のメインコンポーネント
 *
 * Phase 3.5.1: マルチウィンドウReactアプリケーション対応
 * 設定画面専用のReactアプリケーション
 */

import { useState, useEffect } from 'react';
import '../App.css';
import { ElectronProvider } from '../contexts';
import { ElectronAPITestComponent, HMRTestComponent } from '../components/common';

interface SettingsAppProps {
  className?: string;
}

/**
 * React版設定画面のメインアプリケーション
 */
const SettingsApp: React.FC<SettingsAppProps> = ({ className = '' }) => {
  // 基本状態管理
  const [isLoading, setIsLoading] = useState(true);
  const [electronAPIStatus, setElectronAPIStatus] = useState<
    'checking' | 'available' | 'unavailable'
  >('checking');
  const [appInfo, setAppInfo] = useState<{
    version?: string;
    platform?: string;
    arch?: string;
  }>({});

  // ElectronAPI動作確認
  useEffect(() => {
    const checkElectronAPI = async () => {
      try {
        // ElectronAPIの存在確認
        if (!window.electronAPI) {
          setElectronAPIStatus('unavailable');
          setIsLoading(false);
          return;
        }

        console.log('[Settings App] ElectronAPI detected, checking methods...');

        // 設定画面関連のAPI動作確認
        const settingsAPIMethods = [
          'getWindowSettings',
          'getChatSettings',
          'getTheme',
          'getExpressionSettings',
          'saveWindowSettings',
          'saveChatSettings',
          'saveTheme',
        ];

        const availableMethods = settingsAPIMethods.filter(
          method => typeof window.electronAPI[method] === 'function'
        );

        console.log(
          `[Settings App] Available API methods: ${availableMethods.length}/${settingsAPIMethods.length}`
        );

        // アプリ情報取得試行
        if (typeof window.electronAPI.getAppInfo === 'function') {
          try {
            const info = await window.electronAPI.getAppInfo();
            setAppInfo(info || {});
            console.log('[Settings App] App info retrieved:', info);
          } catch (error) {
            console.warn('[Settings App] Failed to get app info:', error);
          }
        }

        setElectronAPIStatus('available');
        setIsLoading(false);

        console.log('[Settings App] ElectronAPI check completed successfully');
      } catch (error) {
        console.error('[Settings App] ElectronAPI check failed:', error);
        setElectronAPIStatus('unavailable');
        setIsLoading(false);
      }
    };

    checkElectronAPI();
  }, []);

  // ローディング画面
  if (isLoading) {
    return (
      <div className={`react-app loading ${className}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>設定画面を初期化中...</p>
        </div>
      </div>
    );
  }

  return (
    <ElectronProvider>
      <div className={`react-app settings-app ${className}`} data-testid="settings-app">
        {/* ヘッダー */}
        <header className="app-header">
          <h1>⚙️ 設定</h1>
          <p className="subtitle">LLM Desktop Mascot - 設定画面</p>
        </header>

        {/* メインコンテンツ */}
        <main className="app-main">
          {/* ElectronAPI統合テスト */}
          <section className="electron-api-test-section">
            <ElectronAPITestComponent />
          </section>

          {/* HMRテスト */}
          <section className="hmr-test-section">
            <HMRTestComponent />
          </section>

          {/* ElectronAPI状態表示（レガシー - 参考用） */}
          <section className="legacy-api-status-section">
            <h2>📡 レガシーシステム状態（参考用）</h2>
            <div className={`api-status ${electronAPIStatus}`}>
              <div className="status-indicator">
                {electronAPIStatus === 'available' && '✅ 正常'}
                {electronAPIStatus === 'unavailable' && '❌ 接続エラー'}
                {electronAPIStatus === 'checking' && '🔄 確認中'}
              </div>
              <div className="status-details">
                <p>
                  <strong>状態:</strong>{' '}
                  {electronAPIStatus === 'available'
                    ? 'システム正常'
                    : electronAPIStatus === 'unavailable'
                      ? 'システム接続エラー'
                      : 'システム確認中'}
                </p>
                {appInfo.version && (
                  <>
                    <p>
                      <strong>Version:</strong> {appInfo.version}
                    </p>
                    <p>
                      <strong>Platform:</strong> {appInfo.platform}
                    </p>
                    <p>
                      <strong>Architecture:</strong> {appInfo.arch}
                    </p>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* 設定項目プレビュー */}
          <section className="settings-preview-section">
            <h2>🛠️ 設定項目</h2>
            <div className="settings-grid">
              <div className="setting-category">
                <h3>🎨 画面表示設定</h3>
                <p>テーマ、ウィンドウサイズ、VRMモデル設定</p>
                <div className="setting-status">準備中...</div>
              </div>
              <div className="setting-category">
                <h3>💬 会話設定</h3>
                <p>ユーザー名、マスコット名、システムプロンプト</p>
                <div className="setting-status">準備中...</div>
              </div>
              <div className="setting-category">
                <h3>🎭 表情・アニメーション設定</h3>
                <p>表情制御、アニメーション設定</p>
                <div className="setting-status">準備中...</div>
              </div>
            </div>
          </section>

          {/* 実装予定 */}
          <section className="implementation-notice">
            <h2>🚧 実装予定</h2>
            <p>
              この設定画面は <strong>Phase 3.5.2</strong>{' '}
              で完全なReactコンポーネントとして実装されます。
            </p>
            <ul>
              <li>✅ マルチウィンドウ対応基盤構築（現在のフェーズ）</li>
              <li>✅ ElectronAPI統合（Phase 3.5.1 Task 4）</li>
              <li>⏳ 設定画面のReact化（Phase 3.5.2）</li>
              <li>⏳ 既存settings.htmlとの統合</li>
            </ul>
          </section>
        </main>

        {/* フッター */}
        <footer className="app-footer">
          <p>Phase 3.5.1: React-Electron統合基盤構築</p>
        </footer>
      </div>
    </ElectronProvider>
  );
};

export default SettingsApp;
