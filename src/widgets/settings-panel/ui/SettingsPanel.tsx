/**
 * SettingsPanel - Settings Panel Widget UI
 * FSD Phase 3: 統合設定パネル（TDD: GREEN Phase）
 */

import React, { useEffect, useState, useCallback, useRef, memo } from 'react';

import { SettingsCoordinator } from '../lib/settings-coordinator';
import { TabManager } from '../model/tab-manager';

type SettingsTab = 'display' | 'chat' | 'expression' | 'camera' | 'debug';

interface ValidationErrors {
  [key: string]: string[];
}

export const SettingsPanel = memo(() => {
  // Managers初期化
  const tabManagerRef = useRef<TabManager | null>(null);
  const coordinatorRef = useRef<SettingsCoordinator | null>(null);
  
  // State
  const [activeTab, setActiveTab] = useState<SettingsTab>('display');
  const [availableTabs, setAvailableTabs] = useState<SettingsTab[]>([]);
  const [displaySettings, setDisplaySettings] = useState<any>({});
  const [chatSettings, setChatSettings] = useState<any>({});
  const [expressionSettings, setExpressionSettings] = useState<any>({});
  const [cameraSettings, setCameraSettings] = useState<any>({});
  const [debugSettings, setDebugSettings] = useState<any>({});
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [updateError, setUpdateError] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Managers初期化
  useEffect(() => {
    if (!tabManagerRef.current) {
      tabManagerRef.current = new TabManager();
    }
    if (!coordinatorRef.current) {
      coordinatorRef.current = new SettingsCoordinator();
    }

    const tabManager = tabManagerRef.current;
    const coordinator = coordinatorRef.current;

    // 初期状態を設定
    const initialState = tabManager.getState();
    setActiveTab(initialState.activeTab);
    setAvailableTabs(initialState.availableTabs);

    // 設定を読み込み
    setDisplaySettings(coordinator.getDisplaySettings());
    setChatSettings(coordinator.getChatSettings());
    setExpressionSettings(coordinator.getExpressionSettings());
    setCameraSettings(coordinator.getCameraSettings());
    setDebugSettings(coordinator.getDebugSettings());

    // タブ変更を購読
    const unsubscribeTab = tabManager.subscribe((state) => {
      setActiveTab(state.activeTab);
      setAvailableTabs(state.availableTabs);
    });

    // 設定変更を購読
    const unsubscribeSettings = coordinator.subscribeToChanges((notification) => {
      if (notification.type === 'settings') {
        const settings = notification.data;
        if (settings.display) setDisplaySettings(settings.display);
        if (settings.chat) setChatSettings(settings.chat);
        if (settings.expression) setExpressionSettings(settings.expression);
        if (settings.camera) setCameraSettings(settings.camera);
        if (settings.debug) setDebugSettings(settings.debug);
      }
    });

    return () => {
      unsubscribeTab();
      unsubscribeSettings();
    };
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (tabManagerRef.current) {
        tabManagerRef.current.destroy();
        tabManagerRef.current = null;
      }
      if (coordinatorRef.current) {
        coordinatorRef.current.destroy();
        coordinatorRef.current = null;
      }
    };
  }, []);

  // タブ切り替え
  const handleTabSwitch = useCallback((tab: SettingsTab) => {
    if (tabManagerRef.current) {
      try {
        tabManagerRef.current.switchTab(tab);
      } catch (error) {
        console.error('Tab switch error:', error);
      }
    }
  }, []);

  // 設定更新の共通処理
  const updateSettings = useCallback(async (
    type: 'display' | 'chat' | 'expression' | 'camera' | 'debug',
    newSettings: any
  ) => {
    if (!coordinatorRef.current) return;

    setIsUpdating(true);
    setUpdateError('');

    try {
      // バリデーション
      const validation = coordinatorRef.current.validateSettings({ [type]: newSettings });
      if (!validation.isValid) {
        setValidationErrors({ [type]: validation.errors });
        return;
      }

      // 更新実行
      switch (type) {
        case 'display':
          await coordinatorRef.current.updateDisplaySettings(newSettings);
          break;
        case 'chat':
          await coordinatorRef.current.updateChatSettings(newSettings);
          break;
        case 'expression':
          await coordinatorRef.current.updateExpressionSettings(newSettings);
          break;
        case 'camera':
          await coordinatorRef.current.updateCameraSettings(newSettings);
          break;
        case 'debug':
          await coordinatorRef.current.updateDebugSettings(newSettings);
          break;
      }

      // バリデーションエラーをクリア
      setValidationErrors(prev => ({ ...prev, [type]: [] }));
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Display設定更新
  const handleDisplayChange = useCallback((field: string, value: any) => {
    const newSettings = { ...displaySettings, [field]: value };
    setDisplaySettings(newSettings);
    updateSettings('display', { [field]: value });
  }, [displaySettings, updateSettings]);

  // Chat設定更新
  const handleChatChange = useCallback((field: string, value: any) => {
    const newSettings = { ...chatSettings, [field]: value };
    setChatSettings(newSettings);
    updateSettings('chat', { [field]: value });
  }, [chatSettings, updateSettings]);

  // Expression設定更新
  const handleExpressionChange = useCallback((field: string, value: any) => {
    const newSettings = { ...expressionSettings, [field]: value };
    setExpressionSettings(newSettings);
    updateSettings('expression', { [field]: value });
  }, [expressionSettings, updateSettings]);

  // Camera設定更新
  const handleCameraChange = useCallback((field: string, value: any) => {
    const newSettings = { ...cameraSettings, [field]: value };
    setCameraSettings(newSettings);
    updateSettings('camera', { [field]: value });
  }, [cameraSettings, updateSettings]);

  // Debug設定更新
  const handleDebugChange = useCallback((field: string, value: any) => {
    const newSettings = { ...debugSettings, [field]: value };
    setDebugSettings(newSettings);
    updateSettings('debug', { [field]: value });
  }, [debugSettings, updateSettings]);

  // エクスポート
  const handleExport = useCallback(async () => {
    if (!coordinatorRef.current) return;

    try {
      const exportData = await coordinatorRef.current.exportSettings();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settings-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      setUpdateError('Export failed');
    }
  }, []);

  // インポート
  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!coordinatorRef.current || !event.target.files?.[0]) return;

    try {
      const file = event.target.files[0];
      const text = await file.text();
      const importData = JSON.parse(text);
      await coordinatorRef.current.importSettings(importData);
    } catch (error) {
      setUpdateError('Import failed');
    }
  }, []);

  // リセット
  const handleReset = useCallback(async () => {
    if (!coordinatorRef.current) return;
    if (!window.confirm('Are you sure you want to reset all settings to defaults?')) return;

    try {
      await coordinatorRef.current.resetToDefaults();
    } catch (error) {
      setUpdateError('Reset failed');
    }
  }, []);

  // キーボードナビゲーション
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.target !== event.currentTarget) return;

    const currentIndex = availableTabs.indexOf(activeTab);
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        newIndex = (currentIndex + 1) % availableTabs.length;
        break;
      case 'ArrowLeft':
        newIndex = (currentIndex - 1 + availableTabs.length) % availableTabs.length;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = availableTabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    handleTabSwitch(availableTabs[newIndex]);
  }, [activeTab, availableTabs, handleTabSwitch]);

  // エラーメッセージ表示
  const renderErrors = (category: string) => {
    const errors = validationErrors[category] || [];
    if (errors.length === 0) return null;

    return (
      <div className="error-messages" role="alert">
        {errors.map((error, index) => (
          <div key={index} className="error-message">
            {error}
          </div>
        ))}
      </div>
    );
  };

  // Display設定フォーム
  const renderDisplaySettings = () => (
    <div className="settings-form">
      <h3>Display Settings</h3>
      
      <div className="form-group">
        <label htmlFor="theme">Theme:</label>
        <select
          id="theme"
          value={displaySettings.theme || 'dark'}
          onChange={(e) => handleDisplayChange('theme', e.target.value)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="opacity">Opacity:</label>
        <input
          id="opacity"
          type="number"
          min="0"
          max="1"
          step="0.1"
          value={displaySettings.opacity || 0.8}
          onChange={(e) => handleDisplayChange('opacity', parseFloat(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label htmlFor="alwaysOnTop">Always on Top:</label>
        <input
          id="alwaysOnTop"
          type="checkbox"
          checked={displaySettings.alwaysOnTop || false}
          onChange={(e) => handleDisplayChange('alwaysOnTop', e.target.checked)}
        />
      </div>

      {renderErrors('display')}
    </div>
  );

  // Chat設定フォーム
  const renderChatSettings = () => (
    <div className="settings-form">
      <h3>Chat Settings</h3>
      
      <div className="form-group">
        <label htmlFor="apiKey">API Key:</label>
        <input
          id="apiKey"
          type="password"
          value={chatSettings.apiKey || ''}
          onChange={(e) => handleChatChange('apiKey', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="maxTokens">Max Tokens:</label>
        <input
          id="maxTokens"
          type="number"
          min="1"
          value={chatSettings.maxTokens || 1000}
          onChange={(e) => handleChatChange('maxTokens', parseInt(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label htmlFor="temperature">Temperature:</label>
        <input
          id="temperature"
          type="number"
          min="0"
          max="2"
          step="0.1"
          value={chatSettings.temperature || 0.7}
          onChange={(e) => handleChatChange('temperature', parseFloat(e.target.value))}
        />
      </div>

      {renderErrors('chat')}
    </div>
  );

  // Expression設定フォーム
  const renderExpressionSettings = () => (
    <div className="settings-form">
      <h3>Expression Settings</h3>
      
      <div className="form-group">
        <label htmlFor="enableEmotions">Enable Emotions:</label>
        <input
          id="enableEmotions"
          type="checkbox"
          checked={expressionSettings.enableEmotions || false}
          onChange={(e) => handleExpressionChange('enableEmotions', e.target.checked)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="intensityMultiplier">Intensity Multiplier:</label>
        <input
          id="intensityMultiplier"
          type="number"
          min="0"
          step="0.1"
          value={expressionSettings.intensityMultiplier || 1.0}
          onChange={(e) => handleExpressionChange('intensityMultiplier', parseFloat(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label htmlFor="transitionSpeed">Transition Speed:</label>
        <input
          id="transitionSpeed"
          type="number"
          min="0"
          step="0.1"
          value={expressionSettings.transitionSpeed || 0.5}
          onChange={(e) => handleExpressionChange('transitionSpeed', parseFloat(e.target.value))}
        />
      </div>

      {renderErrors('expression')}
    </div>
  );

  // Camera設定フォーム
  const renderCameraSettings = () => (
    <div className="settings-form">
      <h3>Camera Settings</h3>
      
      <div className="form-group">
        <label>Position:</label>
        <div className="vector-input">
          <input
            type="number"
            placeholder="X"
            value={cameraSettings.position?.x || 0}
            onChange={(e) => handleCameraChange('position', {
              ...cameraSettings.position,
              x: parseFloat(e.target.value)
            })}
          />
          <input
            type="number"
            placeholder="Y"
            value={cameraSettings.position?.y || 0}
            onChange={(e) => handleCameraChange('position', {
              ...cameraSettings.position,
              y: parseFloat(e.target.value)
            })}
          />
          <input
            type="number"
            placeholder="Z"
            value={cameraSettings.position?.z || 5}
            onChange={(e) => handleCameraChange('position', {
              ...cameraSettings.position,
              z: parseFloat(e.target.value)
            })}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="fov">Field of View:</label>
        <input
          id="fov"
          type="number"
          min="1"
          max="179"
          value={cameraSettings.fov || 45}
          onChange={(e) => handleCameraChange('fov', parseFloat(e.target.value))}
        />
      </div>

      {renderErrors('camera')}
    </div>
  );

  // Debug設定フォーム
  const renderDebugSettings = () => (
    <div className="settings-form">
      <h3>Debug Settings</h3>
      
      <div className="form-group">
        <label htmlFor="enableLogging">Enable Logging:</label>
        <input
          id="enableLogging"
          type="checkbox"
          checked={debugSettings.enableLogging || false}
          onChange={(e) => handleDebugChange('enableLogging', e.target.checked)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="logLevel">Log Level:</label>
        <select
          id="logLevel"
          value={debugSettings.logLevel || 'info'}
          onChange={(e) => handleDebugChange('logLevel', e.target.value)}
        >
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="showFPS">Show FPS:</label>
        <input
          id="showFPS"
          type="checkbox"
          checked={debugSettings.showFPS || false}
          onChange={(e) => handleDebugChange('showFPS', e.target.checked)}
        />
      </div>

      {renderErrors('debug')}
    </div>
  );

  // アクティブタブの内容をレンダリング
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'display':
        return renderDisplaySettings();
      case 'chat':
        return renderChatSettings();
      case 'expression':
        return renderExpressionSettings();
      case 'camera':
        return renderCameraSettings();
      case 'debug':
        return renderDebugSettings();
      default:
        return <div>Unknown tab</div>;
    }
  };

  return (
    <div className="settings-panel">
      {/* 説明 */}
      <div
        role="region"
        aria-live="polite"
        aria-label="Settings Panel Description"
      >
        Configure application settings using the tabs below.
      </div>

      {/* エラー表示 */}
      {updateError && (
        <div className="error-banner" role="alert">
          Error: {updateError}
        </div>
      )}

      {/* バルク操作ボタン */}
      <div className="bulk-actions">
        <button onClick={handleExport} disabled={isUpdating}>
          Export Settings
        </button>
        <label>
          Import Settings
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </label>
        <button onClick={handleReset} disabled={isUpdating}>
          Reset to Defaults
        </button>
      </div>

      {/* タブナビゲーション */}
      <div
        role="tablist"
        aria-label="Settings categories"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {availableTabs.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`${tab}-panel`}
            id={`${tab}-tab`}
            onClick={() => handleTabSwitch(tab)}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* タブパネル */}
      <div
        role="tabpanel"
        id={`${activeTab}-panel`}
        aria-labelledby={`${activeTab}-tab`}
        className="tab-panel"
      >
        {renderActiveTab()}
      </div>

      {/* 更新中表示 */}
      {isUpdating && (
        <div className="updating-overlay">
          Updating settings...
        </div>
      )}
    </div>
  );
});

SettingsPanel.displayName = 'SettingsPanel';