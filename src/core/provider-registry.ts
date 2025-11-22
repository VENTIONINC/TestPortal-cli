import { PlaywrightProvider } from '@/providers/playwright';
import { CypressProvider } from '@/providers/cypress';
import { JestProvider } from '@/providers/jest';
import { JunitProvider } from '@/providers/junit';
import { VitestProvider } from '@/providers/vitest';
import { NUnitProvider } from '@/providers/nunit';
import { MochaProvider } from '@/providers/mocha';
import { PytestProvider } from '@/providers/pytest';
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

  async detectProvider(inputPath: string): Promise<BaseProvider | undefined> {
    for (const provider of this.providers.values()) {
      if (await provider.validate(inputPath)) {
        return provider;
      }
    }
    return undefined;
  }
}
