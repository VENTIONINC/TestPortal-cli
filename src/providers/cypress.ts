import { promises as fs } from 'fs';
import { BaseProvider } from '@/types/providers';
import { CTRFReport, CTRFTest, TestStatus } from '@/types/ctrf';
import { CTRFFactory } from '@/core/ctrf-factory';
import {
  CypressReport,
  CypressTest,
  CypressTestState,
  CypressSuite,
} from '@/types/cypress';

export class CypressProvider implements BaseProvider {
  public readonly name = 'cypress';

  async validate(inputPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(inputPath, 'utf8');
      const data = JSON.parse(content);

      return (
        typeof data === 'object' &&
        data !== null &&
        Array.isArray(data.results) &&
        typeof data.stats === 'object' &&
        typeof data.stats.tests === 'number'
      );
    } catch {
      return false;
    }
  }

  async convert(inputPath: string): Promise<CTRFReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const cypressReport: CypressReport = JSON.parse(content);

    const tests = this.convertResults(cypressReport.results);

    const startTime = new Date(cypressReport.stats.start).getTime();
    const endTime = new Date(cypressReport.stats.end).getTime();

    return CTRFFactory.createReport(
      tests,
      'cypress',
      cypressReport.meta?.mocha?.version,
      startTime,
      endTime
    );
  }

  private convertResults(results: CypressSuite[]): CTRFTest[] {
    const tests: CTRFTest[] = [];

    for (const result of results) {
      if (result.tests && result.tests.length > 0) {
        tests.push(
          ...this.convertTests(result.tests, result.file, result.title)
        );
      }
    }

    return tests;
  }

  private convertTests(
    tests: CypressTest[],
    file: string,
    suiteName: string
  ): CTRFTest[] {
    return tests.map(test => this.convertTest(test, file, suiteName));
  }

  private convertTest(
    test: CypressTest,
    file: string,
    suiteName: string
  ): CTRFTest {
    const status = this.mapStatus(test.state);

    const ctrfTest: CTRFTest = {
      name: this.extractTestName(test.title),
      status,
      duration: test.duration,
      filePath: file,
      suite: suiteName,
      rawStatus: test.state,
    };

    if (test.err && test.err.message) {
      ctrfTest.message = test.err.message;
      ctrfTest.trace = test.err.estack;
    }

    return ctrfTest;
  }

  private mapStatus(state: CypressTestState): TestStatus {
    switch (state) {
      case 'passed':
        return 'passed';
      case 'failed':
        return 'failed';
      case 'pending':
        return 'pending';
      default:
        return 'other';
    }
  }

  private extractTestName(title: string[]): string {
    return title[title.length - 1] || 'Unknown Test';
  }
}
