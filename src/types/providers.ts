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
  readonly name: string;
  validate(inputPath: string): Promise<boolean>;
  convert(inputPath: string): Promise<CTRFReport>;
}

export interface ProviderRegistry {
  [key: string]: BaseProvider;
}

export type SupportedProvider =
  | 'playwright'
  | 'junit'
  | 'jest'
  | 'mocha'
  | 'vitest'
  | 'nunit'
  | 'pytest'
  | 'testng';
