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
  CypressReport,
  CypressTest,
  CypressTestState,
  CypressSuite,
} from '@/types/cypress';

export class CypressProvider implements BaseProvider {
  public readonly name = 'cypress';

  async validate(inputPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(inputPath, 'utf8');
      const data = JSON.parse(content);

      return (
        typeof data === 'object' &&
        data !== null &&
        Array.isArray(data.results) &&
        typeof data.stats === 'object' &&
        typeof data.stats.tests === 'number'
      );
    } catch {
      return false;
    }
  }

  async convert(inputPath: string): Promise<UnifiedReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const cypressReport: CypressReport = JSON.parse(content);

    const unifiedSuites = this.convertResults(cypressReport.results);
    const stats = this.calculateStats(unifiedSuites, cypressReport);

    return {
      id: randomUUID(),
      framework: 'cypress',
      ...(cypressReport.meta?.mocha?.version && {
        frameworkVersion: cypressReport.meta.mocha.version,
      }),
      ...(cypressReport.meta?.mochawesome?.version && {
        toolVersion: cypressReport.meta.mochawesome.version,
      }),
      stats,
      suites: unifiedSuites,
      createdAt: new Date().toISOString(),
    };
  }

  private convertResults(results: CypressSuite[]): UnifiedTestSuite[] {
    const suites: UnifiedTestSuite[] = [];

    for (const result of results) {
      // Only include suites that have tests
      if (result.tests && result.tests.length > 0) {
        const suite: UnifiedTestSuite = {
          id: result.uuid || randomUUID(),
          name: result.title || this.extractSuiteName(result.file),
          file: result.file,
          tests: this.convertTests(result.tests),
          duration: result.duration,
        };

        suites.push(suite);
      }
    }

    return suites;
  }

  private convertTests(tests: CypressTest[]): UnifiedTestResult[] {
    return tests.map(test => this.convertTest(test));
  }

  private convertTest(test: CypressTest): UnifiedTestResult {
    const status = this.mapStatus(test.state);

    // Create a single result attempt (Cypress doesn't have retry info in this format)
    const results = [
      {
        attemptNumber: 1,
        status: status,
        duration: test.duration,
        startTime: undefined, // Not available in this format
        errors:
          test.err && test.err.message
            ? [
                {
                  message: test.err.message,
                  stack: test.err.estack,
                  diff: test.err.diff || undefined,
                },
              ]
            : undefined,
      },
    ];

    return {
      id: test.uuid || randomUUID(),
      name: this.extractTestName(test.title),
      fullName: test.fullTitle,
      status: status,
      duration: test.duration,
      startTime: undefined, // Not available in this format
      endTime: undefined, // Not available in this format
      tags: undefined, // Not available in this format
      results: results,
    };
  }

  private mapStatus(cypressState: CypressTestState): UnifiedTestStatus {
    switch (cypressState) {
      case 'passed':
        return 'passed';
      case 'failed':
        return 'failed';
      case 'pending':
        return 'pending';
      default:
        return 'failed';
    }
  }

  private extractSuiteName(filePath: string): string {
    // Extract suite name from file path like "cypress/e2e/auth/login.cy.js"
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1] || 'unknown';
    return fileName.replace(/\.(cy|spec)\.(js|ts)$/, '');
  }

  private extractTestName(title: string[]): string {
    // Extract test name from title array like ["Login Tests", "should login with valid credentials"]
    return title[title.length - 1] || 'Unknown Test';
  }

  private calculateStats(
    suites: UnifiedTestSuite[],
    cypressReport: CypressReport
  ): UnifiedTestStats {
    const allTests = suites.flatMap(suite => suite.tests);

    const stats = cypressReport.stats;
    const startTime = stats?.start || new Date().toISOString();
    const endTime = stats?.end || new Date().toISOString();
    const duration = stats?.duration || 0;

    return {
      total: allTests.length,
      passed: allTests.filter(t => t.status === 'passed').length,
      failed: allTests.filter(t => t.status === 'failed').length,
      skipped: allTests.filter(t => t.status === 'skipped').length,
      pending: allTests.filter(t => t.status === 'pending').length,
      timeout: allTests.filter(t => t.status === 'timeout').length,
      interrupted: allTests.filter(t => t.status === 'interrupted').length,
      suites: suites.length,
      duration,
      startTime,
      endTime,
    };
  }
}
