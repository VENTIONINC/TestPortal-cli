import { promises as fs } from 'fs';
import { BaseProvider } from '@/types/providers';
import { CTRFReport } from '@/types/ctrf';
import { CTRFBuilder } from '@/core/ctrf-builder';
import {
  PlaywrightReport,
  PlaywrightSuite,
  PlaywrightTest,
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

    const builder = new CTRFBuilder(
      'playwright',
      playwrightReport.config.version
    );

    // Set summary stats
    const stats = playwrightReport.stats;
    if (stats) {
      builder.setSummary({
        start: new Date(stats.startTime).getTime(),
        stop: new Date(stats.startTime).getTime() + stats.duration,
      });
    }

    this.processSuites(playwrightReport.suites, builder);

    return builder.build();
  }

  private processSuites(
    suites: PlaywrightSuite[],
    builder: CTRFBuilder,
    parentSuite?: string
  ) {
    for (const suite of suites) {
      const suiteName = parentSuite
        ? `${parentSuite} › ${suite.title}`
        : suite.title;

      if (suite.specs) {
        for (const spec of suite.specs) {
          for (const test of spec.tests) {
            this.addTestToBuilder(test, spec, suite.file, suiteName, builder);
          }
        }
      }

      if (suite.suites) {
        this.processSuites(suite.suites, builder, suiteName);
      }
    }
  }

  private addTestToBuilder(
    test: PlaywrightTest,
    spec: PlaywrightSpec,
    file: string,
    suiteName: string,
    builder: CTRFBuilder
  ) {
    const lastResult = test.results[test.results.length - 1];
    const error = lastResult?.errors?.[0];

    // Map Playwright status to CTRF status
    let status: string = test.status;
    if (status === 'flaky') {
      status = 'passed';
    } else if (status === 'timedOut') {
      status = 'timeout';
    }

    builder.addTest({
      name: spec.title,
      status: status,
      duration: test.results.reduce((sum, r) => sum + r.duration, 0),
      suite: suiteName,
      filePath: file,
      tags: spec.tags,
      ...(error?.message ? { message: error.message } : {}),
      ...(error?.stack ? { trace: error.stack } : {}),
      retries: test.results.length > 1 ? test.results.length - 1 : 0,
      flaky: test.status === 'flaky',
      rawStatus: test.status,
    });
  }
}
