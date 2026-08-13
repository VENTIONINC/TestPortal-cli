// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { convertUnifiedToCTRF } from '@/utils/ctrf-converter';
import { UnifiedReport } from '@/types/unified-report';

describe('CTRF Converter', () => {
  const mockUnifiedReport: UnifiedReport = {
    id: 'test-id',
    framework: 'vitest',
    frameworkVersion: '1.0.0',
    stats: {
      total: 2,
      passed: 1,
      failed: 1,
      skipped: 0,
      duration: 100,
      startTime: '2025-01-01T00:00:00.000Z',
      endTime: '2025-01-01T00:00:01.000Z',
    },
    suites: [
      {
        id: 'suite-1',
        name: 'Test Suite',
        file: '/path/to/test.ts',
        tests: [
          {
            id: 'test-1',
            name: 'passing test',
            fullName: 'passing test',
            status: 'passed',
            duration: 50,
            results: [
              {
                attemptNumber: 1,
                status: 'passed',
                duration: 50,
              },
            ],
          },
          {
            id: 'test-2',
            name: 'failing test',
            fullName: 'failing test',
            status: 'failed',
            duration: 50,
            results: [
              {
                attemptNumber: 1,
                status: 'failed',
                duration: 50,
                errors: [
                  {
                    message: 'Expected true to be false',
                    stack: 'Error stack trace',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
  };

  describe('convertUnifiedToCTRF', () => {
    it('should convert unified report to CTRF format', async () => {
      const result = await convertUnifiedToCTRF(mockUnifiedReport);

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.results.tool.name).toBe('vitest');
      expect(result.results.tool.version).toBe('1.0.0');
      expect(result.results.summary.tests).toBe(2);
      expect(result.results.summary.passed).toBe(1);
      expect(result.results.summary.failed).toBe(1);
      expect(result.results.tests).toHaveLength(2);
    });

    it('should map todo status to pending in CTRF summary and tests', async () => {
      const todoReport: UnifiedReport = {
        ...mockUnifiedReport,
        stats: {
          ...mockUnifiedReport.stats,
          total: 1,
          passed: 0,
          failed: 0,
          todo: 1,
        },
        suites: [
          {
            id: 'suite-1',
            name: 'Test Suite',
            tests: [
              {
                id: 'test-1',
                name: 'todo test',
                fullName: 'todo test',
                status: 'todo',
                duration: 0,
                results: [],
              },
            ],
          },
        ],
      };

      const result = await convertUnifiedToCTRF(todoReport);

      expect(result.results.summary.pending).toBe(1);
      expect(result.results.summary.other).toBe(0);
      expect(result.results.tests[0]?.status).toBe('pending');
    });

    it('should include environment information', async () => {
      const result = await convertUnifiedToCTRF(mockUnifiedReport);

      expect(result.results.environment).toBeDefined();
    });

    it('should detect GitHub Actions environment', async () => {
      // Mock GitHub Actions environment
      const originalEnv = { ...process.env };

      // Clear other CI vars
      delete process.env.GITLAB_CI;
      delete process.env.JENKINS_URL;
      delete process.env.AZURE_HTTP_USER_AGENT;
      delete process.env.GIT_REPOSITORY_NAME;
      delete process.env.GIT_REPOSITORY_URL;
      delete process.env.GIT_BRANCH_NAME;

      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_WORKFLOW = 'CI';
      process.env.GITHUB_RUN_NUMBER = '123';
      process.env.GITHUB_RUN_ID = '456';
      process.env.GITHUB_REPOSITORY = 'owner/repo';
      process.env.GITHUB_SERVER_URL = 'https://github.com';
      process.env.GITHUB_REF_NAME = 'main';

      const result = await convertUnifiedToCTRF(mockUnifiedReport);

      expect(result.results.environment).toBeDefined();
      expect(result.results.environment?.buildName).toBe('CI');
      expect(result.results.environment?.buildNumber).toBe('123');
      expect(result.results.environment?.repositoryName).toBe('owner/repo');
      expect(result.results.environment?.branchName).toBe('main');
      expect(result.results.environment?.buildUrl).toBe(
        'https://github.com/owner/repo/actions/runs/456'
      );
      expect(result.results.environment?.repositoryUrl).toBe(
        'https://github.com/owner/repo'
      );

      // Restore environment
      process.env = originalEnv;
    });

    it('should detect GitLab CI environment', async () => {
      const originalEnv = { ...process.env };

      // Clear other CI vars
      delete process.env.GITHUB_ACTIONS;
      delete process.env.JENKINS_URL;
      delete process.env.AZURE_HTTP_USER_AGENT;
      delete process.env.GIT_REPOSITORY_NAME;
      delete process.env.GIT_REPOSITORY_URL;
      delete process.env.GIT_BRANCH_NAME;

      process.env.GITLAB_CI = 'true';
      process.env.CI_PROJECT_NAME = 'test-project';
      process.env.CI_PIPELINE_ID = '789';
      process.env.CI_PIPELINE_URL =
        'https://gitlab.com/project/-/pipelines/789';
      process.env.CI_PROJECT_PATH = 'group/project';
      process.env.CI_PROJECT_URL = 'https://gitlab.com/group/project';
      process.env.CI_COMMIT_REF_NAME = 'develop';

      const result = await convertUnifiedToCTRF(mockUnifiedReport);

      expect(result.results.environment).toBeDefined();
      expect(result.results.environment?.buildName).toBe('test-project');
      expect(result.results.environment?.buildNumber).toBe('789');
      expect(result.results.environment?.repositoryName).toBe('group/project');
      expect(result.results.environment?.branchName).toBe('develop');

      process.env = originalEnv;
    });

    it('should handle missing environment gracefully', async () => {
      const originalEnv = { ...process.env };
      // Clear CI environment variables
      delete process.env.GITHUB_ACTIONS;
      delete process.env.GITLAB_CI;
      delete process.env.JENKINS_URL;
      delete process.env.AZURE_HTTP_USER_AGENT;

      const result = await convertUnifiedToCTRF(mockUnifiedReport);

      expect(result.results.environment).toBeDefined();

      process.env = originalEnv;
    });

    it('should map test statuses correctly', async () => {
      const result = await convertUnifiedToCTRF(mockUnifiedReport);

      expect(result.results.tests[0]?.status).toBe('passed');
      expect(result.results.tests[1]?.status).toBe('failed');
    });

    it('should include error information for failed tests', async () => {
      const result = await convertUnifiedToCTRF(mockUnifiedReport);

      const failedTest = result.results.tests[1];
      expect(failedTest?.message).toBe('Expected true to be false');
      expect(failedTest?.trace).toBe('Error stack trace');
    });

    it('should include suite and file path information', async () => {
      const result = await convertUnifiedToCTRF(mockUnifiedReport);

      result.results.tests.forEach(test => {
        expect(test.suite).toBe('Test Suite');
        expect(test.filePath).toBe('/path/to/test.ts');
      });
    });

    it('should detect retry attempts and flaky tests', async () => {
      const reportWithRetries: UnifiedReport = {
        ...mockUnifiedReport,
        suites: [
          {
            id: 'suite-1',
            name: 'Test Suite',
            tests: [
              {
                id: 'test-1',
                name: 'flaky test',
                fullName: 'flaky test',
                status: 'passed',
                duration: 100,
                results: [
                  {
                    attemptNumber: 1,
                    status: 'failed',
                    duration: 50,
                  },
                  {
                    attemptNumber: 2,
                    status: 'passed',
                    duration: 50,
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = await convertUnifiedToCTRF(reportWithRetries);

      expect(result.results.tests[0]?.retry).toBe(1);
      expect(result.results.tests[0]?.flaky).toBe(true);
    });

    it('should map timeout and interrupted statuses to CTRF other summary and tests', async () => {
      const reportWithOtherStatuses: UnifiedReport = {
        ...mockUnifiedReport,
        stats: {
          ...mockUnifiedReport.stats,
          total: 2,
          passed: 0,
          failed: 0,
          skipped: 0,
          timeout: 1,
          interrupted: 1,
        },
        suites: [
          {
            id: 'suite-1',
            name: 'Other Status Suite',
            tests: [
              {
                id: 'test-1',
                name: 'timeout test',
                fullName: 'timeout test',
                status: 'timeout',
                duration: 10,
                results: [],
              },
              {
                id: 'test-2',
                name: 'interrupted test',
                fullName: 'interrupted test',
                status: 'interrupted',
                duration: 20,
                results: [],
              },
            ],
          },
        ],
      };

      const result = await convertUnifiedToCTRF(reportWithOtherStatuses);

      expect(result.results.summary.other).toBe(2);
      expect(result.results.tests.map(test => test.status)).toEqual([
        'other',
        'other',
      ]);
      expect(result.results.tests.map(test => test.rawStatus)).toEqual([
        'timeout',
        'interrupted',
      ]);
    });

    it('should set environment.executionType from EXECUTION_TYPE', async () => {
      const originalEnv = { ...process.env };
      process.env.EXECUTION_TYPE = 'release';

      const result = await convertUnifiedToCTRF(mockUnifiedReport);

      expect(result.results.environment?.executionType).toBe('release');
      expect(result.results.extra).toBeUndefined();

      process.env = originalEnv;
    });

    it('should trim EXECUTION_TYPE value', async () => {
      const originalEnv = { ...process.env };
      process.env.EXECUTION_TYPE = '  release  ';

      const result = await convertUnifiedToCTRF(mockUnifiedReport);

      expect(result.results.environment?.executionType).toBe('release');

      process.env = originalEnv;
    });

    it('should omit executionType when EXECUTION_TYPE is empty', async () => {
      const originalEnv = { ...process.env };
      process.env.EXECUTION_TYPE = '   ';

      const result = await convertUnifiedToCTRF(mockUnifiedReport);

      expect(result.results.environment?.executionType).toBeUndefined();

      process.env = originalEnv;
    });

    it('should include EXECUTION_TYPE and TEST_ENVIRONMENT with CI metadata', async () => {
      const originalEnv = { ...process.env };

      delete process.env.GITLAB_CI;
      delete process.env.JENKINS_URL;
      delete process.env.AZURE_HTTP_USER_AGENT;
      delete process.env.GIT_REPOSITORY_NAME;
      delete process.env.GIT_REPOSITORY_URL;
      delete process.env.GIT_BRANCH_NAME;

      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_WORKFLOW = 'e2e';
      process.env.GITHUB_RUN_NUMBER = '42';
      process.env.GITHUB_RUN_ID = '100';
      process.env.GITHUB_REPOSITORY = 'owner/repo';
      process.env.GITHUB_SERVER_URL = 'https://github.com';
      process.env.GITHUB_REF_NAME = 'main';
      process.env.EXECUTION_TYPE = 'release';
      process.env.TEST_ENVIRONMENT = 'develop';

      const result = await convertUnifiedToCTRF(mockUnifiedReport);

      expect(result.results.environment?.executionType).toBe('release');
      expect(result.results.environment?.testEnvironment).toBe('develop');
      expect(result.results.environment?.buildName).toBe('e2e');
      expect(result.results.environment?.buildNumber).toBe('42');

      process.env = originalEnv;
    });
  });
});
