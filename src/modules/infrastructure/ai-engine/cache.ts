// AI Response Cache (Persistent & Organization-Aware)

import crypto from 'crypto';
import { createClient } from "@/modules/core/database/supabase-server";

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes default
const EXTENDED_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for help/docs

/**
 * Task-specific TTL mapping
 */
const TASK_TTLS: Record<string, number> = {
    'help-assistant': EXTENDED_TTL_MS,
    'knowledge.extract_faq_v1': EXTENDED_TTL_MS,
};

/**
 * Hash the payload to create a unique identifier
 */
function hashPayload(payload: any): string {
    const str = JSON.stringify(payload);
    return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
}

/**
 * Get cached response from Database (ai_cache table)
 */
export async function getCachedResponse(organizationId: string, taskType: string, payload: any): Promise<any | null> {
    try {
        const payloadHash = hashPayload(payload);

        const { data, error } = await (await createClient())
            .from('ai_cache')
            .select('response_data, expires_at')
            .eq('organization_id', organizationId)
            .eq('task_type', taskType)
            .eq('payload_hash', payloadHash)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (error || !data) return null;

        console.log(`[AICache] 🚀 DB Hit for ${organizationId}:${taskType}`);
        return data.response_data;
    } catch (e) {
        console.error("[AICache] Error fetching from DB:", e);
        return null;
    }
}

/**
 * Store response in Database (ai_cache table)
 */
export async function setCachedResponse(organizationId: string, taskType: string, payload: any, data: any): Promise<void> {
    try {
        const payloadHash = hashPayload(payload);
        const ttl = TASK_TTLS[taskType] || DEFAULT_TTL_MS;
        const expiresAt = new Date(Date.now() + ttl).toISOString();

        await (await createClient())
            .from('ai_cache')
            .upsert({
                organization_id: organizationId,
                task_type: taskType,
                payload_hash: payloadHash,
                response_data: data,
                expires_at: expiresAt
            }, { onConflict: 'organization_id, task_type, payload_hash' });

        console.log(`[AICache] 💾 DB Set for ${organizationId}:${taskType} (TTL: ${ttl / 1000}s)`);
    } catch (e) {
        console.error("[AICache] Error saving to DB:", e);
    }
}

/**
 * Clear cache for a specific task type (Admin only)
 */
export async function clearCacheForTask(taskType: string): Promise<void> {
    await (await createClient())
        .from('ai_cache')
        .delete()
        .eq('task_type', taskType);
}
