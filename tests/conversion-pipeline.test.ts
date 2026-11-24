// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import { join } from 'path';

import {
  cleanupTempDir,
  convertFixtureToCTRF,
  createTempDir,
  expectStableCTRFReport,
} from './test-utils';

type PipelineCase = {
  provider: string;
  fixture: string;
};

const pipelineCases: PipelineCase[] = [
  {
    provider: 'playwright',
    fixture: 'examples/playwright-example.json',
  },
  {
    provider: 'cypress',
    fixture: 'examples/cypress-example.json',
  },
  {
    provider: 'jest',
    fixture: 'examples/jest-example.json',
  },
  {
    provider: 'junit',
    fixture: 'examples/junit-example.xml',
  },
  {
    provider: 'vitest',
    fixture: 'examples/vitest-report.json',
  },
  {
    provider: 'nunit',
    fixture: 'examples/nunit/nunit-input.xml',
  },
  {
    provider: 'mocha',
    fixture: 'examples/mocha-report.json',
  },
  {
    provider: 'pytest',
    fixture: 'examples/pytest-example.json',
  },
  {
    provider: 'testng',
    fixture: 'examples/testng-results.xml',
  },
];

describe('fixture-to-CTRF conversion pipeline', () => {
  let outputDir: string;

  beforeEach(async () => {
    outputDir = await createTempDir('pipeline');
  });

  afterEach(async () => {
    await cleanupTempDir(outputDir);
  });

  it.each(pipelineCases)(
    'should convert $provider fixture to stable CTRF output',
    async ({ provider, fixture }) => {
      const outputPath = join(outputDir, `${provider}-ctrf.json`);

      const ctrfReport = await convertFixtureToCTRF(
        {
          input: join(process.cwd(), fixture),
          provider,
        },
        outputPath
      );

      expectStableCTRFReport(ctrfReport, {
        tool: provider,
        tests: ctrfReport.results.tests.length,
      });

      const summary = ctrfReport.results.summary;
      const statusCounts = ctrfReport.results.tests.reduce(
        (counts, test) => ({
          ...counts,
          [test.status]: counts[test.status] + 1,
        }),
        {
          passed: 0,
          failed: 0,
          skipped: 0,
          pending: 0,
          other: 0,
        }
      );

      expect(summary.tests).toBe(ctrfReport.results.tests.length);
      expect(summary.passed).toBe(statusCounts.passed);
      expect(summary.failed).toBe(statusCounts.failed);
      expect(summary.skipped).toBe(statusCounts.skipped);
      expect(summary.pending).toBe(statusCounts.pending);
      expect(summary.other).toBe(statusCounts.other);

      expect(ctrfReport.results.tests.length).toBeGreaterThan(0);
      expect(ctrfReport.results.tests[0]).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          status: expect.stringMatching(
            /^(passed|failed|skipped|pending|other)$/
          ),
          duration: expect.any(Number),
          suite: expect.any(Array),
          rawStatus: expect.any(String),
        })
      );

      const failedTests = ctrfReport.results.tests.filter(
        test => test.status === 'failed'
      );
      for (const failedTest of failedTests) {
        expect(failedTest.message || failedTest.trace).toBeTruthy();
      }
    }
  );

  it('uses testcase timestamps independently from suite timestamps in CTRF', async () => {
    const inputPath = join(outputDir, 'historical-junit.xml');
    const outputPath = join(outputDir, 'historical-ctrf.json');
    await fs.writeFile(
      inputPath,
      '<testsuites tests="2" failures="0" errors="0" time="12"><testsuite name="Suite" tests="2" failures="0" errors="0" time="12" timestamp="2024-01-01T00:00:00"><testcase name="later test" classname="Suite" time="1" timestamp="2024-01-01T00:00:10"/><testcase name="inherited test" classname="Suite" time="2"/></testsuite></testsuites>',
      'utf8'
    );

    const ctrfReport = await convertFixtureToCTRF(
      { input: inputPath, provider: 'junit' },
      outputPath
    );

    const suiteStart = Date.UTC(2024, 0, 1, 0, 0, 0);
    expect(ctrfReport.results.tests[0]).toMatchObject({
      start: suiteStart + 10_000,
      stop: suiteStart + 11_000,
      duration: 1000,
    });
    expect(ctrfReport.results.tests[1]).toMatchObject({
      start: suiteStart,
      stop: suiteStart + 2_000,
      duration: 2000,
    });
    expect(ctrfReport.results.summary.start).toBe(suiteStart);
    expect(ctrfReport.results.summary.stop).toBe(suiteStart + 11_000);
  });

  it('uses the root testsuite timestamp as the CTRF report start', async () => {
    const inputPath = join(outputDir, 'single-root-junit.xml');
    const outputPath = join(outputDir, 'single-root-ctrf.json');
    await fs.writeFile(
      inputPath,
      '<testsuite name="Suite" tests="1" failures="0" errors="0" time="11" timestamp="2024-01-01T00:00:00"><testcase name="later test" classname="Suite" time="1" timestamp="2024-01-01T00:00:10"/></testsuite>',
      'utf8'
    );

    const ctrfReport = await convertFixtureToCTRF(
      { input: inputPath, provider: 'junit' },
      outputPath
    );

    const reportStart = Date.UTC(2024, 0, 1, 0, 0, 0);
    expect(ctrfReport.results.tests[0]?.start).toBe(reportStart + 10_000);
    expect(ctrfReport.results.summary.start).toBe(reportStart);
  });
});
