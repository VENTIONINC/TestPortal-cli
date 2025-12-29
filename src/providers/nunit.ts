import { promises as fs } from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { BaseProvider } from '@/types/providers';
import { CTRFReport, CTRFTest, TestStatus } from '@/types/ctrf';
import { CTRFFactory } from '@/core/ctrf-factory';
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
    const tests = this.convertSuites(testRun['test-suite']);

    let startTime = Date.now();
    let endTime = Date.now();

    if (testRun['@_start-time']) {
      startTime = new Date(testRun['@_start-time']).getTime();
    }

    if (testRun['@_end-time']) {
      endTime = new Date(testRun['@_end-time']).getTime();
    } else if (testRun['@_duration']) {
      endTime = startTime + parseFloat(testRun['@_duration']) * 1000;
    }

    return CTRFFactory.createReport(
      tests,
      'nunit',
      testRun['@_engine-version'],
      startTime,
      endTime
    );
  }

  private convertSuites(
    suite: NUnitTestSuite | NUnitTestSuite[] | undefined
  ): CTRFTest[] {
    if (!suite) {
      return [];
    }

    const tests: CTRFTest[] = [];
    const suitesArray = Array.isArray(suite) ? suite : [suite];

    for (const s of suitesArray) {
      tests.push(...this.extractTests(s));

      if (s['test-suite']) {
        tests.push(...this.convertSuites(s['test-suite']));
      }
    }

    return tests;
  }

  private extractTests(suite: NUnitTestSuite): CTRFTest[] {
    if (!suite['test-case']) return [];

    const tests: CTRFTest[] = [];
    const cases = Array.isArray(suite['test-case'])
      ? suite['test-case']
      : [suite['test-case']];

    for (const testCase of cases) {
      tests.push(
        this.convertTestCase(testCase, suite['@_name'] || 'Unnamed Suite')
      );
    }
    return tests;
  }

  private convertTestCase(
    testCase: NUnitTestCase,
    suiteName: string
  ): CTRFTest {
    const status = this.mapStatus(testCase['@_result']);
    const duration = parseFloat(testCase['@_duration'] || '0') * 1000;

    const ctrfTest: CTRFTest = {
      name: testCase['@_name'],
      status,
      duration,
      suite: suiteName,
      filePath: testCase['@_fullname'],
      rawStatus: testCase['@_result'],
    };

    if (status === 'failed') {
      if (testCase.failure) {
        const message = testCase.failure.message;
        ctrfTest.message =
          typeof message === 'object' ? message['#text'] : message;

        const stack = testCase.failure['stack-trace'];
        ctrfTest.trace = typeof stack === 'object' ? stack['#text'] : stack;
      }
    }

    return ctrfTest;
  }

  private mapStatus(status: string): TestStatus {
    switch (status?.toLowerCase()) {
      case 'passed':
        return 'passed';
      case 'failed':
        return 'failed';
      case 'skipped':
        return 'skipped';
      case 'inconclusive':
        return 'other';
      default:
        return 'other';
    }
  }
}
