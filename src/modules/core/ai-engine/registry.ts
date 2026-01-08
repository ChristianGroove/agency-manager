import { BaseAIProvider } from './providers/base';
import { OpenAIProvider } from './providers/openai';

export class AIRegistry {
    private static providers: Map<string, BaseAIProvider> = new Map();

    static register(provider: BaseAIProvider) {
        this.providers.set(provider.id, provider);
    }

    static getProvider(id: string): BaseAIProvider | undefined {
        return this.providers.get(id);
    }

    static getAll(): BaseAIProvider[] {
        return Array.from(this.providers.values());
    }
}

// Initialize default providers
AIRegistry.register(new OpenAIProvider());
