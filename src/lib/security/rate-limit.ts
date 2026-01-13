/**
 * Token Bucket Rate Limiter with Per-Organization Support
 * 
 * Supports:
 * - IP-based rate limiting (default)
 * - Organization-based rate limiting (stricter, from DB config)
 * 
 * In Production: Replace storage with @upstash/ratelimit using Redis.
 * In Development: This works in-memory (per process).
 */

export interface RateLimitConfig {
    intervalMs: number;
    maxTokens: number;
}

export interface OrgRateLimitConfig {
    requests_per_minute?: number;
    ai_requests_per_day?: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
    intervalMs: 60 * 1000, // 1 Minute
    maxTokens: 500         // 500 requests per minute
};

// Simple In-Memory Store: Key -> { tokens: number, lastRefill: number }
const storage = new Map<string, { tokens: number, lastRefill: number }>();

/**
 * Check rate limit for a given identifier (IP or custom key)
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig = DEFAULT_CONFIG
): { success: boolean, remaining: number } {
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
 * Check rate limit for an organization using its custom config
 * Falls back to IP-based limiting if no org config exists
 */
export function checkOrgRateLimit(
    organizationId: string,
    orgConfig: OrgRateLimitConfig | null,
    identifier: string
): { success: boolean, remaining: number, limitType: 'org' | 'ip' } {
    if (orgConfig && orgConfig.requests_per_minute) {
        // Use organization-specific limits
        const config: RateLimitConfig = {
            intervalMs: 60 * 1000,
            maxTokens: orgConfig.requests_per_minute
        };
        const result = checkRateLimit(`org:${organizationId}`, config);
        return { ...result, limitType: 'org' };
    }

    // Fallback to IP-based limiting
    const result = checkRateLimit(identifier, DEFAULT_CONFIG);
    return { ...result, limitType: 'ip' };
}

/**
 * Check AI-specific rate limit (daily limit per organization)
 */
export function checkAIRateLimit(
    organizationId: string,
    orgConfig: OrgRateLimitConfig | null
): { success: boolean, remaining: number } {
    const dailyLimit = orgConfig?.ai_requests_per_day || 100; // Default 100/day

    const config: RateLimitConfig = {
        intervalMs: 24 * 60 * 60 * 1000, // 24 hours
        maxTokens: dailyLimit
    };

    return checkRateLimit(`ai:${organizationId}`, config);
}

/**
 * Get current rate limit status without consuming a token
 */
export function getRateLimitStatus(identifier: string): { tokens: number, isLimited: boolean } {
    const bucket = storage.get(identifier);
    if (!bucket) {
        return { tokens: DEFAULT_CONFIG.maxTokens, isLimited: false };
    }
    return { tokens: bucket.tokens, isLimited: bucket.tokens === 0 };
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

