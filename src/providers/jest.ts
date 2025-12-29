import { promises as fs } from 'fs';
import { BaseProvider } from '@/types/providers';
import { CTRFReport, CTRFTest, TestStatus } from '@/types/ctrf';
import { CTRFFactory } from '@/core/ctrf-factory';
import {
  JestReport,
  JestTestResult,
  JestAssertionResult,
  JestTestStatus,
} from '@/types/jest';

export class JestProvider implements BaseProvider {
  public readonly name = 'jest';

  async validate(inputPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(inputPath, 'utf8');
      const data = JSON.parse(content);

      return (
        typeof data === 'object' &&
        data !== null &&
        Array.isArray(data.testResults) &&
        typeof data.numTotalTests === 'number' &&
        typeof data.numPassedTests === 'number' &&
        typeof data.numFailedTests === 'number'
      );
    } catch {
      return false;
    }
  }

  async convert(inputPath: string): Promise<CTRFReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const jestReport: JestReport = JSON.parse(content);

    const tests = this.convertTestResults(jestReport.testResults);

    // Calculate start/end time
    const startTime = jestReport.startTime;
    let maxEndTime = startTime;

    jestReport.testResults.forEach(suite => {
      if (suite.perfStats?.end) {
        maxEndTime = Math.max(maxEndTime, suite.perfStats.end);
      } else if (suite.perfStats?.runtime) {
        maxEndTime = Math.max(maxEndTime, startTime + suite.perfStats.runtime);
      }
    });

    return CTRFFactory.createReport(
      tests,
      'jest',
      undefined,
      startTime,
      maxEndTime
    );
  }

  private convertTestResults(testResults: JestTestResult[]): CTRFTest[] {
    const tests: CTRFTest[] = [];

    for (const testResult of testResults) {
      if (testResult.skipped) continue;

      if (testResult.assertionResults) {
        for (const assertion of testResult.assertionResults) {
          tests.push(
            this.convertAssertionResult(assertion, testResult.testFilePath)
          );
        }
      }
    }

    return tests;
  }

  private convertAssertionResult(
    assertion: JestAssertionResult,
    filePath: string
  ): CTRFTest {
    const status = this.mapStatus(assertion.status);

    const test: CTRFTest = {
      name: assertion.title,
      status,
      duration: assertion.duration || 0,
      filePath,
      rawStatus: assertion.status,
      suite: assertion.ancestorTitles?.join(' > '),
    };

    if (status === 'failed') {
      const error = this.extractError(assertion);
      if (error) {
        test.message = error.message;
        test.trace = error.stack;
      }
    }

    return test;
  }

  private extractError(assertion: JestAssertionResult) {
    if (!assertion.failureMessages || assertion.failureMessages.length === 0) {
      return undefined;
    }

    const message = assertion.failureMessages[0];
    if (!message) return undefined;

    return {
      message: this.extractErrorMessage(message),
      stack: message,
    };
  }

  private extractErrorMessage(failureMessage: string): string {
    // Extract the main error message from Jest's failure output
    const lines = failureMessage.split('\n');

    // Find the line with the actual assertion error
    for (const line of lines) {
      if (line.includes('Expected:') || line.includes('Received:')) {
        return lines[0] || 'Test failed'; // Return the first line as the main message
      }
      if (line.trim().startsWith('expect(')) {
        return line.trim();
      }
    }

    // Fallback to first non-empty line
    return lines.find(line => line.trim().length > 0) || 'Test failed';
  }

  private mapStatus(jestStatus: JestTestStatus): TestStatus {
    switch (jestStatus) {
      case 'passed':
        return 'passed';
      case 'failed':
        return 'failed';
      case 'pending':
        return 'pending';
      case 'todo':
        return 'pending';
      default:
        return 'failed';
    }
  }
}
