// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

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
});
