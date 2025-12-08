import { promises as fs } from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { BaseProvider } from '@/types/providers';
import { CTRFReport } from '@/types/ctrf';
import { CTRFBuilder } from '@/core/ctrf-builder';
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

  async convert(inputPath: string): Promise<CTRFReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const nunitReport: NUnitReport = this.parser.parse(content);
    const testRun = nunitReport['test-run'];

    const builder = new CTRFBuilder('nunit');

    // Process suites recursively
    this.processSuites(testRun['test-suite'], builder);

    // Set summary
    const total = parseInt(testRun['@_total'] || '0', 10);
    const passed = parseInt(testRun['@_passed'] || '0', 10);
    const failed = parseInt(testRun['@_failed'] || '0', 10);
    const skipped = parseInt(testRun['@_skipped'] || '0', 10);
    const inconclusive = parseInt(testRun['@_inconclusive'] || '0', 10);

    // NUnit duration is in seconds
    const durationSeconds = parseFloat(testRun['@_duration'] || '0');
    const durationMs = Math.round(durationSeconds * 1000);

    // Start time is usually YYYY-MM-DD HH:MM:SSZ
    const startTime = testRun['@_start-time']
      ? new Date(testRun['@_start-time']).getTime()
      : Date.now();
    const stopTime = testRun['@_end-time']
      ? new Date(testRun['@_end-time']).getTime()
      : startTime + durationMs;

    builder.setSummary({
      tests: total,
      passed: passed,
      failed: failed,
      skipped: skipped,
      pending: inconclusive,
      other: 0,
      start: startTime,
      stop: stopTime,
    });

    return builder.build();
  }

  private processSuites(
    suite: NUnitTestSuite | NUnitTestSuite[] | undefined,
    builder: CTRFBuilder
  ): void {
    if (!suite) {
      return;
    }

    const suitesArray = Array.isArray(suite) ? suite : [suite];

    for (const s of suitesArray) {
      // Extract tests from current suite
      this.extractTests(s, builder);

      // Recursively process child suites
      if (s['test-suite']) {
        this.processSuites(s['test-suite'], builder);
      }
    }
  }

  private extractTests(suite: NUnitTestSuite, builder: CTRFBuilder): void {
    if (!suite['test-case']) {
      return;
    }

    const testCases = Array.isArray(suite['test-case'])
      ? suite['test-case']
      : [suite['test-case']];

    for (const test of testCases) {
      const status = this.mapStatus(test['@_result']);
      const duration = this.parseDuration(test['@_duration'] || test['@_time']);
      const error = this.extractError(test);

      builder.addTest({
        name: test['@_name'],
        status: status,
        duration: duration,
        suite: suite['@_name'] || 'Unnamed Suite',
        filePath: suite['@_fullname'] || '',
        ...(error?.message ? { message: error.message } : {}),
        ...(error?.stack ? { trace: error.stack } : {}),
        rawStatus: test['@_result'],
      });
    }
  }

  private extractError(
    test: NUnitTestCase
  ): { message: string; stack?: string } | undefined {
    if (!test.failure) {
      return undefined;
    }

    const stack = test.failure['stack-trace'];

    return {
      message: test.failure.message || '',
      ...(stack ? { stack } : {}),
    };
  }

  private mapStatus(nunitStatus: NUnitStatus): string {
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

    // NUnit reports duration in seconds, CTRF expects milliseconds
    return Math.round(duration * 1000);
  }
}
