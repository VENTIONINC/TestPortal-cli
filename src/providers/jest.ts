import { promises as fs } from 'fs';
import { BaseProvider } from '@/types/providers';
import { CTRFReport } from '@/types/ctrf';
import { CTRFBuilder } from '@/core/ctrf-builder';
import { JestReport, JestAssertionResult } from '@/types/jest';

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
        typeof data.numFailedTests === 'number' &&
        // Distinguish from Vitest which uses 'name' instead of 'testFilePath'
        data.testResults.length > 0 &&
        'testFilePath' in data.testResults[0]
      );
    } catch {
      return false;
    }
  }

  async convert(inputPath: string): Promise<CTRFReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const jestReport: JestReport = JSON.parse(content);

    const builder = new CTRFBuilder('jest');

    // Calculate end time
    const endTimes = jestReport.testResults
      .map(suite => suite.perfStats?.runtime || 0)
      .filter(duration => duration > 0);
    const maxEndTime = endTimes.length > 0 ? Math.max(...endTimes) : 0;

    builder.setSummary({
      tests: jestReport.numTotalTests,
      passed: jestReport.numPassedTests,
      failed: jestReport.numFailedTests,
      pending: jestReport.numPendingTests,
      skipped: 0,
      other:
        (jestReport.numTodoTests || 0) + (jestReport.wasInterrupted ? 1 : 0),
      start: jestReport.startTime,
      stop: jestReport.startTime + maxEndTime,
    });

    for (const testResult of jestReport.testResults) {
      if (testResult.skipped) {
        continue;
      }

      const suiteName = this.extractSuiteName(testResult.testFilePath);

      if (
        testResult.assertionResults &&
        testResult.assertionResults.length > 0
      ) {
        for (const assertion of testResult.assertionResults) {
          const error = this.extractError(assertion);
          builder.addTest({
            name: assertion.fullName || assertion.title,
            status: assertion.status,
            duration: assertion.duration || 0,
            suite: suiteName,
            filePath: testResult.testFilePath,
            ...(error?.message && { message: error.message }),
            ...(error?.stack && { trace: error.stack }),
            rawStatus: assertion.status,
          });
        }
      }
    }

    return builder.build();
  }

  private extractError(
    assertion: JestAssertionResult
  ): { message: string; stack?: string } | undefined {
    if (!assertion.failureMessages || assertion.failureMessages.length === 0) {
      return undefined;
    }

    const failureMessage = assertion.failureMessages[0];
    if (!failureMessage) {
      return undefined;
    }

    return {
      message: this.extractErrorMessage(failureMessage),
      stack: failureMessage,
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

  private extractSuiteName(testFilePath: string): string {
    // Extract suite name from file path like "/project/src/__tests__/auth.test.js"
    const parts = testFilePath.split('/');
    const fileName = parts[parts.length - 1] || 'unknown';
    return fileName.replace(/\.(test|spec)\.(js|ts|jsx|tsx)$/, '');
  }
}
