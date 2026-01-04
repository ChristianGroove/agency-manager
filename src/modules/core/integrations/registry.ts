import { IntegrationAdapter } from "./adapters/types"
import { OpenAIAdapter } from "./adapters/openai-adapter"
import { MockAdapter } from "./adapters/mock-adapter"
import { EvolutionAdapter } from "./adapters/evolution-adapter"
import { MetaAdapter } from "./adapters/meta-adapter"

class IntegrationRegistry {
    private adapters: Map<string, IntegrationAdapter> = new Map()

    constructor() {
        this.register(new OpenAIAdapter())
        this.register(new MetaAdapter()) // Handles 'meta_whatsapp'
        this.register(new MockAdapter('meta_instagram'))
        this.register(new MockAdapter('stripe'))
        this.register(new MockAdapter('google_mail'))
        this.register(new EvolutionAdapter())
    }

    register(adapter: IntegrationAdapter) {
        this.adapters.set(adapter.key, adapter)
    }

    getAdapter(key: string): IntegrationAdapter | undefined {
        return this.adapters.get(key)
    }
}

export const integrationRegistry = new IntegrationRegistry()
