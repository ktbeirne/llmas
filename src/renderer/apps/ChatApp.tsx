/**
 * ChatApp.tsx - Reactチャット画面のメインコンポーネント
 *
 * Phase 3.5.1: マルチウィンドウReactアプリケーション対応
 * チャット画面専用のReactアプリケーション
 */

import { useState, useEffect } from 'react';
import '../App.css';

interface ChatAppProps {
  className?: string;
}

/**
 * React版チャット画面のメインアプリケーション
 */
const ChatApp: React.FC<ChatAppProps> = ({ className = '' }) => {
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
  const [userName, setUserName] = useState('User');
  const [mascotName, setMascotName] = useState('Mascot');

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

        console.log('[Chat App] ElectronAPI detected, checking methods...');

        // チャット画面関連のAPI動作確認
        const chatAPIMethods = [
          'sendChatMessage',
          'getChatHistory',
          'getUserName',
          'getMascotName',
          'clearChatHistory',
        ];

        const availableMethods = chatAPIMethods.filter(
          method => typeof window.electronAPI[method] === 'function'
        );

        console.log(
          `[Chat App] Available API methods: ${availableMethods.length}/${chatAPIMethods.length}`
        );

        // ユーザー名とマスコット名の取得
        try {
          if (typeof window.electronAPI.getUserName === 'function') {
            const userNameResult = await window.electronAPI.getUserName();
            setUserName(userNameResult || 'User');
          }
          if (typeof window.electronAPI.getMascotName === 'function') {
            const mascotNameResult = await window.electronAPI.getMascotName();
            setMascotName(mascotNameResult || 'Mascot');
          }
        } catch (error) {
          console.warn('[Chat App] Failed to get user/mascot names:', error);
        }

        // アプリ情報取得試行
        if (typeof window.electronAPI.getAppInfo === 'function') {
          try {
            const info = await window.electronAPI.getAppInfo();
            setAppInfo(info || {});
            console.log('[Chat App] App info retrieved:', info);
          } catch (error) {
            console.warn('[Chat App] Failed to get app info:', error);
          }
        }

        setElectronAPIStatus('available');
        setIsLoading(false);

        console.log('[Chat App] ElectronAPI check completed successfully');
      } catch (error) {
        console.error('[Chat App] ElectronAPI check failed:', error);
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
          <div className="loading-spinner" />
          <p>チャット画面を初期化中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`react-app chat-app ${className}`} data-testid="chat-app">
      {/* ヘッダー */}
      <header className="app-header">
        <h1>💬 チャット</h1>
        <p className="subtitle">
          {userName} と {mascotName} の会話
        </p>
      </header>

      {/* メインコンテンツ */}
      <main className="app-main">
        {/* ElectronAPI状態表示 */}
        <section className="api-status-section">
          <h2>📡 接続状態</h2>
          <div className={`api-status ${electronAPIStatus}`}>
            <div className="status-indicator">
              {electronAPIStatus === 'available' && '✅ 接続中'}
              {electronAPIStatus === 'unavailable' && '❌ 接続エラー'}
              {electronAPIStatus === 'checking' && '🔄 接続確認中'}
            </div>
            <div className="status-details">
              <p>
                <strong>状態:</strong>{' '}
                {electronAPIStatus === 'available'
                  ? 'メインプロセスと接続済み'
                  : electronAPIStatus === 'unavailable'
                    ? 'メインプロセス接続エラー'
                    : 'メインプロセス接続確認中'}
              </p>
              {electronAPIStatus === 'available' && (
                <>
                  <p>
                    <strong>ユーザー名:</strong> {userName}
                  </p>
                  <p>
                    <strong>マスコット名:</strong> {mascotName}
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* チャット機能プレビュー */}
        <section className="chat-preview-section">
          <h2>💬 チャット機能</h2>
          <div className="chat-features">
            <div className="feature-item">
              <h3>📝 メッセージ送信</h3>
              <p>テキスト入力とリアルタイム送信</p>
              <div className="feature-status">準備中...</div>
            </div>
            <div className="feature-item">
              <h3>📋 会話履歴</h3>
              <p>過去の会話の表示と管理</p>
              <div className="feature-status">準備中...</div>
            </div>
            <div className="feature-item">
              <h3>🎭 リアルタイム表情</h3>
              <p>メッセージに応じた表情変化</p>
              <div className="feature-status">準備中...</div>
            </div>
            <div className="feature-item">
              <h3>⚡ 自動サイズ調整</h3>
              <p>テキストエリアの動的リサイズ</p>
              <div className="feature-status">準備中...</div>
            </div>
          </div>
        </section>

        {/* モックチャットUI */}
        <section className="mock-chat-section">
          <h2>🎬 チャットUI プレビュー</h2>
          <div className="mock-chat-container">
            <div className="mock-message-area">
              <div className="mock-message user-message">
                <span className="sender-name">{userName}</span>
                <p>こんにちは！元気ですか？</p>
              </div>
              <div className="mock-message mascot-message">
                <span className="sender-name">{mascotName}</span>
                <p>こんにちは！とても元気です😊 今日はどんなことをお手伝いできますか？</p>
              </div>
            </div>
            <div className="mock-input-area">
              <textarea
                placeholder="メッセージを入力..."
                rows={1}
                disabled
                style={{ resize: 'none', opacity: 0.6 }}
              />
              <button disabled style={{ opacity: 0.6 }}>
                送信
              </button>
            </div>
          </div>
        </section>

        {/* 実装予定 */}
        <section className="implementation-notice">
          <h2>🚧 実装予定</h2>
          <p>
            このチャット画面は <strong>Phase 3.5.3</strong>{' '}
            で完全なReactコンポーネントとして実装されます。
          </p>
          <ul>
            <li>✅ マルチウィンドウ対応基盤構築（現在のフェーズ）</li>
            <li>⏳ チャット画面のReact化（Phase 3.5.3）</li>
            <li>⏳ 既存chat.htmlとの統合</li>
            <li>⏳ リアルタイムメッセージング</li>
          </ul>
        </section>
      </main>

      {/* フッター */}
      <footer className="app-footer">
        <p>Phase 3.5.1: React-Electron統合基盤構築</p>
      </footer>
    </div>
  );
};

export default ChatApp;
