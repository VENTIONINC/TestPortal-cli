import { PlaywrightProvider } from '@/providers/playwright';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('PlaywrightProvider', () => {
  let provider: PlaywrightProvider;
  let testDataDir: string;

  beforeEach(() => {
    provider = new PlaywrightProvider();
    testDataDir = join(__dirname, 'test-data');
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

      await fs.unlink(testFile);
      await fs.rmdir(testDataDir);
    });

    it('should reject invalid playwright report', async () => {
      const invalidReport = { invalid: 'structure' };

      const testFile = join(testDataDir, 'invalid-playwright.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(invalidReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);

      await fs.unlink(testFile);
      await fs.rmdir(testDataDir);
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
            tests: [
              {
                title: 'should pass',
                status: 'passed',
                results: [
                  {
                    duration: 1000,
                    status: 'passed',
                    retry: 0,
                    startTime: '2024-01-01T00:00:00.000Z',
                  },
                ],
                location: {
                  file: 'test.spec.ts',
                  line: 1,
                  column: 1,
                },
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

      await fs.unlink(testFile);
      await fs.rmdir(testDataDir);
    });
  });
});
