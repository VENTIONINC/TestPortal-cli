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
import {
  PlaywrightReport,
  PlaywrightTest,
  PlaywrightStatus,
  PlaywrightSuite,
  PlaywrightSpec,
} from '@/types/playwright';

export class PlaywrightProvider implements BaseProvider {
  public readonly name = 'playwright';

  async validate(inputPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(inputPath, 'utf8');
      const data = JSON.parse(content);

      return (
        typeof data === 'object' &&
        data !== null &&
        Array.isArray(data.suites) &&
        typeof data.config === 'object'
      );
    } catch {
      return false;
    }
  }

  async convert(inputPath: string): Promise<UnifiedReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const playwrightReport: PlaywrightReport = JSON.parse(content);

    const unifiedSuites = this.flattenSuites(playwrightReport.suites);
    const stats = this.calculateStats(unifiedSuites, playwrightReport);

    return {
      id: randomUUID(),
      runId: playwrightReport.runId,
      framework: 'playwright',
      frameworkVersion: playwrightReport.config.version || 'unknown',
      toolVersion: playwrightReport.config.version || 'unknown',
      stats,
      suites: unifiedSuites,
      createdAt: new Date().toISOString(),
    };
  }

  private flattenSuites(
    suites: PlaywrightSuite[],
    parentPath?: string
  ): UnifiedTestSuite[] {
    const flattened: UnifiedTestSuite[] = [];

    for (const suite of suites) {
      const suiteId = randomUUID();
      const currentPath = parentPath
        ? `${parentPath} › ${suite.title}`
        : suite.title;

      // Convert current suite
      const unifiedSuite: UnifiedTestSuite = {
        id: suiteId,
        name: suite.title,
        file: suite.file,
        tests: this.convertSpecs(suite.specs),
        duration: undefined, // Will be calculated after all tests are processed
      };

      // Only add suites that have direct tests (filter out empty parent suites)
      if (unifiedSuite.tests.length > 0) {
        flattened.push(unifiedSuite);
      }

      // Recursively flatten child suites
      if (suite.suites) {
        const childSuites = this.flattenSuites(suite.suites, currentPath);
        flattened.push(...childSuites);
      }
    }

    // Calculate durations after all suites are flattened
    for (const suite of flattened) {
      suite.duration = this.calculateSuiteDuration(suite.tests);
    }

    return flattened;
  }

  private convertSpecs(specs: PlaywrightSpec[]): UnifiedTestResult[] {
    const tests: UnifiedTestResult[] = [];

    for (const spec of specs) {
      for (const test of spec.tests) {
        tests.push(this.convertTest(test, spec));
      }
    }

    return tests;
  }

  private convertTest(
    test: PlaywrightTest,
    spec: PlaywrightSpec
  ): UnifiedTestResult {
    // Convert all execution attempts to results array
    const results = test.results.map((result, index) => ({
      attemptNumber: index + 1,
      status: this.mapStatus(result.status),
      duration: result.duration || 0,
      startTime: result.startTime,
      errors:
        result.errors?.map(error => ({
          message: error.message,
          stack: error.stack,
          location: error.location
            ? {
                file: error.location.file,
                line: error.location.line,
                column: error.location.column,
              }
            : undefined,
          snippet: error.snippet,
        })) || undefined,
    }));

    // Calculate summary information
    const totalDuration = results.reduce(
      (sum, r) => sum + (r.duration || 0),
      0
    );

    const firstResult = results[0];
    const lastResult = results[results.length - 1];

    const finalStatus = this.determineFinalStatus(test, results);

    return {
      id: randomUUID(),
      name: spec.title,
      fullName: `${test.projectName || 'default'} › ${spec.title}`,
      status: finalStatus,
      duration: totalDuration,
      startTime: firstResult?.startTime,
      endTime: lastResult?.startTime, // TODO: Calculate proper end time
      tags: spec.tags,
      results, // ALL execution attempts
    };
  }

  private determineFinalStatus(
    test: PlaywrightTest,
    results: Array<{ status: UnifiedTestStatus }>
  ): UnifiedTestStatus {
    // Always use the final result, regardless of whether it's flaky
    if (results.length > 0) {
      const lastResult = results[results.length - 1];

      // Safety check for lastResult
      if (!lastResult) {
        return this.mapStatus(test.status);
      }

      // Return the final attempt's status
      return lastResult.status;
    }

    // Fallback - use the mapped status from Playwright
    return this.mapStatus(test.status);
  }

  private mapStatus(playwrightStatus: PlaywrightStatus): UnifiedTestStatus {
    switch (playwrightStatus) {
      case 'passed':
        return 'passed';
      case 'failed':
        return 'failed';
      case 'timedOut':
        return 'timeout';
      case 'interrupted':
        return 'interrupted';
      case 'skipped':
        return 'skipped';
      case 'flaky':
        return 'passed'; // Flaky tests ultimately passed, so map to passed
      case 'unexpected':
        return 'failed';
      default:
        return 'failed';
    }
  }

  private calculateSuiteDuration(tests: UnifiedTestResult[]): number {
    return tests.reduce((sum, test) => sum + (test.duration || 0), 0);
  }

  private calculateStats(
    suites: UnifiedTestSuite[],
    playwrightReport: PlaywrightReport
  ): UnifiedTestStats {
    const allTests = suites.flatMap(suite => suite.tests);

    const stats = playwrightReport.stats;
    const startTime = stats?.startTime || new Date().toISOString();
    const duration = stats?.duration || 0;
    const endTime = new Date(
      new Date(startTime).getTime() + duration
    ).toISOString();

    return {
      total: allTests.length,
      passed: allTests.filter(t => t.status === 'passed').length,
      failed: allTests.filter(t => t.status === 'failed').length,
      skipped: allTests.filter(t => t.status === 'skipped').length,
      pending: allTests.filter(t => t.status === 'pending').length,
      timeout: allTests.filter(t => t.status === 'timeout').length,
      interrupted: allTests.filter(t => t.status === 'interrupted').length,
      suites: suites.length,
      duration,
      startTime,
      endTime,
    };
  }
}
