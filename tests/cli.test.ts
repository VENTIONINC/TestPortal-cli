// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { createProgram } from '@/cli';
import { Converter } from '@/core/converter';
import { UnifiedReport } from '@/types/unified-report';

describe('CLI', () => {
  const originalEnv = process.env;
  const report: UnifiedReport = {
    id: 'report-1',
    framework: 'playwright',
    stats: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      startTime: '2026-05-10T10:00:00.000Z',
    },
    suites: [],
    createdAt: '2026-05-10T10:00:00.000Z',
  };

  let converter: Converter;

  beforeEach(() => {
    process.env = { ...originalEnv };
    converter = {
      getAvailableProviders: jest.fn().mockReturnValue(['playwright']),
      convertAndSave: jest.fn().mockResolvedValue(report),
    } as unknown as Converter;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('should parse conversion and webhook options into converter options', async () => {
    const program = createProgram(converter);

    await program.parseAsync([
      'node',
      'cli',
      '--input',
      'input.json',
      '--type',
      'playwright',
      '--output',
      'output.json',
      '--stdout',
      '--webhook',
      'https://example.com/webhook',
      '--headers',
      '{"X-Team":"qa"}',
      '--method',
      'PUT',
      '--timeout',
      '5000',
      '--retries',
      '2',
      '--retry-delay',
      '50',
      '--no-verify-ssl',
    ]);

    expect(converter.convertAndSave).toHaveBeenCalledWith({
      input: 'input.json',
      output: 'output.json',
      provider: 'playwright',
      stdout: true,
      webhook: {
        url: 'https://example.com/webhook',
        method: 'PUT',
        timeout: 5000,
        retries: 2,
        retryDelay: 50,
        verifySSL: false,
        headers: {
          'X-Team': 'qa',
        },
      },
    });
  });

  it('should use TEST_PORTAL_URL as webhook fallback', async () => {
    process.env.TEST_PORTAL_URL = 'https://example.com/from-env';
    const program = createProgram(converter);

    await program.parseAsync([
      'node',
      'cli',
      '--input',
      'input.json',
      '--type',
      'playwright',
    ]);

    expect(converter.convertAndSave).toHaveBeenCalledWith(
      expect.objectContaining({
        webhook: expect.objectContaining({
          url: 'https://example.com/from-env',
        }),
      })
    );
  });

  it('should report invalid header JSON and exit without conversion', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(code => {
      throw new Error(`process.exit ${code}`);
    });
    const program = createProgram(converter);

    await expect(
      program.parseAsync([
        'node',
        'cli',
        '--input',
        'input.json',
        '--type',
        'playwright',
        '--webhook',
        'https://example.com/webhook',
        '--headers',
        '{bad-json',
      ])
    ).rejects.toThrow('process.exit 1');

    expect(console.error).toHaveBeenCalledWith(
      '❌ Invalid JSON format for headers:',
      '{bad-json'
    );
    expect(converter.convertAndSave).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should report conversion failures and exit non-zero', async () => {
    jest
      .spyOn(converter, 'convertAndSave')
      .mockRejectedValueOnce(new Error('conversion failed'));
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(code => {
      throw new Error(`process.exit ${code}`);
    });
    const program = createProgram(converter);

    await expect(
      program.parseAsync([
        'node',
        'cli',
        '--input',
        'input.json',
        '--type',
        'playwright',
      ])
    ).rejects.toThrow('process.exit 1');

    expect(console.error).toHaveBeenCalledWith(
      '❌ Error:',
      'conversion failed'
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
