
/**
 * RATE LIMITER
 * Simple in-memory rate limiter per Space/Day.
 */

export class RateLimiter {
    private limits: Map<string, number> = new Map();
    private MAX_REQUESTS_PER_DAY = 50;

    private getKey(spaceId: string): string {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return `${spaceId}:${date}`;
    }

    checkLimit(spaceId: string): boolean {
        const key = this.getKey(spaceId);
        const count = this.limits.get(key) || 0;

        if (count >= this.MAX_REQUESTS_PER_DAY) {
            return false;
        }

        this.limits.set(key, count + 1);
        return true;
    }

    getRemaining(spaceId: string): number {
        const key = this.getKey(spaceId);
        const count = this.limits.get(key) || 0;
        return Math.max(0, this.MAX_REQUESTS_PER_DAY - count);
    }

    // For testing
    reset() {
        this.limits.clear();
    }
}

export const rateLimiter = new RateLimiter();
