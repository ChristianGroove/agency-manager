import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { getAICredentials } from "./actions"
import { decrypt } from "./encryption"
import { OpenAIProvider } from "./providers/openai"
import { AIRegistry } from "./registry"

export interface KnowledgeBaseResult {
    id: string
    question: string
    answer: string
    category: string
    audience: 'staff' | 'customer' | 'both'
    similarity: number
}

export const EmbeddingService = {
    async generateEmbedding(text: string, organizationId: string): Promise<number[] | null> {
        // ... existing implementation ...
        try {
            // 1. Get Credentials
            const credentials = await getAICredentials(organizationId)
            const activeCredentials = credentials
                .filter(c => c.status === 'active' && c.provider_id === 'openai') // Only OpenAI supported for embeddings now
                .sort((a, b) => a.priority - b.priority)

            // Fallback key injection
            const HARDCODED_KEY = "" // Keep same as service.ts if needed, or rely on Env
            const envKey = process.env.OPENAI_API_KEY || HARDCODED_KEY

            if (envKey && envKey.startsWith('sk-')) {
                activeCredentials.unshift({
                    id: 'env-var',
                    organization_id: organizationId,
                    provider_id: 'openai',
                    api_key_encrypted: envKey,
                    priority: 0,
                    status: 'active',
                    created_at: new Date().toISOString()
                })
            }

            if (activeCredentials.length === 0) {
                console.warn("[EmbeddingService] No active OpenAI credentials found")
                return null
            }

            // 2. Iterate and try
            for (const cred of activeCredentials) {
                try {
                    // Decrypt
                    let apiKey = cred.api_key_encrypted
                    if (!apiKey.startsWith('sk-')) {
                        const decrypted = decrypt(apiKey)
                        if (decrypted) apiKey = decrypted
                    }
                    if (!apiKey) continue

                    // Get provider from registry
                    const provider = AIRegistry.getProvider(cred.provider_id)
                    if (!provider || typeof (provider as any).createEmbedding !== 'function') {
                        console.warn(`[EmbeddingService] Provider ${cred.provider_id} does not support embeddings`)
                        continue
                    }

                    const embedding = await (provider as any).createEmbedding(text, apiKey)
                    if (embedding) return embedding

                } catch (e: any) {
                    console.warn(`[EmbeddingService] Credential ${cred.id} failed:`, e.message)
                }
            }

            return null
        } catch (error) {
            console.error("[EmbeddingService] Error generating embedding:", error)
            return null
        }
    },

    async searchKnowledgeBase(query: string, orgId: string, category?: string, audience?: 'staff' | 'customer' | 'both'): Promise<KnowledgeBaseResult[]> {
        const embedding = await this.generateEmbedding(query, orgId)
        if (!embedding) return []

        // 2. Search DB (using v2 with category filtering)
        const { data, error } = await (supabaseAdmin).rpc('match_knowledge_v2', {
            query_embedding: embedding,
            match_threshold: 0.7,
            match_count: 5,
            msg_org_id: orgId,
            category_filter: category,
            audience_filter: audience
        })

        if (error) {
            console.error("[EmbeddingService] Search error:", error)
            return []
        }

        return data as KnowledgeBaseResult[] || []
    }
}
