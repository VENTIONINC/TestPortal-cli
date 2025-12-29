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

      const report = await provider.convert(testFile);

      expect(report.results.tool.name).toBe('playwright');
      expect(report.results.tool.version).toBe('1.43.0');
      expect(report.results.tests).toHaveLength(1);
      expect(report.results.tests[0]?.name).toBe('should pass');
      expect(report.results.tests[0]?.status).toBe('passed');
      expect(report.results.tests[0]?.duration).toBe(1000);
    });
  });
});
