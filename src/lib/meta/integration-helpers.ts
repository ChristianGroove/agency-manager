/**
 * Integration Action: Automatically subscribe WABA to webhooks on connection
 * 
 * This ensures the WABA is subscribed to app webhooks immediately after connection,
 * preventing "Shadow Delivery" failures in production.
 */

import { wabaSubscriptionManager } from '@/lib/meta/waba-subscription-manager';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { decryptObject } from '@/modules/core/integrations/encryption';

/**
 * Auto-subscribe WABA after successful Meta Business integration
 * 
 * Call this after user completes Meta OAuth flow and WABA is connected.
 */
export async function autoSubscribeWABA(
    connectionId: string
): Promise<void> {
    try {
        console.log(`[AutoSubscribe] Processing connection ${connectionId}...`);

        // Get connection details
        const { data: connection, error } = await supabaseAdmin
            .from('integration_connections')
            .select('credentials, metadata')
            .eq('id', connectionId)
            .eq('provider_key', 'meta_business')
            .single();

        if (error || !connection) {
            console.error('[AutoSubscribe] Connection not found:', error);
            return;
        }

        // Decrypt credentials
        const creds = decryptObject(connection.credentials);
        const accessToken = creds.access_token || creds.accessToken;

        if (!accessToken) {
            console.error('[AutoSubscribe] No access token found');
            return;
        }

        // Get all WABAs from metadata
        const selectedAssets = connection.metadata?.selected_assets || [];
        const wabas = selectedAssets.filter((asset: any) =>
            asset.type === 'whatsapp'
        );

        if (wabas.length === 0) {
            console.log('[AutoSubscribe] No WABAs found in connection');
            return;
        }

        console.log(`[AutoSubscribe] Found ${wabas.length} WABA(s) to subscribe`);

        // Subscribe all WABAs
        for (const waba of wabas) {
            const wabaId = waba.waba_id || waba.id;

            console.log(`[AutoSubscribe] Subscribing WABA ${wabaId}...`);

            const result = await wabaSubscriptionManager.subscribeWABA(
                wabaId,
                accessToken
            );

            if (result.success) {
                console.log(`[AutoSubscribe] ✅ Successfully subscribed WABA ${wabaId}`);
            } else {
                console.error(`[AutoSubscribe] ❌ Failed to subscribe WABA ${wabaId}:`, result.error);
            }
        }

    } catch (error) {
        console.error('[AutoSubscribe] Exception:', error);
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
        console.error('[VerifySubscriptions] Exception:', error);
        return { total: 0, subscribed: 0, notSubscribed: [] };
    }
}
