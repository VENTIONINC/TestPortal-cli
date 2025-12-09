import { promises as fs } from 'fs';
import { parseStringPromise } from 'xml2js';
import { BaseProvider } from '@/types/providers';
import { CTRFReport } from '@/types/ctrf';
import { CTRFBuilder } from '@/core/ctrf-builder';
import { JunitTestSuites, JunitTestSuite, JunitTestCase } from '@/types/junit';

export class JunitProvider implements BaseProvider {
  public readonly name = 'junit';

  async validate(inputPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(inputPath, 'utf8');

      // Check if it's valid XML with JUnit structure
      const parsed = await parseStringPromise(content);

      // Check for testsuite or testsuites root element
      if (parsed.testsuite || parsed.testsuites) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  async convert(inputPath: string): Promise<CTRFReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const parsed = await parseStringPromise(content, {
      explicitArray: false,
      mergeAttrs: true,
    });

    // Handle both single testsuite and testsuites formats
    const junitData = this.normalizeJunitData(parsed);
    const builder = new CTRFBuilder('junit');

    // Set summary stats
    const durationSec = this.parseNumber(junitData.time) || 0;
    const durationMs = durationSec * 1000;
    const startTime = junitData.timestamp
      ? new Date(junitData.timestamp).getTime()
      : Date.now();

    builder.setSummary({
      start: startTime,
      stop: startTime + durationMs,
    });

    const testSuites = Array.isArray(junitData.testsuite)
      ? junitData.testsuite
      : [junitData.testsuite];

    for (const suite of testSuites) {
      if (!suite) continue;

      const suiteName = suite.name || 'Unknown Suite';
      const testCases = this.getTestCases(suite);

      for (const testCase of testCases) {
        const status = this.determineTestStatus(testCase);
        // JUnit time is usually in seconds, convert to ms
        const duration = (this.parseNumber(testCase.time) || 0) * 1000;
        const error = this.extractError(testCase);

        builder.addTest({
          name: testCase.name,
          status: status,
          duration: duration,
          suite: suiteName,
          ...(error?.message ? { message: error.message } : {}),
          ...(error?.stack ? { trace: error.stack } : {}),
          rawStatus: status,
        });
      }
    }

    return builder.build();
  }

  private normalizeJunitData(parsed: any): JunitTestSuites {
    // If it's a single testsuite, wrap it in testsuites structure
    if (parsed.testsuite) {
      const testsuite = Array.isArray(parsed.testsuite)
        ? parsed.testsuite
        : [parsed.testsuite];

      return {
        tests: this.parseNumber(parsed.testsuite.tests) || 0,
        failures: this.parseNumber(parsed.testsuite.failures) || 0,
        errors: this.parseNumber(parsed.testsuite.errors) || 0,
        time: this.parseNumber(parsed.testsuite.time) || 0,
        testsuite: testsuite,
        timestamp: parsed.testsuite.timestamp,
      };
    }

    // If it's already testsuites, return as is
    if (parsed.testsuites) {
      return parsed.testsuites;
    }

    throw new Error('Invalid JUnit XML format');
  }

  private getTestCases(suite: JunitTestSuite): JunitTestCase[] {
    return Array.isArray(suite.testcase)
      ? suite.testcase
      : suite.testcase
        ? [suite.testcase]
        : [];
  }

  private determineTestStatus(testCase: JunitTestCase): string {
    if (testCase.skipped !== undefined) {
      return 'skipped';
    }
    if (testCase.error) {
      return 'failed'; // Map JUnit errors to failed
    }
    if (testCase.failure) {
      return 'failed';
    }
    return 'passed';
  }

  private extractError(
    testCase: JunitTestCase
  ): { message: string; stack: string } | undefined {
    if (testCase.failure) {
      return {
        message: testCase.failure.message || 'Test failure',
        stack: testCase.failure._ || '',
      };
    }

    if (testCase.error) {
      return {
        message: testCase.error.message || 'Test error',
        stack: testCase.error._ || '',
      };
    }

    return undefined;
  }

  private parseNumber(value: any): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }
}
