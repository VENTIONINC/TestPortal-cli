import { promises as fs } from 'fs';
import { BaseProvider } from '@/types/providers';
import { CTRFReport } from '@/types/ctrf';
import { CTRFBuilder } from '@/core/ctrf-builder';
import {
  VitestReport,
  VitestAssertionResult,
  VitestTestStatus,
} from '@/types/vitest';

export class VitestProvider implements BaseProvider {
  public readonly name = 'vitest';

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
        // Distinguish from Jest which uses 'testFilePath'
        data.testResults.length > 0 &&
        'name' in data.testResults[0] &&
        !('testFilePath' in data.testResults[0])
      );
    } catch {
      return false;
    }
  }

  async convert(inputPath: string): Promise<CTRFReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const vitestReport: VitestReport = JSON.parse(content);

    const builder = new CTRFBuilder('vitest');

    // Calculate end time
    const endTimes = vitestReport.testResults
      .map(suite => suite.endTime - suite.startTime)
      .filter(duration => duration > 0);
    const maxEndTime = endTimes.length > 0 ? Math.max(...endTimes) : 0;

    let skipped = 0;
    for (const suite of vitestReport.testResults) {
      if (suite.assertionResults) {
        for (const test of suite.assertionResults) {
          if (test.status === 'skipped') {
            skipped++;
          }
        }
      }
    }

    builder.setSummary({
      tests: vitestReport.numTotalTests,
      passed: vitestReport.numPassedTests,
      failed: vitestReport.numFailedTests,
      pending: vitestReport.numPendingTests,
      skipped: skipped,
      other: vitestReport.numTodoTests || 0,
      start: vitestReport.startTime,
      stop: vitestReport.startTime + maxEndTime,
    });

    for (const testResult of vitestReport.testResults) {
      const suiteName = this.extractSuiteName(testResult.name);

      if (
        testResult.assertionResults &&
        testResult.assertionResults.length > 0
      ) {
        for (const assertion of testResult.assertionResults) {
          const status = this.mapStatus(assertion.status);
          const error = this.extractError(assertion);

          builder.addTest({
            name: assertion.fullName || assertion.title,
            status: status,
            duration: assertion.duration || 0,
            suite: suiteName,
            filePath: testResult.name,
            ...(error?.message ? { message: error.message } : {}),
            ...(error?.stack ? { trace: error.stack } : {}),
            rawStatus: assertion.status,
          });
        }
      }
    }

    return builder.build();
  }

  private mapStatus(vitestStatus: VitestTestStatus): string {
    switch (vitestStatus) {
      case 'passed':
        return 'passed';
      case 'failed':
        return 'failed';
      case 'skipped':
        return 'skipped';
      case 'pending':
        return 'pending';
      case 'todo':
        return 'pending';
      default:
        return 'failed';
    }
  }

  private extractError(
    assertion: VitestAssertionResult
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
    // Extract the main error message from Vitest's failure output
    const lines = failureMessage.split('\n');

    // Find the line with the actual assertion error
    for (const line of lines) {
      if (line.includes('expected') || line.includes('received')) {
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
    // Extract suite name from file path like "/project/src/subtraction.test.ts"
    const parts = testFilePath.split('/');
    const fileName = parts[parts.length - 1] || 'unknown';
    return fileName.replace(/\.(test|spec)\.(js|ts|jsx|tsx)$/, '');
  }
}
