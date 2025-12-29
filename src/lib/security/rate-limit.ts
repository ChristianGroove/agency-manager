/**
 * Simple Token Bucket Rate Limiter
 * 
 * In Production: Replace this with @upstash/ratelimit using Redis.
 * In Development: This works in-memory (per process).
 */

interface RateLimitConfig {
    intervalMs: number;
    maxTokens: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
    intervalMs: 60 * 1000, // 1 Minute
    maxTokens: 500         // 500 requests per minute
};

// Simple In-Memory Store: IP -> { tokens: number, lastRefill: number }
const storage = new Map<string, { tokens: number, lastRefill: number }>();

export function checkRateLimit(identifier: string, config: RateLimitConfig = DEFAULT_CONFIG): { success: boolean, remaining: number } {
    const now = Date.now();
    const key = identifier || 'anonymous';

    let bucket = storage.get(key);

    if (!bucket) {
        bucket = { tokens: config.maxTokens, lastRefill: now };
        storage.set(key, bucket);
    }

    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(timePassed * (config.maxTokens / config.intervalMs));

    if (tokensToAdd > 0) {
        bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
    }

    // Consume token
    if (bucket.tokens > 0) {
        bucket.tokens--;
        return { success: true, remaining: bucket.tokens };
    } else {
        return { success: false, remaining: 0 };
    }
}

/**
 * Cleanup old keys to prevent memory leaks (runs occasionally)
 */
if (Math.random() > 0.95) {
    const now = Date.now();
    for (const [key, bucket] of storage.entries()) {
        if (now - bucket.lastRefill > 60 * 60 * 1000) { // 1 hour inactive
            storage.delete(key);
        }
    }
}
