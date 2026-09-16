import { supabaseAdmin } from '@/modules/core/database/supabase-admin';
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

        // 2.5. AI GOVERNANCE & KILL-SWITCH CHECK
        let aiMode: 'saas' | 'byok' | 'disabled' = 'byok';
        let aiStatus: 'active' | 'suspended' = 'active';

        try {
            const { data: orgData } = await supabaseAdmin
                .from('organizations')
                .select('status, rate_limit_config')
                .eq('id', organizationId)
                .maybeSingle();

            const config = (orgData?.rate_limit_config as Record<string, any>) || {};
            aiMode = config.ai_mode || 'byok';
            aiStatus = config.ai_status || 'active';

            if (orgData?.status === 'suspended' || aiStatus === 'suspended' || aiMode === 'disabled') {
                throw new Error('Los servicios de Inteligencia Artificial están desactivados para esta organización.');
            }
        } catch (govErr: any) {
            if (govErr.message?.includes('desactivados')) throw govErr;
            console.warn('[AIEngine] Governance check warning:', govErr);
        }

        // Enforce Usage Limits for SaaS Managed Mode
        if (aiMode === 'saas') {
            try {
                const { assertUsageAllowed } = await import('@/modules/infrastructure/usage/usage-limiter');
                await assertUsageAllowed({ organizationId, engine: 'ai' });
            } catch (limitErr: any) {
                console.warn(`[AIEngine] Usage limit blocked for org ${organizationId}:`, limitErr.message);
                throw limitErr;
            }
        }

        // 3. Resolve Credentials (Active & Priority)
        const credentials = await fetchInternalCredentials(organizationId);

        // Filter active and sort by priority (1 is highest)
        const activeCredentials = credentials
            .filter(c => c.status === 'active')
            .sort((a, b) => a.priority - b.priority);

        if (aiMode === 'byok') {
            if (activeCredentials.length === 0) {
                throw new Error('Claves Propias requerido: La organización debe configurar sus propias API Keys en Integraciones.');
            }
        } else {
            // In SaaS mode: if tenant has no active credentials, check Master Key Vault (DB or Env)
            if (activeCredentials.length === 0) {
                // Check DB Master Vault in ai_settings
                try {
                    const { data: globalSettings } = await supabaseAdmin
                        .from('ai_settings')
                        .select('model_overrides')
                        .eq('scope_type', 'global')
                        .eq('scope_id', 'system')
                        .maybeSingle();

                    const masterKeysRaw = (globalSettings?.model_overrides as any)?.master_keys;

                    if (Array.isArray(masterKeysRaw)) {
                        for (const mk of masterKeysRaw) {
                            if (mk && mk.status !== 'inactive' && mk.apiKeyEncrypted) {
                                activeCredentials.push({
                                    id: mk.id || `master-vault-${mk.providerId}`,
                                    organization_id: organizationId,
                                    provider_id: mk.providerId,
                                    api_key_encrypted: mk.apiKeyEncrypted,
                                    priority: mk.priority || 50,
                                    status: 'active',
                                    created_at: mk.createdAt || new Date().toISOString()
                                });
                            }
                        }
                    } else if (masterKeysRaw && typeof masterKeysRaw === 'object') {
                        for (const [providerId, encryptedVal] of Object.entries(masterKeysRaw)) {
                            if (encryptedVal) {
                                activeCredentials.push({
                                    id: `master-vault-${providerId}`,
                                    organization_id: organizationId,
                                    provider_id: providerId,
                                    api_key_encrypted: encryptedVal as string,
                                    priority: 50,
                                    status: 'active',
                                    created_at: new Date().toISOString()
                                });
                            }
                        }
                    }
                } catch (vaultErr) {
                    console.warn('[AIEngine] Error reading master vault:', vaultErr);
                }

                // Env Var Fallbacks
                const envFallbacks: Array<{ provider: string; keyVal?: string }> = [
                    { provider: 'openai', keyVal: process.env.OPENAI_API_KEY },
                    { provider: 'anthropic', keyVal: process.env.ANTHROPIC_API_KEY },
                    { provider: 'google', keyVal: process.env.GEMINI_API_KEY },
                    { provider: 'groq', keyVal: process.env.GROQ_API_KEY },
                ];

                for (const fb of envFallbacks) {
                    if (fb.keyVal && fb.keyVal.length > 5 && !activeCredentials.some(c => c.provider_id === fb.provider)) {
                        activeCredentials.push({
                            id: `platform-fallback-${fb.provider}`,
                            organization_id: organizationId,
                            provider_id: fb.provider,
                            api_key_encrypted: fb.keyVal,
                            priority: 99,
                            status: 'active',
                            created_at: new Date().toISOString()
                        });
                    }
                }
            }
        }

        if (activeCredentials.length === 0) {
            throw new Error('No se encontraron credenciales activas de IA para procesar la solicitud.');
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
            google: 'gemini-1.5-flash',
            anthropic: 'claude-3-haiku-20240307'
        },
        standard: {
            openai: 'gpt-4o-mini',
            groq: 'llama-3.3-70b-versatile',
            google: 'gemini-1.5-flash',
            anthropic: 'claude-3-5-sonnet-20240620'
        },
        premium: {
            openai: 'gpt-4o',
            google: 'gemini-1.5-pro',
            groq: 'llama-3.3-70b-versatile',
            anthropic: 'claude-3-5-sonnet-20240620'
        }
    };

    return mapping[tier]?.[providerId] || (providerId === 'openai' ? 'gpt-3.5-turbo' : 'default');
}

async function markCredentialExhausted(credId: string) {
    if (credId === 'platform-fallback') return;
    const supabase = supabaseAdmin;
    await supabase.from('ai_credentials').update({ status: 'exhausted' }).eq('id', credId);
}

/**
 * Unified Metering System
 * Logs to usage_events for centralized billing/analytics
 */
async function logUsageEvent(orgId: string, providerId: string, response: any, taskType: string) {
    try {
        const supabase = supabaseAdmin;
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
    const supabase = supabaseAdmin;
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
