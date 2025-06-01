/**
 * チャットメッセージのドメインエンティティ
 * 純粋なビジネスロジックのみを含み、インフラストラクチャの関心事は含まない
 */

export type MessageRole = 'system' | 'user' | 'assistant';

export interface ChatMessageProps {
  role: MessageRole;
  content: string;
  timestamp?: Date;
  id?: string;
}

/**
 * チャットメッセージエンティティ
 * メッセージの不変性とビジネスルールを保証
 */
export class ChatMessage {
  private readonly _id: string;
  private readonly _role: MessageRole;
  private readonly _content: string;
  private readonly _timestamp: Date;

  constructor(props: ChatMessageProps) {
    this.validateContent(props.content);
    this.validateRole(props.role);
    
    this._id = props.id || this.generateId();
    this._role = props.role;
    this._content = props.content.trim();
    this._timestamp = props.timestamp || new Date();
  }

  /**
   * メッセージID取得
   */
  get id(): string {
    return this._id;
  }

  /**
   * メッセージロール取得
   */
  get role(): MessageRole {
    return this._role;
  }

  /**
   * メッセージ内容取得
   */
  get content(): string {
    return this._content;
  }

  /**
   * タイムスタンプ取得
   */
  get timestamp(): Date {
    return this._timestamp;
  }

  /**
   * ISO文字列形式のタイムスタンプ取得（既存コードとの互換性）
   */
  get timestampString(): string {
    return this._timestamp.toISOString();
  }

  /**
   * システムメッセージかどうかを判定
   */
  get isSystemMessage(): boolean {
    return this._role === 'system';
  }

  /**
   * ユーザーメッセージかどうかを判定
   */
  get isUserMessage(): boolean {
    return this._role === 'user';
  }

  /**
   * アシスタントメッセージかどうかを判定
   */
  get isAssistantMessage(): boolean {
    return this._role === 'assistant';
  }

  /**
   * メッセージの要約を取得（長いメッセージ用）
   */
  get summary(): string {
    const maxLength = 100;
    if (this._content.length <= maxLength) {
      return this._content;
    }
    return this._content.substring(0, maxLength) + '...';
  }

  /**
   * メッセージの文字数を取得
   */
  get characterCount(): number {
    return this._content.length;
  }

  /**
   * メッセージが空かどうかを判定
   */
  get isEmpty(): boolean {
    return this._content.trim().length === 0;
  }

  /**
   * 同じメッセージかどうかを比較
   */
  equals(other: ChatMessage): boolean {
    return this._id === other._id;
  }

  /**
   * 同じ内容かどうかを比較（IDは無視）
   */
  hasSameContent(other: ChatMessage): boolean {
    return (
      this._role === other._role &&
      this._content === other._content
    );
  }

  /**
   * 既存システムとの互換性のためのプレーンオブジェクト変換
   */
  toPlainObject(): {
    role: MessageRole;
    content: string;
    timestamp: string;
  } {
    return {
      role: this._role,
      content: this._content,
      timestamp: this.timestampString
    };
  }

  /**
   * プレーンオブジェクトからChatMessageを生成（既存コードとの互換性）
   */
  static fromPlainObject(obj: {
    role: MessageRole;
    content: string;
    timestamp: string;
  }): ChatMessage {
    return new ChatMessage({
      role: obj.role,
      content: obj.content,
      timestamp: new Date(obj.timestamp)
    });
  }

  /**
   * システムメッセージを作成するファクトリーメソッド
   */
  static createSystemMessage(content: string): ChatMessage {
    return new ChatMessage({
      role: 'system',
      content
    });
  }

  /**
   * ユーザーメッセージを作成するファクトリーメソッド
   */
  static createUserMessage(content: string): ChatMessage {
    return new ChatMessage({
      role: 'user',
      content
    });
  }

  /**
   * アシスタントメッセージを作成するファクトリーメソッド
   */
  static createAssistantMessage(content: string): ChatMessage {
    return new ChatMessage({
      role: 'assistant',
      content
    });
  }

  /**
   * メッセージ内容の検証
   */
  private validateContent(content: string): void {
    if (typeof content !== 'string') {
      throw new Error('メッセージ内容は文字列である必要があります');
    }

    if (content.trim().length === 0) {
      throw new Error('メッセージ内容は空文字列にできません');
    }

    if (content.length > 10000) {
      throw new Error('メッセージ内容は10,000文字を超えることはできません');
    }

    // 危険な文字列のチェック
    if (this.containsDangerousContent(content)) {
      throw new Error('メッセージに不正な内容が含まれています');
    }
  }

  /**
   * メッセージロールの検証
   */
  private validateRole(role: MessageRole): void {
    const validRoles: MessageRole[] = ['system', 'user', 'assistant'];
    if (!validRoles.includes(role)) {
      throw new Error(`無効なメッセージロールです: ${role}`);
    }
  }

  /**
   * 危険な内容のチェック
   */
  private containsDangerousContent(content: string): boolean {
    // 基本的なXSS対策
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ];

    return dangerousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * ユニークIDの生成
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}