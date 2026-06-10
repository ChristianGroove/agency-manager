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
const PUBLIC_WABA_SUBSCRIPTION_ERROR = 'WABA subscription failed';

export interface SubscriptionResult {
    success: boolean;
    wabaId: string;
    error?: string;
    timestamp: Date;
}

function isDeployedRuntime(): boolean {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV;
}

function summarizeWABAError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name };
    }

    if (error && typeof error === 'object') {
        const payload = error as Record<string, any>;
        const graphError = payload.error || payload;
        return {
            type: typeof error,
            code: graphError.code,
            subcode: graphError.error_subcode || graphError.subcode,
            metaType: graphError.type,
            traceId: graphError.fbtrace_id,
        };
    }

    return { type: typeof error };
}

function logWABAError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error);
        return;
    }

    console.error(label, summarizeWABAError(error));
}

function logWABAResponse(label: string, data: unknown) {
    if (!isDeployedRuntime()) {
        console.log(label, data);
        return;
    }

    const payload = data && typeof data === 'object' ? data as Record<string, any> : {};
    console.log(label, {
        success: typeof payload.success === 'boolean' ? payload.success : undefined,
        hasData: Array.isArray(payload.data) ? payload.data.length > 0 : undefined,
    });
}

function publicSubscriptionError(error: unknown, fallback: string = PUBLIC_WABA_SUBSCRIPTION_ERROR) {
    if (isDeployedRuntime()) {
        return fallback;
    }

    return error instanceof Error && error.message
        ? error.message
        : fallback;
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
                body: JSON.stringify({
                    subscribed_fields: ['messages', 'calls', 'automatic_events', 'smb_message_echoes']
                })
            });

            const data = await response.json();

            if (!response.ok) {
                const error = data as MetaError;
                logWABAError('[WABASubscription] Subscription failed:', error);

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
            logWABAResponse('[WABASubscription] Response:', data);

            return {
                success: true,
                wabaId,
                timestamp,
            };

        } catch (error: any) {
            logWABAError('[WABASubscription] Exception during subscription:', error);

            return {
                success: false,
                wabaId,
                error: publicSubscriptionError(error),
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
                if (!isDeployedRuntime()) {
                    console.error('[WABASubscription] Verification failed:', await response.text());
                } else {
                    console.error('[WABASubscription] Verification failed:', { status: response.status });
                }
                return false;
            }

            const data = await response.json();

            // Check if our app is in the subscribed list
            const isSubscribed = data.data && data.data.length > 0;

            console.log(`[WABASubscription] WABA ${wabaId} subscription status: ${isSubscribed}`);

            return isSubscribed;

        } catch (error) {
            logWABAError('[WABASubscription] Exception during verification:', error);
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
                logWABAError('[WABASubscription] Unsubscribe failed:', error);
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
            logWABAError('[WABASubscription] Exception during unsubscribe:', error);
            return {
                success: false,
                wabaId,
                error: publicSubscriptionError(error, 'WABA unsubscribe failed'),
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
                    error: publicSubscriptionError(result.reason),
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
