// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { PlaywrightProvider } from '@/providers/playwright';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('PlaywrightProvider', () => {
  let provider: PlaywrightProvider;
  let testDataDir: string;

  beforeEach(() => {
    provider = new PlaywrightProvider();
    testDataDir = join(
      __dirname,
      'test-data',
      `playwright-${Date.now()}-${Math.random()}`
    );
  });

  afterEach(async () => {
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('validate', () => {
    it('should validate valid playwright report', async () => {
      const validReport = {
        config: { version: '1.43.0' },
        suites: [],
      };

      const testFile = join(testDataDir, 'valid-playwright.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(validReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(true);
    });

    it('should reject invalid playwright report', async () => {
      const invalidReport = { invalid: 'structure' };

      const testFile = join(testDataDir, 'invalid-playwright.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(invalidReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });

    it('should reject non-existent file', async () => {
      const isValid = await provider.validate('./non-existent.json');
      expect(isValid).toBe(false);
    });
  });

  describe('convert', () => {
    it('should handle skipped tests', async () => {
      const playwrightReport = {
        config: {
          version: '1.43.0',
        },
        suites: [
          {
            title: 'Test Suite',
            file: 'test.spec.ts',
            line: 1,
            column: 1,
            specs: [
              {
                title: 'should be skipped',
                ok: true,
                tags: [],
                id: 'test-1',
                file: 'test.spec.ts',
                line: 5,
                column: 3,
                tests: [
                  {
                    timeout: 30000,
                    expectedStatus: 'skipped',
                    status: 'skipped',
                    results: [
                      {
                        workerIndex: 0,
                        status: 'skipped',
                        duration: 0,
                        retry: 0,
                        startTime: '2024-01-01T00:00:00.000Z',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        stats: {
          startTime: '2024-01-01T00:00:00.000Z',
          duration: 1000,
        },
      };

      const testFile = join(testDataDir, 'playwright-skipped.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(playwrightReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.stats.skipped).toBe(1);
      expect(unifiedReport.suites[0]?.tests[0]?.status).toBe('skipped');
    });

    it('should convert basic playwright report to unified report', async () => {
      const playwrightReport = {
        config: {
          version: '1.43.0',
        },
        suites: [
          {
            title: 'Test Suite',
            file: 'test.spec.ts',
            line: 1,
            column: 1,
            specs: [
              {
                title: 'should pass',
                ok: true,
                tags: [],
                id: 'test-1',
                file: 'test.spec.ts',
                line: 5,
                column: 3,
                tests: [
                  {
                    timeout: 30000,
                    expectedStatus: 'passed',
                    status: 'passed',
                    results: [
                      {
                        workerIndex: 0,
                        status: 'passed',
                        duration: 1000,
                        retry: 0,
                        startTime: '2024-01-01T00:00:00.000Z',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        stats: {
          startTime: '2024-01-01T00:00:00.000Z',
          duration: 1000,
        },
      };

      const testFile = join(testDataDir, 'playwright-report.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(playwrightReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.framework).toBe('playwright');
      expect(unifiedReport.frameworkVersion).toBe('1.43.0');
      expect(unifiedReport.suites).toHaveLength(1);
      expect(unifiedReport.suites[0]?.tests).toHaveLength(1);
      expect(unifiedReport.suites[0]?.tests[0]?.name).toBe('should pass');
      expect(unifiedReport.suites[0]?.tests[0]?.status).toBe('passed');
      expect(unifiedReport.suites[0]?.tests[0]?.duration).toBe(1000);
    });

    it('should use final attempt status and preserve retry details', async () => {
      const playwrightReport = {
        config: {
          version: '1.43.0',
        },
        suites: [
          {
            title: 'Retry Suite',
            file: 'retry.spec.ts',
            specs: [
              {
                title: 'should pass after retry',
                ok: true,
                tags: ['@smoke'],
                tests: [
                  {
                    projectName: 'chromium',
                    status: 'flaky',
                    results: [
                      {
                        status: 'failed',
                        duration: 100,
                        startTime: '2024-01-01T00:00:00.000Z',
                        errors: [
                          {
                            message: 'first attempt failed',
                            stack: 'stack',
                            location: {
                              file: 'retry.spec.ts',
                              line: 10,
                              column: 5,
                            },
                            snippet: 'expect(value).toBe(true)',
                          },
                        ],
                      },
                      {
                        status: 'passed',
                        duration: 50,
                        startTime: '2024-01-01T00:00:01.000Z',
                      },
                    ],
                  },
                ],
              },
              {
                title: 'should time out',
                ok: false,
                tags: [],
                tests: [
                  {
                    status: 'timedOut',
                    results: [
                      {
                        status: 'timedOut',
                        duration: 30000,
                        startTime: '2024-01-01T00:00:02.000Z',
                      },
                    ],
                  },
                ],
              },
              {
                title: 'should be interrupted',
                ok: false,
                tags: [],
                tests: [
                  {
                    status: 'interrupted',
                    results: [
                      {
                        status: 'interrupted',
                        duration: 1,
                        startTime: '2024-01-01T00:00:03.000Z',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        stats: {
          startTime: '2024-01-01T00:00:00.000Z',
          duration: 31000,
        },
      };

      const testFile = join(testDataDir, 'playwright-retries.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(playwrightReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.tests).toHaveLength(3);
      expect(unifiedReport.suites[0]?.tests[0]).toMatchObject({
        fullName: 'chromium › should pass after retry',
        status: 'passed',
        duration: 150,
        tags: ['@smoke'],
      });
      expect(unifiedReport.suites[0]?.tests[0]?.results).toHaveLength(2);
      expect(
        unifiedReport.suites[0]?.tests[0]?.results[0]?.errors?.[0]?.location
      ).toEqual({
        file: 'retry.spec.ts',
        line: 10,
        column: 5,
      });
      expect(unifiedReport.suites[0]?.tests[1]?.status).toBe('timeout');
      expect(unifiedReport.suites[0]?.tests[2]?.status).toBe('interrupted');
      expect(unifiedReport.stats.timeout).toBe(1);
      expect(unifiedReport.stats.interrupted).toBe(1);
    });
  });
});
