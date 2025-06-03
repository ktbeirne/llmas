/**
 * HMRTestComponent.tsx - HMR動作検証用コンポーネント
 *
 * Phase 3.5.1 Task 3: HMR対応と開発体験最適化
 * Hot Module Replacement の動作確認用
 */

import { useState, useEffect } from 'react';

interface HMRTestComponentProps {
  className?: string;
}

/**
 * HMR（Hot Module Replacement）の動作を検証するためのテストコンポーネント
 *
 * 使用方法:
 * 1. このコンポーネントを表示
 * 2. カウンターをクリックして値を変更
 * 3. このファイルのテキストを編集して保存
 * 4. カウンターの値が保持されていることを確認（状態保持確認）
 * 5. 変更した内容が即座に反映されることを確認（HMR確認）
 */
const HMRTestComponent: React.FC<HMRTestComponentProps> = ({ className = '' }) => {
  const [count, setCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [hmrStatus, setHmrStatus] = useState<'unknown' | 'active' | 'inactive'>(
    'unknown'
  );

  // HMR状態の検出
  useEffect(() => {
    if (import.meta.hot) {
      setHmrStatus('active');
      console.log('🔥 [HMR Test] Hot Module Replacement is active');

      // HMRイベントの監視
      import.meta.hot.on('vite:beforeUpdate', () => {
        console.log('🔄 [HMR Test] About to update...');
      });

      import.meta.hot.on('vite:afterUpdate', () => {
        console.log('✅ [HMR Test] Update completed');
        setLastUpdate(new Date());
      });

      // このモジュールの更新を受け入れ
      import.meta.hot.accept(() => {
        console.log('🔥 [HMR Test] Module updated via HMR');
      });
    } else {
      setHmrStatus('inactive');
      console.log('❌ [HMR Test] Hot Module Replacement is not available');
    }
  }, []);

  // 現在時刻の表示（リアルタイム更新）
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`hmr-test-component ${className}`} data-testid="hmr-test">
      <div className="hmr-test-header">
        <h3>🔥 HMR テストコンポーネント</h3>
        <p className="hmr-description">
          このコンポーネントでHot Module Replacement の動作を確認できます
        </p>
      </div>

      <div className="hmr-status-section">
        <h4>📊 HMR ステータス</h4>
        <div className={`hmr-status ${hmrStatus}`}>
          <div className="status-indicator">
            {hmrStatus === 'active' && '✅ HMR有効'}
            {hmrStatus === 'inactive' && '❌ HMR無効'}
            {hmrStatus === 'unknown' && '❓ HMR状態不明'}
          </div>
          <div className="status-details">
            <p>
              <strong>状態:</strong>{' '}
              {hmrStatus === 'active'
                ? 'Hot Module Replacement 動作中'
                : hmrStatus === 'inactive'
                  ? 'Hot Module Replacement 無効'
                  : 'Hot Module Replacement 状態確認中'}
            </p>
            <p>
              <strong>現在時刻:</strong> {currentTime.toLocaleTimeString()}
            </p>
            <p>
              <strong>最終更新:</strong> {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      <div className="hmr-test-interaction">
        <h4>🎮 インタラクションテスト</h4>
        <div className="counter-section">
          <p>
            <strong>カウンター:</strong> {count}
          </p>
          <div className="counter-controls">
            <button
              onClick={() => setCount(c => c + 1)}
              className="counter-btn increment"
            >
              ➕ 増加
            </button>
            <button
              onClick={() => setCount(c => c - 1)}
              className="counter-btn decrement"
            >
              ➖ 減少
            </button>
            <button onClick={() => setCount(0)} className="counter-btn reset">
              🔄 リセット
            </button>
          </div>
        </div>
      </div>

      <div className="hmr-test-instructions">
        <h4>📋 HMR動作確認手順</h4>
        <ol>
          <li>上のカウンターをクリックして値を変更</li>
          <li>このファイル (HMRTestComponent.tsx) を編集</li>
          <li>ファイルを保存</li>
          <li>カウンターの値が保持されていることを確認</li>
          <li>編集内容が即座に反映されることを確認</li>
        </ol>
        <div className="test-modification-area">
          <p className="modification-text">
            🎨 <strong>編集テスト用テキスト:</strong>
            この文字を変更して保存すると、HMRの動作を確認できます！
            {/* このコメントを変更してテストしてください */}
          </p>
        </div>
      </div>

      <div className="hmr-technical-info">
        <h4>🔧 技術情報</h4>
        <details>
          <summary>HMR詳細情報</summary>
          <div className="tech-details">
            <p>
              <strong>React Version:</strong> {React.version}
            </p>
            <p>
              <strong>Environment:</strong> {process.env.NODE_ENV || 'development'}
            </p>
            <p>
              <strong>Vite HMR:</strong> {import.meta.hot ? '有効' : '無効'}
            </p>
            <p>
              <strong>User Agent:</strong> {navigator.userAgent}
            </p>
            <p>
              <strong>Build Time:</strong> {new Date().toISOString()}
            </p>
          </div>
        </details>
      </div>
    </div>
  );
};

export default HMRTestComponent;
