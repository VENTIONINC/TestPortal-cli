import { BaseProvider } from '@/types/providers';
import { PlaywrightProvider } from '@/providers/playwright';

export class ProviderRegistry {
  private providers: Map<string, BaseProvider> = new Map();

  constructor() {
    this.registerDefaultProviders();
  }

  private registerDefaultProviders(): void {
    this.registerProvider(new PlaywrightProvider());
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
