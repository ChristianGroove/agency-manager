/**
 * High-Throughput Message Queue for Meta WhatsApp API
 * 
 * Uses BullMQ + Redis to achieve 1,000 messages per second throughput
 * with proper error handling, retries, and rate limiting.
 */

import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { getRedisConfig } from './redis-config';
import { metaRateLimiter } from './rate-limiter';
import { metaTelemetry } from './meta-telemetry';
import { metaErrorHandler } from './meta-error-handler';

const META_API_VERSION = 'v24.0';

export interface SendMessageJob {
    wabaId: string;
    phoneNumberId: string;
    accessToken: string;
    to: string;
    message: {
        type: 'text' | 'template' | 'interactive' | 'image' | 'video' | 'document';
        content: any;
    };
    metadata?: Record<string, any>;
}

export interface SendMessageResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

export class MetaMessageQueue {
    private queue: Queue<SendMessageJob>;
    private worker?: Worker<SendMessageJob, SendMessageResult>;
    private queueEvents?: QueueEvents;
    private isInitialized = false;

    constructor() {
        const redisConfig = getRedisConfig();

        // Create queue with high throughput configuration
        this.queue = new Queue<SendMessageJob>('meta-messages', {
            connection: redisConfig,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: {
                    age: 3600, // Keep completed jobs for 1 hour
                    count: 10000,
                },
                removeOnFail: {
                    age: 86400, // Keep failed jobs for 24 hours
                },
            },
        });

        console.log('[MetaMessageQueue] Queue initialized');
    }

    /**
     * Initialize worker to process messages
     */
    async initializeWorker(concurrency: number = 10): Promise<void> {
        if (this.isInitialized) {
            console.warn('[MetaMessageQueue] Worker already initialized');
            return;
        }

        const redisConfig = getRedisConfig();

        this.worker = new Worker<SendMessageJob, SendMessageResult>(
            'meta-messages',
            async (job: Job<SendMessageJob>) => {
                return await this.processMessage(job);
            },
            {
                connection: redisConfig,
                concurrency, // Process multiple jobs in parallel
            }
        );

        // Queue events for monitoring
        this.queueEvents = new QueueEvents('meta-messages', {
            connection: redisConfig,
        });

        // Event listeners
        this.worker.on('completed', (job) => {
            console.log(`[MetaMessageQueue] ✅ Job ${job.id} completed`);
        });

        this.worker.on('failed', (job, error) => {
            console.error(`[MetaMessageQueue] ❌ Job ${job?.id} failed:`, error);
        });

        this.queueEvents.on('stalled', ({ jobId }) => {
            console.warn(`[MetaMessageQueue] ⚠️  Job ${jobId} stalled`);
        });

        this.isInitialized = true;
        console.log(`[MetaMessageQueue] Worker initialized with concurrency: ${concurrency}`);
    }

    /**
     * Add message to queue for sending
     */
    async enqueueMessage(data: SendMessageJob, priority?: number): Promise<string> {
        const job = await this.queue.add(
            'send-message',
            data,
            {
                priority: priority || 0,
                jobId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            }
        );

        return job.id!;
    }

    /**
     * Process a message job
     */
    private async processMessage(job: Job<SendMessageJob>): Promise<SendMessageResult> {
        const startTime = Date.now();
        const { wabaId, phoneNumberId, accessToken, to, message } = job.data;

        try {
            // Apply rate limiting
            await metaRateLimiter.waitForClearance(wabaId);

            // Build API request
            const url = `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`;

            const payload = this.buildPayload(to, message);

            console.log(`[MetaMessageQueue] Sending message via ${url}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const latency = Date.now() - startTime;
            const responseData = await response.json();

            // Record telemetry
            metaTelemetry.recordCall({
                endpoint: `/messages`,
                method: 'POST',
                statusCode: response.status,
                latencyMs: latency,
                success: response.ok,
                errorCode: responseData.error?.code,
                timestamp: new Date(),
                wabaId,
            });

            if (!response.ok) {
                // Handle error with error handler
                const handling = await metaErrorHandler.handleError(
                    responseData,
                    'send_message',
                    job.id
                );

                if (handling.shouldRetry) {
                    // BullMQ will handle the retry
                    throw new Error(responseData.error?.message || 'API Error');
                }

                return {
                    success: false,
                    error: metaErrorHandler.getUserMessage(responseData),
                };
            }

            return {
                success: true,
                messageId: responseData.messages?.[0]?.id,
            };

        } catch (error: any) {
            console.error('[MetaMessageQueue] Exception:', error);

            // Record failed telemetry
            metaTelemetry.recordCall({
                endpoint: '/messages',
                method: 'POST',
                statusCode: 0,
                latencyMs: Date.now() - startTime,
                success: false,
                timestamp: new Date(),
                wabaId,
            });

            throw error; // Let BullMQ handle retries
        }
    }

    /**
     * Build API payload based on message type
     */
    private buildPayload(to: string, message: SendMessageJob['message']): any {
        const base = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
        };

        switch (message.type) {
            case 'text':
                return {
                    ...base,
                    type: 'text',
                    text: { body: message.content.text },
                };

            case 'template':
                return {
                    ...base,
                    type: 'template',
                    template: message.content,
                };

            case 'interactive':
                return {
                    ...base,
                    type: 'interactive',
                    interactive: message.content,
                };

            case 'image':
            case 'video':
            case 'document':
                return {
                    ...base,
                    type: message.type,
                    [message.type]: message.content,
                };

            default:
                throw new Error(`Unsupported message type: ${message.type}`);
        }
    }

    /**
     * Get queue metrics
     */
    async getMetrics(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
    }> {
        const [waiting, active, completed, failed] = await Promise.all([
            this.queue.getWaitingCount(),
            this.queue.getActiveCount(),
            this.queue.getCompletedCount(),
            this.queue.getFailedCount(),
        ]);

        return { waiting, active, completed, failed };
    }

    /**
     * Pause queue processing
     */
    async pause(): Promise<void> {
        await this.queue.pause();
        console.log('[MetaMessageQueue] Queue paused');
    }

    /**
     * Resume queue processing
     */
    async resume(): Promise<void> {
        await this.queue.resume();
        console.log('[MetaMessageQueue] Queue resumed');
    }

    /**
     * Close queue and worker
     */
    async close(): Promise<void> {
        await this.worker?.close();
        await this.queueEvents?.close();
        await this.queue.close();
        console.log('[MetaMessageQueue] Queue closed');
    }
}

// Singleton instance
export const metaMessageQueue = new MetaMessageQueue();
