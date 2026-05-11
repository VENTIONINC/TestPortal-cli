// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { NUnitProvider } from '@/providers/nunit';
import {
  cleanupTempDir,
  createTempDir,
  writeTempFile,
} from './test-utils';

describe('NUnitProvider', () => {
  let provider: NUnitProvider;
  let testDir: string;

  beforeEach(async () => {
    provider = new NUnitProvider();
    testDir = await createTempDir('nunit-provider');
  });

  afterEach(async () => {
    await cleanupTempDir(testDir);
  });

  describe('validate', () => {
    it('should validate NUnit test-run XML', async () => {
      const testFile = await writeTempFile(
        testDir,
        'valid-nunit.xml',
        createNUnitReport()
      );

      await expect(provider.validate(testFile)).resolves.toBe(true);
    });

    it('should reject non-NUnit XML', async () => {
      const testFile = await writeTempFile(
        testDir,
        'invalid-nunit.xml',
        '<testsuite><testcase name="not-nunit"/></testsuite>'
      );

      await expect(provider.validate(testFile)).resolves.toBe(false);
    });

    it('should reject missing files', async () => {
      await expect(provider.validate('missing-nunit.xml')).resolves.toBe(false);
    });
  });

  describe('convert', () => {
    it('should convert nested suites, statuses, durations, assertions, and failures', async () => {
      const testFile = await writeTempFile(
        testDir,
        'nunit-report.xml',
        createNUnitReport()
      );

      const report = await provider.convert(testFile);

      expect(report.framework).toBe('nunit');
      expect(report.frameworkVersion).toBe('3.16.0');
      expect(report.toolVersion).toBe('3.16.0');
      expect(report.runId).toBe('2');
      expect(report.suites).toHaveLength(2);

      const authSuite = report.suites.find(suite => suite.name === 'AuthTests');
      const apiSuite = report.suites.find(suite => suite.name === 'ApiTests');

      expect(authSuite).toBeDefined();
      expect(authSuite?.file).toBe('Example.Tests.AuthTests');
      expect(authSuite?.duration).toBe(2500);
      expect(authSuite?.tests).toHaveLength(4);

      expect(apiSuite).toBeDefined();
      expect(apiSuite?.duration).toBe(750);
      expect(apiSuite?.tests).toHaveLength(1);

      const passed = authSuite?.tests.find(test => test.name === 'LoginSucceeds');
      const failed = authSuite?.tests.find(test => test.name === 'LoginFails');
      const skipped = authSuite?.tests.find(test => test.name === 'LoginSkipped');
      const pending = authSuite?.tests.find(test => test.name === 'LoginWarning');

      expect(passed).toMatchObject({
        status: 'passed',
        duration: 1200,
        assertions: 2,
      });
      expect(passed?.results[0]).toMatchObject({
        attemptNumber: 1,
        status: 'passed',
        duration: 1200,
      });

      expect(failed?.status).toBe('failed');
      expect(failed?.duration).toBe(500);
      expect(failed?.results[0]?.errors?.[0]).toMatchObject({
        message: 'Expected true but was false',
        stack: 'at Example.Tests.AuthTests.LoginFails()',
      });

      expect(skipped?.status).toBe('skipped');
      expect(skipped?.duration).toBe(0);
      expect(pending?.status).toBe('pending');

      expect(report.stats).toMatchObject({
        total: 5,
        passed: 2,
        failed: 1,
        skipped: 1,
        pending: 1,
        suites: 2,
        duration: 3250,
        startTime: '2026-05-10T10:00:00Z',
        endTime: '2026-05-10T10:00:04Z',
      });
    });

    it('should handle missing suites and invalid durations safely', async () => {
      const testFile = await writeTempFile(
        testDir,
        'minimal-nunit.xml',
        `<?xml version="1.0" encoding="utf-8"?>
<test-run id="3" engine-version="3.16.0" start-time="2026-05-10T10:00:00Z">
  <test-suite id="root" type="Assembly" name="Root" fullname="Root" result="Passed" duration="not-a-number">
    <test-case id="1" name="NoDuration" fullname="Root.NoDuration" result="Passed" />
  </test-suite>
</test-run>`
      );

      const report = await provider.convert(testFile);

      expect(report.suites).toHaveLength(1);
      expect(report.suites[0]?.duration).toBe(0);
      expect(report.suites[0]?.tests[0]?.duration).toBe(0);
      expect(report.stats.duration).toBe(0);
    });
  });
});

function createNUnitReport(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<test-run id="2" engine-version="3.16.0" start-time="2026-05-10T10:00:00Z" end-time="2026-05-10T10:00:04Z">
  <test-suite id="root" type="Assembly" name="Example.Tests" fullname="Example.Tests" result="Failed" duration="3.25">
    <test-suite id="auth" type="TestFixture" name="AuthTests" fullname="Example.Tests.AuthTests" result="Failed" duration="2.5">
      <test-case id="auth-1" name="LoginSucceeds" fullname="Example.Tests.AuthTests.LoginSucceeds" result="Passed" duration="1.2" asserts="2" start-time="2026-05-10T10:00:00Z" end-time="2026-05-10T10:00:01Z" />
      <test-case id="auth-2" name="LoginFails" fullname="Example.Tests.AuthTests.LoginFails" result="Failed" duration="0.5" asserts="1">
        <failure>
          <message>Expected true but was false</message>
          <stack-trace>at Example.Tests.AuthTests.LoginFails()</stack-trace>
        </failure>
      </test-case>
      <test-case id="auth-3" name="LoginSkipped" fullname="Example.Tests.AuthTests.LoginSkipped" result="Skipped" duration="0" />
      <test-case id="auth-4" name="LoginWarning" fullname="Example.Tests.AuthTests.LoginWarning" result="Warning" duration="0.8" />
    </test-suite>
    <test-suite id="api" type="TestFixture" name="ApiTests" fullname="Example.Tests.ApiTests" result="Passed" duration="0.75">
      <test-case id="api-1" name="ApiSucceeds" fullname="Example.Tests.ApiTests.ApiSucceeds" result="Passed" duration="0.75" />
    </test-suite>
  </test-suite>
</test-run>`;
}
