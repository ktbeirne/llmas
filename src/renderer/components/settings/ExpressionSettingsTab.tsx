/**
 * ExpressionSettingsTab.tsx - 表情・アニメ設定タブ
 * 
 * Phase 3.5.2.2 Task 4: 表情設定実装
 * 表情制御、アニメーション設定、プレビュー機能
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';

import { useExpressionSettings } from '../../hooks/useSettingsSection';
import { cn } from '../../utils/cn';

// UI Components
import { Button, Card, FormField } from '../common';

// Custom Hooks

// Types
export interface ExpressionSettingsTabProps {
  /** カスタムクラス */
  className?: string;
  
  /** test-id */
  'data-testid'?: string;
}

/**
 * 表情データ型定義
 */
interface ExpressionData {
  name: string;
  displayName: string;
  enabled: boolean;
  intensity: number;
  description?: string;
}

/**
 * ローディング状態の型
 */
type LoadingState = 'loading' | 'loaded' | 'error';

/**
 * デフォルト表情設定（VRMモデルがロードされていない場合のフォールバック）
 */
const DEFAULT_EXPRESSIONS: ExpressionData[] = [
  {
    name: 'happy',
    displayName: '😊 うれしい',
    enabled: true,
    intensity: 1.0,
    description: '喜びや満足を表現する基本的な表情'
  },
  {
    name: 'sad',
    displayName: '😢 かなしい',
    enabled: true,
    intensity: 0.8,
    description: '悲しみや落ち込みを表現する表情'
  },
  {
    name: 'angry',
    displayName: '😠 おこり',
    enabled: false,
    intensity: 0.7,
    description: '怒りや不満を表現する表情'
  },
  {
    name: 'surprised',
    displayName: '😲 おどろき',
    enabled: true,
    intensity: 0.9,
    description: '驚きや興味を表現する表情'
  },
  {
    name: 'neutral',
    displayName: '😐 ニュートラル',
    enabled: true,
    intensity: 1.0,
    description: 'デフォルトの無表情状態'
  },
  {
    name: 'confused',
    displayName: '😕 こまった',
    enabled: true,
    intensity: 0.6,
    description: '困惑や混乱を表現する表情'
  }
];

/**
 * ExpressionSettingsTabコンポーネント
 */
export const ExpressionSettingsTab: React.FC<ExpressionSettingsTabProps> = ({
  className,
  'data-testid': testId
}) => {
  // Zustand Store integration
  const expressionSettings = useExpressionSettings();
  
  // Local UI state (non-persistent)
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [previewExpression, setPreviewExpression] = useState<string>('');
  const [previewIntensity, setPreviewIntensity] = useState(1.0);
  
  // Derived state from Zustand store
  const expressions = useMemo(() => {
    if (expressionSettings.data?.settings) {
      // Zustand storeから表情設定を取得し、ExpressionData形式に変換
      const settings = expressionSettings.data.settings;
      return DEFAULT_EXPRESSIONS.map(defaultExpr => ({
        ...defaultExpr,
        enabled: settings[defaultExpr.name]?.enabled ?? defaultExpr.enabled,
        intensity: settings[defaultExpr.name]?.intensity ?? defaultExpr.intensity,
      }));
    }
    return DEFAULT_EXPRESSIONS;
  }, [expressionSettings.data?.settings]);
  
  // VRMモデルから表情情報を読み込む
  useEffect(() => {
    const loadExpressionData = async () => {
      setLoadingState('loading');
      
      try {
        // TODO: VRMコントローラーから表情情報を取得
        // 現在はモックデータを使用
        await new Promise(resolve => setTimeout(resolve, 1000)); // シミュレーション
        
        // 実装時は以下のような感じになる:
        // const vrmExpressions = await window.electronAPI?.getVRMExpressions();
        // if (vrmExpressions) {
        //   setExpressions(vrmExpressions);
        // }
        
        setLoadingState('loaded');
      } catch (error) {
        console.error('表情データの読み込みに失敗:', error);
        setLoadingState('error');
      }
    };
    
    loadExpressionData();
  }, []);
  
  // 表情設定の変更（Zustand統合）
  const handleExpressionToggle = useCallback(async (expressionName: string, enabled: boolean) => {
    try {
      const currentSettings = expressionSettings.data?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        [expressionName]: {
          ...currentSettings[expressionName],
          enabled
        }
      };
      
      await expressionSettings.updateSettings({
        ...expressionSettings.data!,
        settings: updatedSettings
      });
    } catch (error) {
      console.error('Failed to update expression toggle:', error);
    }
  }, [expressionSettings]);
  
  const handleIntensityChange = useCallback(async (expressionName: string, intensity: number) => {
    try {
      const currentSettings = expressionSettings.data?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        [expressionName]: {
          ...currentSettings[expressionName],
          intensity
        }
      };
      
      await expressionSettings.updateSettings({
        ...expressionSettings.data!,
        settings: updatedSettings
      });
    } catch (error) {
      console.error('Failed to update expression intensity:', error);
    }
  }, [expressionSettings]);
  
  // プレビュー機能
  const handlePreviewExpression = useCallback(() => {
    if (!previewExpression) return;
    
    console.log('表情プレビュー:', { expression: previewExpression, intensity: previewIntensity });
    // TODO: VRMコントローラーに表情適用を送信
    // window.electronAPI?.setVRMExpression(previewExpression, previewIntensity);
  }, [previewExpression, previewIntensity]);
  
  const handleResetExpression = useCallback(() => {
    console.log('表情リセット');
    // TODO: VRMコントローラーに表情リセットを送信
    // window.electronAPI?.resetVRMExpression();
  }, []);
  
  // 設定の保存・リセット（Zustand統合）
  const handleApplySettings = useCallback(async () => {
    try {
      if (expressionSettings.isLoading) {
        console.log('表情設定を保存中...');
        return;
      }
      
      console.log('表情設定を適用:', expressions);
      // 設定は既にZustand経由で保存されている
      console.log('表情設定が正常に適用されました');
    } catch (error) {
      console.error('Failed to apply expression settings:', error);
    }
  }, [expressions, expressionSettings.isLoading]);
  
  const handleResetSettings = useCallback(async () => {
    try {
      setPreviewExpression('');
      setPreviewIntensity(1.0);
      await expressionSettings.resetSettings();
      console.log('表情設定をリセットしました');
    } catch (error) {
      console.error('Failed to reset expression settings:', error);
    }
  }, [expressionSettings]);
  
  // プレビュー用の表情オプション
  const previewOptions = expressions
    .filter(expr => expr.enabled)
    .map(expr => ({
      value: expr.name,
      label: expr.displayName
    }));
  
  return (
    <div className={cn('space-y-6', className)} data-testid={testId}>
      {/* 表情制御設定セクション */}
      <Card
        header={{
          title: '🎭 表情制御設定',
          description: 'AIが表情を変更する際に使用する表情と、その強度を設定してください'
        }}
        variant="elevated"
        data-testid="expression-settings-section"
      >
        {loadingState === 'loading' && (
          <div className="flex items-center justify-center py-8" data-testid="expression-loading">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              <span className="text-gray-600">VRMモデルから表情情報を読み込み中...</span>
            </div>
          </div>
        )}
        
        {loadingState === 'error' && (
          <div className="text-center py-8" data-testid="expression-error">
            <div className="text-red-500 mb-4">
              <span className="text-4xl">⚠️</span>
            </div>
            <p className="text-red-600 mb-4">
              表情情報の読み込みに失敗しました。VRMモデルが正しく読み込まれているか確認してください。
            </p>
            <Button 
              variant="secondary" 
              onClick={() => window.location.reload()}
              data-testid="retry-button"
            >
              再試行
            </Button>
          </div>
        )}
        
        {loadingState === 'loaded' && (
          <div className="space-y-4" data-testid="expression-list">
            {expressions.map((expression) => (
              <div
                key={expression.name}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                data-testid={`expression-item-${expression.name}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <FormField
                      type="checkbox"
                      checkboxProps={{
                        checked: expression.enabled,
                        onChange: (e) => handleExpressionToggle(expression.name, e.target.checked)
                      }}
                      data-testid={`expression-checkbox-${expression.name}`}
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{expression.displayName}</h4>
                      {expression.description && (
                        <p className="text-sm text-gray-600">{expression.description}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {expression.enabled && (
                  <div className="ml-6">
                    <div className="flex items-center space-x-4">
                      <label className="text-sm font-medium text-gray-700 w-12">
                        強度:
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={expression.intensity}
                        onChange={(e) => handleIntensityChange(expression.name, parseFloat(e.target.value))}
                        className="flex-1"
                        data-testid={`expression-intensity-${expression.name}`}
                      />
                      <span className="text-sm text-gray-600 w-8 text-right">
                        {expression.intensity.toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
      
      {/* プレビューセクション */}
      {loadingState === 'loaded' && (
        <Card
          header={{
            title: 'プレビュー',
            description: '設定した表情をリアルタイムで確認できます'
          }}
          variant="default"
          data-testid="preview-section"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                type="select"
                label="表情を選択"
                selectProps={{
                  value: previewExpression,
                  onChange: (value) => setPreviewExpression(value as string),
                  options: [
                    { value: '', label: '表情を選択...' },
                    ...previewOptions
                  ],
                  placeholder: '表情を選択...'
                }}
                data-testid="preview-expression-select"
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  強度: {previewIntensity.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={previewIntensity}
                  onChange={(e) => setPreviewIntensity(parseFloat(e.target.value))}
                  className="w-full"
                  data-testid="preview-intensity-slider"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handlePreviewExpression}
                disabled={!previewExpression}
                data-testid="preview-expression-button"
              >
                プレビュー
              </Button>
              
              <Button
                variant="secondary"
                onClick={handleResetExpression}
                data-testid="reset-expression-button"
              >
                リセット
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {/* 使い方ガイド */}
      <Card
        header="💡 使い方"
        variant="filled"
        collapsible
        defaultCollapsed
        data-testid="usage-guide"
      >
        <div className="space-y-3 text-sm text-gray-700">
          <ul className="space-y-2">
            <li className="flex items-start space-x-2">
              <span>•</span>
              <span>チェックを入れた表情のみがAIによって使用されます</span>
            </li>
            <li className="flex items-start space-x-2">
              <span>•</span>
              <span>スライダーで各表情のデフォルト強度を調整できます</span>
            </li>
            <li className="flex items-start space-x-2">
              <span>•</span>
              <span>プレビュー機能で設定した表情を即座に確認できます</span>
            </li>
            <li className="flex items-start space-x-2">
              <span>•</span>
              <span>AIがintensity（強度）を指定した場合は、そちらが優先されます</span>
            </li>
          </ul>
        </div>
      </Card>
      
      {/* アクションボタン */}
      <Card
        variant="outlined"
        padding="md"
        data-testid="expression-actions"
      >
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={handleResetSettings}
            data-testid="reset-expression-settings"
          >
            リセット
          </Button>
          
          <Button
            variant="primary"
            onClick={handleApplySettings}
            disabled={loadingState !== 'loaded'}
            data-testid="apply-expression-settings"
          >
            適用
          </Button>
        </div>
      </Card>
    </div>
  );
};

// displayNameを設定
ExpressionSettingsTab.displayName = 'ExpressionSettingsTab';

// デフォルトエクスポート
export default ExpressionSettingsTab;

/**
 * ExpressionSettingsTab関連の型定義エクスポート
 */
export type {
  ExpressionSettingsTabProps,
};