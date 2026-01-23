/**
 * WABA Subscription Manager
 * 
 * Critical component to avoid "Shadow Delivery" failures.
 * Automatically subscribes WABAs to the app's webhooks.
 * 
 * Reference: https://developers.facebook.com/docs/whatsapp/embedded-signup/webhooks
 */

import { metaErrorHandler, MetaError } from './meta-error-handler';

const META_API_VERSION = 'v24.0';
const META_GRAPH_URL = 'https://graph.facebook.com';

export interface SubscriptionResult {
    success: boolean;
    wabaId: string;
    error?: string;
    timestamp: Date;
}

export class WABASubscriptionManager {
    /**
     * Subscribe a WABA to app webhooks
     * 
     * CRITICAL: This must be called after WABA connection to ensure webhooks are delivered.
     * Without this, webhooks may pass Meta's test but fail silently in production ("Shadow Delivery").
     * 
     * @param wabaId - WhatsApp Business Account ID
     * @param accessToken - Access token with whatsapp_business_management permission
     */
    async subscribeWABA(
        wabaId: string,
        accessToken: string
    ): Promise<SubscriptionResult> {
        const timestamp = new Date();

        try {
            console.log(`[WABASubscription] Subscribing WABA ${wabaId} to app webhooks...`);

            const url = `${META_GRAPH_URL}/${META_API_VERSION}/${wabaId}/subscribed_apps`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                const error = data as MetaError;
                console.error('[WABASubscription] Subscription failed:', error);

                // Use error handler for retry logic
                const handling = await metaErrorHandler.handleError(
                    error,
                    'waba_subscription',
                    `waba_${wabaId}`
                );

                if (handling.shouldRetry && handling.delayMs) {
                    console.log(`[WABASubscription] Retrying after ${handling.delayMs}ms...`);
                    await this.sleep(handling.delayMs);
                    return this.subscribeWABA(wabaId, accessToken);
                }

                return {
                    success: false,
                    wabaId,
                    error: metaErrorHandler.getUserMessage(error),
                    timestamp,
                };
            }

            console.log(`[WABASubscription] ✅ Successfully subscribed WABA ${wabaId}`);
            console.log('[WABASubscription] Response:', data);

            return {
                success: true,
                wabaId,
                timestamp,
            };

        } catch (error: any) {
            console.error('[WABASubscription] Exception during subscription:', error);

            return {
                success: false,
                wabaId,
                error: error.message || 'Unknown error during WABA subscription',
                timestamp,
            };
        }
    }

    /**
     * Verify if WABA is currently subscribed
     */
    async verifySubscription(
        wabaId: string,
        accessToken: string
    ): Promise<boolean> {
        try {
            const url = `${META_GRAPH_URL}/${META_API_VERSION}/${wabaId}/subscribed_apps`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                console.error('[WABASubscription] Verification failed:', await response.text());
                return false;
            }

            const data = await response.json();

            // Check if our app is in the subscribed list
            const isSubscribed = data.data && data.data.length > 0;

            console.log(`[WABASubscription] WABA ${wabaId} subscription status: ${isSubscribed}`);

            return isSubscribed;

        } catch (error) {
            console.error('[WABASubscription] Exception during verification:', error);
            return false;
        }
    }

    /**
     * Unsubscribe WABA from app webhooks
     * (Usually not needed, but provided for completeness)
     */
    async unsubscribeWABA(
        wabaId: string,
        accessToken: string
    ): Promise<SubscriptionResult> {
        const timestamp = new Date();

        try {
            const url = `${META_GRAPH_URL}/${META_API_VERSION}/${wabaId}/subscribed_apps`;

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                const error = await response.json() as MetaError;
                return {
                    success: false,
                    wabaId,
                    error: metaErrorHandler.getUserMessage(error),
                    timestamp,
                };
            }

            console.log(`[WABASubscription] ✅ Successfully unsubscribed WABA ${wabaId}`);

            return {
                success: true,
                wabaId,
                timestamp,
            };

        } catch (error: any) {
            return {
                success: false,
                wabaId,
                error: error.message,
                timestamp,
            };
        }
    }

    /**
     * Batch subscribe multiple WABAs
     */
    async batchSubscribe(
        wabas: Array<{ wabaId: string; accessToken: string }>
    ): Promise<SubscriptionResult[]> {
        console.log(`[WABASubscription] Batch subscribing ${wabas.length} WABAs...`);

        const results = await Promise.allSettled(
            wabas.map(({ wabaId, accessToken }) =>
                this.subscribeWABA(wabaId, accessToken)
            )
        );

        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                return {
                    success: false,
                    wabaId: wabas[index].wabaId,
                    error: result.reason?.message || 'Unknown error',
                    timestamp: new Date(),
                };
            }
        });
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton instance
export const wabaSubscriptionManager = new WABASubscriptionManager();
