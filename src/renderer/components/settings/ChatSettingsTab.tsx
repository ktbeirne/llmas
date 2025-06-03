/**
 * ChatSettingsTab.tsx - 会話設定タブ
 * 
 * Phase 3.5.2.2 Task 3: 会話設定実装
 * ユーザー名、マスコット名、システムプロンプト、会話履歴の設定
 */

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '../../utils/cn';

// UI Components
import { Button, Card, FormField } from '../common';

// Custom Hooks
import { useChatSettings } from '../../hooks/useSettingsSection';

// Types
export interface ChatSettingsTabProps {
  /** カスタムクラス */
  className?: string;
  
  /** test-id */
  'data-testid'?: string;
}

/**
 * デフォルトシステムプロンプト
 */
const DEFAULT_SYSTEM_PROMPT = `あなたは親しみやすく愛らしいAIアシスタントです。ユーザーと楽しく会話してください。

以下の点を心がけて応答してください：
- 明るく前向きな口調で話す
- ユーザーの質問に親身になって答える
- 適度に絵文字を使って表現を豊かにする
- 困ったときは素直に「わからない」と言う
- ユーザーの気持ちに寄り添う

あなたはデスクトップマスコットとして、ユーザーの日常をサポートし、楽しい時間を提供することが役割です。`;

/**
 * ChatSettingsTabコンポーネント
 */
export const ChatSettingsTab: React.FC<ChatSettingsTabProps> = ({
  className,
  'data-testid': testId
}) => {
  // Zustand Store integration
  const chatSettings = useChatSettings();
  
  // Local UI state (non-persistent)
  const [showPerformanceWarning, setShowPerformanceWarning] = useState(false);
  
  // Derived state from Zustand store
  const userName = useMemo(() => {
    return chatSettings.data?.userName || 'User';
  }, [chatSettings.data?.userName]);
  
  const mascotName = useMemo(() => {
    return chatSettings.data?.mascotName || 'Mascot';
  }, [chatSettings.data?.mascotName]);
  
  const systemPrompt = useMemo(() => {
    return chatSettings.data?.systemPromptCore || DEFAULT_SYSTEM_PROMPT;
  }, [chatSettings.data?.systemPromptCore]);
  
  // Character count for system prompt
  const promptCharacterCount = systemPrompt.length;
  const isPromptTooLong = promptCharacterCount > 2000; // パフォーマンス警告の閾値
  
  // Event handlers with Zustand integration
  const handleUserNameChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 50) {
      try {
        await chatSettings.updateSettings({
          ...chatSettings.data!,
          userName: value
        });
      } catch (error) {
        console.error('Failed to update user name:', error);
      }
    }
  }, [chatSettings]);
  
  const handleMascotNameChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 50) {
      try {
        await chatSettings.updateSettings({
          ...chatSettings.data!,
          mascotName: value
        });
      } catch (error) {
        console.error('Failed to update mascot name:', error);
      }
    }
  }, [chatSettings]);
  
  const handleSystemPromptChange = useCallback(async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setShowPerformanceWarning(value.length > 2000);
    try {
      await chatSettings.updateSettings({
        ...chatSettings.data!,
        systemPromptCore: value
      });
    } catch (error) {
      console.error('Failed to update system prompt:', error);
    }
  }, [chatSettings]);
  
  const handleResetSystemPrompt = useCallback(async () => {
    setShowPerformanceWarning(false);
    try {
      await chatSettings.updateSettings({
        ...chatSettings.data!,
        systemPromptCore: DEFAULT_SYSTEM_PROMPT
      });
    } catch (error) {
      console.error('Failed to reset system prompt:', error);
    }
  }, [chatSettings]);
  
  const handleClearChatHistory = useCallback(() => {
    // TODO: 確認ダイアログを表示してから実行
    if (window.confirm('会話履歴をリセットしてもよろしいですか？この操作は元に戻せません。')) {
      console.log('会話履歴をクリア（実装予定）');
      // TODO: ElectronAPI経由で会話履歴をクリア
    }
  }, []);
  
  const handleApplySettings = useCallback(async () => {
    try {
      // ローディング状態の確認
      if (chatSettings.isLoading) {
        console.log('会話設定を保存中...');
        return;
      }
      
      console.log('会話設定を適用', {
        userName,
        mascotName,
        systemPrompt,
      });
      
      // 設定は既にZustand経由で保存されている
      console.log('会話設定が正常に適用されました');
    } catch (error) {
      console.error('Failed to apply chat settings:', error);
    }
  }, [userName, mascotName, systemPrompt, chatSettings.isLoading]);
  
  const handleResetSettings = useCallback(async () => {
    try {
      setShowPerformanceWarning(false);
      await chatSettings.resetSettings();
      console.log('会話設定をリセットしました');
    } catch (error) {
      console.error('Failed to reset chat settings:', error);
    }
  }, [chatSettings]);
  
  // Validation
  const getUserNameError = () => {
    if (!userName.trim()) {
      return 'ユーザー名を入力してください';
    }
    return undefined;
  };
  
  const getMascotNameError = () => {
    if (!mascotName.trim()) {
      return 'マスコット名を入力してください';
    }
    return undefined;
  };
  
  return (
    <div className={cn('space-y-6', className)} data-testid={testId}>
      {/* ユーザーとマスコットの名前設定 */}
      <Card
        header={{
          title: 'ユーザーとマスコットの名前',
          description: 'あなたの名前とマスコットの名前を設定してください'
        }}
        variant="default"
        data-testid="names-section"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            type="input"
            label="あなたの名前（ユーザー名）"
            required
            inputProps={{
              value: userName,
              onChange: handleUserNameChange,
              placeholder: 'User',
              maxLength: 50
            }}
            error={getUserNameError()}
            helpText={`${userName.length}/50文字`}
            data-testid="user-name-field"
          />
          
          <FormField
            type="input"
            label="マスコットの名前"
            required
            inputProps={{
              value: mascotName,
              onChange: handleMascotNameChange,
              placeholder: 'Mascot',
              maxLength: 50
            }}
            error={getMascotNameError()}
            helpText={`${mascotName.length}/50文字`}
            data-testid="mascot-name-field"
          />
        </div>
      </Card>
      
      {/* システムプロンプト設定 */}
      <Card
        header={{
          title: 'システムプロンプト（キャラクターの性格・役割）',
          description: 'マスコットの基本的な性格や応答スタイルを記述してください。あなたの名前やマスコットの名前に関する指示は自動的に追加されます。',
          actions: (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetSystemPrompt}
              data-testid="reset-system-prompt-button"
            >
              デフォルトに戻す
            </Button>
          )
        }}
        variant="default"
        data-testid="system-prompt-section"
      >
        <div className="space-y-4">
          <FormField
            type="textarea"
            label="プロンプト内容"
            textareaProps={{
              value: systemPrompt,
              onChange: handleSystemPromptChange,
              placeholder: 'あなたは親しみやすく愛らしいAIアシスタントです。ユーザーと楽しく会話してください。',
              rows: 8
            }}
            data-testid="system-prompt-field"
          />
          
          {/* 文字数カウンター */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              文字数: <span data-testid="prompt-character-count">{promptCharacterCount}</span>
            </span>
            
            {showPerformanceWarning && (
              <div className="flex items-center text-amber-600" data-testid="performance-warning">
                <span className="mr-1">⚠️</span>
                <span>入力トークンが長すぎるとモデルのパフォーマンスに影響が出る可能性があります</span>
              </div>
            )}
          </div>
        </div>
      </Card>
      
      {/* 会話履歴管理 */}
      <Card
        header={{
          title: '会話履歴',
          description: '会話履歴の管理を行えます'
        }}
        variant="default"
        data-testid="chat-history-section"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400 text-lg">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  重要な注意事項
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    会話履歴をリセットすると、これまでのすべての会話が削除されます。
                    この操作は元に戻すことができませんので、慎重に行ってください。
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <Button
              variant="danger"
              onClick={handleClearChatHistory}
              data-testid="clear-chat-history-button"
            >
              会話履歴をリセット
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              この操作は元に戻せません
            </p>
          </div>
        </div>
      </Card>
      
      {/* アクションボタン */}
      <Card
        variant="outlined"
        padding="md"
        data-testid="chat-actions"
      >
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={handleResetSettings}
            data-testid="reset-chat-settings"
          >
            リセット
          </Button>
          
          <Button
            variant="primary"
            onClick={handleApplySettings}
            disabled={!!getUserNameError() || !!getMascotNameError()}
            data-testid="apply-chat-settings"
          >
            適用
          </Button>
        </div>
      </Card>
      
      {/* プレビューセクション */}
      <Card
        header={{
          title: '💡 設定プレビュー',
          description: '現在の設定での会話例'
        }}
        variant="filled"
        collapsible
        defaultCollapsed
        data-testid="settings-preview-section"
      >
        <div className="space-y-3">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-gray-900">{userName}</span>
              </div>
              <p className="text-gray-700 ml-8">こんにちは！</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-secondary/10 to-primary/10 rounded-lg p-3 border border-primary/20">
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center text-white text-xs">
                  {mascotName.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-gray-900">{mascotName}</span>
              </div>
              <p className="text-gray-700 ml-8">
                こんにちは、{userName}さん！😊 今日はどんなことをお手伝いできますか？
              </p>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 italic">
            ※ 実際の応答は設定したシステムプロンプトの内容によって変わります
          </div>
        </div>
      </Card>
    </div>
  );
};

// displayNameを設定
ChatSettingsTab.displayName = 'ChatSettingsTab';

// デフォルトエクスポート
export default ChatSettingsTab;

/**
 * ChatSettingsTab関連の型定義エクスポート
 */
export type {
  ChatSettingsTabProps,
};