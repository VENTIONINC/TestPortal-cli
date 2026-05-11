// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { BaseProvider } from '@/types/providers';
import {
  UnifiedReport,
  UnifiedTestSuite,
  UnifiedTestResult,
  UnifiedTestStatus,
  UnifiedTestStats,
  UnifiedError,
} from '@/types/unified-report';
import {
  PytestReport,
  PytestReportSchema,
  PytestTest,
  PytestOutcome,
  PytestStage,
} from '@/types/pytest';

export class PytestProvider implements BaseProvider {
  public readonly name = 'pytest';

  async validate(inputPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(inputPath, 'utf8');
      const data = JSON.parse(content);

      // Validate against pytest report schema
      const result = PytestReportSchema.safeParse(data);
      return result.success;
    } catch {
      return false;
    }
  }

  async convert(inputPath: string): Promise<UnifiedReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const data = JSON.parse(content);

    // Parse and validate with Zod
    const pytestReport = PytestReportSchema.parse(data);

    const testsByFile = this.convertTests(pytestReport.tests);
    const unifiedSuites = this.createTestSuites(testsByFile);
    const stats = this.calculateStats(unifiedSuites, pytestReport);

    return {
      id: randomUUID(),
      framework: 'pytest',
      stats,
      suites: unifiedSuites,
      createdAt: new Date().toISOString(),
    };
  }

  private mapStatus(outcome: PytestOutcome): UnifiedTestStatus {
    switch (outcome) {
      case 'passed':
        return 'passed';
      case 'failed':
      case 'error':
        return 'failed';
      case 'skipped':
      case 'xfailed':
        return 'skipped';
      case 'xpassed':
        return 'passed';
      default:
        return 'failed';
    }
  }

  private extractSuiteInfo(nodeid: string): {
    filePath: string;
    suiteName: string;
    testName: string;
  } {
    // nodeid format: "tests/test_auth.py::TestClass::test_method[param]"
    // or: "tests/test_auth.py::test_function"
    const parts = nodeid.split('::');
    const filePath = parts[0] || 'unknown';

    // Extract filename without extension for suite name
    const fileName = filePath.split('/').pop() || 'unknown';
    const suiteName = fileName.replace(/\.py$/, '');

    // Last part is the test name (may include parameters)
    const testName = parts[parts.length - 1] || 'unknown';

    return { filePath, suiteName, testName };
  }

  private convertTests(tests: PytestTest[]): Map<string, UnifiedTestResult[]> {
    const testsByFile = new Map<string, UnifiedTestResult[]>();

    for (const test of tests) {
      const { filePath, suiteName } = this.extractSuiteInfo(test.nodeid);
      const convertedTest = this.convertTest(test);

      if (!testsByFile.has(suiteName)) {
        testsByFile.set(suiteName, []);
      }
      testsByFile.get(suiteName)!.push(convertedTest);
    }

    return testsByFile;
  }

  private convertTest(test: PytestTest): UnifiedTestResult {
    const status = this.mapStatus(test.outcome);
    const duration = this.calculateTestDuration(test);
    const errors = this.extractErrors(test);
    const { testName } = this.extractSuiteInfo(test.nodeid);

    const results = [
      {
        attemptNumber: 1,
        status: status,
        duration: duration,
        startTime: undefined,
        errors: errors,
      },
    ];

    return {
      id: randomUUID(),
      name: testName,
      fullName: test.nodeid,
      status: status,
      duration: duration,
      startTime: undefined,
      endTime: undefined,
      tags: test.keywords,
      assertions: undefined,
      results: results,
    };
  }

  private extractErrors(test: PytestTest): UnifiedError[] | undefined {
    const errors: UnifiedError[] = [];

    // Check stages in priority order: call > setup > teardown
    const stagesToCheck: Array<{
      stage: PytestStage | undefined;
      name: string;
    }> = [
      { stage: test.call, name: 'call' },
      { stage: test.setup, name: 'setup' },
      { stage: test.teardown, name: 'teardown' },
    ];

    for (const { stage, name } of stagesToCheck) {
      if (!stage) continue;

      // Only extract errors from failed/error stages
      if (stage.outcome === 'failed' || stage.outcome === 'error') {
        // Use longrepr for main error message
        if (stage.longrepr) {
          errors.push({
            message: stage.longrepr,
            stack: this.formatTraceback(stage),
          });
        }

        // Add crash info if present
        if (stage.crash) {
          errors.push({
            message: `Crash at ${stage.crash.path}:${stage.crash.lineno}: ${stage.crash.message}`,
            stack: undefined,
          });
        }

        // If we found errors in this stage, we can break
        // (call stage takes priority)
        if (errors.length > 0) break;
      }
    }

    return errors.length > 0 ? errors : undefined;
  }

  private formatTraceback(stage: PytestStage): string | undefined {
    if (!stage.traceback || stage.traceback.length === 0) {
      return undefined;
    }

    return stage.traceback
      .map(tb => {
        const msg = tb.message ? `: ${tb.message}` : '';
        return `  File "${tb.path}", line ${tb.lineno}${msg}`;
      })
      .join('\n');
  }

  private calculateTestDuration(test: PytestTest): number | undefined {
    let totalDuration = 0;
    let hasDuration = false;

    // Sum durations from all stages
    const stages = [test.setup, test.call, test.teardown];
    for (const stage of stages) {
      if (stage?.duration !== undefined) {
        totalDuration += stage.duration;
        hasDuration = true;
      }
    }

    // Convert seconds to milliseconds
    return hasDuration ? totalDuration * 1000 : undefined;
  }

  private createTestSuites(
    testsByFile: Map<string, UnifiedTestResult[]>
  ): UnifiedTestSuite[] {
    const suites: UnifiedTestSuite[] = [];

    for (const [suiteName, tests] of testsByFile.entries()) {
      // Calculate suite duration as sum of test durations
      const suiteDuration = tests.reduce((sum, test) => {
        return sum + (test.duration || 0);
      }, 0);

      const suite: UnifiedTestSuite = {
        id: randomUUID(),
        name: suiteName,
        tests: tests,
        duration: suiteDuration > 0 ? suiteDuration : undefined,
      };

      suites.push(suite);
    }

    return suites;
  }

  private calculateStats(
    suites: UnifiedTestSuite[],
    report: PytestReport
  ): UnifiedTestStats {
    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    // Count from converted tests
    for (const suite of suites) {
      for (const test of suite.tests) {
        total++;
        switch (test.status) {
          case 'passed':
            passed++;
            break;
          case 'failed':
            failed++;
            break;
          case 'skipped':
            skipped++;
            break;
        }
      }
    }

    // Use report timestamps
    const startTime = new Date(report.created * 1000).toISOString();
    const durationMs = report.duration * 1000;
    const endTime = new Date(report.created * 1000 + durationMs).toISOString();

    return {
      total,
      passed,
      failed,
      skipped,
      suites: suites.length,
      duration: durationMs,
      startTime,
      endTime,
    };
  }
}
