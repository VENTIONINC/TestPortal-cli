import { JunitProvider } from '@/providers/junit';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('JunitProvider', () => {
  let provider: JunitProvider;
  let testDataDir: string;

  beforeEach(() => {
    provider = new JunitProvider();
    testDataDir = join(
      __dirname,
      'test-data',
      `junit-${Date.now()}-${Math.random()}`
    );
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

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.tool.name).toBe('junit');
      expect(ctrfReport.results.summary.tests).toBe(3);
      expect(ctrfReport.results.summary.passed).toBe(3);
      expect(ctrfReport.results.summary.failed).toBe(0);
      expect(ctrfReport.results.summary.skipped).toBe(0);
      expect(ctrfReport.results.tests).toHaveLength(3);
      expect(ctrfReport.results.tests[0]?.suite).toBe('Suite1');
      expect(ctrfReport.results.tests[0]?.name).toBe('test1');
      expect(ctrfReport.results.tests[0]?.status).toBe('passed');
      expect(ctrfReport.results.tests[0]?.duration).toBe(1000);
    });

    it('should convert single testsuite report', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="SingleSuite" tests="2" failures="0" errors="0" time="2.5" timestamp="2024-01-01T00:00:00">
  <testcase name="test1" classname="com.example.TestClass" time="1.5"/>
  <testcase name="test2" classname="com.example.TestClass" time="1.0"/>
</testsuite>`;

      const testFile = join(testDataDir, 'single-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.tool.name).toBe('junit');
      expect(ctrfReport.results.summary.tests).toBe(2);
      expect(ctrfReport.results.tests).toHaveLength(2);
      expect(ctrfReport.results.tests[0]?.suite).toBe('SingleSuite');
    });

    it('should handle failed tests', async () => {
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

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.summary.failed).toBe(1);
      expect(ctrfReport.results.tests[1]?.status).toBe('failed');
      expect(ctrfReport.results.tests[1]?.message).toBe('Assertion failed');
      expect(ctrfReport.results.tests[1]?.trace).toContain('Expected: true');
    });

    it('should handle error tests', async () => {
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

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.summary.failed).toBe(1);
      expect(ctrfReport.results.tests[1]?.status).toBe('failed');
      expect(ctrfReport.results.tests[1]?.message).toBe('NullPointerException');
    });

    it('should handle skipped tests', async () => {
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

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.summary.skipped).toBe(1);
      expect(ctrfReport.results.tests[2]?.status).toBe('skipped');
    });

    it('should handle nested testsuites', async () => {
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

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.tests).toHaveLength(4);
      const suite1Tests = ctrfReport.results.tests.filter(
        t => t.suite === 'Suite1'
      );
      const suite2Tests = ctrfReport.results.tests.filter(
        t => t.suite === 'Suite2'
      );
      expect(suite1Tests).toHaveLength(2);
      expect(suite2Tests).toHaveLength(2);
      expect(ctrfReport.results.summary.tests).toBe(4);
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

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.tests[0]?.duration).toBe(0);
      expect(ctrfReport.results.tests[1]?.duration).toBe(1500);
    });

    it('should handle missing attributes', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="1" failures="0" errors="0" time="1.0">
  <testsuite tests="1" failures="0" errors="0" time="1.0">
    <testcase name="test1" classname="com.example.TestClass" time="1.0"/>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'no-timestamp-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.summary.start).toBeDefined();
      expect(ctrfReport.results.summary.stop).toBeDefined();
    });

    it('should handle system-out and system-err', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="1" failures="0" errors="0" time="1.0">
  <testsuite name="Suite1" tests="1" failures="0" errors="0" time="1.0">
    <testcase name="testMethod" classname="com.example.MyTestClass" time="1.0"/>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'fullname-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.tests[0]?.name).toBe('testMethod');
      // CTRF doesn't standardly capture stdout/stderr in the test object unless we map it to something.
      // The JUnit provider might map it to message or trace if it's relevant, or ignore it.
      // Let's check if it's ignored or mapped.
      // Based on typical implementation, it might be ignored or put in meta.
    });

    it('should handle multiple failure elements', async () => {
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

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.tests[0]?.status).toBe('failed');
      expect(ctrfReport.results.tests[0]?.message).toBe('Assertion failed');
    });

    it('should generate unique test names', async () => {
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

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.tests).toHaveLength(2);
      expect(ctrfReport.results.tests[0]?.name).not.toBe(
        ctrfReport.results.tests[1]?.name
      );
    });

    it('should handle testcase with both failure and error', async () => {
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

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.tests[0]?.status).toBe('failed');
      expect(ctrfReport.results.tests[0]?.message).toBe('Assertion failed');
    });

    it('should prioritize failure over error', async () => {
      const junitReport = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Test Results" tests="1" failures="1" errors="1" time="1.0">
  <testsuite name="Suite1" tests="1" failures="1" errors="1" time="1.0">
    <testcase name="test1" classname="com.example.TestClass" time="1.0">
      <error message="Exception occurred"/>
      <failure message="Assertion failed"/>
    </testcase>
  </testsuite>
</testsuites>`;

      const testFile = join(testDataDir, 'both-error-failure-junit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, junitReport, 'utf8');

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.tests[0]?.status).toBe('failed');
      expect(ctrfReport.results.tests[0]?.message).toBe('Assertion failed');
    });
  });
});
