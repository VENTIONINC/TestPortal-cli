// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { CTRFEnvironment } from '@/types/ctrf';

export class EnvironmentDetector {
  static async detect(): Promise<CTRFEnvironment> {
    const environment: CTRFEnvironment = {};

    const ci = this.detectCI();
    if (ci) {
      Object.assign(environment, ci);
    }

    const git = await this.detectGit();
    if (git) {
      Object.assign(environment, git);
    }

    Object.assign(environment, this.detectExecutionMetadata(Boolean(ci)));

    return environment;
  }

  private static detectCI(): Partial<CTRFEnvironment> | null {
    const env = process.env;

    if (env.GITHUB_ACTIONS) {
      const serverUrl = env.GITHUB_SERVER_URL || 'https://github.com';
      return {
        buildName: env.GITHUB_WORKFLOW,
        buildNumber: env.GITHUB_RUN_NUMBER,
        buildUrl: `${serverUrl}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`,
        repositoryName: env.GITHUB_REPOSITORY,
        repositoryUrl: `${serverUrl}/${env.GITHUB_REPOSITORY}`,
        branchName: env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME,
      };
    }

    if (env.GITLAB_CI) {
      return {
        buildName: env.CI_PROJECT_NAME,
        buildNumber: env.CI_PIPELINE_ID,
        buildUrl: env.CI_PIPELINE_URL,
        repositoryName: env.CI_PROJECT_PATH,
        repositoryUrl: env.CI_PROJECT_URL,
        branchName: env.CI_COMMIT_REF_NAME,
      };
    }

    if (env.JENKINS_URL) {
      return {
        buildName: env.JOB_NAME,
        buildNumber: env.BUILD_NUMBER,
        buildUrl: env.BUILD_URL,
        branchName: env.GIT_BRANCH || env.BRANCH_NAME,
      };
    }

    if (env.AZURE_HTTP_USER_AGENT) {
      return {
        buildName: env.BUILD_DEFINITIONNAME,
        buildNumber: env.BUILD_BUILDNUMBER,
        buildUrl: `${env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI}${env.SYSTEM_TEAMPROJECT}/_build/results?buildId=${env.BUILD_BUILDID}`,
        repositoryName: env.BUILD_REPOSITORY_NAME,
        repositoryUrl: env.BUILD_REPOSITORY_URI,
        branchName: env.BUILD_SOURCEBRANCHNAME,
      };
    }

    return null;
  }

  private static detectExecutionMetadata(
    ciDetected: boolean
  ): Partial<CTRFEnvironment> {
    const metadata: Partial<CTRFEnvironment> = {};
    const testEnvironment = process.env.TEST_ENVIRONMENT?.trim();
    const executionType = process.env.EXECUTION_TYPE?.trim();

    if (testEnvironment) {
      metadata.testEnvironment = testEnvironment;
    } else if (ciDetected) {
      metadata.testEnvironment = 'ci';
    }

    if (executionType) {
      metadata.executionType = executionType;
    }

    return metadata;
  }

  private static async detectGit(): Promise<Partial<CTRFEnvironment> | null> {
    try {
      const env = process.env;

      const git: Partial<CTRFEnvironment> = {};

      if (env.GIT_REPOSITORY_NAME) {
        git.repositoryName = env.GIT_REPOSITORY_NAME;
      }
      if (env.GIT_REPOSITORY_URL) {
        git.repositoryUrl = env.GIT_REPOSITORY_URL;
      }
      if (env.GIT_BRANCH_NAME) {
        git.branchName = env.GIT_BRANCH_NAME;
      }

      return Object.keys(git).length > 0 ? git : null;
    } catch {
      return null;
    }
  }
}
