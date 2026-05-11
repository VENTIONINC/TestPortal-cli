// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import { join } from 'path';

import { ProviderRegistry } from '@/core/provider-registry';

describe('registered provider test coverage', () => {
  it('should have a provider test file for every registered provider', async () => {
    const registry = new ProviderRegistry();
    const providers = registry.getAvailableProviders();

    await Promise.all(
      providers.map(async provider => {
        const testPath = join(__dirname, `${provider}-provider.test.ts`);
        await expect(fs.access(testPath)).resolves.toBeUndefined();
      })
    );
  });
});
