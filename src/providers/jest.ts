import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { BaseProvider } from '@/types/providers';
import {
  UnifiedReport,
  UnifiedTestSuite,
  UnifiedTestResult,
  UnifiedTestStatus,
  UnifiedTestStats,
  UnifiedCoverage,
} from '@/types/unified-report';
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

  async convert(inputPath: string): Promise<UnifiedReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const jestReport: JestReport = JSON.parse(content);

    const unifiedSuites = this.convertTestResults(jestReport.testResults);
    const stats = this.calculateStats(unifiedSuites, jestReport);
    const coverage = this.convertCoverage(jestReport.coverageMap);

    return {
      id: randomUUID(),
      framework: 'jest',
      stats,
      suites: unifiedSuites,
      ...(coverage && { coverage }),
      createdAt: new Date().toISOString(),
    };
  }

  private convertTestResults(
    testResults: JestTestResult[]
  ): UnifiedTestSuite[] {
    const suites: UnifiedTestSuite[] = [];

    for (const testResult of testResults) {
      // Skip test files that were skipped entirely
      if (testResult.skipped) {
        continue;
      }

      // Only include suites that have tests
      if (
        testResult.assertionResults &&
        testResult.assertionResults.length > 0
      ) {
        const suite: UnifiedTestSuite = {
          id: randomUUID(),
          name: this.extractSuiteName(testResult.testFilePath),
          file: testResult.testFilePath,
          tests: this.convertAssertionResults(testResult.assertionResults),
          duration: testResult.perfStats?.runtime,
        };

        suites.push(suite);
      }
    }

    return suites;
  }

  private convertAssertionResults(
    assertionResults: JestAssertionResult[]
  ): UnifiedTestResult[] {
    return assertionResults.map(assertion =>
      this.convertAssertionResult(assertion)
    );
  }

  private convertAssertionResult(
    assertion: JestAssertionResult
  ): UnifiedTestResult {
    const status = this.mapStatus(assertion.status);

    // Create a single result attempt (Jest doesn't have retry mechanism by default)
    const results = [
      {
        attemptNumber: 1,
        status: status,
        duration: assertion.duration,
        startTime: undefined, // Not available in Jest output
        errors: this.extractErrors(assertion),
      },
    ];

    return {
      id: randomUUID(),
      name: assertion.title,
      fullName: assertion.fullName,
      status: status,
      duration: assertion.duration,
      startTime: undefined, // Not available in Jest output
      endTime: undefined, // Not available in Jest output
      tags: undefined, // Jest doesn't have built-in tagging
      assertions: assertion.numPassingAsserts,
      results: results,
    };
  }

  private extractErrors(assertion: JestAssertionResult) {
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

  private extractLocationFromStack(stack: string) {
    // Extract file location from Jest stack trace
    const stackLines = stack.split('\n');

    for (const line of stackLines) {
      // Look for lines like "at Object.<anonymous> (/path/to/file.js:14:28)"
      const match = line.match(/at .+ \((.+):(\d+):(\d+)\)/);
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

  private mapStatus(jestStatus: JestTestStatus): UnifiedTestStatus {
    switch (jestStatus) {
      case 'passed':
        return 'passed';
      case 'failed':
        return 'failed';
      case 'pending':
        return 'pending';
      case 'todo':
        return 'todo';
      default:
        return 'failed';
    }
  }

  private extractSuiteName(testFilePath: string): string {
    // Extract suite name from file path like "/project/src/__tests__/auth.test.js"
    const parts = testFilePath.split('/');
    const fileName = parts[parts.length - 1] || 'unknown';
    return fileName.replace(/\.(test|spec)\.(js|ts|jsx|tsx)$/, '');
  }

  private calculateStats(
    suites: UnifiedTestSuite[],
    jestReport: JestReport
  ): UnifiedTestStats {
    const allTests = suites.flatMap(suite => suite.tests);

    // Convert Jest timestamp (epoch milliseconds) to ISO string
    const startTime = new Date(jestReport.startTime).toISOString();

    // Calculate end time and duration from the test results
    const endTimes = suites
      .map(suite => suite.duration || 0)
      .filter(duration => duration > 0);

    const maxEndTime = endTimes.length > 0 ? Math.max(...endTimes) : 0;
    const endTime = new Date(jestReport.startTime + maxEndTime).toISOString();
    const duration = maxEndTime;

    return {
      total: jestReport.numTotalTests,
      passed: jestReport.numPassedTests,
      failed: jestReport.numFailedTests,
      skipped: 0, // Jest doesn't have a direct "skipped" concept
      pending: jestReport.numPendingTests,
      todo: jestReport.numTodoTests,
      timeout: 0, // Jest reports timeouts as failures
      interrupted: jestReport.wasInterrupted ? 1 : 0,
      suites: jestReport.numTotalTestSuites,
      duration,
      startTime,
      endTime,
    };
  }

  private convertCoverage(coverageMap?: any): UnifiedCoverage | undefined {
    if (!coverageMap) {
      return undefined;
    }

    // Jest coverage is complex, so we'll aggregate the data
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalLines = 0;
    let coveredLines = 0;

    for (const [filePath, fileData] of Object.entries(coverageMap)) {
      const data = fileData as any;

      if (data.s) {
        // Statements
        const statements = Object.values(data.s) as number[];
        totalStatements += statements.length;
        coveredStatements += statements.filter(count => count > 0).length;
      }

      if (data.b) {
        // Branches
        const branches = Object.values(data.b) as number[][];
        for (const branchCounts of branches) {
          totalBranches += branchCounts.length;
          coveredBranches += branchCounts.filter(count => count > 0).length;
        }
      }

      if (data.f) {
        // Functions
        const functions = Object.values(data.f) as number[];
        totalFunctions += functions.length;
        coveredFunctions += functions.filter(count => count > 0).length;
      }
    }

    // Lines coverage is typically the same as statements in Jest
    totalLines = totalStatements;
    coveredLines = coveredStatements;

    return {
      statements:
        totalStatements > 0
          ? {
              total: totalStatements,
              covered: coveredStatements,
              percentage: (coveredStatements / totalStatements) * 100,
            }
          : undefined,
      branches:
        totalBranches > 0
          ? {
              total: totalBranches,
              covered: coveredBranches,
              percentage: (coveredBranches / totalBranches) * 100,
            }
          : undefined,
      functions:
        totalFunctions > 0
          ? {
              total: totalFunctions,
              covered: coveredFunctions,
              percentage: (coveredFunctions / totalFunctions) * 100,
            }
          : undefined,
      lines:
        totalLines > 0
          ? {
              total: totalLines,
              covered: coveredLines,
              percentage: (coveredLines / totalLines) * 100,
            }
          : undefined,
    };
  }
}
