/**
 * Rate Limiter for Meta Graph API
 * 
 * Implements Token Bucket algorithm to ensure we don't exceed
 * Meta's rate limits while maximizing throughput (target: 1,000 mps).
 */

export interface RateLimiterConfig {
    maxTokens: number; // Maximum messages per second
    refillRate: number; // Tokens added per second
    burstSize?: number; // Allow temporary bursts
}

export class TokenBucketRateLimiter {
    private tokens: number;
    private readonly maxTokens: number;
    private readonly refillRate: number;
    private lastRefill: number;

    constructor(config: RateLimiterConfig) {
        this.maxTokens = config.maxTokens;
        this.refillRate = config.refillRate;
        this.tokens = this.maxTokens;
        this.lastRefill = Date.now();
    }

    /**
     * Try to consume a token for sending a message
     * Returns true if allowed, false if rate limit exceeded
     */
    async tryConsume(tokensNeeded: number = 1): Promise<boolean> {
        this.refillTokens();

        if (this.tokens >= tokensNeeded) {
            this.tokens -= tokensNeeded;
            return true;
        }

        return false;
    }

    /**
     * Wait until token becomes available
     */
    async waitForToken(tokensNeeded: number = 1): Promise<void> {
        while (!(await this.tryConsume(tokensNeeded))) {
            const waitTime = this.calculateWaitTime(tokensNeeded);
            await this.sleep(waitTime);
        }
    }

    /**
     * Refill tokens based on elapsed time
     */
    private refillTokens(): void {
        const now = Date.now();
        const timeSinceLastRefill = (now - this.lastRefill) / 1000; // seconds
        const tokensToAdd = timeSinceLastRefill * this.refillRate;

        this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }

    /**
     * Calculate how long to wait for tokens to be available
     */
    private calculateWaitTime(tokensNeeded: number): number {
        const tokensDeficit = tokensNeeded - this.tokens;
        if (tokensDeficit <= 0) return 0;

        const secondsNeeded = tokensDeficit / this.refillRate;
        return Math.ceil(secondsNeeded * 1000); // Convert to milliseconds
    }

    /**
     * Get current token count
     */
    getAvailableTokens(): number {
        this.refillTokens();
        return this.tokens;
    }

    /**
     * Helper sleep function
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Multi-tier rate limiter for different WABAs
 * Meta has different rate limits per WABA
 */
export class MetaRateLimiter {
    private limiters: Map<string, TokenBucketRateLimiter> = new Map();
    private readonly defaultConfig: RateLimiterConfig = {
        maxTokens: 1000, // 1,000 messages per second
        refillRate: 1000, // Refill 1,000 tokens per second
    };

    /**
     * Get or create rate limiter for a specific WABA
     */
    private getLimiter(wabaId: string): TokenBucketRateLimiter {
        if (!this.limiters.has(wabaId)) {
            this.limiters.set(wabaId, new TokenBucketRateLimiter(this.defaultConfig));
        }
        return this.limiters.get(wabaId)!;
    }

    /**
     * Try to send a message through rate limiter
     */
    async tryConsume(wabaId: string, tokensNeeded: number = 1): Promise<boolean> {
        const limiter = this.getLimiter(wabaId);
        return limiter.tryConsume(tokensNeeded);
    }

    /**
     * Wait for rate limit clearance
     */
    async waitForClearance(wabaId: string, tokensNeeded: number = 1): Promise<void> {
        const limiter = this.getLimiter(wabaId);
        await limiter.waitForToken(tokensNeeded);
    }

    /**
     * Get current throughput metrics
     */
    getMetrics(wabaId: string): {
        availableTokens: number;
        maxTokens: number;
        utilizationPercent: number;
    } {
        const limiter = this.getLimiter(wabaId);
        const availableTokens = limiter.getAvailableTokens();
        const maxTokens = this.defaultConfig.maxTokens;

        return {
            availableTokens,
            maxTokens,
            utilizationPercent: ((maxTokens - availableTokens) / maxTokens) * 100,
        };
    }

    /**
     * Configure custom rate limit for specific WABA
     * Useful if different WABAs have different tier limits
     */
    configureWaba(wabaId: string, config: RateLimiterConfig): void {
        this.limiters.set(wabaId, new TokenBucketRateLimiter(config));
    }
}

// Singleton instance
export const metaRateLimiter = new MetaRateLimiter();
