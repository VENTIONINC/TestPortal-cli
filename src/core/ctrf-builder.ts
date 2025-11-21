import {
  CTRFReport,
  CTRFTest,
  CTRFSummary,
  TestStatus,
  CTRFEnvironment,
} from '@/types/ctrf';
import { EnvironmentDetector } from '@/utils/environment';

export interface AddTestOptions {
  name: string;
  status: string;
  duration: number;
  suite?: string;
  filePath?: string;
  tags?: string[];
  message?: string;
  trace?: string;
  retries?: number;
  flaky?: boolean;
  rawStatus?: string;
}

export class CTRFBuilder {
  private tests: CTRFTest[] = [];
  private toolName: string = 'unknown';
  private toolVersion?: string | undefined;
  private summaryOverride?: Partial<CTRFSummary>;
  private environmentOverride?: CTRFEnvironment;

  constructor(toolName: string, toolVersion?: string) {
    this.toolName = toolName;
    this.toolVersion = toolVersion;
  }

  addTest(options: AddTestOptions): void {
    const ctrfStatus = this.mapStatusToCTRF(options.status);

    const test: CTRFTest = {
      name: options.name,
      status: ctrfStatus,
      duration: options.duration,
      suite: options.suite,
      filePath: options.filePath,
      rawStatus: options.rawStatus || options.status,
      message: options.message,
      trace: options.trace,
      tags: options.tags,
    };

    if (options.retries !== undefined && options.retries > 0) {
      test.retry = options.retries;
      // If flaky is not explicitly provided, calculate it based on status and retries
      if (options.flaky === undefined) {
        test.flaky = ctrfStatus === 'passed';
      } else {
        test.flaky = options.flaky;
      }
    } else if (options.flaky) {
      test.flaky = true;
    }

    this.tests.push(test);
  }

  setSummary(summary: Partial<CTRFSummary>): void {
    this.summaryOverride = summary;
  }

  setEnvironment(environment: CTRFEnvironment): void {
    this.environmentOverride = environment;
  }

  async build(): Promise<CTRFReport> {
    const summary = this.calculateSummary();
    const environment =
      this.environmentOverride || (await EnvironmentDetector.detect());

    return {
      results: {
        tool: {
          name: this.toolName,
          version: this.toolVersion,
        },
        summary,
        tests: this.tests,
        environment,
      },
    };
  }

  private calculateSummary(): CTRFSummary {
    if (
      this.summaryOverride &&
      this.summaryOverride.tests !== undefined &&
      this.summaryOverride.passed !== undefined &&
      this.summaryOverride.failed !== undefined &&
      this.summaryOverride.start !== undefined &&
      this.summaryOverride.stop !== undefined
    ) {
      return this.summaryOverride as CTRFSummary;
    }

    const summary: CTRFSummary = {
      tests: 0,
      passed: 0,
      failed: 0,
      pending: 0,
      skipped: 0,
      other: 0,
      start: 0,
      stop: 0,
      ...this.summaryOverride,
    };

    // If counts are not provided, calculate them from tests
    if (this.summaryOverride?.tests === undefined) {
      summary.tests = this.tests.length;
      for (const test of this.tests) {
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
        }
      }
    }

    // If start/stop are not provided, try to infer or default
    if (summary.start === 0) {
      summary.start = Date.now();
    }
    if (summary.stop === 0) {
      summary.stop = Date.now();
    }

    return summary;
  }

  private mapStatusToCTRF(status: string): TestStatus {
    switch (status.toLowerCase()) {
      case 'passed':
      case 'pass':
        return 'passed';
      case 'failed':
      case 'fail':
      case 'error':
        return 'failed';
      case 'skipped':
      case 'skip':
        return 'skipped';
      case 'pending':
      case 'todo':
        return 'pending';
      case 'timeout':
      case 'interrupted':
      default:
        return 'other';
    }
  }
}
