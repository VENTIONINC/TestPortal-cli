import { Converter } from '@/core/converter';
import { ConvertOptions, BaseProvider } from '@/types/providers';
import { CTRFReport, CTRFTest, TestStatus } from '@/types/ctrf';
import { WebhookConfig } from '@/types/webhook';

export async function convert(options: {
  input: string;
  provider: string;
  output?: string;
  webhook?: WebhookConfig;
}): Promise<CTRFReport> {
  const converter = new Converter();

  if (options.webhook) {
    await converter.convertAndSave(options as ConvertOptions);
  }

  return await converter.convert(options);
}

export { Converter };
export type { CTRFReport, CTRFTest, TestStatus, ConvertOptions, BaseProvider };
