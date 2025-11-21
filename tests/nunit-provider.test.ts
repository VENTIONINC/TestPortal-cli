import { NUnitProvider } from '@/providers/nunit';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('NUnitProvider', () => {
  let provider: NUnitProvider;
  let testDataDir: string;

  beforeEach(() => {
    provider = new NUnitProvider();
    testDataDir = join(
      __dirname,
      'test-data',
      `nunit-${Date.now()}-${Math.random()}`
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
    it('should validate valid nunit report', async () => {
      const validReport = `<?xml version="1.0" encoding="utf-8"?>
<test-run id="2" testcasecount="1" result="Passed" total="1" passed="1" failed="0" inconclusive="0" skipped="0" asserts="1" engine-version="3.15.0.0" clr-version="4.0.30319.42000" start-time="2024-01-01 00:00:00Z" end-time="2024-01-01 00:00:01Z" duration="1.0">
  <test-suite type="Assembly" id="1-1" name="Tests.dll" fullname="Tests.dll" runstate="Runnable" testcasecount="1" result="Passed" start-time="2024-01-01 00:00:00Z" end-time="2024-01-01 00:00:01Z" duration="1.0" total="1" passed="1" failed="0" warnings="0" inconclusive="0" skipped="0" asserts="1">
    <test-case id="1-1001" name="Test1" fullname="Tests.Test1" methodname="Test1" classname="Tests" runstate="Runnable" seed="1234" result="Passed" start-time="2024-01-01 00:00:00Z" end-time="2024-01-01 00:00:01Z" duration="1.0" asserts="1"/>
  </test-suite>
</test-run>`;

      const testFile = join(testDataDir, 'valid-nunit.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, validReport, 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(true);
    });

    it('should reject invalid XML', async () => {
      const invalidReport = 'not valid xml';

      const testFile = join(testDataDir, 'invalid-nunit.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, invalidReport, 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });

    it('should reject non-nunit XML', async () => {
      const nonNunitReport = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <element>data</element>
</root>`;

      const testFile = join(testDataDir, 'non-nunit.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, nonNunitReport, 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });
  });

  describe('convert', () => {
    it('should convert basic nunit report to CTRF report', async () => {
      const nunitReport = `<?xml version="1.0" encoding="utf-8"?>
<test-run id="2" testcasecount="3" result="Passed" total="3" passed="3" failed="0" inconclusive="0" skipped="0" asserts="3" engine-version="3.15.0.0" clr-version="4.0.30319.42000" start-time="2024-01-01 00:00:00Z" end-time="2024-01-01 00:00:03Z" duration="3.0">
  <test-suite type="Assembly" id="1-1" name="Tests.dll" fullname="Tests.dll" runstate="Runnable" testcasecount="3" result="Passed" start-time="2024-01-01 00:00:00Z" end-time="2024-01-01 00:00:03Z" duration="3.0" total="3" passed="3" failed="0" warnings="0" inconclusive="0" skipped="0" asserts="3">
    <test-case id="1-1001" name="Test1" fullname="Tests.Test1" methodname="Test1" classname="Tests" runstate="Runnable" seed="1234" result="Passed" start-time="2024-01-01 00:00:00Z" end-time="2024-01-01 00:00:01Z" duration="1.0" asserts="1"/>
    <test-case id="1-1002" name="Test2" fullname="Tests.Test2" methodname="Test2" classname="Tests" runstate="Runnable" seed="1234" result="Passed" start-time="2024-01-01 00:00:01Z" end-time="2024-01-01 00:00:02Z" duration="1.0" asserts="1"/>
    <test-case id="1-1003" name="Test3" fullname="Tests.Test3" methodname="Test3" classname="Tests" runstate="Runnable" seed="1234" result="Passed" start-time="2024-01-01 00:00:02Z" end-time="2024-01-01 00:00:03Z" duration="1.0" asserts="1"/>
  </test-suite>
</test-run>`;

      const testFile = join(testDataDir, 'nunit-report.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, nunitReport, 'utf8');

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.tool.name).toBe('nunit');
      expect(ctrfReport.results.summary.tests).toBe(3);
      expect(ctrfReport.results.summary.passed).toBe(3);
      expect(ctrfReport.results.summary.failed).toBe(0);
      expect(ctrfReport.results.summary.skipped).toBe(0);
      expect(ctrfReport.results.tests).toHaveLength(3);
      expect(ctrfReport.results.tests[0]?.name).toBe('Test1');
      expect(ctrfReport.results.tests[0]?.status).toBe('passed');
      expect(ctrfReport.results.tests[0]?.duration).toBe(1000);
    });

    it('should handle failed tests', async () => {
      const nunitReport = `<?xml version="1.0" encoding="utf-8"?>
<test-run id="2" testcasecount="1" result="Failed" total="1" passed="0" failed="1" inconclusive="0" skipped="0" asserts="0" engine-version="3.15.0.0" clr-version="4.0.30319.42000" start-time="2024-01-01 00:00:00Z" end-time="2024-01-01 00:00:01Z" duration="1.0">
  <test-suite type="Assembly" id="1-1" name="Tests.dll" fullname="Tests.dll" runstate="Runnable" testcasecount="1" result="Failed" start-time="2024-01-01 00:00:00Z" end-time="2024-01-01 00:00:01Z" duration="1.0" total="1" passed="0" failed="1" warnings="0" inconclusive="0" skipped="0" asserts="0">
    <test-case id="1-1001" name="Test1" fullname="Tests.Test1" methodname="Test1" classname="Tests" runstate="Runnable" seed="1234" result="Failed" start-time="2024-01-01 00:00:00Z" end-time="2024-01-01 00:00:01Z" duration="1.0" asserts="0">
      <failure>
        <message><![CDATA[Expected: 5
But was:  4]]></message>
        <stack-trace><![CDATA[   at Tests.Test1() in C:\Tests\Test1.cs:line 10]]></stack-trace>
      </failure>
    </test-case>
  </test-suite>
</test-run>`;

      const testFile = join(testDataDir, 'failed-nunit.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, nunitReport, 'utf8');

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.summary.failed).toBe(1);
      expect(ctrfReport.results.tests[0]?.status).toBe('failed');
      expect(ctrfReport.results.tests[0]?.message).toContain('Expected: 5');
      expect(ctrfReport.results.tests[0]?.trace).toContain('at Tests.Test1()');
    });

    it('should handle skipped tests', async () => {
      const nunitReport = `<?xml version="1.0" encoding="utf-8"?>
<test-run id="2" testcasecount="1" result="Skipped" total="1" passed="0" failed="0" inconclusive="0" skipped="1" asserts="0" engine-version="3.15.0.0" clr-version="4.0.30319.42000" start-time="2024-01-01 00:00:00Z" end-time="2024-01-01 00:00:01Z" duration="1.0">
  <test-suite type="Assembly" id="1-1" name="Tests.dll" fullname="Tests.dll" runstate="Runnable" testcasecount="1" result="Skipped" start-time="2024-01-01 00:00:00Z" end-time="2024-01-01 00:00:01Z" duration="1.0" total="1" passed="0" failed="0" warnings="0" inconclusive="0" skipped="1" asserts="0">
    <test-case id="1-1001" name="Test1" fullname="Tests.Test1" methodname="Test1" classname="Tests" runstate="Runnable" seed="1234" result="Skipped" start-time="2024-01-01 00:00:00Z" end-time="2024-01-01 00:00:01Z" duration="1.0" asserts="0">
      <reason>
        <message><![CDATA[Ignored]]></message>
      </reason>
    </test-case>
  </test-suite>
</test-run>`;

      const testFile = join(testDataDir, 'skipped-nunit.xml');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, nunitReport, 'utf8');

      const ctrfReport = await provider.convert(testFile);

      expect(ctrfReport.results.summary.skipped).toBe(1);
      expect(ctrfReport.results.tests[0]?.status).toBe('skipped');
    });
  });
});
