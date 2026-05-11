// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { VitestProvider } from '@/providers/vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { convertUnifiedToCTRF } from '@/utils/ctrf-converter';

describe('VitestProvider', () => {
  let provider: VitestProvider;
  let testDataDir: string;

  beforeEach(() => {
    provider = new VitestProvider();
    testDataDir = join(
      __dirname,
      'test-data',
      `vitest-${Date.now()}-${Math.random()}`
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
    it('should validate valid vitest report', async () => {
      const validReport = {
        numTotalTestSuites: 2,
        numPassedTestSuites: 1,
        numFailedTestSuites: 1,
        numPendingTestSuites: 0,
        numTotalTests: 4,
        numPassedTests: 2,
        numFailedTests: 1,
        numPendingTests: 1,
        numTodoTests: 0,
        snapshot: {
          added: 0,
          failure: false,
          filesAdded: 0,
          filesRemoved: 0,
          filesRemovedList: [],
          filesUnmatched: 0,
          filesUpdated: 0,
          matched: 0,
          total: 0,
          unchecked: 0,
          uncheckedKeysByFile: [],
          unmatched: 0,
          updated: 0,
          didUpdate: false,
        },
        startTime: 1761646529949,
        success: false,
        testResults: [],
      };

      const testFile = join(testDataDir, 'valid-vitest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(validReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(true);
    });

    it('should reject invalid vitest report', async () => {
      const invalidReport = { invalid: 'structure' };

      const testFile = join(testDataDir, 'invalid-vitest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(invalidReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });

    it('should reject non-existent file', async () => {
      const isValid = await provider.validate('./non-existent.json');
      expect(isValid).toBe(false);
    });

    it('should reject report missing required fields', async () => {
      const incompleteReport = {
        numTotalTests: 4,
        testResults: [],
        // Missing numPassedTests and numFailedTests
      };

      const testFile = join(testDataDir, 'incomplete-vitest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(incompleteReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });
  });

  describe('convert', () => {
    it('should handle skipped tests', async () => {
      const vitestReport = {
        numTotalTestSuites: 1,
        numPassedTestSuites: 1,
        numFailedTestSuites: 0,
        numPendingTestSuites: 0,
        numTotalTests: 1,
        numPassedTests: 0,
        numFailedTests: 0,
        numPendingTests: 1,
        numTodoTests: 0,
        snapshot: {
          added: 0,
          failure: false,
          filesAdded: 0,
          filesRemoved: 0,
          filesRemovedList: [],
          filesUnmatched: 0,
          filesUpdated: 0,
          matched: 0,
          total: 0,
          unchecked: 0,
          uncheckedKeysByFile: [],
          unmatched: 0,
          updated: 0,
          didUpdate: false,
        },
        startTime: 1761646529949,
        success: true,
        testResults: [
          {
            assertionResults: [
              {
                ancestorTitles: [],
                fullName: 'should be skipped',
                status: 'pending',
                title: 'should be skipped',
                duration: 0,
                failureMessages: [],
                meta: {},
              },
            ],
            startTime: 1761646530086,
            endTime: 1761646530086.78,
            status: 'passed',
            message: '',
            name: '/Users/test/skipped.test.ts',
          },
        ],
      };

      const testFile = join(testDataDir, 'vitest-skipped.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(vitestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.stats.skipped).toBe(1);
      expect(unifiedReport.suites[0]?.tests[0]?.status).toBe('skipped');
    });

    it('should convert basic vitest report to unified report', async () => {
      const vitestReport = {
        numTotalTestSuites: 1,
        numPassedTestSuites: 1,
        numFailedTestSuites: 0,
        numPendingTestSuites: 0,
        numTotalTests: 1,
        numPassedTests: 1,
        numFailedTests: 0,
        numPendingTests: 0,
        numTodoTests: 0,
        snapshot: {
          added: 0,
          failure: false,
          filesAdded: 0,
          filesRemoved: 0,
          filesRemovedList: [],
          filesUnmatched: 0,
          filesUpdated: 0,
          matched: 0,
          total: 0,
          unchecked: 0,
          uncheckedKeysByFile: [],
          unmatched: 0,
          updated: 0,
          didUpdate: false,
        },
        startTime: 1761646529949,
        success: true,
        testResults: [
          {
            assertionResults: [
              {
                ancestorTitles: [],
                fullName: 'adds 1 + 2 to equal 3',
                status: 'passed',
                title: 'adds 1 + 2 to equal 3',
                duration: 0.78,
                failureMessages: [],
                meta: {},
              },
            ],
            startTime: 1761646530086,
            endTime: 1761646530086.78,
            status: 'passed',
            message: '',
            name: '/Users/test/sum.test.ts',
          },
        ],
      };

      const testFile = join(testDataDir, 'vitest-report.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(vitestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.framework).toBe('vitest');
      expect(unifiedReport.suites).toHaveLength(1);
      expect(unifiedReport.suites[0]?.tests).toHaveLength(1);
      expect(unifiedReport.suites[0]?.tests[0]?.name).toBe(
        'adds 1 + 2 to equal 3'
      );
      expect(unifiedReport.suites[0]?.tests[0]?.status).toBe('passed');
      expect(unifiedReport.suites[0]?.tests[0]?.duration).toBe(0.78);
      expect(unifiedReport.stats.total).toBe(1);
      expect(unifiedReport.stats.passed).toBe(1);
      expect(unifiedReport.stats.failed).toBe(0);
    });

    it('should handle failed tests with error messages', async () => {
      const vitestReport = {
        numTotalTestSuites: 1,
        numPassedTestSuites: 0,
        numFailedTestSuites: 1,
        numPendingTestSuites: 0,
        numTotalTests: 1,
        numPassedTests: 0,
        numFailedTests: 1,
        numPendingTests: 0,
        numTodoTests: 0,
        snapshot: {
          added: 0,
          failure: false,
          filesAdded: 0,
          filesRemoved: 0,
          filesRemovedList: [],
          filesUnmatched: 0,
          filesUpdated: 0,
          matched: 0,
          total: 0,
          unchecked: 0,
          uncheckedKeysByFile: [],
          unmatched: 0,
          updated: 0,
          didUpdate: false,
        },
        startTime: 1761646529949,
        success: false,
        testResults: [
          {
            assertionResults: [
              {
                ancestorTitles: [],
                fullName: 'subtraction 0 - 4 to equal -4',
                status: 'failed',
                title: 'subtraction 0 - 4 to equal -4',
                duration: 3.19,
                failureMessages: [
                  'AssertionError: expected 100 to be -4 // Object.is equality\n    at /Users/test/subtraction.test.ts:14:29',
                ],
                meta: {},
              },
            ],
            startTime: 1761646530086,
            endTime: 1761646530090.19,
            status: 'failed',
            message: '',
            name: '/Users/test/subtraction.test.ts',
          },
        ],
      };

      const testFile = join(testDataDir, 'failed-vitest-report.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(vitestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.tests[0]?.status).toBe('failed');
      expect(
        unifiedReport.suites[0]?.tests[0]?.results[0]?.errors
      ).toBeDefined();
      expect(
        unifiedReport.suites[0]?.tests[0]?.results[0]?.errors?.[0]?.message
      ).toContain('AssertionError');
    });

    it('should handle skipped tests', async () => {
      const vitestReport = {
        numTotalTestSuites: 1,
        numPassedTestSuites: 0,
        numFailedTestSuites: 0,
        numPendingTestSuites: 1,
        numTotalTests: 1,
        numPassedTests: 0,
        numFailedTests: 0,
        numPendingTests: 1,
        numTodoTests: 0,
        snapshot: {
          added: 0,
          failure: false,
          filesAdded: 0,
          filesRemoved: 0,
          filesRemovedList: [],
          filesUnmatched: 0,
          filesUpdated: 0,
          matched: 0,
          total: 0,
          unchecked: 0,
          uncheckedKeysByFile: [],
          unmatched: 0,
          updated: 0,
          didUpdate: false,
        },
        startTime: 1761646529949,
        success: true,
        testResults: [
          {
            assertionResults: [
              {
                ancestorTitles: [],
                fullName: 'subtraction 4 - 0 to equal 0',
                status: 'skipped',
                title: 'subtraction 4 - 0 to equal 0',
                failureMessages: [],
                meta: {},
              },
            ],
            startTime: 1761646530086,
            endTime: 1761646530086.5,
            status: 'passed',
            message: '',
            name: '/Users/test/subtraction.test.ts',
          },
        ],
      };

      const testFile = join(testDataDir, 'skipped-vitest-report.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(vitestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.tests[0]?.status).toBe('skipped');
    });

    it('should extract suite name from file path', async () => {
      const vitestReport = {
        numTotalTestSuites: 1,
        numPassedTestSuites: 1,
        numFailedTestSuites: 0,
        numPendingTestSuites: 0,
        numTotalTests: 1,
        numPassedTests: 1,
        numFailedTests: 0,
        numPendingTests: 0,
        numTodoTests: 0,
        snapshot: {
          added: 0,
          failure: false,
          filesAdded: 0,
          filesRemoved: 0,
          filesRemovedList: [],
          filesUnmatched: 0,
          filesUpdated: 0,
          matched: 0,
          total: 0,
          unchecked: 0,
          uncheckedKeysByFile: [],
          unmatched: 0,
          updated: 0,
          didUpdate: false,
        },
        startTime: 1761646529949,
        success: true,
        testResults: [
          {
            assertionResults: [
              {
                ancestorTitles: [],
                fullName: 'test',
                status: 'passed',
                title: 'test',
                duration: 1,
                failureMessages: [],
                meta: {},
              },
            ],
            startTime: 1761646530086,
            endTime: 1761646530087,
            status: 'passed',
            message: '',
            name: '/Users/test/features/auth.test.ts',
          },
        ],
      };

      const testFile = join(testDataDir, 'named-vitest-report.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(vitestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.name).toBe('auth');
    });

    it('should set framework name in CTRF output', async () => {
      const vitestReport = {
        numTotalTestSuites: 1,
        numPassedTestSuites: 1,
        numFailedTestSuites: 0,
        numPendingTestSuites: 0,
        numTotalTests: 1,
        numPassedTests: 1,
        numFailedTests: 0,
        numPendingTests: 0,
        numTodoTests: 0,
        snapshot: {
          added: 0,
          failure: false,
          filesAdded: 0,
          filesRemoved: 0,
          filesRemovedList: [],
          filesUnmatched: 0,
          filesUpdated: 0,
          matched: 0,
          total: 0,
          unchecked: 0,
          uncheckedKeysByFile: [],
          unmatched: 0,
          updated: 0,
          didUpdate: false,
        },
        startTime: 1761646529949,
        success: true,
        testResults: [
          {
            assertionResults: [
              {
                ancestorTitles: [],
                fullName: 'test',
                status: 'passed',
                title: 'test',
                duration: 1,
                failureMessages: [],
                meta: {},
              },
            ],
            startTime: 1761646530086,
            endTime: 1761646530087,
            status: 'passed',
            message: '',
            name: '/Users/test/test.ts',
          },
        ],
      };

      const testFile = join(testDataDir, 'framework-vitest-report.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(vitestReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);
      const ctrfReport = await convertUnifiedToCTRF(unifiedReport);

      expect(ctrfReport.results.tool.name).toBe('vitest');
    });
  });
});
