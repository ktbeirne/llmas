import Store from 'electron-store';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export class ChatHistoryStore {
  private store: Store;
  private readonly HISTORY_KEY = 'chatHistory';
  private readonly SYSTEM_PROMPT_KEY = 'systemPrompt';
  private readonly DEFAULT_SYSTEM_PROMPT = 'あなたは親しみやすく愛らしいAIアシスタントです。ユーザーと楽しく会話してください。';

  constructor() {
    this.store = new Store({
      name: 'chat-history',
      defaults: {
        [this.HISTORY_KEY]: [],
        [this.SYSTEM_PROMPT_KEY]: this.DEFAULT_SYSTEM_PROMPT
      }
    });
  }

  getHistory(): ChatMessage[] {
    return this.store.get(this.HISTORY_KEY, []) as ChatMessage[];
  }

  addMessage(role: 'user' | 'assistant', content: string): void {
    const history = this.getHistory();
    const message: ChatMessage = {
      role,
      content,
      timestamp: new Date().toISOString()
    };
    
    history.push(message);
    this.store.set(this.HISTORY_KEY, history);
  }

  getSystemPrompt(): string {
    return this.store.get(this.SYSTEM_PROMPT_KEY, this.DEFAULT_SYSTEM_PROMPT) as string;
  }

  setSystemPrompt(prompt: string): void {
    this.store.set(this.SYSTEM_PROMPT_KEY, prompt);
  }

  getFullHistory(): ChatMessage[] {
    const systemPrompt = this.getSystemPrompt();
    const history = this.getHistory();
    
    return [
      {
        role: 'system' as const,
        content: systemPrompt,
        timestamp: new Date().toISOString()
      },
      ...history
    ];
  }

  clearHistory(): void {
    this.store.set(this.HISTORY_KEY, []);
  }

  clearAll(): void {
    this.store.clear();
    this.store.set(this.SYSTEM_PROMPT_KEY, this.DEFAULT_SYSTEM_PROMPT);
  }
}