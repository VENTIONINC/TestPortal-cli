import { promises as fs } from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { randomUUID } from 'crypto';
import { BaseProvider } from '@/types/providers';
import {
  UnifiedReport,
  UnifiedTestSuite,
  UnifiedTestResult,
  UnifiedTestStatus,
  UnifiedTestStats,
} from '@/types/unified-report';
import { TestNGResults, TestNGClass, TestNGStatus } from '@/types/testng';

export class TestNGProvider implements BaseProvider {
  public readonly name = 'testng';
  private readonly parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: false,
      trimValues: true,
      textNodeName: '#text',
    });
  }

  async validate(inputPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(inputPath, 'utf8');
      const data = this.parser.parse(content) as TestNGResults;
      return !!(data['testng-results'] && data['testng-results'].suite);
    } catch {
      return false;
    }
  }

  async convert(inputPath: string): Promise<UnifiedReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const data = this.parser.parse(content) as TestNGResults;
    const results = data['testng-results'];

    const unifiedSuites: UnifiedTestSuite[] = [];
    const suites = this.ensureArray(results.suite);

    for (const suite of suites) {
      const tests = this.ensureArray(suite.test);
      for (const test of tests) {
        if (!test.class) continue;
        const classes = this.ensureArray(test.class);
        for (const cls of classes) {
          const unifiedSuite = this.convertClassToSuite(cls);
          if (unifiedSuite.tests.length > 0) {
            unifiedSuites.push(unifiedSuite);
          }
        }
      }
    }

    const stats = this.calculateStats(unifiedSuites);

    return {
      id: randomUUID(),
      runId: randomUUID(),
      framework: 'testng',
      frameworkVersion: 'unknown',
      toolVersion: 'unknown',
      stats,
      suites: unifiedSuites,
      createdAt: new Date().toISOString(),
    };
  }

  private convertClassToSuite(cls: TestNGClass): UnifiedTestSuite {
    const methods = this.ensureArray(cls['test-method']);
    const tests: UnifiedTestResult[] = [];

    for (const method of methods) {
      if (method['@_is-config'] === 'true') continue;

      tests.push({
        id: randomUUID(),
        name: method['@_name'],
        fullName: `${cls['@_name']}.${method['@_name']}`,
        status: this.mapStatus(method['@_status']),
        duration: parseInt(method['@_duration-ms'] || '0', 10),
        startTime: method['@_started-at'],
        endTime: method['@_finished-at'],
        results: [
          {
            attemptNumber: 1,
            status: this.mapStatus(method['@_status']),
            duration: parseInt(method['@_duration-ms'] || '0', 10),
            startTime: method['@_started-at'],
            errors: method.exception
              ? [
                  {
                    message: method.exception.message,
                    stack: method.exception['full-stacktrace'],
                  },
                ]
              : undefined,
          },
        ],
      });
    }

    return {
      id: randomUUID(),
      name: cls['@_name'],
      tests,
    };
  }

  private mapStatus(status: TestNGStatus): UnifiedTestStatus {
    switch (status) {
      case 'PASS':
        return 'passed';
      case 'FAIL':
        return 'failed';
      case 'SKIP':
        return 'skipped';
      default:
        return 'failed';
    }
  }

  private calculateStats(suites: UnifiedTestSuite[]): UnifiedTestStats {
    const allTests = suites.flatMap(s => s.tests);

    const duration = allTests.reduce((acc, t) => acc + (t.duration || 0), 0);

    const startTimes = allTests
      .map(t => t.startTime)
      .filter(Boolean) as string[];
    const endTimes = allTests.map(t => t.endTime).filter(Boolean) as string[];

    const startTime =
      (startTimes.length ? startTimes.sort()[0] : new Date().toISOString()) ||
      new Date().toISOString();
    const endTime =
      (endTimes.length
        ? endTimes.sort().reverse()[0]
        : new Date().toISOString()) || new Date().toISOString();

    return {
      total: allTests.length,
      passed: allTests.filter(t => t.status === 'passed').length,
      failed: allTests.filter(t => t.status === 'failed').length,
      skipped: allTests.filter(t => t.status === 'skipped').length,
      pending: allTests.filter(t => t.status === 'pending').length,
      suites: suites.length,
      duration,
      startTime,
      endTime,
    };
  }

  private ensureArray<T>(item: T | T[] | undefined): T[] {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
  }
}
