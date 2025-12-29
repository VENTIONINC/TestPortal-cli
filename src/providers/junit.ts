import { promises as fs } from 'fs';
import { parseStringPromise } from 'xml2js';
import { BaseProvider } from '@/types/providers';
import { CTRFReport, CTRFTest, TestStatus } from '@/types/ctrf';
import { CTRFFactory } from '@/core/ctrf-factory';
import { JunitTestSuite, JunitTestCase, JunitTestSuites } from '@/types/junit';

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
    const tests = this.convertTestSuites(junitData);

    let startTime = Date.now();
    let endTime = Date.now();

    // Try to find timestamp in root
    if (parsed.testsuites && parsed.testsuites.timestamp) {
      startTime = new Date(parsed.testsuites.timestamp).getTime();
    } else if (parsed.testsuite && parsed.testsuite.timestamp) {
      startTime = new Date(parsed.testsuite.timestamp).getTime();
    }

    // Calculate duration
    const totalTime = this.parseNumber(junitData.time) || 0;
    if (totalTime > 0) {
      endTime = startTime + totalTime * 1000; // JUnit time is usually seconds
    }

    return CTRFFactory.createReport(
      tests,
      'junit',
      undefined,
      startTime,
      endTime
    );
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
      };
    }

    // If it's already testsuites, return as is
    if (parsed.testsuites) {
      return parsed.testsuites;
    }

    throw new Error('Invalid JUnit XML format');
  }

  private convertTestSuites(junitData: JunitTestSuites): CTRFTest[] {
    const tests: CTRFTest[] = [];

    const testSuites = Array.isArray(junitData.testsuite)
      ? junitData.testsuite
      : [junitData.testsuite];

    for (const suite of testSuites) {
      if (!suite) continue;
      tests.push(...this.convertTestCases(suite));
    }

    return tests;
  }

  private convertTestCases(suite: JunitTestSuite): CTRFTest[] {
    const tests: CTRFTest[] = [];
    const cases = suite.testcase
      ? Array.isArray(suite.testcase)
        ? suite.testcase
        : [suite.testcase]
      : [];

    for (const testCase of cases) {
      tests.push(this.convertTestCase(testCase, suite.name));
    }
    return tests;
  }

  private convertTestCase(
    testCase: JunitTestCase,
    suiteName: string
  ): CTRFTest {
    const status = this.determineStatus(testCase);
    const duration = (this.parseNumber(testCase.time) || 0) * 1000; // seconds to ms

    const ctrfTest: CTRFTest = {
      name: testCase.name,
      status,
      duration,
      suite: suiteName,
      filePath: testCase.file, // Some JUnit reports have file attribute
    };

    if (status === 'failed' || status === 'other') {
      if (testCase.failure) {
        const failure = Array.isArray(testCase.failure)
          ? testCase.failure[0]
          : testCase.failure;
        ctrfTest.message = failure.message || failure._;
        ctrfTest.trace = failure._; // Content often contains stack
      } else if (testCase.error) {
        const error = Array.isArray(testCase.error)
          ? testCase.error[0]
          : testCase.error;
        ctrfTest.message = error.message || error._;
        ctrfTest.trace = error._;
      }
    }

    return ctrfTest;
  }

  private determineStatus(testCase: JunitTestCase): TestStatus {
    if (testCase.failure) return 'failed';
    if (testCase.error) return 'failed';
    if (testCase.skipped !== undefined) return 'skipped';
    return 'passed';
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value);
    return 0;
  }
}
