// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { parseStringPromise } from 'xml2js';
import { BaseProvider } from '@/types/providers';
import {
  UnifiedReport,
  UnifiedTestSuite,
  UnifiedTestResult,
  UnifiedTestStatus,
  UnifiedTestStats,
} from '@/types/unified-report';
import { JunitTestSuite, JunitTestCase, JunitTestSuites } from '@/types/junit';

export class JunitProvider implements BaseProvider {
  public readonly name = 'junit';

  async validate(inputPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(inputPath, 'utf8');

      // Check if it's valid XML with JUnit structure
      const parsed = await parseStringPromise(content);

      // Check for testsuite or testsuites root element
      if (parsed.testsuite || parsed.testsuites) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  async convert(inputPath: string): Promise<UnifiedReport> {
    const content = await fs.readFile(inputPath, 'utf8');
    const parsed = await parseStringPromise(content, {
      explicitArray: false,
      mergeAttrs: true,
    });

    // Handle both single testsuite and testsuites formats
    const junitData = this.normalizeJunitData(parsed);

    const unifiedSuites = this.convertTestSuites(junitData);
    const stats = this.calculateStats(unifiedSuites, junitData);

    return {
      id: randomUUID(),
      framework: 'junit',
      stats,
      suites: unifiedSuites,
      createdAt: new Date().toISOString(),
    };
  }

  private normalizeJunitData(parsed: any): JunitTestSuites {
    // If it's a single testsuite, wrap it in testsuites structure
    if (parsed.testsuite) {
      const testsuite = Array.isArray(parsed.testsuite)
        ? parsed.testsuite
        : [parsed.testsuite];

      return {
        tests: this.parseNumber(parsed.testsuite.tests) || 0,
        failures: this.parseNumber(parsed.testsuite.failures) || 0,
        errors: this.parseNumber(parsed.testsuite.errors) || 0,
        time: this.parseNumber(parsed.testsuite.time) || 0,
        timestamp: parsed.testsuite.timestamp,
        testsuite: testsuite,
      };
    }

    // If it's already testsuites, return as is
    if (parsed.testsuites) {
      return parsed.testsuites;
    }

    throw new Error('Invalid JUnit XML format');
  }

  private convertTestSuites(junitData: JunitTestSuites): UnifiedTestSuite[] {
    const suites: UnifiedTestSuite[] = [];

    const testSuites = Array.isArray(junitData.testsuite)
      ? junitData.testsuite
      : [junitData.testsuite];

    for (const suite of testSuites) {
      if (!suite) continue;

      const unifiedSuite: UnifiedTestSuite = {
        id: randomUUID(),
        name: suite.name || 'Unknown Suite',
        tests: this.convertTestCases(suite),
        duration: secondsToMilliseconds(this.parseNumber(suite.time)),
      };

      suites.push(unifiedSuite);
    }

    return suites;
  }

  private convertTestCases(suite: JunitTestSuite): UnifiedTestResult[] {
    const testCases = Array.isArray(suite.testcase)
      ? suite.testcase
      : suite.testcase
        ? [suite.testcase]
        : [];

    return testCases.map(testCase =>
      this.convertTestCase(testCase, suite.timestamp)
    );
  }

  private convertTestCase(
    testCase: JunitTestCase,
    suiteTimestamp?: string
  ): UnifiedTestResult {
    const status = this.determineTestStatus(testCase);
    const duration = secondsToMilliseconds(this.parseNumber(testCase.time));
    const startTime =
      parseJunitTimestamp(testCase.timestamp) ??
      parseJunitTimestamp(suiteTimestamp);

    // Create a single result attempt
    const results = [
      {
        attemptNumber: 1,
        status: status,
        duration: duration,
        startTime,
        errors: this.extractErrors(testCase),
      },
    ];

    return {
      id: randomUUID(),
      name: testCase.name,
      fullName: `${testCase.classname}.${testCase.name}`,
      status: status,
      duration: duration,
      startTime,
      endTime: startTime
        ? new Date(
            new Date(startTime).getTime() + (duration || 0)
          ).toISOString()
        : undefined,
      tags: undefined,
      assertions: undefined,
      results: results,
    };
  }

  private determineTestStatus(testCase: JunitTestCase): UnifiedTestStatus {
    if (testCase.skipped !== undefined) {
      return 'skipped';
    }
    if (testCase.error) {
      return 'failed'; // Map JUnit errors to failed
    }
    if (testCase.failure) {
      return 'failed';
    }
    return 'passed';
  }

  private extractErrors(testCase: JunitTestCase) {
    const errors = [];

    if (testCase.failure) {
      errors.push({
        message: testCase.failure.message || 'Test failure',
        stack: testCase.failure._ || '',
      });
    }

    if (testCase.error) {
      errors.push({
        message: testCase.error.message || 'Test error',
        stack: testCase.error._ || '',
      });
    }

    return errors.length > 0 ? errors : undefined;
  }

  private calculateStats(
    suites: UnifiedTestSuite[],
    junitData: JunitTestSuites
  ): UnifiedTestStats {
    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const suite of suites) {
      for (const test of suite.tests) {
        total++;
        switch (test.status) {
          case 'passed':
            passed++;
            break;
          case 'failed':
            failed++;
            break;
          case 'skipped':
            skipped++;
            break;
        }
      }
    }

    const rawSuites = Array.isArray(junitData.testsuite)
      ? junitData.testsuite
      : [junitData.testsuite];
    const testTimes = suites.flatMap(suite => suite.tests);
    const testStarts = testTimes
      .map(test => test.startTime)
      .filter((timestamp): timestamp is string => Boolean(timestamp))
      .map(timestamp => Date.parse(timestamp))
      .filter(Number.isFinite);
    const suiteStarts = rawSuites
      .map(suite => parseJunitTimestamp(suite.timestamp))
      .filter((timestamp): timestamp is string => Boolean(timestamp))
      .map(timestamp => Date.parse(timestamp));
    const rootStart = parseJunitTimestamp(junitData.timestamp);
    const fallbackStart =
      suiteStarts.length > 0
        ? Math.min(...suiteStarts)
        : rootStart
          ? Date.parse(rootStart)
          : Date.now();
    const startTimestamp = rootStart
      ? Date.parse(rootStart)
      : testStarts.length > 0
        ? Math.min(...testStarts)
        : fallbackStart;
    const startTime = new Date(startTimestamp).toISOString();
    const duration =
      secondsToMilliseconds(this.parseNumber(junitData.time)) || 0;
    const testEnds = testTimes
      .map(test => test.endTime)
      .filter((timestamp): timestamp is string => Boolean(timestamp))
      .map(timestamp => Date.parse(timestamp))
      .filter(Number.isFinite);
    const endTimestamp =
      testEnds.length > 0 ? Math.max(...testEnds) : startTimestamp + duration;

    return {
      total,
      passed,
      failed,
      skipped,
      suites: suites.length,
      duration,
      startTime,
      endTime: new Date(endTimestamp).toISOString(),
    };
  }

  private parseNumber(value: any): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }
}

function parseJunitTimestamp(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  const hasTimezone = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(normalized);
  const timestamp = Date.parse(hasTimezone ? normalized : `${normalized}Z`);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : undefined;
}

function secondsToMilliseconds(seconds?: number): number | undefined {
  return seconds === undefined ? undefined : Math.round(seconds * 1000);
}
