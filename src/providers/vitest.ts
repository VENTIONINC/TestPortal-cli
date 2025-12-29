import { promises as fs } from 'fs';
import { BaseProvider } from '@/types/providers';
import { CTRFReport, CTRFTest, TestStatus } from '@/types/ctrf';
import { CTRFFactory } from '@/core/ctrf-factory';
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

  async convert(inputPath: string): Promise<CTRFReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const vitestReport: VitestReport = JSON.parse(content);

    const tests = this.convertTestResults(vitestReport.testResults);

    const startTime = vitestReport.startTime;
    let maxEndTime = startTime;
    vitestReport.testResults.forEach(suite => {
      if (suite.endTime > maxEndTime) {
        maxEndTime = suite.endTime;
      }
    });

    return CTRFFactory.createReport(
      tests,
      'vitest',
      undefined,
      startTime,
      maxEndTime
    );
  }

  private convertTestResults(testResults: VitestTestResult[]): CTRFTest[] {
    const tests: CTRFTest[] = [];

    for (const testResult of testResults) {
      if (testResult.assertionResults) {
        for (const assertion of testResult.assertionResults) {
          tests.push(this.convertAssertionResult(assertion, testResult.name));
        }
      }
    }
    return tests;
  }

  private convertAssertionResult(
    assertion: VitestAssertionResult,
    filePath: string
  ): CTRFTest {
    const status = this.mapStatus(assertion.status);

    const ctrfTest: CTRFTest = {
      name: assertion.fullName || assertion.title,
      status,
      duration: assertion.duration || 0,
      filePath: filePath,
      suite:
        assertion.ancestorTitles && assertion.ancestorTitles.length > 0
          ? assertion.ancestorTitles.join(' > ')
          : this.extractSuiteName(filePath),
      rawStatus: assertion.status,
    };

    if (status === 'failed') {
      const error = this.extractError(assertion);
      if (error) {
        ctrfTest.message = error.message;
        ctrfTest.trace = error.stack;
      }
    }

    return ctrfTest;
  }

  private mapStatus(status: VitestTestStatus): TestStatus {
    switch (status) {
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
        return 'other';
    }
  }

  private extractError(assertion: VitestAssertionResult) {
    if (!assertion.failureMessages || assertion.failureMessages.length === 0) {
      return undefined;
    }
    const message = assertion.failureMessages[0];
    return {
      message: message,
      stack: message,
    };
  }

  private extractSuiteName(filePath: string): string {
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1] || 'unknown';
    return fileName.replace(/\.(test|spec)\.(js|ts|jsx|tsx)$/, '');
  }
}
