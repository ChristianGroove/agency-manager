import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getAICredentials } from "./actions"
import { decrypt } from "./encryption"
import { OpenAIProvider } from "./providers/openai"
import { AIRegistry } from "./registry"

export const EmbeddingService = {
    async generateEmbedding(text: string, organizationId: string): Promise<number[] | null> {
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

                    // Call Provider directly (since createEmbedding is specific to OpenAIProvider for now)
                    // In a perfect world, BaseAIProvider would have createEmbedding, but we are moving fast
                    const provider = new OpenAIProvider()
                    const embedding = await provider.createEmbedding(text, apiKey)

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

    async searchKnowledgeBase(query: string, organizationId: string, limit = 5) {
        // 1. Generate query embedding
        const embedding = await this.generateEmbedding(query, organizationId)
        if (!embedding) return []

        // 2. Search DB
        // Use supabaseAdmin to ensure we can execute the function
        const { data, error } = await supabaseAdmin.rpc('match_knowledge', {
            query_embedding: embedding,
            match_threshold: 0.7, // Only relevant matches
            match_count: limit,
            msg_org_id: organizationId
        })

        if (error) {
            console.error("[EmbeddingService] Search error:", error)
            return []
        }

        return data || []
    }
}
