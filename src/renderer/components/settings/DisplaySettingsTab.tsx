/**
 * DisplaySettingsTab.tsx - 画面表示設定タブ
 * 
 * Phase 3.5.2.2 Task 2: 画面表示設定実装
 * テーマ選択、ウィンドウサイズ、VRMモデル設定
 */

import React, { useState, useCallback, useMemo } from 'react';

import { useWindowSettings, useThemeSettings } from '../../hooks/useSettingsSection';
import { cn } from '../../utils/cn';

// UI Components
import { Button, Card, FormField, Select, Input } from '../common';

// Custom Hooks

// Types
export interface DisplaySettingsTabProps {
  /** カスタムクラス */
  className?: string;
  
  /** test-id */
  'data-testid'?: string;
}

// Theme configuration type
interface ThemeConfig {
  id: string;
  title: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  labels: string[];
}

// Window size presets
interface WindowSizePreset {
  value: string;
  label: string;
  width?: number;
  height?: number;
}

/**
 * テーマ設定データ
 */
const THEME_CONFIGS: ThemeConfig[] = [
  {
    id: 'default',
    title: 'ソフト＆ドリーミー',
    description: '明るく親しみやすい、やわらかな印象のテーマ',
    colors: {
      primary: '#5082C4',
      secondary: '#8E7CC3',
      accent: '#E91E63',
      background: '#FDFBF7'
    },
    labels: ['メイン', 'サブ', 'アクセント', '背景']
  },
  {
    id: 'dark',
    title: 'ダークモード',
    description: '目に優しく洗練された暗めのテーマ',
    colors: {
      primary: '#60A5FA',
      secondary: '#A78BFA',
      accent: '#FCD34D',
      background: '#0F172A'
    },
    labels: ['メイン', 'サブ', 'アクセント', '背景']
  },
  {
    id: 'sakura',
    title: '桜',
    description: '日本の春をイメージした温かみのあるテーマ',
    colors: {
      primary: '#D1477A',
      secondary: '#C485C7',
      accent: '#FF5722',
      background: '#FDF2F8'
    },
    labels: ['メイン', 'サブ', 'アクセント', '背景']
  },
  {
    id: 'ocean',
    title: 'オーシャン',
    description: '海の静けさをイメージした爽やかなテーマ',
    colors: {
      primary: '#0077BE',
      secondary: '#06AED5',
      accent: '#FFC947',
      background: '#F0FEFF'
    },
    labels: ['メイン', 'サブ', 'アクセント', '背景']
  },
  {
    id: 'forest',
    title: 'フォレスト',
    description: '森の静寂をイメージした、落ち着いた自然派テーマ',
    colors: {
      primary: '#6B7280',
      secondary: '#8B7355',
      accent: '#2D8659',
      background: '#F9FAFB'
    },
    labels: ['メイン', 'サブ', 'アクセント', '背景']
  },
  {
    id: 'wonderland',
    title: 'ワンダーランド',
    description: '不思議の国のアリスの幻想世界をイメージした魔法的なテーマ',
    colors: {
      primary: '#7C3AED',
      secondary: '#EC4899',
      accent: '#10B981',
      background: '#FAF5FF'
    },
    labels: ['メイン', 'サブ', 'アクセント', '背景']
  }
];

/**
 * ウィンドウサイズプリセット
 */
const WINDOW_SIZE_PRESETS: WindowSizePreset[] = [
  { value: 'small', label: '小 (300×600)', width: 300, height: 600 },
  { value: 'medium', label: '中 (400×800)', width: 400, height: 800 },
  { value: 'large', label: '大 (500×1000)', width: 500, height: 1000 },
  { value: 'custom', label: 'カスタム' }
];

/**
 * テーマカードコンポーネント
 */
interface ThemeCardProps {
  theme: ThemeConfig;
  isSelected: boolean;
  onSelect: (themeId: string) => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({
  theme,
  isSelected,
  onSelect
}) => {
  return (
    <div
      className={cn(
        'border-2 rounded-lg p-4 cursor-pointer transition-all duration-200',
        'hover:shadow-md',
        isSelected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-gray-200 hover:border-gray-300'
      )}
      onClick={() => onSelect(theme.id)}
      data-testid={`theme-card-${theme.id}`}
    >
      <div className="space-y-3">
        {/* Header */}
        <div>
          <h3 className="font-semibold text-gray-900">{theme.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{theme.description}</p>
        </div>
        
        {/* Color Preview */}
        <div className="flex gap-2">
          {Object.values(theme.colors).map((color, index) => (
            <div
              key={index}
              className="w-8 h-8 rounded border border-gray-200 flex-shrink-0"
              style={{ backgroundColor: color }}
              title={theme.labels[index]}
            />
          ))}
        </div>
        
        {/* Color Labels */}
        <div className="flex gap-2 text-xs text-gray-500">
          {theme.labels.map((label, index) => (
            <span key={index} className="flex-1 text-center">
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * DisplaySettingsTabコンポーネント
 */
export const DisplaySettingsTab: React.FC<DisplaySettingsTabProps> = ({
  className,
  'data-testid': testId
}) => {
  // Zustand Store integration
  const windowSettings = useWindowSettings();
  const themeSettings = useThemeSettings();
  
  // Local UI state (non-persistent)
  const [isThemeCollapsed, setIsThemeCollapsed] = useState(false);
  
  // Derived state from Zustand store
  const selectedTheme = useMemo(() => {
    return themeSettings.data?.currentTheme ?? 'default';
  }, [themeSettings.data?.currentTheme]);
  
  // Available themes from ElectronAPI (not hardcoded)
  const availableThemes = useMemo(() => {
    return themeSettings.data?.availableThemes ?? [];
  }, [themeSettings.data?.availableThemes]);
  
  // Convert ElectronAPI themes to component format
  const themeConfigs = useMemo(() => {
    return availableThemes.map(theme => ({
      id: theme.id,
      title: theme.name,
      description: theme.description ?? '',
      colors: theme.preview ?? {
        primary: '#5082C4',
        secondary: '#8E7CC3', 
        accent: '#E91E63',
        background: '#FDFBF7'
      },
      labels: ['メイン', 'サブ', 'アクセント', '背景']
    }));
  }, [availableThemes]);
  
  const windowSizePreset = useMemo(() => {
    const size = windowSettings.data?.windowSize;
    if (!size) return 'medium';
    
    // Find matching preset
    const preset = WINDOW_SIZE_PRESETS.find(p => 
      p.width === size.width && p.height === size.height
    );
    return preset?.value ?? 'custom';
  }, [windowSettings.data?.windowSize]);
  
  const customWidth = windowSettings.data?.windowSize?.width ?? 400;
  const customHeight = windowSettings.data?.windowSize?.height ?? 800;
  const vrmModelPath = windowSettings.data?.vrmModelPath ?? '/avatar.vrm';
  
  // Event handlers with Zustand integration
  const handleThemeSelect = useCallback(async (themeId: string) => {
    try {
      await themeSettings.updateSettings({
        currentTheme: themeId,
        availableThemes: themeSettings.data?.availableThemes ?? []
      });
      
      // ElectronAPIでテーマを保存し、メインウィンドウに通知
      if (window.electronAPI && window.electronAPI.setTheme) {
        const result = await window.electronAPI.setTheme(themeId);
        if (result.success) {
          console.log(`テーマ ${themeId} を適用しました`);
        } else {
          console.error('テーマの適用に失敗しました:', result.error);
        }
      }
      
      // 設定画面自体のプレビューも更新
      if (window.themeManager) {
        window.themeManager.setTheme(themeId);
      }
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  }, [themeSettings]);
  
  const handleWindowSizeChange = useCallback(async (value: string) => {
    try {
      // プリセット選択時にカスタム値も更新
      const preset = WINDOW_SIZE_PRESETS.find(p => p.value === value);
      if (preset?.width && preset.height) {
        await windowSettings.updateSettings({
          ...windowSettings.data!,
          windowSize: {
            width: preset.width,
            height: preset.height
          }
        });
      }
    } catch (error) {
      console.error('Failed to update window size:', error);
    }
  }, [windowSettings]);
  
  const handleVrmModelSelect = useCallback(async () => {
    try {
      // TODO: ElectronAPI経由でファイル選択ダイアログを開く
      console.log('VRMモデル選択ダイアログを開く（実装予定）');
      
      // 仮のファイルパス更新（ファイルダイアログ実装後に置き換え）
      // const selectedPath = await window.electronAPI.selectVrmFile();
      // if (selectedPath) {
      //   await windowSettings.updateSettings({
      //     ...windowSettings.data!,
      //     vrmModelPath: selectedPath
      //   });
      // }
    } catch (error) {
      console.error('Failed to select VRM model:', error);
    }
  }, [windowSettings]);
  
  const handleApplySettings = useCallback(async () => {
    try {
      // ローディング状態の確認
      if (windowSettings.isLoading || themeSettings.isLoading) {
        console.log('設定を保存中...');
        return;
      }
      
      console.log('画面表示設定を適用', {
        theme: selectedTheme,
        windowSize: {
          preset: windowSizePreset,
          custom: { width: customWidth, height: customHeight }
        },
        vrmModel: vrmModelPath
      });
      
      // 実際の設定は既にZustand経由で保存されている
      console.log('設定が正常に適用されました');
    } catch (error) {
      console.error('Failed to apply settings:', error);
    }
  }, [selectedTheme, windowSizePreset, customWidth, customHeight, vrmModelPath, windowSettings.isLoading, themeSettings.isLoading]);
  
  const handleResetSettings = useCallback(async () => {
    try {
      // 設定をデフォルトにリセット
      await Promise.all([
        themeSettings.resetSettings(),
        windowSettings.resetSettings()
      ]);
      
      console.log('画面表示設定をリセットしました');
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  }, [themeSettings, windowSettings]);
  
  return (
    <div className={cn('space-y-6', className)} data-testid={testId}>
      {/* テーマ設定セクション */}
      <Card
        header={{
          title: '🎨 デザインテーマ',
          description: 'アプリケーション全体の見た目と雰囲気を選択してください',
          actions: (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsThemeCollapsed(!isThemeCollapsed)}
              data-testid="theme-toggle-button"
            >
              {isThemeCollapsed ? '展開' : '折りたたみ'}
            </Button>
          )
        }}
        collapsible
        collapsed={isThemeCollapsed}
        onCollapsedChange={setIsThemeCollapsed}
        variant="elevated"
        data-testid="theme-section"
      >
        <div className="space-y-4">
          {/* テーマ選択グリッド */}
          {themeConfigs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {themeConfigs.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  isSelected={selectedTheme === theme.id}
                  onSelect={handleThemeSelect}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>テーマを読み込み中...</p>
              {themeSettings.error && (
                <p className="text-red-500 mt-2">
                  エラー: {themeSettings.error.message}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>
      
      {/* ウィンドウサイズ設定 */}
      <Card
        header="ウィンドウサイズ"
        variant="default"
        data-testid="window-size-section"
      >
        <div className="space-y-4">
          <FormField
            type="select"
            label="プリセット"
            selectProps={{
              value: windowSizePreset,
              onChange: (value) => handleWindowSizeChange(value as string),
              options: WINDOW_SIZE_PRESETS.map(preset => ({
                value: preset.value,
                label: preset.label
              })),
              placeholder: 'サイズを選択'
            }}
            data-testid="window-size-preset"
          />
          
          {/* カスタムサイズ入力 */}
          {windowSizePreset === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <FormField
                type="input"
                label="幅"
                inputProps={{
                  type: 'number',
                  value: customWidth.toString(),
                  onChange: (e) => setCustomWidth(Number(e.target.value)),
                  min: '200',
                  max: '1000'
                }}
                helpText="px"
                data-testid="custom-width"
              />
              
              <FormField
                type="input"
                label="高さ"
                inputProps={{
                  type: 'number',
                  value: customHeight.toString(),
                  onChange: (e) => setCustomHeight(Number(e.target.value)),
                  min: '300',
                  max: '1200'
                }}
                helpText="px"
                data-testid="custom-height"
              />
            </div>
          )}
        </div>
      </Card>
      
      {/* VRMモデル設定 */}
      <Card
        header="VRMモデル"
        variant="default"
        data-testid="vrm-model-section"
      >
        <div className="space-y-4">
          <FormField
            type="input"
            label="現在のモデル"
            inputProps={{
              value: vrmModelPath,
              readOnly: true
            }}
            data-testid="current-vrm-path"
          />
          
          <div>
            <Button
              variant="secondary"
              onClick={handleVrmModelSelect}
              data-testid="select-vrm-model"
            >
              モデルファイルを選択
            </Button>
          </div>
        </div>
      </Card>
      
      {/* アクションボタン */}
      <Card
        variant="outlined"
        padding="md"
        data-testid="display-actions"
      >
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={handleResetSettings}
            data-testid="reset-display-settings"
          >
            リセット
          </Button>
          
          <Button
            variant="primary"
            onClick={handleApplySettings}
            data-testid="apply-display-settings"
          >
            適用
          </Button>
        </div>
      </Card>
    </div>
  );
};

// displayNameを設定
DisplaySettingsTab.displayName = 'DisplaySettingsTab';

// デフォルトエクスポート
export default DisplaySettingsTab;

/**
 * DisplaySettingsTab関連の型定義エクスポート
 */
export type {
  DisplaySettingsTabProps,
};