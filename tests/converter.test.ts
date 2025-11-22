import { Converter } from '@/core/converter';
import { ConvertOptions } from '@/types/providers';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('Converter', () => {
  let converter: Converter;

  beforeEach(() => {
    converter = new Converter();
  });

  describe('getAvailableProviders', () => {
    it('should return available providers', () => {
      const providers = converter.getAvailableProviders();
      expect(providers).toContain('playwright');
      expect(providers.length).toBeGreaterThan(0);
    });
  });

  describe('convert', () => {
    it('should throw error for non-existent file', async () => {
      const options: ConvertOptions = {
        input: './non-existent-file.json',
        provider: 'playwright',
      };

      await expect(converter.convert(options)).rejects.toThrow(
        'Input file not found'
      );
    });

    it('should throw error for unsupported provider', async () => {
      const testFile = join(__dirname, 'temp-test.json');
      await fs.writeFile(testFile, '{}', 'utf8');

      const options: ConvertOptions = {
        input: testFile,
        provider: 'unsupported',
      };

      try {
        await expect(converter.convert(options)).rejects.toThrow(
          'Unsupported provider'
        );
      } finally {
        await fs.unlink(testFile);
      }
    });
  });

  describe('detectProvider', () => {
    it('should detect jest provider', async () => {
      const testFile = join(__dirname, 'temp-jest.json');
      const content = JSON.stringify({
        testResults: [{ testFilePath: 'some/path' }],
        numTotalTests: 1,
        numPassedTests: 1,
        numFailedTests: 0,
      });
      await fs.writeFile(testFile, content, 'utf8');

      try {
        const provider = await converter.detectProvider(testFile);
        expect(provider).toBe('jest');
      } finally {
        await fs.unlink(testFile);
      }
    });

    it('should detect vitest provider', async () => {
      const testFile = join(__dirname, 'temp-vitest.json');
      const content = JSON.stringify({
        testResults: [{ name: 'some/path' }],
        numTotalTests: 1,
        numPassedTests: 1,
        numFailedTests: 0,
      });
      await fs.writeFile(testFile, content, 'utf8');

      try {
        const provider = await converter.detectProvider(testFile);
        expect(provider).toBe('vitest');
      } finally {
        await fs.unlink(testFile);
      }
    });

    it('should return undefined if no provider matches', async () => {
      const testFile = join(__dirname, 'temp-unknown.json');
      await fs.writeFile(testFile, '{}', 'utf8');
      try {
        const provider = await converter.detectProvider(testFile);
        expect(provider).toBeUndefined();
      } finally {
        await fs.unlink(testFile);
      }
    });

    it('should detect junit provider', async () => {
      const testFile = join(__dirname, 'temp-junit.xml');
      const content = '<testsuites><testsuite></testsuite></testsuites>';
      await fs.writeFile(testFile, content, 'utf8');

      try {
        const provider = await converter.detectProvider(testFile);
        expect(provider).toBe('junit');
      } finally {
        await fs.unlink(testFile);
      }
    });

    it('should detect cypress provider', async () => {
      const testFile = join(__dirname, 'temp-cypress.json');
      const content = JSON.stringify({
        results: [],
        stats: { tests: 1 },
      });
      await fs.writeFile(testFile, content, 'utf8');

      try {
        const provider = await converter.detectProvider(testFile);
        expect(provider).toBe('cypress');
      } finally {
        await fs.unlink(testFile);
      }
    });

    it('should detect playwright provider', async () => {
      const testFile = join(__dirname, 'temp-playwright.json');
      const content = JSON.stringify({
        suites: [],
        config: {},
      });
      await fs.writeFile(testFile, content, 'utf8');

      try {
        const provider = await converter.detectProvider(testFile);
        expect(provider).toBe('playwright');
      } finally {
        await fs.unlink(testFile);
      }
    });

    it('should detect mocha provider', async () => {
      const testFile = join(__dirname, 'temp-mocha.json');
      const content = JSON.stringify({
        stats: { tests: 1, passes: 1, failures: 0 },
        tests: [],
      });
      await fs.writeFile(testFile, content, 'utf8');

      try {
        const provider = await converter.detectProvider(testFile);
        expect(provider).toBe('mocha');
      } finally {
        await fs.unlink(testFile);
      }
    });

    it('should detect nunit provider', async () => {
      const testFile = join(__dirname, 'temp-nunit.xml');
      const content = '<test-run id="1"></test-run>';
      await fs.writeFile(testFile, content, 'utf8');

      try {
        const provider = await converter.detectProvider(testFile);
        expect(provider).toBe('nunit');
      } finally {
        await fs.unlink(testFile);
      }
    });

    it('should detect pytest provider', async () => {
      const testFile = join(__dirname, 'temp-pytest.json');
      const content = JSON.stringify({
        created: 123,
        duration: 123,
        exitcode: 0,
        root: 'root',
        summary: {
          total: 1,
          collected: 1,
        },
        tests: [
          {
            nodeid: 'test_id',
            lineno: 1,
            outcome: 'passed',
          },
        ],
      });
      await fs.writeFile(testFile, content, 'utf8');

      try {
        const provider = await converter.detectProvider(testFile);
        expect(provider).toBe('pytest');
      } finally {
        await fs.unlink(testFile);
      }
    });
  });
});
