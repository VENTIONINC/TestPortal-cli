// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { JunitProvider } from '@/providers/junit';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('JunitProvider', () => {
  let provider: JunitProvider;
  let testDataDir: string;

  beforeEach(() => {
    provider = new JunitProvider();
    testDataDir = join(__dirname, 'test-data', `junit-${Date.now()}-${Math.random()}`);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('validate', () => {
    it('should validate valid junit testsuites report', async () => {
      const validReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="1" failures="0" errors="0" time="1.234">
  <testsuite name="Suite1" tests="1" failures="0" errors="0" time="1.234">
    <testcase name="test1" classname="TestClass" time="1.234"/>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'valid-junit.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, validReport, 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(true);
    });

    it('should validate valid junit single testsuite report', async () => {
      const validReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="Suite1" tests="1" failures="0" errors="0" time="1.234">
  <testcase name="test1" classname="TestClass" time="1.234"/>
</testsuite>`;

      const testFile = join(testDataDir, 'valid-single-junit.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, validReport, 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(true);
    });

    it('should reject invalid XML', async () => {
      const invalidReport = 'not valid xml';

      const testFile = join(testDataDir, 'invalid-junit.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, invalidReport, 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });

    it('should reject non-junit XML', async () => {
      const nonJunitReport = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <element>data</element>
</root>`;

      const testFile = join(testDataDir, 'non-junit.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, nonJunitReport, 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });

    it('should reject non-existent file', async () => {
      const isValid = await provider.validate('./non-existent.xml');
      expect(isValid).toBe(false);
    });
  });

  describe('convert', () => {
    it('should convert basic testsuites report to unified format', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="3" failures="0" errors="0" time="3.5" timestamp="2024-01-01T00:00:00">
  <testsuite name="Suite1" tests="3" failures="0" errors="0" time="3.5">
    <testcase name="test1" classname="com.example.TestClass" time="1.0"/>
    <testcase name="test2" classname="com.example.TestClass" time="1.5"/>
    <testcase name="test3" classname="com.example.TestClass" time="1.0"/>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.framework).toBe('junit');
      expect(unifiedReport.suites).toHaveLength(1);
      expect(unifiedReport.suites[0]?.name).toBe('Suite1');
      expect(unifiedReport.suites[0]?.tests).toHaveLength(3);
      expect(unifiedReport.suites[0]?.tests[0]?.name).toBe('test1');
      expect(unifiedReport.suites[0]?.tests[0]?.status).toBe('passed');
      expect(unifiedReport.suites[0]?.tests[0]?.duration).toBe(1.0);
      expect(unifiedReport.stats.total).toBe(3);
      expect(unifiedReport.stats.passed).toBe(3);
      expect(unifiedReport.stats.failed).toBe(0);
      expect(unifiedReport.stats.skipped).toBe(0);
    });

    it('should convert single testsuite report to unified format', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="SingleSuite" tests="2" failures="0" errors="0" time="2.5" timestamp="2024-01-01T00:00:00">
  <testcase name="test1" classname="com.example.TestClass" time="1.5"/>
  <testcase name="test2" classname="com.example.TestClass" time="1.0"/>
</testsuite>`;

      const testFile = join(testDataDir, 'single-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.framework).toBe('junit');
      expect(unifiedReport.suites).toHaveLength(1);
      expect(unifiedReport.suites[0]?.name).toBe('SingleSuite');
      expect(unifiedReport.suites[0]?.tests).toHaveLength(2);
      expect(unifiedReport.stats.total).toBe(2);
      expect(unifiedReport.stats.passed).toBe(2);
    });

    it('should handle test failures correctly', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="2" failures="1" errors="0" time="2.0">
  <testsuite name="Suite1" tests="2" failures="1" errors="0" time="2.0">
    <testcase name="test1" classname="com.example.TestClass" time="1.0"/>
    <testcase name="test2" classname="com.example.TestClass" time="1.0">
      <failure message="Assertion failed" type="java.lang.AssertionError">
Expected: true
Actual: false
      </failure>
    </testcase>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'failed-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.tests[1]?.status).toBe('failed');
      expect(unifiedReport.suites[0]?.tests[1]?.results[0]?.errors).toBeDefined();
      expect(unifiedReport.suites[0]?.tests[1]?.results[0]?.errors?.[0]?.message).toBe('Assertion failed');
      expect(unifiedReport.suites[0]?.tests[1]?.results[0]?.errors?.[0]?.stack).toContain('Expected: true');
      expect(unifiedReport.stats.passed).toBe(1);
      expect(unifiedReport.stats.failed).toBe(1);
    });

    it('should handle test errors correctly', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="2" failures="0" errors="1" time="2.0">
  <testsuite name="Suite1" tests="2" failures="0" errors="1" time="2.0">
    <testcase name="test1" classname="com.example.TestClass" time="1.0"/>
    <testcase name="test2" classname="com.example.TestClass" time="1.0">
      <error message="NullPointerException" type="java.lang.NullPointerException">
java.lang.NullPointerException: Cannot invoke method on null
  at com.example.TestClass.test2(TestClass.java:42)
      </error>
    </testcase>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'error-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.tests[1]?.status).toBe('failed');
      expect(unifiedReport.suites[0]?.tests[1]?.results[0]?.errors).toBeDefined();
      expect(unifiedReport.suites[0]?.tests[1]?.results[0]?.errors?.[0]?.message).toBe('NullPointerException');
      expect(unifiedReport.stats.passed).toBe(1);
      expect(unifiedReport.stats.failed).toBe(1);
    });

    it('should handle skipped tests correctly', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="3" failures="0" errors="0" time="2.0">
  <testsuite name="Suite1" tests="3" failures="0" errors="0" time="2.0" skipped="1">
    <testcase name="test1" classname="com.example.TestClass" time="1.0"/>
    <testcase name="test2" classname="com.example.TestClass" time="1.0"/>
    <testcase name="test3" classname="com.example.TestClass" time="0">
      <skipped message="Test skipped"/>
    </testcase>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'skipped-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.tests[2]?.status).toBe('skipped');
      expect(unifiedReport.stats.passed).toBe(2);
      expect(unifiedReport.stats.skipped).toBe(1);
      expect(unifiedReport.stats.total).toBe(3);
    });

    it('should handle multiple test suites', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="4" failures="0" errors="0" time="4.0">
  <testsuite name="Suite1" tests="2" failures="0" errors="0" time="2.0">
    <testcase name="test1" classname="com.example.Suite1" time="1.0"/>
    <testcase name="test2" classname="com.example.Suite1" time="1.0"/>
  </testsuite>
  <testsuite name="Suite2" tests="2" failures="0" errors="0" time="2.0">
    <testcase name="test1" classname="com.example.Suite2" time="1.0"/>
    <testcase name="test2" classname="com.example.Suite2" time="1.0"/>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'multi-suite-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites).toHaveLength(2);
      expect(unifiedReport.suites[0]?.name).toBe('Suite1');
      expect(unifiedReport.suites[1]?.name).toBe('Suite2');
      expect(unifiedReport.stats.total).toBe(4);
      expect(unifiedReport.stats.suites).toBe(2);
    });

    it('should handle tests without time attribute', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="2" failures="0" errors="0">
  <testsuite name="Suite1" tests="2" failures="0" errors="0">
    <testcase name="test1" classname="com.example.TestClass"/>
    <testcase name="test2" classname="com.example.TestClass" time="1.5"/>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'no-time-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.tests[0]?.duration).toBeUndefined();
      expect(unifiedReport.suites[0]?.tests[1]?.duration).toBe(1.5);
    });

    it('should handle missing test name with default', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="1" failures="0" errors="0" time="1.0">
  <testsuite tests="1" failures="0" errors="0" time="1.0">
    <testcase name="test1" classname="com.example.TestClass" time="1.0"/>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'no-name-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.name).toBe('Unknown Suite');
    });

    it('should generate fullName from classname and test name', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="1" failures="0" errors="0" time="1.0">
  <testsuite name="Suite1" tests="1" failures="0" errors="0" time="1.0">
    <testcase name="testMethod" classname="com.example.MyTestClass" time="1.0"/>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'fullname-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.tests[0]?.fullName).toBe('com.example.MyTestClass.testMethod');
    });

    it('should handle mixed test statuses', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="4" failures="1" errors="1" time="4.0">
  <testsuite name="Suite1" tests="4" failures="1" errors="1" time="4.0" skipped="1">
    <testcase name="passed" classname="com.example.TestClass" time="1.0"/>
    <testcase name="failed" classname="com.example.TestClass" time="1.0">
      <failure message="Test failed"/>
    </testcase>
    <testcase name="error" classname="com.example.TestClass" time="1.0">
      <error message="Test error"/>
    </testcase>
    <testcase name="skipped" classname="com.example.TestClass" time="1.0">
      <skipped/>
    </testcase>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'mixed-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.stats.total).toBe(4);
      expect(unifiedReport.stats.passed).toBe(1);
      expect(unifiedReport.stats.failed).toBe(2); // both failure and error map to failed
      expect(unifiedReport.stats.skipped).toBe(1);
      expect(unifiedReport.suites[0]?.tests[0]?.status).toBe('passed');
      expect(unifiedReport.suites[0]?.tests[1]?.status).toBe('failed');
      expect(unifiedReport.suites[0]?.tests[2]?.status).toBe('failed');
      expect(unifiedReport.suites[0]?.tests[3]?.status).toBe('skipped');
    });

    it('should handle empty testsuite', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="0" failures="0" errors="0" time="0">
  <testsuite name="EmptySuite" tests="0" failures="0" errors="0" time="0"/>
</testsuites>`;

      const testFile = join(testDataDir, 'empty-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites).toHaveLength(1);
      expect(unifiedReport.suites[0]?.tests).toHaveLength(0);
      expect(unifiedReport.stats.total).toBe(0);
    });

    it('should convert duration to milliseconds in stats', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="1" failures="0" errors="0" time="1.5" timestamp="2024-01-01T00:00:00">
  <testsuite name="Suite1" tests="1" failures="0" errors="0" time="1.5">
    <testcase name="test1" classname="com.example.TestClass" time="1.5"/>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'duration-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      // Duration in stats should be in milliseconds
      expect(unifiedReport.stats.duration).toBe(1500);
    });

    it('should handle string time values', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="1" failures="0" errors="0" time="1.5">
  <testsuite name="Suite1" tests="1" failures="0" errors="0" time="2.5">
    <testcase name="test1" classname="com.example.TestClass" time="0.5"/>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'string-time-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.duration).toBe(2.5);
      expect(unifiedReport.suites[0]?.tests[0]?.duration).toBe(0.5);
    });
  });

  describe('edge cases', () => {
    it('should handle both failure and error in same test', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="1" failures="1" errors="1" time="1.0">
  <testsuite name="Suite1" tests="1" failures="1" errors="1" time="1.0">
    <testcase name="test1" classname="com.example.TestClass" time="1.0">
      <failure message="Assertion failed"/>
      <error message="Exception occurred"/>
    </testcase>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'both-error-failure-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.tests[0]?.status).toBe('failed');
      expect(unifiedReport.suites[0]?.tests[0]?.results[0]?.errors).toHaveLength(2);
      expect(unifiedReport.suites[0]?.tests[0]?.results[0]?.errors?.[0]?.message).toBe('Assertion failed');
      expect(unifiedReport.suites[0]?.tests[0]?.results[0]?.errors?.[1]?.message).toBe('Exception occurred');
    });

    it('should set default timestamp if not provided', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="1" failures="0" errors="0" time="1.0">
  <testsuite name="Suite1" tests="1" failures="0" errors="0" time="1.0">
    <testcase name="test1" classname="com.example.TestClass" time="1.0"/>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'no-timestamp-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.stats.startTime).toBeDefined();
      expect(unifiedReport.stats.endTime).toBeDefined();
    });

    it('should generate unique IDs for report and tests', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="2" failures="0" errors="0" time="2.0">
  <testsuite name="Suite1" tests="2" failures="0" errors="0" time="2.0">
    <testcase name="test1" classname="com.example.TestClass" time="1.0"/>
    <testcase name="test2" classname="com.example.TestClass" time="1.0"/>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'ids-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.id).toBeDefined();
      expect(unifiedReport.suites[0]?.id).toBeDefined();
      expect(unifiedReport.suites[0]?.tests[0]?.id).toBeDefined();
      expect(unifiedReport.suites[0]?.tests[1]?.id).toBeDefined();

      // IDs should be unique
      expect(unifiedReport.suites[0]?.tests[0]?.id).not.toBe(unifiedReport.suites[0]?.tests[1]?.id);
    });

    it('should handle failure without message attribute', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="1" failures="1" errors="0" time="1.0">
  <testsuite name="Suite1" tests="1" failures="1" errors="0" time="1.0">
    <testcase name="test1" classname="com.example.TestClass" time="1.0">
      <failure type="AssertionError">Stack trace here</failure>
    </testcase>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'no-message-failure-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.tests[0]?.results[0]?.errors?.[0]?.message).toBe('Test failure');
    });

    it('should handle error without message attribute', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="1" failures="0" errors="1" time="1.0">
  <testsuite name="Suite1" tests="1" failures="0" errors="1" time="1.0">
    <testcase name="test1" classname="com.example.TestClass" time="1.0">
      <error type="Exception">Stack trace here</error>
    </testcase>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'no-message-error-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.tests[0]?.results[0]?.errors?.[0]?.message).toBe('Test error');
    });
  });
});
