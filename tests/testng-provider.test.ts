import { TestNGProvider } from '@/providers/testng';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('TestNGProvider', () => {
  let provider: TestNGProvider;
  let testDataDir: string;

  beforeEach(() => {
    provider = new TestNGProvider();
    testDataDir = join(
      __dirname,
      'test-data',
      `testng-${Date.now()}-${Math.random()}`
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
    it('should validate valid testng report', async () => {
      const validReport = `
        <testng-results>
          <suite name="Suite">
            <test name="Test">
              <class name="TestClass">
                <test-method status="PASS" signature="test()" name="test" duration-ms="100" started-at="2023-01-01T00:00:00Z" finished-at="2023-01-01T00:00:01Z"/>
              </class>
            </test>
          </suite>
        </testng-results>
      `;

      const testFile = join(testDataDir, 'valid-testng.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, validReport, 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(true);
    });

    it('should reject invalid structure', async () => {
      const invalidReport = '<invalid>data</invalid>';

      const testFile = join(testDataDir, 'invalid-testng.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, invalidReport, 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });

    it('should reject non-existent file', async () => {
      const isValid = await provider.validate('./non-existent.xml');
      expect(isValid).toBe(false);
    });
  });

  describe('convert', () => {
    it('should convert basic report to unified format', async () => {
      const testngReport = `
        <testng-results total="1" passed="1" failed="0" skipped="0">
          <suite name="Suite">
            <test name="Test">
              <class name="com.example.TestClass">
                <test-method status="PASS" signature="testMethod()" name="testMethod" duration-ms="100" started-at="2023-01-01T00:00:00Z" finished-at="2023-01-01T00:00:01Z"/>
              </class>
            </test>
          </suite>
        </testng-results>
      `;

      const testFile = join(testDataDir, 'testng-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, testngReport, 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tool.name).toBe('testng');
      expect(report.results.tests).toHaveLength(1);
      expect(report.results.tests[0]?.suite).toBe('com.example.TestClass');
      expect(report.results.tests[0]?.status).toBe('passed');
      expect(report.results.tests[0]?.name).toBe('testMethod');
      expect(report.results.summary.tests).toBe(1);
      expect(report.results.summary.passed).toBe(1);
    });

    it('should handle failed tests with exceptions', async () => {
      const testngReport = `
        <testng-results>
          <suite name="Suite">
            <test name="Test">
              <class name="com.example.TestClass">
                <test-method status="FAIL" signature="failTest()" name="failTest" duration-ms="100" started-at="2023-01-01T00:00:00Z" finished-at="2023-01-01T00:00:01Z">
                  <exception class="java.lang.AssertionError">
                    <message>Expected true but found false</message>
                    <full-stacktrace>java.lang.AssertionError: Expected true but found false...</full-stacktrace>
                  </exception>
                </test-method>
              </class>
            </test>
          </suite>
        </testng-results>
      `;

      const testFile = join(testDataDir, 'testng-fail.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, testngReport, 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.summary.failed).toBe(1);
      expect(report.results.tests[0]?.status).toBe('failed');
      expect(report.results.tests[0]?.message).toBeDefined();
      expect(report.results.tests[0]?.message).toBe(
        'Expected true but found false'
      );
    });

    it('should ignore config methods', async () => {
      const testngReport = `
        <testng-results>
          <suite name="Suite">
            <test name="Test">
              <class name="com.example.TestClass">
                <test-method status="PASS" signature="beforeClass()" name="beforeClass" is-config="true" duration-ms="10" started-at="2023-01-01T00:00:00Z" finished-at="2023-01-01T00:00:01Z"/>
                <test-method status="PASS" signature="testMethod()" name="testMethod" duration-ms="100" started-at="2023-01-01T00:00:00Z" finished-at="2023-01-01T00:00:01Z"/>
              </class>
            </test>
          </suite>
        </testng-results>
      `;

      const testFile = join(testDataDir, 'testng-config.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, testngReport, 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.summary.tests).toBe(1);
      expect(report.results.tests).toHaveLength(1);
      expect(report.results.tests[0]?.name).toBe('testMethod');
    });
  });
});
