// AI Response Cache (In-Memory)

import crypto from 'crypto';

// Simple in-memory cache (swap to Redis for production)
const responseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a deterministic hash for cache key
 */
function generateCacheKey(taskType: string, payloadHash: string): string {
    return `ai:${taskType}:${payloadHash}`;
}

/**
 * Hash the payload to create a unique identifier
 */
function hashPayload(payload: any): string {
    const str = JSON.stringify(payload);
    return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
}

/**
 * Get cached response if valid
 */
export function getCachedResponse(taskType: string, payload: any): any | null {
    const key = generateCacheKey(taskType, hashPayload(payload));
    const cached = responseCache.get(key);

    if (!cached) return null;

    // Check TTL
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
        responseCache.delete(key);
        return null;
    }

    console.log(`[AICache] HIT for ${taskType}`);
    return cached.data;
}

/**
 * Store response in cache
 */
export function setCachedResponse(taskType: string, payload: any, data: any): void {
    const key = generateCacheKey(taskType, hashPayload(payload));
    responseCache.set(key, { data, timestamp: Date.now() });
    console.log(`[AICache] SET for ${taskType}`);
}

/**
 * Clear cache for a specific task type (useful after config changes)
 */
export function clearCacheForTask(taskType: string): void {
    for (const key of responseCache.keys()) {
        if (key.startsWith(`ai:${taskType}:`)) {
            responseCache.delete(key);
        }
    }
}
