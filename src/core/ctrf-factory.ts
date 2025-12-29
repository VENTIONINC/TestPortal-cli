import { CTRFReport, CTRFTest, CTRFSummary } from '@/types/ctrf';
import { EnvironmentDetector } from '@/utils/environment';

export class CTRFFactory {
  static async createReport(
    tests: CTRFTest[],
    toolName: string,
    toolVersion?: string,
    startTime: number = Date.now(),
    endTime: number = Date.now()
  ): Promise<CTRFReport> {
    const summary = this.calculateSummary(tests, startTime, endTime);
    const environment = await EnvironmentDetector.detect();

    return {
      results: {
        tool: {
          name: toolName,
          version: toolVersion,
        },
        summary,
        tests,
        environment,
      },
    };
  }

  private static calculateSummary(
    tests: CTRFTest[],
    start: number,
    stop: number
  ): CTRFSummary {
    const summary: CTRFSummary = {
      tests: tests.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      pending: 0,
      other: 0,
      start,
      stop,
    };

    for (const test of tests) {
      switch (test.status) {
        case 'passed':
          summary.passed++;
          break;
        case 'failed':
          summary.failed++;
          break;
        case 'skipped':
          summary.skipped++;
          break;
        case 'pending':
          summary.pending++;
          break;
        case 'other':
          summary.other++;
          break;
        default:
          summary.other++;
      }
    }

    return summary;
  }
}
