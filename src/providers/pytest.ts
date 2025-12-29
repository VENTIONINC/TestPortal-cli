import { promises as fs } from 'fs';
import { BaseProvider } from '@/types/providers';
import { CTRFReport, CTRFTest, TestStatus } from '@/types/ctrf';
import { CTRFFactory } from '@/core/ctrf-factory';
import {
  PytestReport,
  PytestReportSchema,
  PytestTest,
  PytestOutcome,
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

    const tests = this.convertTests(pytestReport.tests);

    const startTime = pytestReport.created * 1000;
    const endTime = startTime + pytestReport.duration * 1000;

    return CTRFFactory.createReport(
      tests,
      'pytest',
      undefined,
      startTime,
      endTime
    );
  }

  private convertTests(tests: PytestTest[]): CTRFTest[] {
    return tests.map(test => this.convertTest(test));
  }

  private convertTest(test: PytestTest): CTRFTest {
    const { filePath, suiteName, testName } = this.extractSuiteInfo(
      test.nodeid
    );
    const status = this.mapStatus(test.outcome);

    const durationSeconds =
      (test.call?.duration || 0) +
      (test.setup?.duration || 0) +
      (test.teardown?.duration || 0);

    const duration = durationSeconds > 0 ? durationSeconds * 1000 : 0;

    const ctrfTest: CTRFTest = {
      name: testName,
      status,
      duration,
      suite: suiteName,
      filePath,
      rawStatus: test.outcome,
      tags: test.keywords,
    };

    if (status === 'failed') {
      const stage =
        test.call?.outcome === 'failed' || test.call?.outcome === 'error'
          ? test.call
          : test.setup?.outcome === 'failed' || test.setup?.outcome === 'error'
            ? test.setup
            : test.teardown?.outcome === 'failed' ||
                test.teardown?.outcome === 'error'
              ? test.teardown
              : undefined;

      if (stage) {
        if (stage.crash) {
          ctrfTest.message = stage.crash.message;
        }

        if (stage.longrepr) {
          const msg =
            typeof stage.longrepr === 'string'
              ? stage.longrepr
              : JSON.stringify(stage.longrepr);
          if (!ctrfTest.message) {
            ctrfTest.message = msg;
          }
          ctrfTest.trace = msg;
        }

        if (stage.traceback && stage.traceback.length > 0) {
          const traceLines = stage.traceback.map(
            t => `${t.path}:${t.lineno} ${t.message || ''}`
          );
          ctrfTest.trace = traceLines.join('\n');
        }
      }
    }

    return ctrfTest;
  }

  private mapStatus(outcome: PytestOutcome): TestStatus {
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
        return 'other';
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
}
