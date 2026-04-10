/**
 * Redis Configuration for Message Queue
 * 
 * Required for achieving 1,000 mps throughput with BullMQ.
 */

import type { RedisOptions } from 'ioredis';

/**
 * Get Redis connection configuration from environment
 */
export function getRedisConfig(): RedisOptions {
    // Production: Use environment variables
    if (process.env.REDIS_URL) {
        // Parse Redis URL if provided
        const url = new URL(process.env.REDIS_URL);
        return {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password || undefined,
            db: parseInt(url.pathname?.slice(1) || '0'),
        };
    }

    // Development: Use localhost or custom config
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),

        // Optimizations for high throughput
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        enableOfflineQueue: true,

        // Connection pool for better performance
        lazyConnect: false,
        keepAlive: 30000, // 30 seconds
    };
}

/**
 * Validate Redis connection
 */
export async function validateRedisConnection(
    config: RedisOptions = getRedisConfig()
): Promise<boolean> {
    try {
        const Redis = (await import('ioredis')).default;
        const redis = new Redis(config);

        await redis.ping();
        await redis.quit();

        console.log('[Redis] ✅ Connection validated');
        return true;
    } catch (error) {
        console.error('[Redis] ❌ Connection failed:', error);
        return false;
    }
}
