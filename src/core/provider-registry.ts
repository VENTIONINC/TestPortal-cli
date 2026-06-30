// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { PlaywrightProvider } from '@/providers/playwright';
import { CypressProvider } from '@/providers/cypress';
import { JestProvider } from '@/providers/jest';
import { JunitProvider } from '@/providers/junit';
import { VitestProvider } from '@/providers/vitest';
import { NUnitProvider } from '@/providers/nunit';
import { MochaProvider } from '@/providers/mocha';
import { PytestProvider } from '@/providers/pytest';
import { TestNGProvider } from '@/providers/testng';
import { BaseProvider } from '@/types/providers';

export class ProviderRegistry {
  private providers: Map<string, BaseProvider> = new Map();

  constructor() {
    this.registerDefaultProviders();
  }

  private registerDefaultProviders(): void {
    this.registerProvider(new PlaywrightProvider());
    this.registerProvider(new CypressProvider());
    this.registerProvider(new JestProvider());
    this.registerProvider(new JunitProvider());
    this.registerProvider(new VitestProvider());
    this.registerProvider(new NUnitProvider());
    this.registerProvider(new MochaProvider());
    this.registerProvider(new PytestProvider());
    this.registerProvider(new TestNGProvider());
  }

  registerProvider(provider: BaseProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  getProvider(name: string): BaseProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name.toLowerCase());
  }
}
