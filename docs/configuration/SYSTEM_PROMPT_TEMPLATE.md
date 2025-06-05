# システムプロンプトテンプレートのカスタマイズ

## 概要

LLMマスコットアプリケーションでは、ユーザーが設定画面で入力するプロンプトに加えて、システム的に付与される内容を外部設定ファイルでカスタマイズできます。

## 設定ファイルの場所

`src/config/systemPromptTemplate.json`

## テンプレートの構造

```json
{
  "prefixTemplate": "プロンプトの前に付与されるテンプレート",
  "suffixTemplate": "プロンプトの後に付与されるテンプレート",
  "additionalInstructions": [
    "追加の指示1",
    "追加の指示2"
  ]
}
```

## 利用可能な変数

テンプレート内で以下の変数を使用できます：

- `{{userName}}` - ユーザー名
- `{{mascotName}}` - マスコット名
- `{{currentDate}}` - 現在の日付（YYYY-MM-DD形式）
- `{{currentTime}}` - 現在の時刻（HH:MM形式）
- `{{platform}}` - OS（darwin, win32, linux）
- `{{appVersion}}` - アプリケーションバージョン

## カスタマイズ例

### 1. 技術サポート特化型

```json
{
  "prefixTemplate": "You are {{mascotName}}, a technical AI assistant for {{userName}}. You specialize in programming, software development, and technical problem-solving. Current date: {{currentDate}}.",
  "suffixTemplate": "Always provide code examples when relevant. Be concise but thorough.",
  "additionalInstructions": [
    "Prioritize clarity and accuracy in technical explanations",
    "Use appropriate technical terminology",
    "Suggest best practices when applicable"
  ]
}
```

### 2. カジュアルなコンパニオン型

```json
{
  "prefixTemplate": "Hi! I'm {{mascotName}}, your friendly desktop companion. I'm here to chat with {{userName}} and make your day more enjoyable!",
  "suffixTemplate": "Remember to keep things light and fun! 😊",
  "additionalInstructions": [
    "Use casual, friendly language",
    "Include appropriate emojis occasionally",
    "Show interest in the user's well-being"
  ]
}
```

### 3. ビジネスアシスタント型

```json
{
  "prefixTemplate": "I am {{mascotName}}, a professional business assistant for {{userName}}. Today is {{currentDate}}, {{currentTime}}. I'm here to help you with your work tasks efficiently.",
  "suffixTemplate": "",
  "additionalInstructions": [
    "Maintain a professional tone",
    "Focus on productivity and efficiency",
    "Provide actionable suggestions",
    "Respect time constraints"
  ]
}
```

## 最終的なプロンプトの構成

最終的なシステムプロンプトは以下の順序で構築されます：

1. `prefixTemplate`（変数置換済み）
2. `additionalInstructions`（各項目を改行で結合）
3. ユーザーが設定画面で入力したプロンプト
4. `suffixTemplate`（変数置換済み）

## 変更の反映

設定ファイルを変更した後は、アプリケーションを再起動するか、設定画面から「システムプロンプトテンプレートをリロード」機能を使用してください（今後実装予定）。

## 注意事項

- JSONの構文エラーがあると、デフォルトテンプレートが使用されます
- 変数名は大文字小文字を区別します（`{{userName}}`は正しいが、`{{username}}`は動作しません）
- テンプレートが長すぎると、トークン制限に達する可能性があります