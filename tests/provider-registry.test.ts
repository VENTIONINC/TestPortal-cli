// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { ProviderRegistry } from '@/core/provider-registry';
import type { BaseProvider } from '@/types/providers';

describe('ProviderRegistry mapper selection', () => {
  it('selects Playwright and an unrelated provider through the same registry', () => {
    const registry = new ProviderRegistry();
    expect(registry.getProvider('playwright')?.name).toBe('playwright');
    expect(registry.getProvider('jest')?.name).toBe('jest');
  });

  it('supports custom registration and preserves unknown-provider behavior', () => {
    const registry = new ProviderRegistry();
    const custom: BaseProvider = {
      name: 'custom',
      validate: async () => true,
      convert: async () => { throw new Error('not needed'); },
    };
    registry.registerProvider(custom);
    expect(registry.getProvider('CUSTOM')).toBe(custom);
    expect(registry.getProvider('unknown')).toBeUndefined();
  });
});
