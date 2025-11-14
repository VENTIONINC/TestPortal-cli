import { promises as fs } from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { randomUUID } from 'crypto';

import { BaseProvider } from '@/types/providers';
import {
  UnifiedReport,
  UnifiedTestSuite,
  UnifiedTestResult,
  UnifiedTestStatus,
  UnifiedTestStats,
  UnifiedTestAttempt,
  UnifiedError,
} from '@/types/unified-report';
import {
  NUnitReport,
  NUnitTestCase,
  NUnitTestSuite,
  NUnitStatus,
} from '@/types/nunit';

export class NUnitProvider implements BaseProvider {
  public readonly name = 'nunit';
  private readonly parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: false,
      trimValues: true,
      textNodeName: '#text',
    });
  }

  async validate(inputPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(inputPath, 'utf8');
      const data = this.parser.parse(content) as NUnitReport;

      return (
        typeof data === 'object' &&
        data !== null &&
        'test-run' in data &&
        typeof data['test-run'] === 'object'
      );
    } catch {
      return false;
    }
  }

  async convert(inputPath: string): Promise<UnifiedReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const nunitReport: NUnitReport = this.parser.parse(content);

    const testRun = nunitReport['test-run'];
    const suites = this.convertSuites(testRun['test-suite']);
    const stats = this.calculateStats(suites, testRun);

    return {
      id: randomUUID(),
      runId: testRun['@_id'],
      framework: 'nunit',
      frameworkVersion: testRun['@_engine-version'] || 'unknown',
      toolVersion: testRun['@_engine-version'] || 'unknown',
      stats,
      suites,
      createdAt: new Date().toISOString(),
    };
  }

  private convertSuites(
    suite: NUnitTestSuite | NUnitTestSuite[] | undefined
  ): UnifiedTestSuite[] {
    if (!suite) {
      return [];
    }

    const suites: UnifiedTestSuite[] = [];
    const suitesArray = Array.isArray(suite) ? suite : [suite];

    for (const s of suitesArray) {
      // Extract tests from current suite
      const tests = this.extractTests(s);

      // If this suite has tests, add it
      if (tests.length > 0) {
        const unifiedSuite: UnifiedTestSuite = {
          id: s['@_id'] || randomUUID(),
          name: s['@_name'] || 'Unnamed Suite',
          file: s['@_fullname'],
          path: s['@_fullname'],
          tests,
          duration: this.parseDuration(s['@_duration'] || s['@_time']),
        };
        suites.push(unifiedSuite);
      }

      // Recursively process child suites
      if (s['test-suite']) {
        const childSuites = this.convertSuites(s['test-suite']);
        suites.push(...childSuites);
      }
    }

    return suites;
  }

  private extractTests(suite: NUnitTestSuite): UnifiedTestResult[] {
    if (!suite['test-case']) {
      return [];
    }

    const testCases = Array.isArray(suite['test-case'])
      ? suite['test-case']
      : [suite['test-case']];

    return testCases.map(test => this.convertTest(test, suite));
  }

  private convertTest(
    test: NUnitTestCase,
    suite: NUnitTestSuite
  ): UnifiedTestResult {
    const status = this.mapStatus(test['@_result']);
    const duration = this.parseDuration(test['@_duration'] || test['@_time']);

    const attempt: UnifiedTestAttempt = {
      attemptNumber: 1,
      status,
      duration,
      startTime: test['@_start-time'],
      errors: this.extractErrors(test),
    };

    return {
      id: test['@_id'] || randomUUID(),
      name: test['@_name'],
      fullName: test['@_fullname'] || test['@_name'],
      status,
      duration,
      startTime: test['@_start-time'],
      endTime: test['@_end-time'],
      tags: [],
      assertions: test['@_asserts'] ? parseInt(test['@_asserts'], 10) : undefined,
      results: [attempt],
    };
  }

  private extractErrors(test: NUnitTestCase): UnifiedError[] | undefined {
    if (!test.failure) {
      return undefined;
    }

    const error: UnifiedError = {
      message: test.failure.message || '',
      stack: test.failure['stack-trace'],
    };

    return [error];
  }

  private mapStatus(nunitStatus: NUnitStatus): UnifiedTestStatus {
    switch (nunitStatus) {
      case 'Passed':
        return 'passed';
      case 'Failed':
        return 'failed';
      case 'Skipped':
        return 'skipped';
      case 'Inconclusive':
      case 'Warning':
        return 'pending';
      default:
        return 'failed';
    }
  }

  private parseDuration(durationStr?: string): number {
    if (!durationStr) {
      return 0;
    }

    const duration = parseFloat(durationStr);
    if (isNaN(duration)) {
      return 0;
    }

    // NUnit reports duration in seconds, UnifiedReport expects milliseconds
    return Math.round(duration * 1000);
  }

  private calculateStats(
    suites: UnifiedTestSuite[],
    testRun: any
  ): UnifiedTestStats {
    const allTests = suites.flatMap(s => s.tests);

    const passed = allTests.filter(t => t.status === 'passed').length;
    const failed = allTests.filter(t => t.status === 'failed').length;
    const skipped = allTests.filter(t => t.status === 'skipped').length;
    const pending = allTests.filter(t => t.status === 'pending').length;

    const totalDuration = suites.reduce((sum, suite) => {
      return sum + (suite.duration || 0);
    }, 0);

    return {
      total: allTests.length,
      passed,
      failed,
      skipped,
      pending,
      suites: suites.length,
      duration: totalDuration,
      startTime: testRun['@_start-time'] || new Date().toISOString(),
      endTime: testRun['@_end-time'],
    };
  }
}
