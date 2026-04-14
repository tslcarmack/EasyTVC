import type { AIProviderInterface } from './types.js';
import { MockProvider } from './mock-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { ReplicateProvider } from './replicate-provider.js';

const providers: Record<string, AIProviderInterface> = {
  mock: new MockProvider(),
  openai: new OpenAIProvider(),
  replicate: new ReplicateProvider(),
};

export function getProvider(name?: string): AIProviderInterface {
  if (!name || name === 'mock') return providers.mock;
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown AI provider: ${name}`);
  return provider;
}

export function getDefaultProvider(): AIProviderInterface {
  if (process.env.OPENAI_API_KEY) return providers.openai;
  if (process.env.REPLICATE_API_TOKEN) return providers.replicate;
  return providers.mock;
}

export type { AIProviderInterface, GenerationResult } from './types.js';
