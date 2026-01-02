import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { BaseProvider } from '@/types/providers';
import {
  UnifiedReport,
  UnifiedTestSuite,
  UnifiedTestResult,
  UnifiedTestStatus,
  UnifiedTestStats,
} from '@/types/unified-report';
import { MochaReport, MochaTest } from '@/types/mocha';

export class MochaProvider implements BaseProvider {
  public readonly name = 'mocha';

  async validate(inputPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(inputPath, 'utf8');
      const data = JSON.parse(content);

      return (
        typeof data === 'object' &&
        data !== null &&
        typeof data.stats === 'object' &&
        data.stats !== null &&
        typeof data.stats.tests === 'number' &&
        typeof data.stats.passes === 'number' &&
        typeof data.stats.failures === 'number' &&
        Array.isArray(data.tests)
      );
    } catch {
      return false;
    }
  }

  async convert(inputPath: string): Promise<UnifiedReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const mochaReport: MochaReport = JSON.parse(content);

    const unifiedSuites = this.convertTests(mochaReport);
    const stats = this.calculateStats(unifiedSuites, mochaReport);

    return {
      id: randomUUID(),
      framework: 'mocha',
      frameworkVersion: undefined,
      toolVersion: undefined,
      stats,
      suites: unifiedSuites,
      createdAt: new Date().toISOString(),
    };
  }

  private convertTests(mochaReport: MochaReport): UnifiedTestSuite[] {
    // Group tests by file path or create a default suite
    const testsByFile = new Map<string, MochaTest[]>();

    for (const test of mochaReport.tests) {
      const filePath = test.file || 'unknown';
      if (!testsByFile.has(filePath)) {
        testsByFile.set(filePath, []);
      }
      testsByFile.get(filePath)?.push(test);
    }

    // Convert grouped tests to unified suites
    const suites: UnifiedTestSuite[] = [];

    for (const [filePath, tests] of testsByFile.entries()) {
      const suiteName = this.extractSuiteName(filePath);
      const unifiedTests = tests.map(test => this.convertTest(test));

      suites.push({
        id: randomUUID(),
        name: suiteName,
        file: filePath !== 'unknown' ? filePath : undefined,
        tests: unifiedTests,
        duration: this.calculateSuiteDuration(unifiedTests),
      });
    }

    return suites;
  }

  private convertTest(test: MochaTest): UnifiedTestResult {
    const status = this.mapStatus(test);

    // Create a single result attempt (Mocha supports retries with currentRetry)
    const results = [
      {
        attemptNumber: (test.currentRetry || 0) + 1,
        status: status,
        duration: test.duration,
        startTime: undefined, // Mocha doesn't provide individual test start times
        errors: this.extractErrors(test),
      },
    ];

    return {
      id: randomUUID(),
      name: test.title,
      fullName: test.fullTitle,
      status: status,
      duration: test.duration,
      startTime: undefined,
      endTime: undefined,
      tags: undefined, // Mocha doesn't have built-in tagging
      results: results,
    };
  }

  private mapStatus(test: MochaTest): UnifiedTestStatus {
    // Check explicit flags first
    if (test.pending === true) {
      return 'skipped';
    }

    if (test.skipped === true) {
      return 'skipped';
    }

    if (test.pass === true) {
      return 'passed';
    }

    if (test.fail === true) {
      if (test.timedOut === true) {
        return 'timeout';
      }
      return 'failed';
    }

    // Fallback: check for error object
    if (test.err) {
      if (test.timedOut === true) {
        return 'timeout';
      }
      return 'failed';
    }

    // Default to passed if no failure indicators
    return 'passed';
  }

  private extractErrors(test: MochaTest) {
    if (!test.err || !test.err.message) {
      return undefined;
    }

    return [
      {
        message: test.err.message || 'Test failed',
        stack: test.err.stack,
        // Extract diff information if available
        diff:
          test.err.actual !== undefined && test.err.expected !== undefined
            ? `Expected: ${JSON.stringify(test.err.expected)}\nActual: ${JSON.stringify(test.err.actual)}`
            : undefined,
      },
    ];
  }

  private extractSuiteName(filePath: string): string {
    if (filePath === 'unknown') {
      return 'unknown';
    }

    // Extract file name from path
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1] || 'unknown';

    // Remove common test file extensions
    return fileName
      .replace(/\.(test|spec)\.(js|ts|jsx|tsx|mjs|cjs)$/, '')
      .replace(/\.(js|ts|jsx|tsx|mjs|cjs)$/, '');
  }

  private calculateSuiteDuration(tests: UnifiedTestResult[]): number {
    return tests.reduce((sum, test) => sum + (test.duration || 0), 0);
  }

  private calculateStats(
    suites: UnifiedTestSuite[],
    mochaReport: MochaReport
  ): UnifiedTestStats {
    const allTests = suites.flatMap(suite => suite.tests);

    // Use Mocha's statistics if available, otherwise calculate from tests
    const total = mochaReport.stats.tests || allTests.length;
    const passed = mochaReport.stats.passes || 0;
    const failed = mochaReport.stats.failures || 0;
    const pending = 0;
    const skipped = mochaReport.stats.skipped || mochaReport.stats.pending || 0;

    // Calculate duration
    const duration = mochaReport.stats.duration || 0;

    // Parse timestamps
    let startTime: string;
    let endTime: string;

    if (mochaReport.stats.start) {
      startTime = new Date(mochaReport.stats.start).toISOString();
    } else {
      startTime = new Date().toISOString();
    }

    if (mochaReport.stats.end) {
      endTime = new Date(mochaReport.stats.end).toISOString();
    } else {
      endTime = new Date(
        new Date(startTime).getTime() + duration
      ).toISOString();
    }

    // Count timeout tests
    const timeoutTests = allTests.filter(t => t.status === 'timeout').length;

    return {
      total,
      passed,
      failed,
      skipped,
      pending,
      timeout: timeoutTests > 0 ? timeoutTests : undefined,
      suites: mochaReport.stats.suites || suites.length,
      duration,
      startTime,
      endTime,
    };
  }
}
