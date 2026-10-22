// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { EnvironmentDetector } from '@/utils/environment';

describe('EnvironmentDetector', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;
    delete process.env.JENKINS_URL;
    delete process.env.AZURE_HTTP_USER_AGENT;
    delete process.env.TEST_ENVIRONMENT;
    delete process.env.EXECUTION_TYPE;
    delete process.env.GIT_REPOSITORY_NAME;
    delete process.env.GIT_REPOSITORY_URL;
    delete process.env.GIT_BRANCH_NAME;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('GitHub Actions', () => {
    it('should detect testEnvironment from TEST_ENVIRONMENT env var', async () => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.TEST_ENVIRONMENT = 'staging';
      process.env.GITHUB_REPOSITORY = 'test/repo';
      process.env.GITHUB_RUN_NUMBER = '123';

      const result = await EnvironmentDetector.detect();

      expect(result.testEnvironment).toBe('staging');
    });

    it('should default testEnvironment to "ci" when TEST_ENVIRONMENT not set', async () => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_REPOSITORY = 'test/repo';
      process.env.GITHUB_RUN_NUMBER = '123';
      delete process.env.TEST_ENVIRONMENT;

      const result = await EnvironmentDetector.detect();

      expect(result.testEnvironment).toBe('ci');
    });

    it('should include all GitHub Actions fields', async () => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_WORKFLOW = 'CI';
      process.env.GITHUB_RUN_NUMBER = '456';
      process.env.GITHUB_RUN_ID = '789';
      process.env.GITHUB_SERVER_URL = 'https://github.com';
      process.env.GITHUB_REPOSITORY = 'owner/repo';
      process.env.GITHUB_REF_NAME = 'main';
      process.env.TEST_ENVIRONMENT = 'production';

      const result = await EnvironmentDetector.detect();

      expect(result).toEqual({
        testEnvironment: 'production',
        buildName: 'CI',
        buildNumber: '456',
        buildUrl: 'https://github.com/owner/repo/actions/runs/789',
        repositoryName: 'owner/repo',
        repositoryUrl: 'https://github.com/owner/repo',
        branchName: 'main',
      });
    });
  });

  describe('GitLab CI', () => {
    it('should detect testEnvironment from TEST_ENVIRONMENT env var', async () => {
      process.env.GITLAB_CI = 'true';
      process.env.TEST_ENVIRONMENT = 'qa';
      process.env.CI_PROJECT_NAME = 'test-project';

      const result = await EnvironmentDetector.detect();

      expect(result.testEnvironment).toBe('qa');
    });

    it('should default testEnvironment to "ci" when TEST_ENVIRONMENT not set', async () => {
      process.env.GITLAB_CI = 'true';
      process.env.CI_PROJECT_NAME = 'test-project';
      delete process.env.TEST_ENVIRONMENT;

      const result = await EnvironmentDetector.detect();

      expect(result.testEnvironment).toBe('ci');
    });
  });

  describe('Jenkins', () => {
    it('should detect testEnvironment from TEST_ENVIRONMENT env var', async () => {
      process.env.JENKINS_URL = 'https://jenkins.example.com';
      process.env.TEST_ENVIRONMENT = 'dev';
      process.env.JOB_NAME = 'test-job';

      const result = await EnvironmentDetector.detect();

      expect(result.testEnvironment).toBe('dev');
    });

    it('should default testEnvironment to "ci" when TEST_ENVIRONMENT not set', async () => {
      process.env.JENKINS_URL = 'https://jenkins.example.com';
      process.env.JOB_NAME = 'test-job';
      delete process.env.TEST_ENVIRONMENT;

      const result = await EnvironmentDetector.detect();

      expect(result.testEnvironment).toBe('ci');
    });
  });

  describe('Azure Pipelines', () => {
    it('should detect testEnvironment from TEST_ENVIRONMENT env var', async () => {
      process.env.AZURE_HTTP_USER_AGENT = 'azure-pipelines';
      process.env.TEST_ENVIRONMENT = 'test';
      process.env.BUILD_DEFINITIONNAME = 'test-definition';

      const result = await EnvironmentDetector.detect();

      expect(result.testEnvironment).toBe('test');
    });

    it('should default testEnvironment to "ci" when TEST_ENVIRONMENT not set', async () => {
      process.env.AZURE_HTTP_USER_AGENT = 'azure-pipelines';
      process.env.BUILD_DEFINITIONNAME = 'test-definition';
      delete process.env.TEST_ENVIRONMENT;

      const result = await EnvironmentDetector.detect();

      expect(result.testEnvironment).toBe('ci');
    });
  });

  describe('No CI detected', () => {
    it('should return empty environment when no CI detected', async () => {
      const result = await EnvironmentDetector.detect();

      expect(result).toEqual({});
    });
  });

  describe('User-provided execution metadata', () => {
    it('should set testEnvironment from TEST_ENVIRONMENT without CI', async () => {
      process.env.TEST_ENVIRONMENT = 'develop';

      const result = await EnvironmentDetector.detect();

      expect(result).toEqual({ testEnvironment: 'develop' });
    });

    it('should trim TEST_ENVIRONMENT value', async () => {
      process.env.TEST_ENVIRONMENT = '  staging  ';

      const result = await EnvironmentDetector.detect();

      expect(result.testEnvironment).toBe('staging');
    });

    it('should ignore empty TEST_ENVIRONMENT without CI', async () => {
      process.env.TEST_ENVIRONMENT = '   ';

      const result = await EnvironmentDetector.detect();

      expect(result).toEqual({});
    });

    it('should set executionType from EXECUTION_TYPE without CI', async () => {
      process.env.EXECUTION_TYPE = 'release';

      const result = await EnvironmentDetector.detect();

      expect(result).toEqual({ executionType: 'release' });
    });

    it('should trim EXECUTION_TYPE value', async () => {
      process.env.EXECUTION_TYPE = '  ondemand  ';

      const result = await EnvironmentDetector.detect();

      expect(result.executionType).toBe('ondemand');
    });

    it('should ignore empty EXECUTION_TYPE', async () => {
      process.env.EXECUTION_TYPE = '   ';

      const result = await EnvironmentDetector.detect();

      expect(result.executionType).toBeUndefined();
    });
  });
});
