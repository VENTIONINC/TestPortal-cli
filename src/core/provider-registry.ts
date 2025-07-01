import { PlaywrightProvider } from '@/providers/playwright';
import { CypressProvider } from '@/providers/cypress';
import { UnifiedProvider } from '@/types/providers';

export class ProviderRegistry {
  private providers: Map<string, UnifiedProvider> = new Map();

  constructor() {
    this.registerDefaultProviders();
  }

  private registerDefaultProviders(): void {
    this.registerProvider(new PlaywrightProvider());
    this.registerProvider(new CypressProvider());
  }

  registerProvider(provider: UnifiedProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  getProvider(name: string): UnifiedProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name.toLowerCase());
  }
}
