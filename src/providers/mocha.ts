import { promises as fs } from 'fs';
import { BaseProvider } from '@/types/providers';
import { CTRFReport, CTRFTest, TestStatus } from '@/types/ctrf';
import { CTRFFactory } from '@/core/ctrf-factory';
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

  async convert(inputPath: string): Promise<CTRFReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const mochaReport: MochaReport = JSON.parse(content);

    const tests = this.convertTests(mochaReport);

    const startTime = mochaReport.stats.start
      ? new Date(mochaReport.stats.start).getTime()
      : Date.now();
    const endTime = mochaReport.stats.end
      ? new Date(mochaReport.stats.end).getTime()
      : startTime;

    return CTRFFactory.createReport(
      tests,
      'mocha',
      undefined,
      startTime,
      endTime
    );
  }

  private convertTests(mochaReport: MochaReport): CTRFTest[] {
    return mochaReport.tests.map(test => this.convertTest(test));
  }

  private convertTest(test: MochaTest): CTRFTest {
    const status = this.mapStatus(test);

    const ctrfTest: CTRFTest = {
      name: test.title,
      status,
      duration: test.duration || 0,
      filePath: test.file,
      suite: this.extractSuiteName(test.fullTitle, test.title),
      rawStatus: status,
      retry: test.currentRetry,
    };

    if (status === 'failed') {
      const error = this.extractError(test);
      if (error) {
        ctrfTest.message = error.message;
        ctrfTest.trace = error.stack;
      }
    }

    return ctrfTest;
  }

  private mapStatus(test: MochaTest): TestStatus {
    if (test.pending === true) return 'pending';
    if (test.skipped === true) return 'skipped';
    if (test.pass === true) return 'passed';
    if (test.fail === true) return 'failed';
    if (test.timedOut === true) return 'failed';
    if (test.err) return 'failed';
    return 'passed';
  }

  private extractSuiteName(fullTitle: string, title: string): string {
    if (fullTitle === title) return '';
    return fullTitle.substring(0, fullTitle.lastIndexOf(title)).trim();
  }

  private extractError(test: MochaTest) {
    if (!test.err || !test.err.message) {
      return undefined;
    }
    return {
      message: test.err.message,
      stack: test.err.stack,
    };
  }
}
