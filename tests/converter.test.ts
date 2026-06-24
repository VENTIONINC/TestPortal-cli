// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Converter } from '@/core/converter';
import { ConvertOptions } from '@/types/providers';
import { HttpClient } from '@/utils/http-client';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import {
  cleanupTempDir,
  createTempDir,
  readCTRFReport,
  spyOnConsole,
  writeTempJsonFile,
} from './test-utils';

describe('Converter', () => {
  let converter: Converter;
  let testDataDir: string;

  beforeEach(async () => {
    converter = new Converter();
    testDataDir = await createTempDir('converter');
    jest.restoreAllMocks();
  });

  afterEach(async () => {
    await cleanupTempDir(testDataDir);
    jest.restoreAllMocks();
  });

  describe('getAvailableProviders', () => {
    it('should return available providers', () => {
      const providers = converter.getAvailableProviders();
      expect(providers).toContain('playwright');
      expect(providers.length).toBeGreaterThan(0);
    });
  });

  describe('convert', () => {
    it('should throw error for non-existent file', async () => {
      const options: ConvertOptions = {
        input: './non-existent-file.json',
        provider: 'playwright',
      };

      await expect(converter.convert(options)).rejects.toThrow(
        'Input file not found'
      );
    });

    it('should throw error for unsupported provider', async () => {
      const testFile = join(__dirname, 'temp-test.json');
      await fs.writeFile(testFile, '{}', 'utf8');

      const options: ConvertOptions = {
        input: testFile,
        provider: 'unsupported',
      };

      try {
        await expect(converter.convert(options)).rejects.toThrow(
          'Unsupported provider'
        );
      } finally {
        await fs.unlink(testFile);
      }
    });

    it('should throw error when provider validation fails', async () => {
      const testFile = await writeTempJsonFile(testDataDir, 'invalid.json', {
        invalid: true,
      });

      await expect(
        converter.convert({
          input: testFile,
          provider: 'playwright',
        })
      ).rejects.toThrow('Invalid playwright format');
    });

    it('should throw error for input paths that are not files', async () => {
      await expect(
        converter.convert({
          input: testDataDir,
          provider: 'playwright',
        })
      ).rejects.toThrow('Input path is not a file');
    });
  });

  describe('convertAndSave', () => {
    it('should write CTRF to stdout when stdout is requested', async () => {
      const input = await writePlaywrightFixture('stdout.json');
      const logSpy = spyOnConsole('log');

      await converter.convertAndSave({
        input,
        provider: 'playwright',
        stdout: true,
      });

      const output = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
      expect(output.results.tool.name).toBe('playwright');
      expect(output.results.summary.tests).toBe(1);
    });

    it('should write CTRF to explicit output file', async () => {
      const input = await writePlaywrightFixture('explicit.json');
      const output = join(testDataDir, 'report.json');

      await converter.convertAndSave({
        input,
        output,
        provider: 'playwright',
      });

      const report = await readCTRFReport(output);
      expect(report.results.tool.name).toBe('playwright');
      expect(report.results.summary.tests).toBe(1);
    });

    it('should write CTRF to default output file when no output or webhook is provided', async () => {
      const input = await writePlaywrightFixture('default.json');

      await converter.convertAndSave({
        input,
        provider: 'playwright',
      });

      const defaultOutput = resolve(input).replace(
        /\.[^/.]+$/,
        '.unified.json'
      );
      const report = await readCTRFReport(defaultOutput);
      expect(report.results.tool.name).toBe('playwright');
    });

    it('should send webhook without writing default output when only webhook is configured', async () => {
      const input = await writePlaywrightFixture('webhook-only.json');
      const sendWebhookSpy = jest
        .spyOn(HttpClient.prototype, 'sendWebhook')
        .mockResolvedValue({
          success: true,
          status: 200,
          statusText: 'OK',
        });
      const logSpy = spyOnConsole('log');

      await converter.convertAndSave({
        input,
        provider: 'playwright',
        webhook: {
          url: 'https://example.com/webhook',
        },
      });

      expect(sendWebhookSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        '✅ Successfully sent to webhook:',
        'https://example.com/webhook'
      );
      await expect(
        fs.access(resolve(input).replace(/\.[^/.]+$/, '.unified.json'))
      ).rejects.toThrow();
    });

    it('should send webhook and write output when both webhook and output are configured', async () => {
      const input = await writePlaywrightFixture('webhook-output.json');
      const output = join(testDataDir, 'webhook-output-ctrf.json');
      spyOnConsole('log');
      const sendWebhookSpy = jest
        .spyOn(HttpClient.prototype, 'sendWebhook')
        .mockResolvedValue({
          success: true,
          status: 200,
          statusText: 'OK',
        });

      await converter.convertAndSave({
        input,
        output,
        provider: 'playwright',
        webhook: {
          url: 'https://example.com/webhook',
        },
      });

      expect(sendWebhookSpy).toHaveBeenCalledTimes(1);
      const report = await readCTRFReport(output);
      expect(report.results.tool.name).toBe('playwright');
    });

    it('should not send webhook when validation fails', async () => {
      const input = await writeTempJsonFile(testDataDir, 'invalid.json', {
        invalid: true,
      });
      const sendWebhookSpy = jest.spyOn(HttpClient.prototype, 'sendWebhook');

      await expect(
        converter.convertAndSave({
          input,
          provider: 'playwright',
          webhook: {
            url: 'https://example.com/webhook',
          },
        })
      ).rejects.toThrow('Invalid playwright format');

      expect(sendWebhookSpy).not.toHaveBeenCalled();
    });

    it('should reject when writing output fails', async () => {
      const input = await writePlaywrightFixture('write-failure.json');

      await expect(
        converter.convertAndSave({
          input,
          output: testDataDir,
          provider: 'playwright',
        })
      ).rejects.toThrow();
    });
  });

  async function writePlaywrightFixture(fileName: string): Promise<string> {
    return writeTempJsonFile(testDataDir, fileName, {
      config: {
        version: '1.43.0',
      },
      suites: [
        {
          title: 'Converter Suite',
          file: 'converter.spec.ts',
          specs: [
            {
              title: 'should pass',
              ok: true,
              tags: [],
              tests: [
                {
                  status: 'passed',
                  results: [
                    {
                      status: 'passed',
                      duration: 25,
                      startTime: '2026-05-10T10:00:00.000Z',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      stats: {
        startTime: '2026-05-10T10:00:00.000Z',
        duration: 25,
      },
    });
  }
});
