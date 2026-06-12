/**
 * Integration Action: Automatically subscribe WABA to webhooks on connection
 * 
 * This ensures the WABA is subscribed to app webhooks immediately after connection,
 * preventing "Shadow Delivery" failures in production.
 */

import { wabaSubscriptionManager } from '@/modules/infrastructure/meta/services/waba-subscription-manager';
import { supabaseAdmin } from '@/modules/core/database/supabase-admin';
import { decryptObject } from '@/modules/infrastructure/integrations/encryption';

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV;
}

function sanitizeIntegrationHelperLogDetails(details: Record<string, unknown> = {}) {
    const sensitiveKeys = new Set(['connectionId', 'organizationId', 'wabaId']);

    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => {
            if (sensitiveKeys.has(key)) {
                return [`${key}Present`, Boolean(value)];
            }

            return [key, value];
        })
    );
}

function summarizeIntegrationHelperError(error: unknown) {
    return error instanceof Error
        ? { name: error.name }
        : { type: typeof error };
}

function logIntegrationHelperInfo(label: string, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        console.log(label, details);
        return;
    }

    console.log(label, sanitizeIntegrationHelperLogDetails(details));
}

function logIntegrationHelperError(label: string, error: unknown, details?: Record<string, unknown>) {
    if (!isDeployedRuntime()) {
        if (details) console.error(label, error, details);
        else console.error(label, error);
        return;
    }

    console.error(label, {
        ...(details ? sanitizeIntegrationHelperLogDetails(details) : {}),
        detail: summarizeIntegrationHelperError(error),
    });
}

/**
 * Auto-subscribe WABA after successful Meta Business integration
 * 
 * Call this after user completes Meta OAuth flow and WABA is connected.
 */
export async function autoSubscribeWABA(
    connectionId: string
): Promise<void> {
    try {
        logIntegrationHelperInfo('[AutoSubscribe] Processing connection', { connectionId });

        // Get connection details
        const { data: connection, error } = await supabaseAdmin
            .from('integration_connections')
            .select('credentials, metadata')
            .eq('id', connectionId)
            .eq('provider_key', 'meta_business')
            .single();

        if (error || !connection) {
            logIntegrationHelperError('[AutoSubscribe] Connection not found:', error, { connectionId });
            return;
        }

        // Decrypt credentials
        const creds = decryptObject(connection.credentials);
        const accessToken = creds.access_token || creds.accessToken;

        if (!accessToken) {
            logIntegrationHelperError('[AutoSubscribe] No access token found', new Error('missing_access_token'), { connectionId });
            return;
        }

        // Get all WABAs from metadata
        const selectedAssets = connection.metadata?.selected_assets || [];
        const wabas = selectedAssets.filter((asset: any) =>
            asset.type === 'whatsapp'
        );

        if (wabas.length === 0) {
            logIntegrationHelperInfo('[AutoSubscribe] No WABAs found in connection', { connectionId });
            return;
        }

        logIntegrationHelperInfo('[AutoSubscribe] Found WABAs to subscribe', { count: wabas.length });

        // Subscribe all WABAs
        for (const waba of wabas) {
            const wabaId = waba.waba_id || waba.id;

            logIntegrationHelperInfo('[AutoSubscribe] Subscribing WABA', { wabaId });

            const result = await wabaSubscriptionManager.subscribeWABA(
                wabaId,
                accessToken
            );

            if (result.success) {
                logIntegrationHelperInfo('[AutoSubscribe] Successfully subscribed WABA', { wabaId });
            } else {
                logIntegrationHelperError('[AutoSubscribe] Failed to subscribe WABA', result.error, { wabaId });
            }
        }

    } catch (error) {
        logIntegrationHelperError('[AutoSubscribe] Exception:', error, { connectionId });
    }
}

/**
 * Verify all WABAs in organization are subscribed
 * 
 * Run this periodically or on-demand to ensure all WABAs remain subscribed.
 */
export async function verifyAllWABASubscriptions(
    organizationId: string
): Promise<{
    total: number;
    subscribed: number;
    notSubscribed: string[];
}> {
    try {
        // Get all Meta connections for organization
        const { data: connections } = await supabaseAdmin
            .from('integration_connections')
            .select('credentials, metadata')
            .eq('organization_id', organizationId)
            .eq('provider_key', 'meta_business')
            .eq('status', 'active');

        if (!connections || connections.length === 0) {
            return { total: 0, subscribed: 0, notSubscribed: [] };
        }

        let total = 0;
        let subscribed = 0;
        const notSubscribed: string[] = [];

        for (const connection of connections) {
            const creds = decryptObject(connection.credentials);
            const accessToken = creds.access_token || creds.accessToken;
            const wabas = (connection.metadata?.selected_assets || [])
                .filter((a: any) => a.type === 'whatsapp');

            for (const waba of wabas) {
                total++;
                const wabaId = waba.waba_id || waba.id;

                const isSubscribed = await wabaSubscriptionManager.verifySubscription(
                    wabaId,
                    accessToken
                );

                if (isSubscribed) {
                    subscribed++;
                } else {
                    notSubscribed.push(wabaId);
                }
            }
        }

        return { total, subscribed, notSubscribed };

    } catch (error) {
        logIntegrationHelperError('[VerifySubscriptions] Exception:', error, { organizationId });
        return { total: 0, subscribed: 0, notSubscribed: [] };
    }
}
