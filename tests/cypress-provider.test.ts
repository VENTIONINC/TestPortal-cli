// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { CypressProvider } from '@/providers/cypress';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('CypressProvider', () => {
  let provider: CypressProvider;
  let testDataDir: string;

  beforeEach(() => {
    provider = new CypressProvider();
    testDataDir = join(
      __dirname,
      'test-data',
      `cypress-${Date.now()}-${Math.random()}`
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
    it('should validate valid cypress report with results array', async () => {
      const validReport = {
        stats: {
          suites: 1,
          tests: 2,
          passes: 2,
          pending: 0,
          failures: 0,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:05.000Z',
          duration: 5000,
        },
        results: [],
      };

      const testFile = join(testDataDir, 'valid-cypress.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(validReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(true);
    });

    it('should reject invalid cypress report', async () => {
      const invalidReport = { invalid: 'structure' };

      const testFile = join(testDataDir, 'invalid-cypress.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(invalidReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });

    it('should reject non-existent file', async () => {
      const isValid = await provider.validate('./non-existent.json');
      expect(isValid).toBe(false);
    });

    it('should reject report missing results array', async () => {
      const invalidReport = {
        stats: {
          tests: 1,
        },
      };

      const testFile = join(testDataDir, 'missing-results.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(invalidReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });

    it('should reject report missing stats object', async () => {
      const invalidReport = {
        results: [],
      };

      const testFile = join(testDataDir, 'missing-stats.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(invalidReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });

    it('should reject report with stats.tests as non-number', async () => {
      const invalidReport = {
        stats: {
          tests: 'not a number',
        },
        results: [],
      };

      const testFile = join(testDataDir, 'invalid-stats.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(invalidReport), 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });

    it('should reject malformed JSON', async () => {
      const testFile = join(testDataDir, 'malformed.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, '{ invalid json', 'utf8');

      const isValid = await provider.validate(testFile);
      expect(isValid).toBe(false);
    });
  });

  describe('convert', () => {
    it('should handle skipped tests', async () => {
      const cypressReport = {
        stats: {
          suites: 1,
          tests: 1,
          passes: 0,
          pending: 1,
          failures: 0,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:01.000Z',
          duration: 1000,
        },
        results: [
          {
            uuid: 'suite-uuid-1',
            title: 'Skipped Suite',
            fullFile: 'cypress/e2e/skipped.cy.js',
            file: 'cypress/e2e/skipped.cy.js',
            beforeHooks: [],
            afterHooks: [],
            tests: [
              {
                title: ['Skipped Suite', 'should be skipped'],
                fullTitle: 'Skipped Suite should be skipped',
                timedOut: null,
                duration: 0,
                state: 'pending',
                speed: null,
                pass: false,
                fail: false,
                pending: true,
                context: null,
                code: 'cy.skip()',
                err: {},
                uuid: 'test-uuid-1',
                parentUUID: 'suite-uuid-1',
                isHook: false,
                skipped: true,
              },
            ],
            suites: [],
            passes: [],
            failures: [],
            pending: ['test-uuid-1'],
            skipped: [],
            duration: 0,
            root: false,
            rootEmpty: false,
            _timeout: 2000,
          },
        ],
      };

      const testFile = join(testDataDir, 'cypress-skipped.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(cypressReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.stats.skipped).toBe(1);
      expect(unifiedReport.suites[0]?.tests[0]?.status).toBe('skipped');
    });

    it('should convert basic cypress report with passing tests', async () => {
      const cypressReport = {
        stats: {
          suites: 1,
          tests: 2,
          passes: 2,
          pending: 0,
          failures: 0,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:05.000Z',
          duration: 5000,
        },
        results: [
          {
            uuid: 'suite-uuid-1',
            title: 'Login Tests',
            fullFile: 'cypress/e2e/auth/login.cy.js',
            file: 'cypress/e2e/auth/login.cy.js',
            beforeHooks: [],
            afterHooks: [],
            tests: [
              {
                title: ['Login Tests', 'should login with valid credentials'],
                fullTitle: 'Login Tests should login with valid credentials',
                timedOut: null,
                duration: 2500,
                state: 'passed',
                speed: 'fast',
                pass: true,
                fail: false,
                pending: false,
                context: null,
                code: 'cy.login()',
                err: {},
                uuid: 'test-uuid-1',
                parentUUID: 'suite-uuid-1',
                isHook: false,
                skipped: false,
              },
              {
                title: ['Login Tests', 'should logout successfully'],
                fullTitle: 'Login Tests should logout successfully',
                timedOut: null,
                duration: 1500,
                state: 'passed',
                speed: 'fast',
                pass: true,
                fail: false,
                pending: false,
                context: null,
                code: 'cy.logout()',
                err: {},
                uuid: 'test-uuid-2',
                parentUUID: 'suite-uuid-1',
                isHook: false,
                skipped: false,
              },
            ],
            suites: [],
            passes: ['test-uuid-1', 'test-uuid-2'],
            failures: [],
            pending: [],
            skipped: [],
            duration: 4000,
            root: false,
            rootEmpty: false,
            _timeout: 2000,
          },
        ],
        meta: {
          mocha: {
            version: '10.2.0',
          },
          mochawesome: {
            version: '7.1.3',
          },
        },
      };

      const testFile = join(testDataDir, 'cypress-report.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(cypressReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.framework).toBe('cypress');
      expect(unifiedReport.frameworkVersion).toBe('10.2.0');
      expect(unifiedReport.toolVersion).toBe('7.1.3');
      expect(unifiedReport.stats.total).toBe(2);
      expect(unifiedReport.stats.passed).toBe(2);
      expect(unifiedReport.stats.failed).toBe(0);
      expect(unifiedReport.stats.duration).toBe(5000);
      expect(unifiedReport.suites).toHaveLength(1);
      expect(unifiedReport.suites[0]?.name).toBe('Login Tests');
      expect(unifiedReport.suites[0]?.file).toBe(
        'cypress/e2e/auth/login.cy.js'
      );
      expect(unifiedReport.suites[0]?.tests).toHaveLength(2);
      expect(unifiedReport.suites[0]?.tests[0]?.name).toBe(
        'should login with valid credentials'
      );
      expect(unifiedReport.suites[0]?.tests[0]?.status).toBe('passed');
      expect(unifiedReport.suites[0]?.tests[0]?.duration).toBe(2500);
      expect(unifiedReport.id).toBeDefined();
      expect(unifiedReport.createdAt).toBeDefined();
    });

    it('should convert cypress report with failed tests', async () => {
      const cypressReport = {
        stats: {
          suites: 1,
          tests: 1,
          passes: 0,
          pending: 0,
          failures: 1,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:02.000Z',
          duration: 2000,
        },
        results: [
          {
            uuid: 'suite-uuid-1',
            title: 'Failed Tests',
            fullFile: 'cypress/e2e/failing.cy.js',
            file: 'cypress/e2e/failing.cy.js',
            beforeHooks: [],
            afterHooks: [],
            tests: [
              {
                title: ['Failed Tests', 'should fail'],
                fullTitle: 'Failed Tests should fail',
                timedOut: null,
                duration: 1500,
                state: 'failed',
                speed: null,
                pass: false,
                fail: true,
                pending: false,
                context: null,
                code: 'expect(true).to.be.false',
                err: {
                  message: 'AssertionError: expected true to be false',
                  estack:
                    'AssertionError: expected true to be false\n    at Context.eval (failing.cy.js:5:25)',
                  diff: null,
                },
                uuid: 'test-uuid-1',
                parentUUID: 'suite-uuid-1',
                isHook: false,
                skipped: false,
              },
            ],
            suites: [],
            passes: [],
            failures: ['test-uuid-1'],
            pending: [],
            skipped: [],
            duration: 1500,
            root: false,
            rootEmpty: false,
            _timeout: 2000,
          },
        ],
      };

      const testFile = join(testDataDir, 'cypress-failed.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(cypressReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.stats.total).toBe(1);
      expect(unifiedReport.stats.passed).toBe(0);
      expect(unifiedReport.stats.failed).toBe(1);
      expect(unifiedReport.suites[0]?.tests[0]?.status).toBe('failed');
      expect(unifiedReport.suites[0]?.tests[0]?.results[0]?.errors).toHaveLength(1);
      expect(unifiedReport.suites[0]?.tests[0]?.results[0]?.errors?.[0]?.message).toBe(
        'AssertionError: expected true to be false'
      );
      expect(unifiedReport.suites[0]?.tests[0]?.results[0]?.errors?.[0]?.stack).toContain(
        'failing.cy.js:5:25'
      );
    });

    it('should convert cypress report with pending tests', async () => {
      const cypressReport = {
        stats: {
          suites: 1,
          tests: 1,
          passes: 0,
          pending: 1,
          failures: 0,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:01.000Z',
          duration: 1000,
        },
        results: [
          {
            uuid: 'suite-uuid-1',
            title: 'Pending Tests',
            fullFile: 'cypress/e2e/pending.cy.js',
            file: 'cypress/e2e/pending.cy.js',
            beforeHooks: [],
            afterHooks: [],
            tests: [
              {
                title: ['Pending Tests', 'should be pending'],
                fullTitle: 'Pending Tests should be pending',
                timedOut: null,
                duration: 0,
                state: 'pending',
                speed: null,
                pass: false,
                fail: false,
                pending: true,
                context: null,
                code: '',
                err: {},
                uuid: 'test-uuid-1',
                parentUUID: 'suite-uuid-1',
                isHook: false,
                skipped: false,
              },
            ],
            suites: [],
            passes: [],
            failures: [],
            pending: ['test-uuid-1'],
            skipped: [],
            duration: 0,
            root: false,
            rootEmpty: false,
            _timeout: 2000,
          },
        ],
      };

      const testFile = join(testDataDir, 'cypress-pending.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(cypressReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.stats.total).toBe(1);
      expect(unifiedReport.stats.skipped).toBe(1);
      expect(unifiedReport.suites[0]?.tests[0]?.status).toBe('skipped');
    });

    it('should handle multiple suites', async () => {
      const cypressReport = {
        stats: {
          suites: 2,
          tests: 3,
          passes: 3,
          pending: 0,
          failures: 0,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:06.000Z',
          duration: 6000,
        },
        results: [
          {
            uuid: 'suite-uuid-1',
            title: 'Suite 1',
            fullFile: 'cypress/e2e/suite1.cy.js',
            file: 'cypress/e2e/suite1.cy.js',
            beforeHooks: [],
            afterHooks: [],
            tests: [
              {
                title: ['Suite 1', 'test 1'],
                fullTitle: 'Suite 1 test 1',
                timedOut: null,
                duration: 1000,
                state: 'passed',
                speed: 'fast',
                pass: true,
                fail: false,
                pending: false,
                context: null,
                code: '',
                err: {},
                uuid: 'test-uuid-1',
                parentUUID: 'suite-uuid-1',
                isHook: false,
                skipped: false,
              },
              {
                title: ['Suite 1', 'test 2'],
                fullTitle: 'Suite 1 test 2',
                timedOut: null,
                duration: 1500,
                state: 'passed',
                speed: 'fast',
                pass: true,
                fail: false,
                pending: false,
                context: null,
                code: '',
                err: {},
                uuid: 'test-uuid-2',
                parentUUID: 'suite-uuid-1',
                isHook: false,
                skipped: false,
              },
            ],
            suites: [],
            passes: ['test-uuid-1', 'test-uuid-2'],
            failures: [],
            pending: [],
            skipped: [],
            duration: 2500,
            root: false,
            rootEmpty: false,
            _timeout: 2000,
          },
          {
            uuid: 'suite-uuid-2',
            title: 'Suite 2',
            fullFile: 'cypress/e2e/suite2.cy.js',
            file: 'cypress/e2e/suite2.cy.js',
            beforeHooks: [],
            afterHooks: [],
            tests: [
              {
                title: ['Suite 2', 'test 3'],
                fullTitle: 'Suite 2 test 3',
                timedOut: null,
                duration: 2000,
                state: 'passed',
                speed: 'medium',
                pass: true,
                fail: false,
                pending: false,
                context: null,
                code: '',
                err: {},
                uuid: 'test-uuid-3',
                parentUUID: 'suite-uuid-2',
                isHook: false,
                skipped: false,
              },
            ],
            suites: [],
            passes: ['test-uuid-3'],
            failures: [],
            pending: [],
            skipped: [],
            duration: 2000,
            root: false,
            rootEmpty: false,
            _timeout: 2000,
          },
        ],
      };

      const testFile = join(testDataDir, 'cypress-multiple.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(cypressReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.stats.total).toBe(3);
      expect(unifiedReport.stats.passed).toBe(3);
      expect(unifiedReport.stats.suites).toBe(2);
      expect(unifiedReport.suites).toHaveLength(2);
      expect(unifiedReport.suites[0]?.name).toBe('Suite 1');
      expect(unifiedReport.suites[0]?.tests).toHaveLength(2);
      expect(unifiedReport.suites[1]?.name).toBe('Suite 2');
      expect(unifiedReport.suites[1]?.tests).toHaveLength(1);
    });

    it('should extract suite name from file path when title is missing', async () => {
      const cypressReport = {
        stats: {
          suites: 1,
          tests: 1,
          passes: 1,
          pending: 0,
          failures: 0,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:02.000Z',
          duration: 2000,
        },
        results: [
          {
            uuid: 'suite-uuid-1',
            title: '',
            fullFile: 'cypress/e2e/auth/login.cy.js',
            file: 'cypress/e2e/auth/login.cy.js',
            beforeHooks: [],
            afterHooks: [],
            tests: [
              {
                title: ['test'],
                fullTitle: 'test',
                timedOut: null,
                duration: 1000,
                state: 'passed',
                speed: 'fast',
                pass: true,
                fail: false,
                pending: false,
                context: null,
                code: '',
                err: {},
                uuid: 'test-uuid-1',
                parentUUID: 'suite-uuid-1',
                isHook: false,
                skipped: false,
              },
            ],
            suites: [],
            passes: ['test-uuid-1'],
            failures: [],
            pending: [],
            skipped: [],
            duration: 1000,
            root: false,
            rootEmpty: false,
            _timeout: 2000,
          },
        ],
      };

      const testFile = join(testDataDir, 'cypress-no-title.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(cypressReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.name).toBe('login');
    });

    it('should skip empty suites without tests', async () => {
      const cypressReport = {
        stats: {
          suites: 1,
          tests: 1,
          passes: 1,
          pending: 0,
          failures: 0,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:02.000Z',
          duration: 2000,
        },
        results: [
          {
            uuid: 'suite-uuid-1',
            title: 'Empty Suite',
            fullFile: 'cypress/e2e/empty.cy.js',
            file: 'cypress/e2e/empty.cy.js',
            beforeHooks: [],
            afterHooks: [],
            tests: [],
            suites: [],
            passes: [],
            failures: [],
            pending: [],
            skipped: [],
            duration: 0,
            root: false,
            rootEmpty: true,
            _timeout: 2000,
          },
          {
            uuid: 'suite-uuid-2',
            title: 'Suite with Tests',
            fullFile: 'cypress/e2e/valid.cy.js',
            file: 'cypress/e2e/valid.cy.js',
            beforeHooks: [],
            afterHooks: [],
            tests: [
              {
                title: ['Suite with Tests', 'test'],
                fullTitle: 'Suite with Tests test',
                timedOut: null,
                duration: 1000,
                state: 'passed',
                speed: 'fast',
                pass: true,
                fail: false,
                pending: false,
                context: null,
                code: '',
                err: {},
                uuid: 'test-uuid-1',
                parentUUID: 'suite-uuid-2',
                isHook: false,
                skipped: false,
              },
            ],
            suites: [],
            passes: ['test-uuid-1'],
            failures: [],
            pending: [],
            skipped: [],
            duration: 1000,
            root: false,
            rootEmpty: false,
            _timeout: 2000,
          },
        ],
      };

      const testFile = join(testDataDir, 'cypress-empty-suite.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(cypressReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites).toHaveLength(1);
      expect(unifiedReport.suites[0]?.name).toBe('Suite with Tests');
    });

    it('should handle test with missing version metadata', async () => {
      const cypressReport = {
        stats: {
          suites: 1,
          tests: 1,
          passes: 1,
          pending: 0,
          failures: 0,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:02.000Z',
          duration: 2000,
        },
        results: [
          {
            uuid: 'suite-uuid-1',
            title: 'Test Suite',
            fullFile: 'cypress/e2e/test.cy.js',
            file: 'cypress/e2e/test.cy.js',
            beforeHooks: [],
            afterHooks: [],
            tests: [
              {
                title: ['Test Suite', 'test'],
                fullTitle: 'Test Suite test',
                timedOut: null,
                duration: 1000,
                state: 'passed',
                speed: 'fast',
                pass: true,
                fail: false,
                pending: false,
                context: null,
                code: '',
                err: {},
                uuid: 'test-uuid-1',
                parentUUID: 'suite-uuid-1',
                isHook: false,
                skipped: false,
              },
            ],
            suites: [],
            passes: ['test-uuid-1'],
            failures: [],
            pending: [],
            skipped: [],
            duration: 1000,
            root: false,
            rootEmpty: false,
            _timeout: 2000,
          },
        ],
      };

      const testFile = join(testDataDir, 'cypress-no-meta.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(cypressReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.framework).toBe('cypress');
      expect(unifiedReport.frameworkVersion).toBeUndefined();
      expect(unifiedReport.toolVersion).toBeUndefined();
    });

    it('should use generated UUID when suite uuid is missing', async () => {
      const cypressReport = {
        stats: {
          suites: 1,
          tests: 1,
          passes: 1,
          pending: 0,
          failures: 0,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:02.000Z',
          duration: 2000,
        },
        results: [
          {
            title: 'Test Suite',
            fullFile: 'cypress/e2e/test.cy.js',
            file: 'cypress/e2e/test.cy.js',
            beforeHooks: [],
            afterHooks: [],
            tests: [
              {
                title: ['Test Suite', 'test'],
                fullTitle: 'Test Suite test',
                timedOut: null,
                duration: 1000,
                state: 'passed',
                speed: 'fast',
                pass: true,
                fail: false,
                pending: false,
                context: null,
                code: '',
                err: {},
                parentUUID: 'suite-uuid-1',
                isHook: false,
                skipped: false,
              },
            ],
            suites: [],
            passes: [],
            failures: [],
            pending: [],
            skipped: [],
            duration: 1000,
            root: false,
            rootEmpty: false,
            _timeout: 2000,
          },
        ],
      };

      const testFile = join(testDataDir, 'cypress-no-uuid.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(cypressReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.id).toBeDefined();
      expect(unifiedReport.suites[0]?.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('should handle error without diff field', async () => {
      const cypressReport = {
        stats: {
          suites: 1,
          tests: 1,
          passes: 0,
          pending: 0,
          failures: 1,
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:02.000Z',
          duration: 2000,
        },
        results: [
          {
            uuid: 'suite-uuid-1',
            title: 'Failed Test',
            fullFile: 'cypress/e2e/fail.cy.js',
            file: 'cypress/e2e/fail.cy.js',
            beforeHooks: [],
            afterHooks: [],
            tests: [
              {
                title: ['Failed Test', 'test'],
                fullTitle: 'Failed Test test',
                timedOut: null,
                duration: 1000,
                state: 'failed',
                speed: null,
                pass: false,
                fail: true,
                pending: false,
                context: null,
                code: '',
                err: {
                  message: 'Test failed',
                  estack: 'Error stack trace',
                },
                uuid: 'test-uuid-1',
                parentUUID: 'suite-uuid-1',
                isHook: false,
                skipped: false,
              },
            ],
            suites: [],
            passes: [],
            failures: ['test-uuid-1'],
            pending: [],
            skipped: [],
            duration: 1000,
            root: false,
            rootEmpty: false,
            _timeout: 2000,
          },
        ],
      };

      const testFile = join(testDataDir, 'cypress-no-diff.json');
      await fs.mkdir(testDataDir, { recursive: true });
      await fs.writeFile(testFile, JSON.stringify(cypressReport), 'utf8');

      const unifiedReport = await provider.convert(testFile);

      expect(unifiedReport.suites[0]?.tests[0]?.results[0]?.errors?.[0]?.diff).toBeUndefined();
    });
  });
});
