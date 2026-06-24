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

    return environment;
  }

  private static detectCI(): Partial<CTRFEnvironment> | null {
    const env = process.env;

    if (env.GITHUB_ACTIONS) {
      const serverUrl = env.GITHUB_SERVER_URL || 'https://github.com';
      return {
        testEnvironment: env.TEST_ENVIRONMENT || 'ci',
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
        testEnvironment: env.TEST_ENVIRONMENT || 'ci',
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
        testEnvironment: env.TEST_ENVIRONMENT || 'ci',
        buildName: env.JOB_NAME,
        buildNumber: env.BUILD_NUMBER,
        buildUrl: env.BUILD_URL,
        branchName: env.GIT_BRANCH || env.BRANCH_NAME,
      };
    }

    if (env.AZURE_HTTP_USER_AGENT) {
      return {
        testEnvironment: env.TEST_ENVIRONMENT || 'ci',
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
