import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { BaseProvider } from '@/types/providers';
import {
  UnifiedReport,
  UnifiedTestSuite,
  UnifiedTestResult,
  UnifiedTestStatus,
  UnifiedTestStats,
} from '@/types/unified-report';
import {
  VitestReport,
  VitestTestResult,
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
        typeof data.numFailedTests === 'number'
      );
    } catch {
      return false;
    }
  }

  async convert(inputPath: string): Promise<UnifiedReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const vitestReport: VitestReport = JSON.parse(content);

    const unifiedSuites = this.convertTestResults(vitestReport.testResults);
    const stats = this.calculateStats(unifiedSuites, vitestReport);

    return {
      id: randomUUID(),
      framework: 'vitest',
      stats,
      suites: unifiedSuites,
      createdAt: new Date().toISOString(),
    };
  }

  private convertTestResults(
    testResults: VitestTestResult[]
  ): UnifiedTestSuite[] {
    const suites: UnifiedTestSuite[] = [];

    for (const testResult of testResults) {
      // Only include suites that have tests
      if (
        testResult.assertionResults &&
        testResult.assertionResults.length > 0
      ) {
        const suite: UnifiedTestSuite = {
          id: randomUUID(),
          name: this.extractSuiteName(testResult.name),
          file: testResult.name,
          tests: this.convertAssertionResults(testResult.assertionResults),
          duration: testResult.endTime - testResult.startTime,
        };

        suites.push(suite);
      }
    }

    return suites;
  }

  private convertAssertionResults(
    assertionResults: VitestAssertionResult[]
  ): UnifiedTestResult[] {
    return assertionResults.map(assertion =>
      this.convertAssertionResult(assertion)
    );
  }

  private convertAssertionResult(
    assertion: VitestAssertionResult
  ): UnifiedTestResult {
    const status = this.mapStatus(assertion.status);

    // Create a single result attempt (Vitest doesn't have retry mechanism by default)
    const results = [
      {
        attemptNumber: 1,
        status: status,
        duration: assertion.duration,
        startTime: undefined, // Not available in Vitest output
        errors: this.extractErrors(assertion),
      },
    ];

    return {
      id: randomUUID(),
      name: assertion.title,
      fullName: assertion.fullName,
      status: status,
      duration: assertion.duration,
      startTime: undefined, // Not available in Vitest output
      endTime: undefined, // Not available in Vitest output
      tags: undefined, // Vitest doesn't have built-in tagging
      assertions: undefined,
      results: results,
    };
  }

  private extractErrors(assertion: VitestAssertionResult) {
    if (!assertion.failureMessages || assertion.failureMessages.length === 0) {
      return undefined;
    }

    return assertion.failureMessages.map(message => {
      const location = this.extractLocationFromStack(message);
      return {
        message: this.extractErrorMessage(message),
        stack: message,
        ...(location && { location }),
      };
    });
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

  private extractLocationFromStack(stack: string) {
    // Extract file location from Vitest stack trace
    const stackLines = stack.split('\n');

    for (const line of stackLines) {
      // Look for lines like "at /path/to/file.ts:14:29"
      const match = line.match(/at (.+):(\d+):(\d+)/);
      if (match && match[1] && match[2] && match[3]) {
        return {
          file: match[1],
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
        };
      }
    }

    return undefined;
  }

  private mapStatus(vitestStatus: VitestTestStatus): UnifiedTestStatus {
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
        return 'todo';
      default:
        return 'failed';
    }
  }

  private extractSuiteName(testFilePath: string): string {
    // Extract suite name from file path like "/project/src/subtraction.test.ts"
    const parts = testFilePath.split('/');
    const fileName = parts[parts.length - 1] || 'unknown';
    return fileName.replace(/\.(test|spec)\.(js|ts|jsx|tsx)$/, '');
  }

  private calculateStats(
    suites: UnifiedTestSuite[],
    vitestReport: VitestReport
  ): UnifiedTestStats {
    // Convert Vitest timestamp (epoch milliseconds) to ISO string
    const startTime = new Date(vitestReport.startTime).toISOString();

    // Calculate end time and duration from the test results
    const endTimes = suites
      .map(suite => suite.duration || 0)
      .filter(duration => duration > 0);

    const maxEndTime = endTimes.length > 0 ? Math.max(...endTimes) : 0;
    const endTime = new Date(vitestReport.startTime + maxEndTime).toISOString();
    const duration = maxEndTime;

    return {
      total: vitestReport.numTotalTests,
      passed: vitestReport.numPassedTests,
      failed: vitestReport.numFailedTests,
      skipped: 0, // Vitest doesn't have a direct "skipped" concept in top-level stats
      pending: vitestReport.numPendingTests,
      todo: vitestReport.numTodoTests,
      timeout: 0, // Vitest reports timeouts as failures
      interrupted: 0,
      suites: vitestReport.numTotalTestSuites,
      duration,
      startTime,
      endTime,
    };
  }
}
