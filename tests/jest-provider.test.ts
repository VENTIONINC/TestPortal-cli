// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

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
        testResults: [],
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
    it('should handle todo tests', async () => {
      const jestReport = {
        numTotalTests: 1,
        numPassedTests: 0,
        numFailedTests: 0,
        numPendingTests: 0,
        numTodoTests: 1,
        startTime: 1703847600123,
        testResults: [
          {
            testFilePath: '/project/tests/todo.test.js',
            numFailingTests: 0,
            numPassingTests: 0,
            numPendingTests: 0,
            numTodoTests: 1,
            perfStats: {
              start: 1703847600123,
              end: 1703847601123,
              runtime: 1000,
            },
            assertionResults: [
              {
                ancestorTitles: ['Test Suite'],
                title: 'should be todo',
                fullName: 'Test Suite should be todo',
                status: 'todo',
                duration: 0,
                failureMessages: [],
              },
            ],
          },
        ],
      };

      const testFile = join(testDataDir, 'jest-todo.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(jestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.stats.todo).toBe(1);
      expect(unifiedReport.suites[0]?.tests[0]?.status).toBe('todo');
    });

    it('should handle skipped tests', async () => {
      const jestReport = {
        numTotalTests: 1,
        numPassedTests: 0,
        numFailedTests: 0,
        numPendingTests: 1,
        numTodoTests: 0,
        startTime: 1703847600123,
        testResults: [
          {
            testFilePath: '/project/tests/skipped.test.js',
            numFailingTests: 0,
            numPassingTests: 0,
            numPendingTests: 1,
            numTodoTests: 0,
            perfStats: {
              start: 1703847600123,
              end: 1703847601123,
              runtime: 1000,
            },
            assertionResults: [
              {
                ancestorTitles: ['Test Suite'],
                title: 'should be skipped',
                fullName: 'Test Suite should be skipped',
                status: 'pending',
                duration: 0,
                failureMessages: [],
              },
            ],
          },
        ],
      };

      const testFile = join(testDataDir, 'jest-skipped.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(jestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.stats.skipped).toBe(1);
      expect(unifiedReport.suites[0]?.tests[0]?.status).toBe('skipped');
    });

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

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.framework).toBe('jest');
      expect(unifiedReport.suites).toHaveLength(1);
      expect(unifiedReport.suites[0]?.tests).toHaveLength(2);
      expect(unifiedReport.suites[0]?.tests[0]?.name).toBe(
        'should pass test 1'
      );
      expect(unifiedReport.suites[0]?.tests[0]?.status).toBe('passed');
      expect(unifiedReport.suites[0]?.tests[0]?.duration).toBe(450);
      expect(unifiedReport.suites[0]?.tests[1]?.name).toBe(
        'should pass test 2'
      );
      expect(unifiedReport.suites[0]?.tests[1]?.status).toBe('passed');
      expect(unifiedReport.stats.total).toBe(2);
      expect(unifiedReport.stats.passed).toBe(2);
      expect(unifiedReport.stats.failed).toBe(0);
    });

    it('should convert jest report with failed tests and error messages', async () => {
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

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites).toHaveLength(1);
      expect(unifiedReport.suites[0]?.tests).toHaveLength(2);

      const failedTest = unifiedReport.suites[0]?.tests[1];
      expect(failedTest?.status).toBe('failed');
      expect(failedTest?.results[0]?.errors?.[0]?.message).toBe(
        'expect(received).toBe(expected)'
      );
      expect(failedTest?.results[0]?.errors?.[0]?.stack).toContain(
        'Expected: 200'
      );
      expect(failedTest?.results[0]?.errors?.[0]?.stack).toContain(
        'Received: 500'
      );
      expect(failedTest?.results[0]?.errors?.[0]?.stack).toContain(
        '/project/tests/example.test.js:25:29'
      );

      expect(unifiedReport.stats.total).toBe(2);
      expect(unifiedReport.stats.passed).toBe(1);
      expect(unifiedReport.stats.failed).toBe(1);
    });

    it('should convert jest report with pending tests', async () => {
      const jestReport = {
        numTotalTests: 2,
        numPassedTests: 1,
        numFailedTests: 0,
        numPendingTests: 1,
        numTodoTests: 0,
        startTime: 1703847600123,
        testResults: [
          {
            testFilePath: '/project/tests/example.test.js',
            numFailingTests: 0,
            numPassingTests: 1,
            numPendingTests: 1,
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
                title: 'should be pending',
                fullName: 'Test Suite should be pending',
                status: 'pending',
                duration: 0,
                failureMessages: [],
              },
            ],
          },
        ],
      };

      const testFile = join(testDataDir, 'jest-report-pending.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(jestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.tests).toHaveLength(2);
      expect(unifiedReport.suites[0]?.tests[1]?.status).toBe('skipped');
      expect(unifiedReport.stats.skipped).toBe(1);
      expect(unifiedReport.stats.passed).toBe(1);
    });

    it('should convert jest report with todo tests', async () => {
      const jestReport = {
        numTotalTests: 2,
        numPassedTests: 1,
        numFailedTests: 0,
        numPendingTests: 0,
        numTodoTests: 1,
        startTime: 1703847600123,
        testResults: [
          {
            testFilePath: '/project/tests/example.test.js',
            numFailingTests: 0,
            numPassingTests: 1,
            numPendingTests: 0,
            numTodoTests: 1,
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
                title: 'should be todo',
                fullName: 'Test Suite should be todo',
                status: 'todo',
                duration: 0,
                failureMessages: [],
              },
            ],
          },
        ],
      };

      const testFile = join(testDataDir, 'jest-report-todo.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(jestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.tests).toHaveLength(2);
      expect(unifiedReport.suites[0]?.tests[1]?.status).toBe('todo');
      expect(unifiedReport.stats.todo).toBe(1);
    });

    it('should handle multiple test suites', async () => {
      const jestReport = {
        numTotalTests: 4,
        numPassedTests: 4,
        numFailedTests: 0,
        numPendingTests: 0,
        numTodoTests: 0,
        startTime: 1703847600123,
        testResults: [
          {
            testFilePath: '/project/tests/suite1.test.js',
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
                ancestorTitles: ['Suite 1'],
                title: 'test 1',
                fullName: 'Suite 1 test 1',
                status: 'passed',
                duration: 450,
                failureMessages: [],
              },
              {
                ancestorTitles: ['Suite 1'],
                title: 'test 2',
                fullName: 'Suite 1 test 2',
                status: 'passed',
                duration: 550,
                failureMessages: [],
              },
            ],
          },
          {
            testFilePath: '/project/tests/suite2.test.js',
            numFailingTests: 0,
            numPassingTests: 2,
            numPendingTests: 0,
            numTodoTests: 0,
            perfStats: {
              start: 1703847601123,
              end: 1703847602123,
              runtime: 1000,
            },
            assertionResults: [
              {
                ancestorTitles: ['Suite 2'],
                title: 'test 3',
                fullName: 'Suite 2 test 3',
                status: 'passed',
                duration: 300,
                failureMessages: [],
              },
              {
                ancestorTitles: ['Suite 2'],
                title: 'test 4',
                fullName: 'Suite 2 test 4',
                status: 'passed',
                duration: 700,
                failureMessages: [],
              },
            ],
          },
        ],
      };

      const testFile = join(testDataDir, 'jest-report-multi.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(jestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites).toHaveLength(2);
      expect(unifiedReport.suites[0]?.tests).toHaveLength(2);
      expect(unifiedReport.suites[1]?.tests).toHaveLength(2);
      expect(unifiedReport.stats.total).toBe(4);
      expect(unifiedReport.stats.passed).toBe(4);
    });

    it('should extract suite names from file paths', async () => {
      const jestReport = {
        numTotalTests: 1,
        numPassedTests: 1,
        numFailedTests: 0,
        numPendingTests: 0,
        numTodoTests: 0,
        startTime: 1703847600123,
        testResults: [
          {
            testFilePath: '/project/src/__tests__/auth.test.js',
            numFailingTests: 0,
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
                ancestorTitles: ['Auth'],
                title: 'should authenticate',
                fullName: 'Auth should authenticate',
                status: 'passed',
                duration: 450,
                failureMessages: [],
              },
            ],
          },
        ],
      };

      const testFile = join(testDataDir, 'jest-report-path.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(jestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.name).toBe('auth');
    });

    it('should handle skipped test files', async () => {
      const jestReport = {
        numTotalTests: 0,
        numPassedTests: 0,
        numFailedTests: 0,
        numPendingTests: 0,
        numTodoTests: 0,
        startTime: 1703847600123,
        testResults: [
          {
            testFilePath: '/project/tests/skipped.test.js',
            numFailingTests: 0,
            numPassingTests: 0,
            numPendingTests: 0,
            numTodoTests: 0,
            skipped: true,
            perfStats: {
              start: 1703847600123,
              end: 1703847600123,
              runtime: 0,
            },
            testResults: [],
          },
        ],
      };

      const testFile = join(testDataDir, 'jest-report-skipped.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(jestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites).toHaveLength(0);
      expect(unifiedReport.stats.total).toBe(0);
    });

    it('should calculate stats correctly', async () => {
      const jestReport = {
        numTotalTests: 5,
        numPassedTests: 2,
        numFailedTests: 2,
        numPendingTests: 1,
        numTodoTests: 0,
        startTime: 1703847600123,
        wasInterrupted: false,
        testResults: [
          {
            testFilePath: '/project/tests/example.test.js',
            numFailingTests: 2,
            numPassingTests: 2,
            numPendingTests: 1,
            numTodoTests: 0,
            perfStats: {
              start: 1703847600123,
              end: 1703847603123,
              runtime: 3000,
            },
            assertionResults: [
              {
                ancestorTitles: [],
                title: 't1',
                fullName: 't1',
                status: 'passed',
                duration: 100,
                failureMessages: [],
              },
              {
                ancestorTitles: [],
                title: 't2',
                fullName: 't2',
                status: 'passed',
                duration: 200,
                failureMessages: [],
              },
              {
                ancestorTitles: [],
                title: 't3',
                fullName: 't3',
                status: 'failed',
                duration: 150,
                failureMessages: ['error'],
              },
              {
                ancestorTitles: [],
                title: 't4',
                fullName: 't4',
                status: 'failed',
                duration: 250,
                failureMessages: ['error'],
              },
              {
                ancestorTitles: [],
                title: 't5',
                fullName: 't5',
                status: 'pending',
                duration: 0,
                failureMessages: [],
              },
            ],
          },
        ],
      };

      const testFile = join(testDataDir, 'jest-report-stats.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(jestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.stats.total).toBe(5);
      expect(unifiedReport.stats.passed).toBe(2);
      expect(unifiedReport.stats.failed).toBe(2);
      expect(unifiedReport.stats.skipped).toBe(1);
    });

    it('should handle tests without duration', async () => {
      const jestReport = {
        numTotalTests: 1,
        numPassedTests: 1,
        numFailedTests: 0,
        numPendingTests: 0,
        numTodoTests: 0,
        startTime: 1703847600123,
        testResults: [
          {
            testFilePath: '/project/tests/example.test.js',
            numFailingTests: 0,
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
                failureMessages: [],
              },
            ],
          },
        ],
      };

      const testFile = join(testDataDir, 'jest-report-no-duration.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(jestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.tests[0]?.duration).toBeUndefined();
    });

    it('should handle interrupted test runs', async () => {
      const jestReport = {
        numTotalTests: 2,
        numPassedTests: 1,
        numFailedTests: 0,
        numPendingTests: 0,
        numTodoTests: 0,
        startTime: 1703847600123,
        wasInterrupted: true,
        testResults: [
          {
            testFilePath: '/project/tests/example.test.js',
            numFailingTests: 0,
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
                ancestorTitles: [],
                title: 'should pass',
                fullName: 'should pass',
                status: 'passed',
                duration: 450,
                failureMessages: [],
              },
            ],
          },
        ],
      };

      const testFile = join(testDataDir, 'jest-report-interrupted.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(jestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.stats.interrupted).toBeGreaterThanOrEqual(0);
    });

    it('should extract error location from stack traces', async () => {
      const jestReport = {
        numTotalTests: 1,
        numPassedTests: 0,
        numFailedTests: 1,
        numPendingTests: 0,
        numTodoTests: 0,
        startTime: 1703847600123,
        testResults: [
          {
            testFilePath: '/project/tests/example.test.js',
            numFailingTests: 1,
            numPassingTests: 0,
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
                title: 'should fail with location',
                fullName: 'Test Suite should fail with location',
                status: 'failed',
                duration: 450,
                failureMessages: [
                  'Error: Something went wrong\n    at Object.<anonymous> (/project/tests/example.test.js:42:15)',
                ],
              },
            ],
          },
        ],
      };

      const testFile = join(testDataDir, 'jest-report-location.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(jestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      const failedTest = unifiedReport.suites[0]?.tests[0];
      expect(failedTest?.results[0]?.errors?.[0]?.location?.file).toBe(
        '/project/tests/example.test.js'
      );
      expect(failedTest?.results[0]?.errors?.[0]?.location?.line).toBe(42);
    });

    it('should handle coverage data', async () => {
      const jestReport = {
        numTotalTests: 1,
        numPassedTests: 1,
        numFailedTests: 0,
        numPendingTests: 0,
        numTodoTests: 0,
        startTime: 1703847600123,
        testResults: [
          {
            testFilePath: '/project/tests/example.test.js',
            numFailingTests: 0,
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
                ancestorTitles: [],
                title: 'should pass',
                fullName: 'should pass',
                status: 'passed',
                duration: 450,
                failureMessages: [],
              },
            ],
          },
        ],
        coverageMap: {
          '/project/src/app.js': {
            path: '/project/src/app.js',
            s: { '0': 10, '1': 5 },
            f: { '0': 8 },
            b: { '0': [3, 2] },
          },
        },
      };

      const testFile = join(testDataDir, 'jest-report-coverage.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(jestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.coverage).toBeDefined();
      expect(unifiedReport.coverage?.statements).toBeDefined();
      expect(unifiedReport.coverage?.functions).toBeDefined();
      expect(unifiedReport.coverage?.branches).toBeDefined();
    });

    it('should set attempt number correctly', async () => {
      const jestReport = {
        numTotalTests: 1,
        numPassedTests: 1,
        numFailedTests: 0,
        numPendingTests: 0,
        numTodoTests: 0,
        startTime: 1703847600123,
        testResults: [
          {
            testFilePath: '/project/tests/example.test.js',
            numFailingTests: 0,
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
                ancestorTitles: [],
                title: 'should pass',
                fullName: 'should pass',
                status: 'passed',
                duration: 450,
                failureMessages: [],
                invocations: 2,
              },
            ],
          },
        ],
      };

      const testFile = join(testDataDir, 'jest-report-attempts.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(jestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      // Jest provider creates single attempt per test
      expect(unifiedReport.suites[0]?.tests[0]?.results).toHaveLength(1);
      expect(unifiedReport.suites[0]?.tests[0]?.results[0]?.attemptNumber).toBe(
        1
      );
    });
  });
});
