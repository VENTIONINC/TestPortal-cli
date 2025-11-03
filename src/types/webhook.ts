export interface WebhookConfig {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  verifySSL?: boolean;
}

export interface WebhookResponse {
  success: boolean;
  status: number;
  statusText: string;
  data?: any;
  error?: string | undefined;
}

export interface WebhookRetryConfig {
  attempts: number;
  delay: number;
  backoff?: 'linear' | 'exponential';
  maxDelay?: number;
}

export type AuthMethod = 'bearer' | 'apikey' | 'basic' | 'custom';

export interface WebhookAuthConfig {
  method: AuthMethod;
  token: string;
  headerName?: string;
  username?: string;
  password?: string;
}
