import { promises as fs } from 'fs';
import { BaseProvider } from '@/types/providers';
import { CTRFReport } from '@/types/ctrf';
import { CTRFBuilder } from '@/core/ctrf-builder';
import {
  PytestReportSchema,
  PytestTest,
  PytestOutcome,
  PytestStage,
} from '@/types/pytest';

export class PytestProvider implements BaseProvider {
  public readonly name = 'pytest';

  async validate(inputPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(inputPath, 'utf8');
      const data = JSON.parse(content);

      // Validate against pytest report schema
      const result = PytestReportSchema.safeParse(data);
      return result.success;
    } catch {
      return false;
    }
  }

  async convert(inputPath: string): Promise<CTRFReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const data = JSON.parse(content);

    // Parse and validate with Zod
    const pytestReport = PytestReportSchema.parse(data);

    const builder = new CTRFBuilder('pytest');

    // Set summary stats
    const startTime = pytestReport.created * 1000;
    const durationMs = pytestReport.duration * 1000;
    const endTime = startTime + durationMs;

    builder.setSummary({
      start: startTime,
      stop: endTime,
    });

    for (const test of pytestReport.tests) {
      const { filePath, suiteName, testName } = this.extractSuiteInfo(
        test.nodeid
      );
      const status = this.mapStatus(test.outcome);
      const duration = this.calculateTestDuration(test) || 0;
      const error = this.extractError(test);

      builder.addTest({
        name: testName,
        status: status,
        duration: duration,
        suite: suiteName,
        filePath: filePath,
        ...(test.keywords && { tags: test.keywords }),
        ...(error?.message && { message: error.message }),
        ...(error?.stack && { trace: error.stack }),
        rawStatus: test.outcome,
      });
    }

    return builder.build();
  }

  private mapStatus(outcome: PytestOutcome): string {
    switch (outcome) {
      case 'passed':
        return 'passed';
      case 'failed':
      case 'error':
        return 'failed';
      case 'skipped':
      case 'xfailed':
        return 'skipped';
      case 'xpassed':
        return 'passed';
      default:
        return 'failed';
    }
  }

  private extractSuiteInfo(nodeid: string): {
    filePath: string;
    suiteName: string;
    testName: string;
  } {
    // nodeid format: "tests/test_auth.py::TestClass::test_method[param]"
    // or: "tests/test_auth.py::test_function"
    const parts = nodeid.split('::');
    const filePath = parts[0] || 'unknown';

    // Extract filename without extension for suite name
    const fileName = filePath.split('/').pop() || 'unknown';
    const suiteName = fileName.replace(/\.py$/, '');

    // Last part is the test name (may include parameters)
    const testName = parts[parts.length - 1] || 'unknown';

    return { filePath, suiteName, testName };
  }

  private extractError(
    test: PytestTest
  ): { message: string; stack?: string } | undefined {
    // Check stages in priority order: call > setup > teardown
    const stagesToCheck: Array<{
      stage: PytestStage | undefined;
      name: string;
    }> = [
      { stage: test.call, name: 'call' },
      { stage: test.setup, name: 'setup' },
      { stage: test.teardown, name: 'teardown' },
    ];

    for (const { stage } of stagesToCheck) {
      if (!stage) continue;

      // Only extract errors from failed/error stages
      if (stage.outcome === 'failed' || stage.outcome === 'error') {
        // Use longrepr for main error message
        if (stage.longrepr) {
          const stack = this.formatTraceback(stage);
          return {
            message: stage.longrepr,
            ...(stack && { stack }),
          };
        }

        // Add crash info if present
        if (stage.crash) {
          return {
            message: `Crash at ${stage.crash.path}:${stage.crash.lineno}: ${stage.crash.message}`,
          };
        }
      }
    }

    return undefined;
  }

  private formatTraceback(stage: PytestStage): string | undefined {
    if (!stage.traceback || stage.traceback.length === 0) {
      return undefined;
    }

    return stage.traceback
      .map(tb => {
        const msg = tb.message ? `: ${tb.message}` : '';
        return `  File "${tb.path}", line ${tb.lineno}${msg}`;
      })
      .join('\n');
  }

  private calculateTestDuration(test: PytestTest): number | undefined {
    let totalDuration = 0;
    let hasDuration = false;

    // Sum durations from all stages
    const stages = [test.setup, test.call, test.teardown];
    for (const stage of stages) {
      if (stage?.duration !== undefined) {
        totalDuration += stage.duration;
        hasDuration = true;
      }
    }

    // Convert seconds to milliseconds
    return hasDuration ? totalDuration * 1000 : undefined;
  }
}
