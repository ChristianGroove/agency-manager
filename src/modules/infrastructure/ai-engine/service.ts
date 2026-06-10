import { createClient } from '@/modules/core/database/supabase-server';
// import { getAICredentials } from './actions';
import { AIRegistry } from './registry';
import { AIEngineResponse } from './types';
import { getTaskDefinition } from './tasks/registry';
import { decrypt } from './encryption';
import { getCachedResponse, setCachedResponse } from './cache';

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV;
}

function logAIEngineError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error);
        return;
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error });
}

interface TaskExecutionOptions {
    organizationId: string;
    taskType: string; // "inbox.smart_replies_v1"
    payload: any; // Checked against Zod schema in future
    bypassCache?: boolean;
}

export const AIEngine = {
    /**
     * Execute a specific defined AI Task (Sealed Prompt Pattern)
     */
    async executeTask(options: TaskExecutionOptions): Promise<AIEngineResponse> {
        const { organizationId, taskType, payload, bypassCache } = options;

        // 1. Load Task Definition
        const taskDef = getTaskDefinition(taskType);

        // 2. CHECK CACHE FIRST (Cost Optimization & Multi-tenant Isolation)
        if (!bypassCache && taskType !== 'contract.generate_v1') {
            const cached = await getCachedResponse(organizationId, taskType, payload);
            if (cached) {
                console.log(`[AIEngine] 📦 Cache HIT for ${organizationId}:${taskType}`);
                return { success: true, data: cached, provider: 'cache' };
            }
        }

        // 3. Resolve Credentials (Active & Priority)
        const credentials = await fetchInternalCredentials(organizationId);

        // Filter active and sort by priority (1 is highest)
        const activeCredentials = credentials
            .filter(c => c.status === 'active')
            .sort((a, b) => a.priority - b.priority);

        // Env Var Fallback (Platform cost)
        const envKey = process.env.OPENAI_API_KEY;
        if (envKey && envKey.startsWith('sk-') && activeCredentials.length === 0) {
            console.log('[AIEngine] Using Platform Fallback (OpenAI)');
            activeCredentials.push({
                id: 'platform-fallback',
                organization_id: organizationId,
                provider_id: 'openai',
                api_key_encrypted: envKey,
                priority: 99,
                status: 'active',
                created_at: new Date().toISOString()
            });
        }

        if (activeCredentials.length === 0) {
            throw new Error('No active AI credentials found for this organization.');
        }

        // 4. RAG Context Injection (Knowledge Base)
        if (taskDef.useKnowledgeBase && taskDef.getKBQuery) {
            try {
                const query = taskDef.getKBQuery(payload);
                if (query && query.trim().length > 3) {
                    const { EmbeddingService } = await import('./embedding');
                    const knowledge = await EmbeddingService.searchKnowledgeBase(query, organizationId, payload.spaceCategory, 'staff');
                    if (knowledge && knowledge.length > 0) {
                        payload.knowledgeContext = knowledge;
                    }
                }
            } catch (err: any) {
                console.warn(`[AIEngine] RAG Search failed:`, err.message);
            }
        }

        // 5. Construct Sealed Prompt
        const systemMessage = taskDef.systemPrompt(payload);
        const userMessage = taskDef.userPrompt(payload);
        const messages = [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage }
        ];

        // 6. Execute with Auto-Healing Fallback
        let lastError: Error | null = null;

        for (const cred of activeCredentials) {
            try {
                const provider = AIRegistry.getProvider(cred.provider_id);
                if (!provider) continue;

                // Decrypt Key
                let apiKey = cred.api_key_encrypted;
                if (!apiKey.startsWith('sk-') && !apiKey.startsWith('gsk_')) {
                    const decrypted = decrypt(apiKey);
                    if (decrypted) apiKey = decrypted;
                }
                if (!apiKey || apiKey.includes('●')) continue;

                // Resolve Best Model for Tier & Provider
                const model = resolveModelForTier(taskDef.tier, cred.provider_id);

                console.log(`[AIEngine] 🚀 Executing ${taskType} (${taskDef.tier}) via ${cred.provider_id}:${model}`);

                // EXECUTE
                const response = await provider.generateResponse(
                    messages as any,
                    model,
                    apiKey,
                    {
                        temperature: taskDef.temperature,
                        maxTokens: taskDef.maxTokens,
                        response_format: taskDef.jsonMode ? { type: 'json_object' } : undefined
                    }
                );

                // LOG UNIFIED METERING (usage_events)
                logUsageEvent(organizationId, cred.provider_id, response, taskType).catch(console.error);

                let parsedData;
                if (taskDef.jsonMode) {
                    try {
                        parsedData = JSON.parse(response.content || '{}');
                    } catch (parseErr: any) {
                        console.error(`[AIEngine] JSON Parse Error:`, parseErr.message);
                        throw new Error(`Invalid JSON from AI: ${parseErr.message}`);
                    }
                } else {
                    parsedData = response.content;
                }

                // CACHE RESULT
                await setCachedResponse(organizationId, taskType, payload, parsedData);

                return {
                    success: true,
                    data: parsedData,
                    usage: response.usage,
                    provider: cred.provider_id,
                    model: response.model,
                    context: payload.knowledgeContext
                };

            } catch (error: any) {
                console.warn(`[AIEngine] Provider ${cred.provider_id} failed:`, error.message);
                lastError = error;

                // Auto-Exhaustion
                if (error.code === 'QUOTA_EXCEEDED' || error.message.includes('429')) {
                    markCredentialExhausted(cred.id).catch(console.error);
                }
                
                // Continue to next credential
            }
        }

        throw lastError || new Error('All AI providers failed.');
    }
};

// --- Helpers ---

/**
 * Intelligent Model Router
 * Chooses the best model based on task tier and available provider
 */
function resolveModelForTier(tier: 'cheap' | 'standard' | 'premium', providerId: string): string {
    const mapping: Record<string, Record<string, string>> = {
        cheap: {
            openai: 'gpt-4o-mini',
            groq: 'llama-3.1-8b-instant',
            google: 'gemini-1.5-flash'
        },
        standard: {
            openai: 'gpt-4o-mini',
            groq: 'llama-3.3-70b-versatile',
            google: 'gemini-1.5-flash'
        },
        premium: {
            openai: 'gpt-4o',
            google: 'gemini-1.5-pro',
            groq: 'llama-3.3-70b-versatile'
        }
    };

    return mapping[tier]?.[providerId] || (providerId === 'openai' ? 'gpt-3.5-turbo' : 'default');
}

async function markCredentialExhausted(credId: string) {
    if (credId === 'platform-fallback') return;
    const supabase = await createClient();
    await supabase.from('ai_credentials').update({ status: 'exhausted' }).eq('id', credId);
}

/**
 * Unified Metering System
 * Logs to usage_events for centralized billing/analytics
 */
async function logUsageEvent(orgId: string, providerId: string, response: any, taskType: string) {
    try {
        const supabase = await createClient();
        const totalTokens = response.usage?.total_tokens || 0;

        await supabase.from('usage_events').insert({
            organization_id: orgId,
            engine: 'ai',
            action: taskType,
            quantity: totalTokens > 0 ? totalTokens : 1, // Minimum 1 unit if tokens not tracked
            metadata: {
                provider: providerId,
                model: response.model,
                input_tokens: response.usage?.input_tokens,
                output_tokens: response.usage?.output_tokens
            }
        });
    } catch (e) {
        console.error('[AI-Engine] Failed to log usage event:', e);
    }
}

/**
 * Internal helper to fetch credentials without masking (System Use Only)
 */
async function fetchInternalCredentials(organizationId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('ai_credentials')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('priority', { ascending: true });

    if (error) {
        logAIEngineError('[AIEngine] Error fetching internal credentials:', error);
        return [];
    }
    return data || [];
}
