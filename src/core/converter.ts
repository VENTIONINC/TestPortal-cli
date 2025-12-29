import { promises as fs } from 'fs';
import { resolve } from 'path';
import { CTRFReport } from '@/types/ctrf';
import { ConvertOptions } from '@/types/providers';
import { ProviderRegistry } from '@/core/provider-registry';
import { HttpClient } from '@/utils/http-client';

export class Converter {
  private providers: ProviderRegistry;
  private httpClient: HttpClient;

  constructor() {
    this.providers = new ProviderRegistry();
    this.httpClient = new HttpClient();
  }

  async convert(options: ConvertOptions): Promise<CTRFReport> {
    const { input, provider } = options;

    await this.validateInputFile(input);

    const providerInstance = this.providers.getProvider(provider);
    if (!providerInstance) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    const isValid = await providerInstance.validate(input);
    if (!isValid) {
      throw new Error(`Invalid ${provider} format in file: ${input}`);
    }

    const ctrfReport = await providerInstance.convert(input);

    return ctrfReport;
  }

  async convertAndSave(options: ConvertOptions): Promise<void> {
    const ctrfReport = await this.convert(options);

    const webhookPromise = options.webhook
      ? this.sendWebhook(ctrfReport, options.webhook)
      : Promise.resolve();

    const outputPromise = this.handleOutput(ctrfReport, options);

    const [webhookResult] = await Promise.allSettled([
      webhookPromise,
      outputPromise,
    ]);

    if (webhookResult.status === 'rejected') {
      console.error('❌ Webhook failed:', webhookResult.reason.message);
    } else if (options.webhook) {
      console.log('✅ Successfully sent to webhook:', options.webhook.url);
    }
  }

  private async handleOutput(
    report: CTRFReport,
    options: ConvertOptions
  ): Promise<void> {
    if (options.stdout) {
      console.log(JSON.stringify(report, null, 2));
    } else if (options.output) {
      const output = this.resolveOutputPath(options);
      await fs.writeFile(output, JSON.stringify(report, null, 2), 'utf8');
    } else if (!options.webhook) {
      // No webhook configured and no explicit output - fallback to file
      const output = this.resolveOutputPath(options);
      await fs.writeFile(output, JSON.stringify(report, null, 2), 'utf8');
    }
    // If webhook is configured but no output/stdout specified, skip file output
  }

  private async sendWebhook(report: CTRFReport, config: any): Promise<void> {
    const response = await this.httpClient.sendWebhook(report, config);

    if (!response.success) {
      throw new Error(
        response.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }
  }

  private async validateInputFile(inputPath: string): Promise<void> {
    try {
      const stats = await fs.stat(inputPath);
      if (!stats.isFile()) {
        throw new Error(`Input path is not a file: ${inputPath}`);
      }
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        throw new Error(`Input file not found: ${inputPath}`);
      }
      throw error;
    }
  }

  private resolveOutputPath(options: ConvertOptions): string {
    if (options.output) {
      return resolve(options.output);
    }

    const inputPath = resolve(options.input);
    const ext = inputPath.endsWith('.json') ? '.unified.json' : '.unified.json';
    return inputPath.replace(/\.[^/.]+$/, ext);
  }

  getAvailableProviders(): string[] {
    return this.providers.getAvailableProviders();
  }
}
