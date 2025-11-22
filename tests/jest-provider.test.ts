import { JestProvider } from '@/providers/jest';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('JestProvider', () => {
  let provider: JestProvider;
  let testDataDir: string;

  beforeEach(() => {
    provider = new JestProvider();
    testDataDir = join(
      __dirname,
      'test-data',
      `jest-${Date.now()}-${Math.random()}`
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
    it('should validate valid jest report', async () => {
      const validReport = {
        numTotalTests: 1,
        numPassedTests: 1,
        numFailedTests: 0,
        testResults: [
          {
            testFilePath: 'some/path',
            assertionResults: [],
          },
        ],
      };

      const testFile = join(testDataDir, 'valid-jest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(validReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(true);
    });

    it('should reject invalid jest report', async () => {
      const invalidReport = { invalid: 'structure' };

      const testFile = join(testDataDir, 'invalid-jest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(invalidReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });

    it('should reject non-existent file', async () => {
      const isValid = await provider.validate('./non-existent.json');
      expect(isValid).toBe(false);
    });

    it('should reject report missing numTotalTests', async () => {
      const invalidReport = {
        numPassedTests: 1,
        numFailedTests: 0,
        testResults: [],
      };

      const testFile = join(testDataDir, 'missing-total.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(invalidReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });

    it('should reject report missing testResults', async () => {
      const invalidReport = {
        numTotalTests: 1,
        numPassedTests: 1,
        numFailedTests: 0,
      };

      const testFile = join(testDataDir, 'missing-results.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(invalidReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });
  });

  describe('convert', () => {
    it('should convert basic jest report with passing tests', async () => {
      const jestReport = {
        numTotalTests: 2,
        numPassedTests: 2,
        numFailedTests: 0,
        numPendingTests: 0,
        numTodoTests: 0,
        startTime: 1703847600123,
        testResults: [
          {
            testFilePath: '/project/tests/example.test.js',
            numFailingTests: 0,
            numPassingTests: 2,
            numPendingTests: 0,
            numTodoTests: 0,
            perfStats: {
              start: 1703847600123,
              end: 1703847601123,
              runtime: 1000,
            },
            assertionResults: [
              {
                ancestorTitles: ['Test Suite'],
                title: 'should pass test 1',
                fullName: 'Test Suite should pass test 1',
                status: 'passed',
                duration: 450,
                failureMessages: [],
              },
              {
                ancestorTitles: ['Test Suite'],
                title: 'should pass test 2',
                fullName: 'Test Suite should pass test 2',
                status: 'passed',
                duration: 550,
                failureMessages: [],
              },
            ],
          },
        ],
      };

      const testFile = join(testDataDir, 'jest-report.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(jestReport), 'utf8');

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.tool.name).toBe('jest');
      expect(ctrfReport.results.tests).toHaveLength(2);
      expect(ctrfReport.results.tests[0]?.name).toBe(
        'Test Suite should pass test 1'
      );
      expect(ctrfReport.results.tests[0]?.status).toBe('passed');
      expect(ctrfReport.results.tests[0]?.duration).toBe(450);
      expect(ctrfReport.results.tests[1]?.name).toBe(
        'Test Suite should pass test 2'
      );
    });

    it('should handle failed tests with error extraction', async () => {
      const jestReport = {
        numTotalTests: 2,
        numPassedTests: 1,
        numFailedTests: 1,
        numPendingTests: 0,
        numTodoTests: 0,
        startTime: 1703847600123,
        testResults: [
          {
            testFilePath: '/project/tests/example.test.js',
            numFailingTests: 1,
            numPassingTests: 1,
            numPendingTests: 0,
            numTodoTests: 0,
            perfStats: {
              start: 1703847600123,
              end: 1703847601123,
              runtime: 1000,
            },
            assertionResults: [
              {
                ancestorTitles: ['Test Suite'],
                title: 'should pass',
                fullName: 'Test Suite should pass',
                status: 'passed',
                duration: 450,
                failureMessages: [],
              },
              {
                ancestorTitles: ['Test Suite'],
                title: 'should fail',
                fullName: 'Test Suite should fail',
                status: 'failed',
                duration: 550,
                failureMessages: [
                  'expect(received).toBe(expected)\n\nExpected: 200\nReceived: 500\n\n  at Object.<anonymous> (/project/tests/example.test.js:25:29)',
                ],
              },
            ],
          },
        ],
      };

      const testFile = join(testDataDir, 'jest-report-failed.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(jestReport), 'utf8');

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.summary.failed).toBe(1);
      expect(ctrfReport.results.tests[1]?.status).toBe('failed');
      expect(ctrfReport.results.tests[1]?.message).toBeDefined();
      expect(ctrfReport.results.tests[1]?.message).toContain(
        'expect(received).toBe(expected)'
      );
    });
  });
});
