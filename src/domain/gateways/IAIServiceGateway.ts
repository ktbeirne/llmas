

/**
 * AIサービスのエラー類型
 */
export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider: string,
    public readonly retryable: boolean = false,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

/**
 * AIサービスのエラーコード
 */
export const AIServiceErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_KEY_INVALID: 'API_KEY_INVALID',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  RATE_LIMITED: 'RATE_LIMITED',
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  CONTENT_FILTERED: 'CONTENT_FILTERED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type AIServiceErrorCode = typeof AIServiceErrorCodes[keyof typeof AIServiceErrorCodes];

/**
 * AIサービスのヘルスチェック結果
 */
export interface AIServiceHealthCheck {
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastChecked: Date;
  errors: string[];
  warnings: string[];
  capabilities: {
    textGeneration: boolean;
    streaming: boolean;
    emotionAnalysis: boolean;
    expressionRecommendation: boolean;
    suggestions: boolean;
  };
}