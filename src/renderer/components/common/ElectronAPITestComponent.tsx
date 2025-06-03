/**
 * ElectronAPITestComponent.tsx - ElectronAPI統合テスト用コンポーネント
 *
 * Phase 3.5.1 Task 4: 既存IPCのReact Context統合
 * ElectronContextの動作確認とAPIテスト用
 */

import React, { useState } from 'react';
import { useElectron, useElectronMethod, useElectronState } from '../../contexts';

interface ElectronAPITestComponentProps {
  className?: string;
}

/**
 * ElectronAPI統合のテスト・デモンストレーション用コンポーネント
 */
const ElectronAPITestComponent: React.FC<ElectronAPITestComponentProps> = ({
  className = '',
}) => {
  const { api, isElectronAvailable, connectionStatus, lastError, appInfo, clearError } =
    useElectron();

  const { chatWindowVisible, settingsWindowOpen, currentTheme, speechBubbleText } =
    useElectronState();

  // API メソッド用のHooks
  const getUserName = useElectronMethod('getUserName');
  const getMascotName = useElectronMethod('getMascotName');
  const getTheme = useElectronMethod('getTheme');
  const toggleChatWindow = useElectronMethod('toggleChatWindowVisibility');
  const toggleSettingsWindow = useElectronMethod('toggleSettingsWindow');

  // 状態管理
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [mascotName, setMascotName] = useState<string>('');

  // 基本APIテストの実行
  const runBasicAPITests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    clearError();

    const tests = [
      {
        name: 'ユーザー名取得',
        test: async () => {
          const result = await getUserName.safeCall();
          if (result.success) {
            setUserName(result.data || 'User');
          }
          return result;
        },
      },
      {
        name: 'マスコット名取得',
        test: async () => {
          const result = await getMascotName.safeCall();
          if (result.success) {
            setMascotName(result.data || 'Mascot');
          }
          return result;
        },
      },
      {
        name: 'テーマ取得',
        test: async () => {
          return await getTheme.safeCall();
        },
      },
      {
        name: 'チャット履歴取得',
        test: async () => {
          if (!api?.getChatHistory) {
            return { success: false, error: 'getChatHistory not available' };
          }
          const result = await api.getChatHistory();
          return { success: true, data: result };
        },
      },
    ];

    const results = [];
    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.test();
        const duration = Date.now() - startTime;

        results.push({
          name: test.name,
          success: result.success,
          data: result.data,
          error: result.error,
          duration,
        });
      } catch (error) {
        results.push({
          name: test.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: 0,
        });
      }
    }

    setTestResults(results);
    setIsRunningTests(false);
  };

  // ウィンドウコントロールのテスト
  const testWindowControls = async () => {
    try {
      if (chatWindowVisible) {
        await toggleChatWindow.call();
      } else {
        await toggleChatWindow.call();
      }
    } catch (error) {
      console.error('Window control test failed:', error);
    }
  };

  return (
    <div
      className={`electron-api-test-component ${className}`}
      data-testid="electron-api-test"
    >
      <div className="test-header">
        <h3>🔌 ElectronAPI統合テスト</h3>
        <p className="test-description">ElectronContextとIPCの動作確認とテスト</p>
      </div>

      {/* 接続状態 */}
      <div className="connection-status-section">
        <h4>📡 接続状態</h4>
        <div className={`connection-status ${connectionStatus}`}>
          <div className="status-indicator">
            {connectionStatus === 'connected' && '✅ 接続済み'}
            {connectionStatus === 'disconnected' && '❌ 未接続'}
            {connectionStatus === 'checking' && '🔄 確認中'}
          </div>
          <div className="status-details">
            <p>
              <strong>ElectronAPI:</strong>{' '}
              {isElectronAvailable ? '利用可能' : '利用不可'}
            </p>
            <p>
              <strong>接続状態:</strong> {connectionStatus}
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
      </div>

      {/* リアルタイム状態 */}
      <div className="realtime-status-section">
        <h4>⚡ リアルタイム状態</h4>
        <div className="realtime-status-grid">
          <div className="status-item">
            <span className="status-label">チャットウィンドウ:</span>
            <span className={`status-value ${chatWindowVisible ? 'visible' : 'hidden'}`}>
              {chatWindowVisible ? '表示中' : '非表示'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">設定ウィンドウ:</span>
            <span className={`status-value ${settingsWindowOpen ? 'open' : 'closed'}`}>
              {settingsWindowOpen ? '開いている' : '閉じている'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">現在のテーマ:</span>
            <span className="status-value">{currentTheme}</span>
          </div>
          <div className="status-item">
            <span className="status-label">スピーチバブル:</span>
            <span className="status-value">{speechBubbleText || '(なし)'}</span>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {lastError && (
        <div className="error-section">
          <h4>❌ エラー</h4>
          <div className="error-message">
            <p>
              <strong>エラー:</strong> {lastError.message}
            </p>
            <button onClick={clearError} className="clear-error-btn">
              🗑️ エラーをクリア
            </button>
          </div>
        </div>
      )}

      {/* APIテスト */}
      <div className="api-test-section">
        <h4>🧪 APIテスト</h4>
        <div className="test-controls">
          <button
            onClick={runBasicAPITests}
            disabled={isRunningTests || !isElectronAvailable}
            className="test-btn primary"
          >
            {isRunningTests ? '🔄 テスト実行中...' : '🚀 基本APIテスト実行'}
          </button>
          <button
            onClick={testWindowControls}
            disabled={!isElectronAvailable}
            className="test-btn secondary"
          >
            🪟 ウィンドウコントロールテスト
          </button>
        </div>

        {testResults.length > 0 && (
          <div className="test-results">
            <h5>テスト結果:</h5>
            <div className="test-summary">
              <span className="success-count">
                ✅ 成功: {testResults.filter(r => r.success).length}
              </span>
              <span className="fail-count">
                ❌ 失敗: {testResults.filter(r => !r.success).length}
              </span>
            </div>
            <div className="test-details">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`test-item ${result.success ? 'success' : 'fail'}`}
                >
                  <h6>
                    {result.success ? '✅' : '❌'} {result.name}
                  </h6>
                  {result.error && <p className="error-msg">エラー: {result.error}</p>}
                  {result.data && (
                    <details>
                      <summary>データを表示</summary>
                      <pre className="test-data">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                  <p className="duration">実行時間: {result.duration}ms</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 取得した情報の表示 */}
      {(userName || mascotName) && (
        <div className="retrieved-info-section">
          <h4>📋 取得した情報</h4>
          <div className="info-grid">
            {userName && (
              <div className="info-item">
                <span className="info-label">ユーザー名:</span>
                <span className="info-value">{userName}</span>
              </div>
            )}
            {mascotName && (
              <div className="info-item">
                <span className="info-label">マスコット名:</span>
                <span className="info-value">{mascotName}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 使用方法 */}
      <div className="usage-section">
        <h4>📖 使用方法</h4>
        <details>
          <summary>ElectronContextの使用例</summary>
          <div className="usage-examples">
            <pre>{`
// 基本的な使用
const { api, isElectronAvailable } = useElectron();

// 特定のメソッドを使用
const getUserName = useElectronMethod('getUserName');
const result = await getUserName.safeCall();

// リアルタイム状態の監視
const { chatWindowVisible, currentTheme } = useElectronState();

// 直接API呼び出し
const { invoke, safeInvoke } = useElectron();
const data = await safeInvoke('getSettings');
            `}</pre>
          </div>
        </details>
      </div>
    </div>
  );
};

export default ElectronAPITestComponent;
