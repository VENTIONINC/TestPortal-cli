import { promises as fs } from 'fs';
import { BaseProvider } from '@/types/providers';
import { CTRFReport } from '@/types/ctrf';
import { CTRFBuilder } from '@/core/ctrf-builder';
import { CypressReport, CypressSuite, CypressTestState } from '@/types/cypress';

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

  async convert(inputPath: string): Promise<CTRFReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const cypressReport: CypressReport = JSON.parse(content);

    const builder = new CTRFBuilder(
      'cypress',
      cypressReport.meta?.mochawesome?.version
    );

    // Set summary stats
    const stats = cypressReport.stats as any;
    if (stats) {
      builder.setSummary({
        tests: stats.tests,
        passed: stats.passes,
        failed: stats.failures,
        pending: stats.pending,
        skipped: stats.skipped || 0,
        other: 0,
        start: new Date(stats.start).getTime(),
        stop: new Date(stats.end).getTime(),
      });
    }

    this.processResults(cypressReport.results, builder);

    return builder.build();
  }

  private processResults(results: CypressSuite[], builder: CTRFBuilder) {
    for (const result of results) {
      const suiteName = result.title || this.extractSuiteName(result.file);

      if (result.tests) {
        for (const test of result.tests) {
          const testName = this.extractTestName(test.title);

          const testOptions: any = {
            name: testName,
            status: this.mapStatus(test.state),
            duration: test.duration,
            suite: suiteName,
            filePath: result.file,
            rawStatus: test.state,
          };

          if (test.err?.message) {
            testOptions.message = test.err.message;
          }
          if (test.err?.estack) {
            testOptions.trace = test.err.estack;
          }

          builder.addTest(testOptions);
        }
      }

      if (result.suites) {
        this.processResults(result.suites, builder);
      }
    }
  }

  private mapStatus(state: CypressTestState): string {
    switch (state) {
      case 'passed':
        return 'passed';
      case 'failed':
        return 'failed';
      case 'pending':
        return 'pending';
      default:
        return 'other';
    }
  }

  private extractSuiteName(filePath: string): string {
    // Extract suite name from file path like "cypress/e2e/auth/login.cy.js"
    if (!filePath) return 'unknown';
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1] || 'unknown';
    return fileName.replace(/\.(cy|spec)\.(js|ts)$/, '');
  }

  private extractTestName(title: string[]): string {
    // Extract test name from title array like ["Login Tests", "should login with valid credentials"]
    return title[title.length - 1] || 'Unknown Test';
  }
}
