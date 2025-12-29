import { promises as fs } from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { BaseProvider } from '@/types/providers';
import { CTRFReport, CTRFTest, TestStatus } from '@/types/ctrf';
import { CTRFFactory } from '@/core/ctrf-factory';
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

  async convert(inputPath: string): Promise<CTRFReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const data = this.parser.parse(content) as TestNGResults;
    const results = data['testng-results'];

    const tests = this.convertSuites(results.suite);

    let minStart = Infinity;
    let maxEnd = 0;

    const suites = this.ensureArray(results.suite);
    for (const suite of suites) {
      if (suite['@_started-at']) {
        const start = new Date(suite['@_started-at']).getTime();
        if (start < minStart) minStart = start;
      }
      if (suite['@_finished-at']) {
        const end = new Date(suite['@_finished-at']).getTime();
        if (end > maxEnd) maxEnd = end;
      }
    }

    if (minStart === Infinity) minStart = Date.now();
    if (maxEnd === 0) maxEnd = Date.now();

    return CTRFFactory.createReport(
      tests,
      'testng',
      undefined,
      minStart,
      maxEnd
    );
  }

  private convertSuites(suite: any): CTRFTest[] {
    const tests: CTRFTest[] = [];
    const suites = this.ensureArray(suite);

    for (const s of suites) {
      const suiteTests = this.ensureArray(s.test);
      for (const t of suiteTests) {
        if (!t.class) continue;
        const classes = this.ensureArray(t.class);
        for (const cls of classes) {
          tests.push(...this.convertClass(cls));
        }
      }
    }
    return tests;
  }

  private convertClass(cls: TestNGClass): CTRFTest[] {
    const tests: CTRFTest[] = [];
    const methods = this.ensureArray(cls['test-method']);

    for (const method of methods) {
      if (method['@_is-config'] === 'true') continue;

      const status = this.mapStatus(method['@_status']);
      const duration = parseInt(method['@_duration-ms'] || '0', 10);

      const ctrfTest: CTRFTest = {
        name: method['@_name'],
        status,
        duration,
        suite: cls['@_name'],
        rawStatus: method['@_status'],
      };

      if (status === 'failed' && method.exception) {
        ctrfTest.message = method.exception.message;
        ctrfTest.trace = method.exception['full-stacktrace'];
      }

      tests.push(ctrfTest);
    }
    return tests;
  }

  private mapStatus(status: string): TestStatus {
    switch (status?.toUpperCase()) {
      case 'PASS':
        return 'passed';
      case 'FAIL':
        return 'failed';
      case 'SKIP':
        return 'skipped';
      default:
        return 'other';
    }
  }

  private ensureArray<T>(item: T | T[] | undefined): T[] {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
  }
}
