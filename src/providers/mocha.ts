import { promises as fs } from 'fs';
import { BaseProvider } from '@/types/providers';
import { CTRFReport } from '@/types/ctrf';
import { CTRFBuilder } from '@/core/ctrf-builder';
import { MochaReport, MochaTest } from '@/types/mocha';

export class MochaProvider implements BaseProvider {
  public readonly name = 'mocha';

  async validate(inputPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(inputPath, 'utf8');
      const data = JSON.parse(content);

      return (
        typeof data === 'object' &&
        data !== null &&
        typeof data.stats === 'object' &&
        data.stats !== null &&
        typeof data.stats.tests === 'number' &&
        typeof data.stats.passes === 'number' &&
        typeof data.stats.failures === 'number' &&
        Array.isArray(data.tests)
      );
    } catch {
      return false;
    }
  }

  async convert(inputPath: string): Promise<CTRFReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const mochaReport: MochaReport = JSON.parse(content);

    const builder = new CTRFBuilder('mocha');

    // Set summary stats
    const stats = mochaReport.stats;
    if (stats) {
      builder.setSummary({
        tests: stats.tests,
        passed: stats.passes,
        failed: stats.failures,
        pending: stats.pending,
        skipped: stats.skipped || 0,
        other: 0,
        start: stats.start ? new Date(stats.start).getTime() : Date.now(),
        stop: stats.end ? new Date(stats.end).getTime() : Date.now(),
      });
    }

    for (const test of mochaReport.tests) {
      const filePath = test.file || 'unknown';
      const suiteName = this.extractSuiteName(filePath);
      const status = this.mapStatus(test);
      const error = this.extractError(test);

      builder.addTest({
        name: test.title,
        status: status,
        duration: test.duration || 0,
        suite: suiteName,
        ...(test.file ? { filePath: test.file } : {}),
        ...(error?.message ? { message: error.message } : {}),
        ...(error?.stack ? { trace: error.stack } : {}),
        rawStatus: status,
        ...(test.currentRetry !== undefined
          ? { retries: test.currentRetry }
          : {}),
      });
    }

    return builder.build();
  }

  private mapStatus(test: MochaTest): string {
    // Check explicit flags first
    if (test.pending === true) {
      return 'pending';
    }

    if (test.skipped === true) {
      return 'skipped';
    }

    if (test.pass === true) {
      return 'passed';
    }

    if (test.fail === true) {
      if (test.timedOut === true) {
        return 'failed';
      }
      return 'failed';
    }

    // Fallback: check for error object
    if (test.err) {
      if (test.timedOut === true) {
        return 'failed';
      }
      return 'failed';
    }

    // Default to passed if no failure indicators
    return 'passed';
  }

  private extractError(
    test: MochaTest
  ): { message: string; stack?: string } | undefined {
    if (!test.err || !test.err.message) {
      return undefined;
    }

    const result: { message: string; stack?: string } = {
      message: test.err.message || 'Test failed',
    };

    if (test.err.stack) {
      result.stack = test.err.stack;
    }

    return result;
  }

  private extractSuiteName(filePath: string): string {
    if (filePath === 'unknown') {
      return 'unknown';
    }

    // Extract file name from path
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1] || 'unknown';

    // Remove common test file extensions
    return fileName
      .replace(/\.(test|spec)\.(js|ts|jsx|tsx|mjs|cjs)$/, '')
      .replace(/\.(js|ts|jsx|tsx|mjs|cjs)$/, '');
  }
}
