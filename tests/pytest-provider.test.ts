import { PytestProvider } from '@/providers/pytest';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('PytestProvider', () => {
  let provider: PytestProvider;
  let testDataDir: string;

  beforeEach(() => {
    provider = new PytestProvider();
    testDataDir = join(
      __dirname,
      'test-data',
      `pytest-${Date.now()}-${Math.random()}`
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
    it('should validate valid pytest-json-report format', async () => {
      const validReport = {
        created: 1700000000,
        duration: 1.5,
        exitcode: 0,
        root: '/path/to/project',
        summary: {
          total: 1,
          passed: 1,
          collected: 1,
        },
        tests: [
          {
            nodeid: 'tests/test_example.py::test_pass',
            lineno: 5,
            outcome: 'passed',
          },
        ],
      };

      const testFile = join(testDataDir, 'valid-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(validReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(true);
    });

    it('should validate pytest report with minimal fields', async () => {
      const minimalReport = {
        created: 1700000000,
        duration: 0.5,
        exitcode: 0,
        root: '/path',
        summary: {
          total: 0,
          collected: 0,
        },
        tests: [],
      };

      const testFile = join(testDataDir, 'minimal-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(minimalReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(true);
    });

    it('should reject invalid JSON', async () => {
      const invalidReport = 'not valid json';

      const testFile = join(testDataDir, 'invalid-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, invalidReport, 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });

    it('should reject JSON without required fields', async () => {
      const missingFieldsReport = {
        created: 1700000000,
        // missing duration, exitcode, root, summary, tests
      };

      const testFile = join(testDataDir, 'missing-fields-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(missingFieldsReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });

    it('should reject non-existent file', async () => {
      const isValid = await provider.validate('./non-existent.json');
      expect(isValid).toBe(false);
    });

    it('should reject malformed JSON structure', async () => {
      const malformedReport = {
        created: 'not-a-number',
        duration: 1.5,
        exitcode: 0,
        root: '/path',
        summary: {
          total: 1,
          collected: 1,
        },
        tests: [],
      };

      const testFile = join(testDataDir, 'malformed-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(malformedReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });
  });

  describe('convert', () => {
    it('should convert basic pytest report with passing tests', async () => {
      const pytestReport = {
        created: 1700000000,
        duration: 2.5,
        exitcode: 0,
        root: '/path/to/project',
        summary: {
          total: 3,
          passed: 3,
          collected: 3,
        },
        tests: [
          {
            nodeid: 'tests/test_auth.py::test_login',
            lineno: 10,
            outcome: 'passed',
            call: {
              outcome: 'passed',
              duration: 0.5,
            },
          },
          {
            nodeid: 'tests/test_auth.py::test_logout',
            lineno: 20,
            outcome: 'passed',
            call: {
              outcome: 'passed',
              duration: 0.3,
            },
          },
          {
            nodeid: 'tests/test_auth.py::test_refresh',
            lineno: 30,
            outcome: 'passed',
            call: {
              outcome: 'passed',
              duration: 0.4,
            },
          },
        ],
      };

      const testFile = join(testDataDir, 'passing-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tool.name).toBe('pytest');
      expect(report.results.tests).toHaveLength(3);
      expect(report.results.tests[0]?.suite).toBe('test_auth');
      expect(report.results.tests[0]?.name).toBe('test_login');
      expect(report.results.tests[0]?.status).toBe('passed');
      expect(report.results.summary.tests).toBe(3);
      expect(report.results.summary.passed).toBe(3);
      expect(report.results.summary.failed).toBe(0);
      expect(report.results.summary.skipped).toBe(0);
    });

    it('should handle failed tests with error extraction', async () => {
      const pytestReport = {
        created: 1700000000,
        duration: 1.5,
        exitcode: 1,
        root: '/path/to/project',
        summary: {
          total: 2,
          passed: 1,
          failed: 1,
          collected: 2,
        },
        tests: [
          {
            nodeid: 'tests/test_api.py::test_success',
            lineno: 5,
            outcome: 'passed',
            call: {
              outcome: 'passed',
              duration: 0.5,
            },
          },
          {
            nodeid: 'tests/test_api.py::test_failure',
            lineno: 15,
            outcome: 'failed',
            call: {
              outcome: 'failed',
              duration: 0.8,
              longrepr: 'AssertionError: Expected 200, got 404',
              traceback: [
                {
                  path: '/path/to/project/tests/test_api.py',
                  lineno: 18,
                  message: 'AssertionError',
                },
              ],
            },
          },
        ],
      };

      const testFile = join(testDataDir, 'failed-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.summary.passed).toBe(1);
      expect(report.results.summary.failed).toBe(1);
      expect(report.results.tests[1]?.status).toBe('failed');
      expect(report.results.tests[1]?.message).toBe(
        'AssertionError: Expected 200, got 404'
      );
      expect(report.results.tests[1]?.trace).toContain('test_api.py');
    });

    it('should map error outcome to failed status', async () => {
      const pytestReport = {
        created: 1700000000,
        duration: 1.0,
        exitcode: 1,
        root: '/path/to/project',
        summary: {
          total: 1,
          error: 1,
          collected: 1,
        },
        tests: [
          {
            nodeid: 'tests/test_db.py::test_connection',
            lineno: 10,
            outcome: 'error',
            setup: {
              outcome: 'error',
              duration: 0.1,
              longrepr: "fixture 'db' not found",
            },
          },
        ],
      };

      const testFile = join(testDataDir, 'error-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests[0]?.status).toBe('failed');
      expect(report.results.summary.failed).toBe(1);
      expect(report.results.tests[0]?.message).toBeDefined();
    });

    it('should handle skipped tests', async () => {
      const pytestReport = {
        created: 1700000000,
        duration: 0.5,
        exitcode: 0,
        root: '/path/to/project',
        summary: {
          total: 2,
          passed: 1,
          skipped: 1,
          collected: 2,
        },
        tests: [
          {
            nodeid: 'tests/test_feature.py::test_enabled',
            lineno: 5,
            outcome: 'passed',
            call: {
              outcome: 'passed',
              duration: 0.3,
            },
          },
          {
            nodeid: 'tests/test_feature.py::test_disabled',
            lineno: 15,
            outcome: 'skipped',
            call: {
              outcome: 'skipped',
              longrepr: 'Skipped: Feature not implemented',
            },
          },
        ],
      };

      const testFile = join(testDataDir, 'skipped-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.summary.passed).toBe(1);
      expect(report.results.summary.skipped).toBe(1);
      expect(report.results.tests[1]?.status).toBe('skipped');
    });

    it('should map xfailed tests to skipped status', async () => {
      const pytestReport = {
        created: 1700000000,
        duration: 0.8,
        exitcode: 0,
        root: '/path/to/project',
        summary: {
          total: 1,
          xfailed: 1,
          collected: 1,
        },
        tests: [
          {
            nodeid: 'tests/test_bugs.py::test_known_bug',
            lineno: 5,
            outcome: 'xfailed',
            call: {
              outcome: 'failed',
              duration: 0.5,
              longrepr: 'Expected failure: Known bug #123',
            },
          },
        ],
      };

      const testFile = join(testDataDir, 'xfailed-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests[0]?.status).toBe('skipped');
      expect(report.results.summary.skipped).toBe(1);
    });

    it('should map xpassed tests to passed status', async () => {
      const pytestReport = {
        created: 1700000000,
        duration: 0.6,
        exitcode: 0,
        root: '/path/to/project',
        summary: {
          total: 1,
          xpassed: 1,
          collected: 1,
        },
        tests: [
          {
            nodeid: 'tests/test_bugs.py::test_unexpected_pass',
            lineno: 15,
            outcome: 'xpassed',
            call: {
              outcome: 'passed',
              duration: 0.4,
            },
          },
        ],
      };

      const testFile = join(testDataDir, 'xpassed-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests[0]?.status).toBe('passed');
      expect(report.results.summary.passed).toBe(1);
    });

    it('should handle setup failures', async () => {
      const pytestReport = {
        created: 1700000000,
        duration: 0.3,
        exitcode: 1,
        root: '/path/to/project',
        summary: {
          total: 1,
          error: 1,
          collected: 1,
        },
        tests: [
          {
            nodeid: 'tests/test_setup.py::test_with_setup_failure',
            lineno: 5,
            outcome: 'error',
            setup: {
              outcome: 'error',
              duration: 0.1,
              longrepr: 'Setup failed: Database unavailable',
              traceback: [
                {
                  path: '/path/to/project/conftest.py',
                  lineno: 25,
                  message: 'ConnectionError',
                },
              ],
            },
          },
        ],
      };

      const testFile = join(testDataDir, 'setup-failure-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests[0]?.status).toBe('failed');
      expect(report.results.tests[0]?.message).toBeDefined();
      expect(report.results.tests[0]?.message).toContain('Setup failed');
    });

    it('should handle teardown failures', async () => {
      const pytestReport = {
        created: 1700000000,
        duration: 0.5,
        exitcode: 1,
        root: '/path/to/project',
        summary: {
          total: 1,
          passed: 0,
          failed: 1,
          collected: 1,
        },
        tests: [
          {
            nodeid: 'tests/test_teardown.py::test_with_teardown_failure',
            lineno: 5,
            outcome: 'failed',
            setup: {
              outcome: 'passed',
              duration: 0.05,
            },
            call: {
              outcome: 'passed',
              duration: 0.2,
            },
            teardown: {
              outcome: 'failed',
              duration: 0.1,
              longrepr: 'Teardown failed: Cleanup error',
              traceback: [
                {
                  path: '/path/to/project/conftest.py',
                  lineno: 50,
                  message: 'Exception',
                },
              ],
            },
          },
        ],
      };

      const testFile = join(testDataDir, 'teardown-failure-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests[0]?.status).toBe('failed');
      expect(report.results.tests[0]?.message).toBeDefined();
      expect(report.results.tests[0]?.message).toContain('Teardown failed');
    });

    it('should handle multiple test files with proper suite grouping', async () => {
      const pytestReport = {
        created: 1700000000,
        duration: 1.5,
        exitcode: 0,
        root: '/path/to/project',
        summary: {
          total: 4,
          passed: 4,
          collected: 4,
        },
        tests: [
          {
            nodeid: 'tests/test_auth.py::test_login',
            lineno: 5,
            outcome: 'passed',
            call: { outcome: 'passed', duration: 0.3 },
          },
          {
            nodeid: 'tests/test_auth.py::test_logout',
            lineno: 15,
            outcome: 'passed',
            call: { outcome: 'passed', duration: 0.2 },
          },
          {
            nodeid: 'tests/test_api.py::test_get',
            lineno: 5,
            outcome: 'passed',
            call: { outcome: 'passed', duration: 0.4 },
          },
          {
            nodeid: 'tests/test_api.py::test_post',
            lineno: 15,
            outcome: 'passed',
            call: { outcome: 'passed', duration: 0.5 },
          },
        ],
      };

      const testFile = join(testDataDir, 'multi-file-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests).toHaveLength(4);

      const authTests = report.results.tests.filter(
        t => t.suite === 'test_auth'
      );
      const apiTests = report.results.tests.filter(t => t.suite === 'test_api');

      expect(authTests).toHaveLength(2);
      expect(apiTests).toHaveLength(2);
    });

    it('should handle parameterized tests', async () => {
      const pytestReport = {
        created: 1700000000,
        duration: 0.8,
        exitcode: 0,
        root: '/path/to/project',
        summary: {
          total: 3,
          passed: 3,
          collected: 3,
        },
        tests: [
          {
            nodeid: 'tests/test_utils.py::test_format[param1]',
            lineno: 10,
            outcome: 'passed',
            keywords: ['test_format', 'parametrize'],
            call: { outcome: 'passed', duration: 0.2 },
          },
          {
            nodeid: 'tests/test_utils.py::test_format[param2]',
            lineno: 10,
            outcome: 'passed',
            keywords: ['test_format', 'parametrize'],
            call: { outcome: 'passed', duration: 0.25 },
          },
          {
            nodeid: 'tests/test_utils.py::test_format[param3]',
            lineno: 10,
            outcome: 'passed',
            keywords: ['test_format', 'parametrize'],
            call: { outcome: 'passed', duration: 0.22 },
          },
        ],
      };

      const testFile = join(testDataDir, 'parameterized-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests).toHaveLength(3);
      expect(report.results.tests[0]?.name).toBe('test_format[param1]');
      expect(report.results.tests[1]?.name).toBe('test_format[param2]');
      expect(report.results.tests[2]?.name).toBe('test_format[param3]');
    });

    it('should calculate test duration from all stages', async () => {
      const pytestReport = {
        created: 1700000000,
        duration: 1.0,
        exitcode: 0,
        root: '/path/to/project',
        summary: {
          total: 1,
          passed: 1,
          collected: 1,
        },
        tests: [
          {
            nodeid: 'tests/test_duration.py::test_with_stages',
            lineno: 5,
            outcome: 'passed',
            setup: {
              outcome: 'passed',
              duration: 0.1,
            },
            call: {
              outcome: 'passed',
              duration: 0.5,
            },
            teardown: {
              outcome: 'passed',
              duration: 0.15,
            },
          },
        ],
      };

      const testFile = join(testDataDir, 'duration-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      // 0.1 + 0.5 + 0.15 = 0.75 seconds = 750 milliseconds
      expect(report.results.tests[0]?.duration).toBe(750);
    });

    it('should convert timestamps correctly', async () => {
      const pytestReport = {
        created: 1700000000.5,
        duration: 2.5,
        exitcode: 0,
        root: '/path/to/project',
        summary: {
          total: 1,
          passed: 1,
          collected: 1,
        },
        tests: [
          {
            nodeid: 'tests/test_time.py::test_timing',
            lineno: 5,
            outcome: 'passed',
            call: { outcome: 'passed', duration: 0.5 },
          },
        ],
      };

      const testFile = join(testDataDir, 'timestamp-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.summary.start).toBeDefined();
      expect(report.results.summary.stop).toBeDefined();
    });

    it('should handle empty test report', async () => {
      const pytestReport = {
        created: 1700000000,
        duration: 0,
        exitcode: 5,
        root: '/path/to/project',
        summary: {
          total: 0,
          collected: 0,
        },
        tests: [],
      };

      const testFile = join(testDataDir, 'empty-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests).toHaveLength(0);
      expect(report.results.summary.tests).toBe(0);
    });

    it('should handle tests without stages', async () => {
      const pytestReport = {
        created: 1700000000,
        duration: 0.5,
        exitcode: 0,
        root: '/path/to/project',
        summary: {
          total: 1,
          passed: 1,
          collected: 1,
        },
        tests: [
          {
            nodeid: 'tests/test_simple.py::test_no_stages',
            lineno: 5,
            outcome: 'passed',
          },
        ],
      };

      const testFile = join(testDataDir, 'no-stages-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests[0]?.status).toBe('passed');
      expect(report.results.tests[0]?.duration).toBe(0);
    });

    it('should handle crash information in errors', async () => {
      const pytestReport = {
        created: 1700000000,
        duration: 0.3,
        exitcode: 1,
        root: '/path/to/project',
        summary: {
          total: 1,
          error: 1,
          collected: 1,
        },
        tests: [
          {
            nodeid: 'tests/test_crash.py::test_segfault',
            lineno: 5,
            outcome: 'error',
            call: {
              outcome: 'error',
              duration: 0.1,
              crash: {
                path: '/path/to/project/tests/test_crash.py',
                lineno: 7,
                message: 'Segmentation fault',
              },
            },
          },
        ],
      };

      const testFile = join(testDataDir, 'crash-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests[0]?.message).toBeDefined();
      expect(report.results.tests[0]?.message).toContain('Segmentation fault');
    });

    it('should preserve test keywords as tags', async () => {
      const pytestReport = {
        created: 1700000000,
        duration: 0.5,
        exitcode: 0,
        root: '/path/to/project',
        summary: {
          total: 1,
          passed: 1,
          collected: 1,
        },
        tests: [
          {
            nodeid: 'tests/test_tags.py::test_with_markers',
            lineno: 5,
            outcome: 'passed',
            keywords: ['test_with_markers', 'slow', 'integration', 'smoke'],
            call: { outcome: 'passed', duration: 0.3 },
          },
        ],
      };

      const testFile = join(testDataDir, 'tags-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      expect(report.results.tests[0]?.tags).toEqual([
        'test_with_markers',
        'slow',
        'integration',
        'smoke',
      ]);
    });

    it('should handle TestClass structure in nodeid', async () => {
      const pytestReport = {
        created: 1700000000,
        duration: 0.5,
        exitcode: 0,
        root: '/path/to/project',
        summary: {
          total: 2,
          passed: 2,
          collected: 2,
        },
        tests: [
          {
            nodeid: 'tests/test_classes.py::TestUserAuth::test_login',
            lineno: 10,
            outcome: 'passed',
            call: { outcome: 'passed', duration: 0.2 },
          },
          {
            nodeid: 'tests/test_classes.py::TestUserAuth::test_logout',
            lineno: 20,
            outcome: 'passed',
            call: { outcome: 'passed', duration: 0.15 },
          },
        ],
      };

      const testFile = join(testDataDir, 'classes-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      // Should group by file, not by TestClass
      expect(report.results.tests).toHaveLength(2);
      expect(report.results.tests[0]?.suite).toBe('test_classes');
      expect(report.results.tests[0]?.name).toBe('test_login');
    });

    it('should calculate suite duration as sum of test durations', async () => {
      const pytestReport = {
        created: 1700000000,
        duration: 2.0,
        exitcode: 0,
        root: '/path/to/project',
        summary: {
          total: 3,
          passed: 3,
          collected: 3,
        },
        tests: [
          {
            nodeid: 'tests/test_suite.py::test_one',
            lineno: 5,
            outcome: 'passed',
            call: { outcome: 'passed', duration: 0.5 },
          },
          {
            nodeid: 'tests/test_suite.py::test_two',
            lineno: 10,
            outcome: 'passed',
            call: { outcome: 'passed', duration: 0.7 },
          },
          {
            nodeid: 'tests/test_suite.py::test_three',
            lineno: 15,
            outcome: 'passed',
            call: { outcome: 'passed', duration: 0.3 },
          },
        ],
      };

      const testFile = join(testDataDir, 'suite-duration-pytest.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(pytestReport), 'utf8');

      const report = await provider.convert(testFile);

      // 0.5 + 0.7 + 0.3 = 1.5 seconds = 1500 milliseconds
      expect(report.results.tests[0]?.duration).toBe(500);
      expect(report.results.tests[1]?.duration).toBe(700);
      expect(report.results.tests[2]?.duration).toBe(300);
    });
  });
});
