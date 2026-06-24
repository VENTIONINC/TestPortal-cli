// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { UnifiedReport } from '@/types/unified-report';
import { CTRFReport, CTRFTest, TestStatus } from '@/types/ctrf';
import { EnvironmentDetector } from '@/utils/environment';

/**
 * Converts UnifiedReport format to CTRF (Common Test Report Format)
 */
export async function convertUnifiedToCTRF(
  unified: UnifiedReport
): Promise<CTRFReport> {
  const tests: CTRFTest[] = [];

  // Flatten all tests from all suites
  for (const suite of unified.suites) {
    for (const test of suite.tests) {
      const ctrfTest: CTRFTest = {
        name: test.fullName || test.name,
        status: mapStatusToCTRF(test.status),
        duration: test.duration || 0,
        suite: suite.name,
        filePath: suite.file,
      };

      // Add optional fields
      if (test.tags && test.tags.length > 0) {
        ctrfTest.tags = test.tags;
      }

      // Add error information from the last attempt
      if (test.results && test.results.length > 0) {
        const lastAttempt = test.results[test.results.length - 1];
        if (lastAttempt?.errors && lastAttempt.errors.length > 0) {
          const error = lastAttempt.errors[0];
          ctrfTest.message = error?.message;
          ctrfTest.trace = error?.stack;
        }

        // Track retry attempts
        if (test.results.length > 1) {
          ctrfTest.retry = test.results.length - 1;
          ctrfTest.flaky = test.status === 'passed';
        }
      }

      // Preserve original status
      ctrfTest.rawStatus = test.status;

      tests.push(ctrfTest);
    }
  }

  // Detect environment information
  const environment = await EnvironmentDetector.detect();

  // Build CTRF report
  const ctrfReport: CTRFReport = {
    results: {
      tool: {
        name: unified.framework,
        version: unified.frameworkVersion,
      },
      summary: {
        tests: unified.stats.total,
        passed: unified.stats.passed,
        failed: unified.stats.failed,
        pending: (unified.stats.pending || 0) + (unified.stats.todo || 0),
        skipped: unified.stats.skipped,
        other: (unified.stats.timeout || 0) + (unified.stats.interrupted || 0),
        start: new Date(unified.stats.startTime).getTime(),
        stop: unified.stats.endTime
          ? new Date(unified.stats.endTime).getTime()
          : Date.now(),
      },
      tests,
      environment,
    },
  };

  return ctrfReport;
}

/**
 * Maps UnifiedTestStatus to CTRF TestStatus
 */
function mapStatusToCTRF(status: string): TestStatus {
  switch (status) {
    case 'passed':
      return 'passed';
    case 'failed':
      return 'failed';
    case 'skipped':
      return 'skipped';
    case 'pending':
    case 'todo':
      return 'pending';
    case 'timeout':
    case 'interrupted':
    default:
      return 'other';
  }
}
