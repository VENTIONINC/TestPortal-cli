import { promises as fs } from 'fs';
import { BaseProvider } from '@/types/providers';
import { CTRFReport, CTRFTest, TestStatus } from '@/types/ctrf';
import { CTRFFactory } from '@/core/ctrf-factory';
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

  async convert(inputPath: string): Promise<CTRFReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const playwrightReport: PlaywrightReport = JSON.parse(content);

    const tests = this.flattenSuites(playwrightReport.suites);

    let minStart = Infinity;
    let maxEnd = 0;

    const findTimes = (suites: PlaywrightSuite[]) => {
      for (const suite of suites) {
        if (suite.specs) {
          for (const spec of suite.specs) {
            for (const test of spec.tests) {
              for (const result of test.results) {
                const start = new Date(result.startTime).getTime();
                const end = start + result.duration;
                if (start < minStart) minStart = start;
                if (end > maxEnd) maxEnd = end;
              }
            }
          }
        }
        if (suite.suites) {
          findTimes(suite.suites);
        }
      }
    };

    findTimes(playwrightReport.suites);

    if (minStart === Infinity) minStart = Date.now();
    if (maxEnd === 0) maxEnd = Date.now();

    return CTRFFactory.createReport(
      tests,
      'playwright',
      playwrightReport.config.version,
      minStart,
      maxEnd
    );
  }

  private flattenSuites(
    suites: PlaywrightSuite[],
    parentPath?: string
  ): CTRFTest[] {
    const tests: CTRFTest[] = [];

    for (const suite of suites) {
      const currentPath = parentPath
        ? `${parentPath} > ${suite.title}`
        : suite.title;

      if (suite.specs) {
        tests.push(...this.convertSpecs(suite.specs, currentPath, suite.file));
      }

      if (suite.suites) {
        tests.push(...this.flattenSuites(suite.suites, currentPath));
      }
    }

    return tests;
  }

  private convertSpecs(
    specs: PlaywrightSpec[],
    suiteName: string,
    file: string
  ): CTRFTest[] {
    const tests: CTRFTest[] = [];
    for (const spec of specs) {
      for (const test of spec.tests) {
        tests.push(this.convertTest(test, spec.title, suiteName, file));
      }
    }
    return tests;
  }

  private convertTest(
    test: PlaywrightTest,
    specTitle: string,
    suiteName: string,
    file: string
  ): CTRFTest {
    const lastResult = test.results[test.results.length - 1];

    if (!lastResult) {
      return {
        name: specTitle,
        status: 'skipped',
        duration: 0,
        suite: suiteName,
        filePath: file,
      };
    }

    const status = this.mapStatus(lastResult.status);

    const ctrfTest: CTRFTest = {
      name: specTitle,
      status,
      duration: lastResult.duration,
      suite: suiteName,
      filePath: file,
      rawStatus: lastResult.status,
      retry: test.results.length > 1 ? test.results.length - 1 : undefined,
      flaky: test.results.length > 1 && status === 'passed',
    };

    if (status === 'failed') {
      const error =
        lastResult.error || (lastResult.errors && lastResult.errors[0]);
      if (error) {
        ctrfTest.message = error.message;
        ctrfTest.trace = error.stack;
      }
    }

    return ctrfTest;
  }

  private mapStatus(status: PlaywrightStatus): TestStatus {
    switch (status) {
      case 'passed':
        return 'passed';
      case 'failed':
      case 'timedOut':
      case 'unexpected':
        return 'failed';
      case 'skipped':
        return 'skipped';
      case 'interrupted':
        return 'other';
      case 'flaky':
        return 'passed';
      default:
        return 'other';
    }
  }
}
