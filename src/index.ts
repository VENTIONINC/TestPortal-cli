// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { Converter } from '@/core/converter';
import {
  UnifiedReport,
  UnifiedTestResult,
  UnifiedTestStatus,
} from '@/types/unified-report';
import { ConvertOptions, BaseProvider } from '@/types/providers';
import { WebhookConfig } from '@/types/webhook';

export async function convert(options: {
  input: string;
  provider: string;
  output?: string;
  stdout?: boolean;
  webhook?: WebhookConfig;
}): Promise<UnifiedReport> {
  const converter = new Converter();

  if (options.output || options.stdout || options.webhook) {
    return await converter.convertAndSave(options as ConvertOptions);
  }

  return await converter.convert(options);
}

export { Converter };
export type {
  UnifiedReport,
  UnifiedTestResult,
  UnifiedTestStatus,
  ConvertOptions,
  BaseProvider,
};
