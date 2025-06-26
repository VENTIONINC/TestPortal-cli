import { promises as fs } from 'fs';
import { BaseProvider } from '@/types/providers';
import { CTRFReport, CTRFTest, TestStatus } from '@/types/ctrf';
import {
  PlaywrightReport,
  PlaywrightTest,
  PlaywrightStatus,
  PlaywrightSuite,
} from '@/types/playwright';
import { EnvironmentDetector } from '@/utils/environment';

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

    const allTests = this.extractAllTests(playwrightReport.suites);

    const ctrfTests = allTests.map(test => this.convertTest(test));

    const summary = this.calculateSummary(ctrfTests, playwrightReport);

    const environment = await EnvironmentDetector.detect();

    return {
      results: {
        tool: {
          name: 'playwright',
          version: playwrightReport.config.version,
        },
        summary,
        tests: ctrfTests,
        environment,
      },
    };
  }

  private extractAllTests(suites: PlaywrightSuite[]): PlaywrightTest[] {
    const tests: PlaywrightTest[] = [];

    const traverse = (suites: PlaywrightSuite[]): void => {
      for (const suite of suites) {
        if (suite.tests) {
          tests.push(...suite.tests);
        }
        if (suite.suites) {
          traverse(suite.suites);
        }
      }
    };

    traverse(suites);
    return tests;
  }

  private convertTest(test: PlaywrightTest): CTRFTest {
    const lastResult = test.results[test.results.length - 1];
    const duration = lastResult?.duration || 0;
    const status = this.mapStatus(test.status);

    return {
      name: test.title,
      status,
      duration,
      message: lastResult?.error?.message,
      trace: lastResult?.error?.snippet,
      rawStatus: test.status,
      filePath: test.location?.file,
      retry: lastResult?.retry || 0,
      flaky: test.results.length > 1,
      suite: this.extractSuiteName(test),
      tags: test.tags,
    };
  }

  private mapStatus(playwrightStatus: PlaywrightStatus): TestStatus {
    switch (playwrightStatus) {
      case 'passed':
        return 'passed';
      case 'failed':
      case 'timedOut':
      case 'interrupted':
        return 'failed';
      case 'skipped':
        return 'skipped';
      default:
        return 'other';
    }
  }

  private extractSuiteName(test: PlaywrightTest): string | undefined {
    return test.projectName || undefined;
  }

  private calculateSummary(
    tests: CTRFTest[],
    playwrightReport: PlaywrightReport
  ) {
    const stats = playwrightReport.stats;
    const start = stats?.startTime ? new Date(stats.startTime).getTime() : 0;
    const stop = start + (stats?.duration || 0);

    return {
      tests: tests.length,
      passed: tests.filter(t => t.status === 'passed').length,
      failed: tests.filter(t => t.status === 'failed').length,
      pending: tests.filter(t => t.status === 'pending').length,
      skipped: tests.filter(t => t.status === 'skipped').length,
      other: tests.filter(t => t.status === 'other').length,
      start,
      stop,
    };
  }
}
