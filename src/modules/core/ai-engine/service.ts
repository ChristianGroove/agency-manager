import { createClient } from '@/lib/supabase-server';
import { getAICredentials } from './actions';
import { AIRegistry } from './registry';
import { AIEngineResponse } from './types';
import { getTaskDefinition } from './tasks/registry';
import { decrypt } from './encryption';
import { getCachedResponse, setCachedResponse } from './cache';

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

        // 2. CHECK CACHE FIRST (Cost Optimization)
        if (!bypassCache) {
            const cached = getCachedResponse(taskType, payload);
            if (cached) {
                return { success: true, data: cached, provider: 'cache' };
            }
        }

        // 3. Resolve Credentials (Active & Priority)
        const credentials = await getAICredentials(organizationId);

        // Filter active and sort by priority (1 is highest)
        const activeCredentials = credentials
            .filter(c => c.status === 'active')
            .sort((a, b) => a.priority - b.priority);

        if (activeCredentials.length === 0) {
            throw new Error('No active AI credentials found for this organization.');
        }

        // 4. Construct Sealed Prompt
        const systemMessage = taskDef.systemPrompt(payload);
        const userMessage = taskDef.userPrompt(payload);

        const messages = [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage }
        ];

        // 5. Execute with Fallback
        let lastError: Error | null = null;

        for (const cred of activeCredentials) {
            try {
                const provider = AIRegistry.getProvider(cred.provider_id);
                if (!provider) {
                    console.warn(`[AIEngine] Provider ${cred.provider_id} not found in registry.`);
                    continue;
                }

                const apiKey = decrypt(cred.api_key_encrypted);

                // EXECUTE
                const response = await provider.generateResponse(
                    messages as any,
                    provider.models?.[0] || 'gpt-3.5-turbo', // Default to first model or specific map
                    apiKey,
                    {
                        temperature: taskDef.temperature,
                        maxTokens: taskDef.maxTokens,
                        response_format: taskDef.jsonMode ? { type: 'json_object' } : undefined
                    }
                );

                // LOG USAGE (Async - Fire & Forget)
                logUsage(organizationId, cred.id, cred.provider_id, response, taskType).catch(console.error);

                const parsedData = taskDef.jsonMode ? JSON.parse(response.content || '{}') : response.content;

                // CACHE RESULT for future requests
                setCachedResponse(taskType, payload, parsedData);

                return {
                    success: true,
                    data: parsedData,
                    usage: response.usage,
                    provider: cred.provider_id
                };

            } catch (error: any) {
                console.warn(`[AIEngine] Credential ${cred.id} failed:`, error.message);
                lastError = error;

                // If quota error, mark exhausted
                if (error.code === 'QUOTA_EXCEEDED' || error.message.includes('429')) {
                    markCredentialExhausted(cred.id).catch(console.error);
                }
            }
        }

        throw lastError || new Error('All AI credentials failed.');
    }
}

// --- Helpers ---

async function markCredentialExhausted(credId: string) {
    const supabase = await createClient();
    await supabase.from('ai_credentials').update({ status: 'exhausted' }).eq('id', credId);
}

async function logUsage(orgId: string, credId: string, providerId: string, response: any, taskType: string) {
    try {
        const supabase = await createClient();
        await supabase.from('ai_usage_logs').insert({
            organization_id: orgId,
            credential_id: credId,
            provider_id: providerId,
            model: response.model,
            task_type: taskType,
            input_tokens: response.usage?.input_tokens || 0,
            output_tokens: response.usage?.output_tokens || 0,
            status: 'success'
        });
    } catch (e) {
        console.error('[AI-Engine] Failed to log usage:', e);
    }
}
