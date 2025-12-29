import { MochaProvider } from '@/providers/mocha';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('MochaProvider', () => {
  let provider: MochaProvider;
  let testDataDir: string;

  beforeEach(() => {
    provider = new MochaProvider();
    testDataDir = join(
      __dirname,
      'test-data',
      `mocha-${Date.now()}-${Math.random()}`
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
    it('should validate valid mocha report', async () => {
      const validReport = {
        stats: {
          suites: 1,
          tests: 2,
          passes: 2,
          pending: 0,
          failures: 0,
        },
        tests: [],
      };

      const testFile = join(testDataDir, 'valid-mocha.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(validReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(true);
    });

    it('should reject invalid mocha report', async () => {
      const invalidReport = { invalid: 'structure' };

      const testFile = join(testDataDir, 'invalid-mocha.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(invalidReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });

    it('should reject non-existent file', async () => {
      const isValid = await provider.validate('./non-existent.json');
      expect(isValid).toBe(false);
    });

    it('should reject report missing stats', async () => {
      const invalidReport = {
        tests: [],
      };

      const testFile = join(testDataDir, 'missing-stats.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(invalidReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });

    it('should reject report with invalid stats', async () => {
      const invalidReport = {
        stats: {
          suites: 1,
          // Missing required fields
        },
        tests: [],
      };

      const testFile = join(testDataDir, 'invalid-stats.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(invalidReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });

    it('should reject report missing tests array', async () => {
      const invalidReport = {
        stats: {
          suites: 1,
          tests: 2,
          passes: 2,
          pending: 0,
          failures: 0,
        },
      };

      const testFile = join(testDataDir, 'missing-tests.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(invalidReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });
  });

  describe('convert', () => {
    it('should convert basic mocha report with passing tests', async () => {
      const mochaReport = {
        stats: {
          suites: 1,
          tests: 2,
          passes: 2,
          pending: 0,
          failures: 0,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:02.000Z',
          duration: 2000,
        },
        tests: [
          {
            title: 'should pass test 1',
            fullTitle: 'Test Suite should pass test 1',
            file: '/project/test/example.test.js',
            duration: 900,
            pass: true,
            fail: false,
          },
          {
            title: 'should pass test 2',
            fullTitle: 'Test Suite should pass test 2',
            file: '/project/test/example.test.js',
            duration: 1100,
            pass: true,
            fail: false,
          },
        ],
      };

      const testFile = join(testDataDir, 'mocha-report.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(mochaReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tool.name).toBe('mocha');
      expect(report.results.tests).toHaveLength(2);
      expect(report.results.tests[0]?.name).toBe('should pass test 1');
      expect(report.results.tests[0]?.status).toBe('passed');
      expect(report.results.tests[0]?.duration).toBe(900);
      expect(report.results.tests[1]?.name).toBe('should pass test 2');
      expect(report.results.tests[1]?.status).toBe('passed');
      expect(report.results.summary.tests).toBe(2);
      expect(report.results.summary.passed).toBe(2);
      expect(report.results.summary.failed).toBe(0);
    });

    it('should convert mocha report with failed tests and error messages', async () => {
      const mochaReport = {
        stats: {
          suites: 1,
          tests: 2,
          passes: 1,
          pending: 0,
          failures: 1,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:02.000Z',
          duration: 2000,
        },
        tests: [
          {
            title: 'should pass',
            fullTitle: 'Test Suite should pass',
            file: '/project/test/example.test.js',
            duration: 450,
            pass: true,
            fail: false,
          },
          {
            title: 'should fail',
            fullTitle: 'Test Suite should fail',
            file: '/project/test/example.test.js',
            duration: 550,
            pass: false,
            fail: true,
            err: {
              message: 'expected 500 to equal 200',
              stack:
                'AssertionError: expected 500 to equal 200\n    at Context.<anonymous> (/project/test/example.test.js:25:29)',
              actual: 500,
              expected: 200,
              operator: 'strictEqual',
              showDiff: true,
            },
          },
        ],
      };

      const testFile = join(testDataDir, 'mocha-report-failed.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(mochaReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests).toHaveLength(2);

      const failedTest = report.results.tests[1];
      expect(failedTest?.status).toBe('failed');
      expect(failedTest?.message).toBe('expected 500 to equal 200');
      expect(failedTest?.trace).toContain('AssertionError');

      expect(report.results.summary.tests).toBe(2);
      expect(report.results.summary.passed).toBe(1);
      expect(report.results.summary.failed).toBe(1);
    });

    it('should convert mocha report with pending tests', async () => {
      const mochaReport = {
        stats: {
          suites: 1,
          tests: 2,
          passes: 1,
          pending: 1,
          failures: 0,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:02.000Z',
          duration: 2000,
        },
        tests: [
          {
            title: 'should pass',
            fullTitle: 'Test Suite should pass',
            file: '/project/test/example.test.js',
            duration: 450,
            pass: true,
            fail: false,
          },
          {
            title: 'should be pending',
            fullTitle: 'Test Suite should be pending',
            file: '/project/test/example.test.js',
            duration: 0,
            pending: true,
          },
        ],
      };

      const testFile = join(testDataDir, 'mocha-report-pending.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(mochaReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests).toHaveLength(2);
      expect(report.results.tests[1]?.status).toBe('pending');
      expect(report.results.summary.pending).toBe(1);
      expect(report.results.summary.passed).toBe(1);
    });

    it('should convert mocha report with skipped tests', async () => {
      const mochaReport = {
        stats: {
          suites: 1,
          tests: 2,
          passes: 1,
          pending: 0,
          failures: 0,
          skipped: 1,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:02.000Z',
          duration: 2000,
        },
        tests: [
          {
            title: 'should pass',
            fullTitle: 'Test Suite should pass',
            file: '/project/test/example.test.js',
            duration: 450,
            pass: true,
            fail: false,
          },
          {
            title: 'should be skipped',
            fullTitle: 'Test Suite should be skipped',
            file: '/project/test/example.test.js',
            duration: 0,
            skipped: true,
          },
        ],
      };

      const testFile = join(testDataDir, 'mocha-report-skipped.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(mochaReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests).toHaveLength(2);
      expect(report.results.tests[1]?.status).toBe('skipped');
      expect(report.results.summary.skipped).toBe(1);
      expect(report.results.summary.passed).toBe(1);
    });

    it('should convert mocha report with timeout tests', async () => {
      const mochaReport = {
        stats: {
          suites: 1,
          tests: 2,
          passes: 1,
          pending: 0,
          failures: 1,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:05.000Z',
          duration: 5000,
        },
        tests: [
          {
            title: 'should pass',
            fullTitle: 'Test Suite should pass',
            file: '/project/test/example.test.js',
            duration: 450,
            pass: true,
            fail: false,
          },
          {
            title: 'should timeout',
            fullTitle: 'Test Suite should timeout',
            file: '/project/test/example.test.js',
            duration: 2000,
            pass: false,
            fail: true,
            timedOut: true,
            err: {
              message: 'Timeout of 2000ms exceeded',
              stack: 'Error: Timeout of 2000ms exceeded',
            },
          },
        ],
      };

      const testFile = join(testDataDir, 'mocha-report-timeout.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(mochaReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests).toHaveLength(2);
      expect(report.results.tests[1]?.status).toBe('failed');
      expect(report.results.summary.failed).toBe(1);
      expect(report.results.summary.passed).toBe(1);
    });

    it('should handle multiple test files in separate suites', async () => {
      const mochaReport = {
        stats: {
          suites: 2,
          tests: 4,
          passes: 4,
          pending: 0,
          failures: 0,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:03.000Z',
          duration: 3000,
        },
        tests: [
          {
            title: 'test 1',
            fullTitle: 'Suite 1 test 1',
            file: '/project/test/suite1.test.js',
            duration: 450,
            pass: true,
          },
          {
            title: 'test 2',
            fullTitle: 'Suite 1 test 2',
            file: '/project/test/suite1.test.js',
            duration: 550,
            pass: true,
          },
          {
            title: 'test 3',
            fullTitle: 'Suite 2 test 3',
            file: '/project/test/suite2.test.js',
            duration: 300,
            pass: true,
          },
          {
            title: 'test 4',
            fullTitle: 'Suite 2 test 4',
            file: '/project/test/suite2.test.js',
            duration: 700,
            pass: true,
          },
        ],
      };

      const testFile = join(testDataDir, 'mocha-report-multi.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(mochaReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests).toHaveLength(4);
      expect(report.results.summary.tests).toBe(4);
      expect(report.results.summary.passed).toBe(4);
    });

    it('should extract suite names from file paths', async () => {
      const mochaReport = {
        stats: {
          suites: 1,
          tests: 1,
          passes: 1,
          pending: 0,
          failures: 0,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:01.000Z',
          duration: 1000,
        },
        tests: [
          {
            title: 'should authenticate',
            fullTitle: 'Auth should authenticate',
            file: '/project/test/auth.test.js',
            duration: 450,
            pass: true,
          },
        ],
      };

      const testFile = join(testDataDir, 'mocha-report-path.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(mochaReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests[0]?.suite).toBe('Auth');
    });

    it('should handle tests without file paths', async () => {
      const mochaReport = {
        stats: {
          suites: 1,
          tests: 1,
          passes: 1,
          pending: 0,
          failures: 0,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:01.000Z',
          duration: 1000,
        },
        tests: [
          {
            title: 'should pass',
            fullTitle: 'Test should pass',
            duration: 450,
            pass: true,
          },
        ],
      };

      const testFile = join(testDataDir, 'mocha-report-no-file.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(mochaReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests[0]?.suite).toBe('Test');
      expect(report.results.tests[0]?.filePath).toBeUndefined();
    });

    it('should handle tests with retries', async () => {
      const mochaReport = {
        stats: {
          suites: 1,
          tests: 1,
          passes: 1,
          pending: 0,
          failures: 0,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:03.000Z',
          duration: 3000,
        },
        tests: [
          {
            title: 'should pass after retry',
            fullTitle: 'Test Suite should pass after retry',
            file: '/project/test/example.test.js',
            duration: 450,
            currentRetry: 2,
            pass: true,
            fail: false,
          },
        ],
      };

      const testFile = join(testDataDir, 'mocha-report-retry.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(mochaReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests[0]?.retry).toBe(2);
      expect(report.results.tests[0]?.status).toBe('passed');
    });

    it('should calculate stats correctly', async () => {
      const mochaReport = {
        stats: {
          suites: 2,
          tests: 5,
          passes: 2,
          pending: 1,
          failures: 2,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:05.000Z',
          duration: 5000,
        },
        tests: [
          {
            title: 't1',
            fullTitle: 't1',
            file: '/project/test/example.test.js',
            duration: 100,
            pass: true,
          },
          {
            title: 't2',
            fullTitle: 't2',
            file: '/project/test/example.test.js',
            duration: 200,
            pass: true,
          },
          {
            title: 't3',
            fullTitle: 't3',
            file: '/project/test/example.test.js',
            duration: 150,
            fail: true,
            err: { message: 'error' },
          },
          {
            title: 't4',
            fullTitle: 't4',
            file: '/project/test/example.test.js',
            duration: 250,
            fail: true,
            err: { message: 'error' },
          },
          {
            title: 't5',
            fullTitle: 't5',
            file: '/project/test/example.test.js',
            duration: 0,
            pending: true,
          },
        ],
      };

      const testFile = join(testDataDir, 'mocha-report-stats.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(mochaReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.summary.tests).toBe(5);
      expect(report.results.summary.passed).toBe(2);
      expect(report.results.summary.failed).toBe(2);
      expect(report.results.summary.pending).toBe(1);
      expect(report.results.summary.stop - report.results.summary.start).toBe(
        5000
      );
    });

    it('should handle tests without duration', async () => {
      const mochaReport = {
        stats: {
          suites: 1,
          tests: 1,
          passes: 1,
          pending: 0,
          failures: 0,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:01.000Z',
          duration: 1000,
        },
        tests: [
          {
            title: 'should pass',
            fullTitle: 'Test Suite should pass',
            file: '/project/test/example.test.js',
            pass: true,
          },
        ],
      };

      const testFile = join(testDataDir, 'mocha-report-no-duration.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(mochaReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests[0]?.duration).toBe(0);
    });

    it('should handle empty test array', async () => {
      const mochaReport = {
        stats: {
          suites: 0,
          tests: 0,
          passes: 0,
          pending: 0,
          failures: 0,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:00.000Z',
          duration: 0,
        },
        tests: [],
      };

      const testFile = join(testDataDir, 'mocha-report-empty.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(mochaReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests).toHaveLength(0);
      expect(report.results.summary.tests).toBe(0);
    });

    it('should handle tests with missing error objects', async () => {
      const mochaReport = {
        stats: {
          suites: 1,
          tests: 1,
          passes: 0,
          pending: 0,
          failures: 1,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:01.000Z',
          duration: 1000,
        },
        tests: [
          {
            title: 'should fail',
            fullTitle: 'Test should fail',
            file: '/project/test/example.test.js',
            duration: 450,
            fail: true,
            err: {},
          },
        ],
      };

      const testFile = join(testDataDir, 'mocha-report-no-error-msg.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(mochaReport), 'utf8');

      const report = await provider.convert(testFile);

      const failedTest = report.results.tests[0];
      expect(failedTest?.status).toBe('failed');
      expect(failedTest?.message).toBeUndefined();
    });
  });
});
