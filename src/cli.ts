#!/usr/bin/env node

import { Command } from 'commander';
import { Converter } from '@/core/converter';
import { ConvertOptions } from '@/types/providers';
import { WebhookConfig } from '@/types/webhook';

const program = new Command();

async function main(): Promise<void> {
  const converter = new Converter();

  program
    .name('test-convert')
    .description(
      'Convert test reports from popular frameworks to unified format'
    )
    .version('1.0.0-alpha.1');

  program
    .requiredOption('-i, --input <path>', 'Path to the source report file')
    .requiredOption(
      '-t, --type <provider>',
      `Provider name (${converter.getAvailableProviders().join(', ')})`
    )
    .option('-o, --output <path>', 'Write file instead of stdout')
    .option('--stdout', 'Force output to console')
    .option('--webhook <url>', 'Send report to webhook URL')
    .option('--headers <json>', 'Custom headers as JSON string')
    .option('--auth-token <token>', 'Authentication token')
    .option('--auth-header <name>', 'Custom authentication header name')
    .option(
      '--method <method>',
      'HTTP method for webhook (POST, PUT, PATCH)',
      'POST'
    )
    .option('--timeout <ms>', 'Request timeout in milliseconds', '30000')
    .option('--retries <count>', 'Number of retry attempts', '3')
    .option(
      '--retry-delay <ms>',
      'Delay between retries in milliseconds',
      '1000'
    )
    .option('--verify-ssl', 'Verify SSL certificates', true)
    .option('--no-verify-ssl', 'Skip SSL certificate verification')
    .action(async options => {
      try {
        let webhookConfig: WebhookConfig | undefined;
        if (options.webhook) {
          webhookConfig = {
            url: options.webhook,
            method: options.method as 'POST' | 'PUT' | 'PATCH',
            timeout: parseInt(options.timeout, 10),
            retries: parseInt(options.retries, 10),
            retryDelay: parseInt(options.retryDelay, 10),
            verifySSL: options.verifySsl,
          };

          if (options.headers) {
            try {
              webhookConfig.headers = JSON.parse(options.headers);
            } catch (error) {
              console.error(
                '❌ Invalid JSON format for headers:',
                options.headers
              );
              process.exit(1);
            }
          }

          if (options.authToken) {
            webhookConfig.authToken = options.authToken;
            webhookConfig.authHeader = options.authHeader;
          }
        }

        const convertOptions: ConvertOptions = {
          input: options.input,
          output: options.output,
          provider: options.type,
          stdout: options.stdout,
          ...(webhookConfig && { webhook: webhookConfig }),
        };

        await converter.convertAndSave(convertOptions);

        if (!options.stdout && !options.output) {
          console.log(
            `✅ Successfully converted ${options.input} to unified format`
          );
        }
      } catch (error) {
        console.error('❌ Error:', (error as Error).message);
        process.exit(1);
      }
    });

  await program.parseAsync();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}
