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
        const cleanQuery = query?.trim()
        if (!cleanQuery) return []

        const embedding = await this.generateEmbedding(cleanQuery, orgId)

        if (embedding) {
            // 1. Try vector similarity search
            try {
                const { data, error } = await (supabaseAdmin).rpc('match_knowledge_v2', {
                    query_embedding: embedding,
                    match_threshold: 0.65,
                    match_count: 5,
                    msg_org_id: orgId,
                    category_filter: category,
                    audience_filter: audience
                })

                if (!error && Array.isArray(data) && data.length > 0) {
                    return data as KnowledgeBaseResult[]
                }
            } catch (err: any) {
                console.warn("[EmbeddingService] Vector search error, falling back to text search:", err.message)
            }
        }

        // 2. Resilient Fallback: Text Similarity Match directly on knowledge_base
        return this.fallbackTextSearch(cleanQuery, orgId, category)
    },

    async fallbackTextSearch(query: string, orgId: string, category?: string): Promise<KnowledgeBaseResult[]> {
        try {
            const words = query
                .toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 3)
                .slice(0, 5)

            let dbQuery = supabaseAdmin
                .from('knowledge_base')
                .select('id, question, answer, category')
                .eq('organization_id', orgId)
                .limit(5)

            if (category) {
                dbQuery = dbQuery.eq('category', category)
            }

            if (words.length > 0) {
                const orConditions = words.map(w => `question.ilike.%${w}%,answer.ilike.%${w}%`).join(',')
                dbQuery = dbQuery.or(orConditions)
            } else {
                dbQuery = dbQuery.or(`question.ilike.%${query}%,answer.ilike.%${query}%`)
            }

            const { data, error } = await dbQuery
            if (error || !data) return []

            return data.map((item: any) => ({
                id: item.id,
                question: item.question,
                answer: item.answer,
                category: item.category || 'General',
                audience: 'both',
                similarity: 0.8
            }))
        } catch (e: any) {
            console.error("[EmbeddingService] Fallback search error:", e.message)
            return []
        }
    }
}
