import { CTRFReport } from '@/types/ctrf';
import { WebhookConfig } from '@/types/webhook';

export interface ConvertOptions {
  input: string;
  output?: string;
  provider: string;
  stdout?: boolean;
  webhook?: WebhookConfig;
}

export interface BaseProvider {
  name: string;
  convert(inputPath: string): Promise<CTRFReport>;
  validate(inputPath: string): Promise<boolean>;
}

export interface ProviderRegistry {
  [key: string]: BaseProvider;
}

export type SupportedProvider = 'playwright' | 'junit' | 'jest' | 'mocha';
