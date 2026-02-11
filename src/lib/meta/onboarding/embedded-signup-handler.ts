import { supabaseAdmin } from "@/lib/supabase-admin"
import { wabaSubscriptionManager } from "@/lib/meta/waba-subscription-manager"

const GRAPH_URL = 'https://graph.facebook.com/v24.0';

export interface OnboardingResult {
    success: boolean;
    connectionId?: string;
    wabaId?: string;
    error?: string;
}

export class EmbeddedSignupHandler {

    /**
     * Complete the onboarding process given an OAuth code from the Embedded Signup flow.
     * 
     * Steps:
     * 1. Exchange code for access token
     * 2. Resolve WABA ID
     * 3. Get phone numbers
     * 4. Register in DB (with deduplication)
     * 5. Subscribe webhooks + smb_message_echoes for Coexistence
     */
    async completeOnboarding(orgId: string, code: string): Promise<OnboardingResult> {
        try {
            console.log(`[EmbeddedSignup] Starting onboarding for Org: ${orgId}`);

            // 1. Exchange Code for Access Token
            const tokenData = await this.exchangeCodeForToken(code);
            if (!tokenData.access_token) {
                throw new Error('Failed to obtain access token');
            }
            console.log('[EmbeddedSignup] Access Token obtained');

            // 2. Resolve WABA ID
            const wabaId = await this.resolveWabaId(tokenData.access_token, tokenData.waba_id);
            if (!wabaId) {
                throw new Error('Could not resolve WABA ID from token response');
            }

            // 3. Get Phone Numbers
            const phoneNumbers = await this.getPhoneNumbers(wabaId, tokenData.access_token);
            if (phoneNumbers.length === 0) {
                throw new Error('No phone numbers found for this WABA');
            }
            const primaryPhone = phoneNumbers[0];

            console.log(`[EmbeddedSignup] Found WABA: ${wabaId}, Phone: ${primaryPhone.display_phone_number}`);

            // 4. Register in Database with deduplication
            const connectionId = await this.registerConnection(orgId, {
                wabaId,
                accessToken: tokenData.access_token,
                phoneNumberId: primaryPhone.id,
                displayPhoneNumber: primaryPhone.display_phone_number,
                businessName: primaryPhone.verified_name || 'WhatsApp Business'
            });

            // 5. Subscribe to Webhooks (Critical for Shadow Delivery prevention)
            const subResult = await wabaSubscriptionManager.subscribeWABA(wabaId, tokenData.access_token);
            if (!subResult.success) {
                console.warn('[EmbeddedSignup] Webhook subscription warning:', subResult.error);
            }

            // 6. Subscribe smb_message_echoes for Coexistence mode
            await this.subscribeSmbMessageEchoes(wabaId, tokenData.access_token);

            return {
                success: true,
                connectionId,
                wabaId
            };

        } catch (error: any) {
            console.error('[EmbeddedSignup] Onboarding Failed:', error);
            return {
                success: false,
                error: error.message || 'Unknown error during onboarding'
            };
        }
    }

    /**
     * Exchange System User Code for Access Token
     */
    private async exchangeCodeForToken(code: string): Promise<any> {
        const appId = process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID;
        const appSecret = process.env.META_APP_SECRET;

        if (!appId || !appSecret) {
            throw new Error('Missing Meta App Config (ID/Secret)');
        }

        const url = `${GRAPH_URL}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            throw new Error(`Token Exchange Error: ${data.error.message}`);
        }
        return data;
    }

    /**
     * Resolve WABA ID from token inspection or direct query
     */
    private async resolveWabaId(accessToken: string, hintWabaId?: string): Promise<string> {
        if (hintWabaId) return hintWabaId;

        // For System User token from Embedded Signup, fetch shared WABAs
        const url = `${GRAPH_URL}/me/client_whatsapp_business_accounts?access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.data && data.data.length > 0) {
            return data.data[0].id;
        }

        // Fallback: try owned WABAs
        const ownedUrl = `${GRAPH_URL}/me/businesses?fields=owned_whatsapp_business_accounts&access_token=${accessToken}`;
        const ownedRes = await fetch(ownedUrl);
        const ownedData = await ownedRes.json();

        if (ownedData.data?.[0]?.owned_whatsapp_business_accounts?.data?.[0]?.id) {
            return ownedData.data[0].owned_whatsapp_business_accounts.data[0].id;
        }

        return '';
    }

    /**
     * Get Phone Numbers for WABA
     */
    private async getPhoneNumbers(wabaId: string, accessToken: string) {
        const url = `${GRAPH_URL}/${wabaId}/phone_numbers?access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();
        return data.data || [];
    }

    /**
     * Subscribe coexistence webhook fields: smb_message_echoes + history.
     * - smb_message_echoes: mirrors messages sent from the mobile WA Business app
     * - history: syncs conversation history for seamless mobile↔desktop experience
     * 
     * Also configures the rate limiter to 20 mps (Meta's coexistence limit).
     */
    private async subscribeSmbMessageEchoes(wabaId: string, accessToken: string): Promise<void> {
        try {
            const url = `${GRAPH_URL}/${wabaId}/subscribed_apps`;
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscribed_fields: ['messages', 'smb_message_echoes', 'history']
                })
            });

            const data = await res.json();

            if (!res.ok) {
                console.warn('[EmbeddedSignup] Coexistence fields subscription warning:', data);
            } else {
                console.log('[EmbeddedSignup] ✅ Coexistence fields subscribed (messages, smb_message_echoes, history)');
            }

            // Configure rate limiter for coexistence mode (20 mps limit)
            try {
                const { metaRateLimiter } = await import('@/lib/meta/rate-limiter');
                metaRateLimiter.configureWaba(wabaId, {
                    maxTokens: 20,
                    refillRate: 20,
                });
                console.log(`[EmbeddedSignup] ✅ Rate limiter set to 20 mps for WABA ${wabaId} (Coexistence)`);
            } catch (rlError) {
                console.warn('[EmbeddedSignup] Rate limiter config warning:', rlError);
            }
        } catch (error) {
            // Non-fatal: log but don't break onboarding
            console.warn('[EmbeddedSignup] Coexistence subscription error:', error);
        }
    }

    /**
     * Register connection in Supabase with deduplication.
     * 
     * Uses the same schema as activateMetaChannel to ensure compatibility
     * with the inbox and channel management system.
     */
    private async registerConnection(orgId: string, data: {
        wabaId: string,
        accessToken: string,
        phoneNumberId: string,
        displayPhoneNumber: string,
        businessName: string
    }): Promise<string> {

        // Check for existing connection (including deleted/disconnected)
        const { data: existing } = await supabaseAdmin
            .from('integration_connections')
            .select('id, status')
            .eq('organization_id', orgId)
            .eq('provider_key', 'whatsapp_cloud')
            .eq('metadata->>asset_id', data.phoneNumberId)
            .limit(1);

        if (existing && existing.length > 0) {
            const existingChannel = existing[0];

            if (existingChannel.status === 'active') {
                console.log(`[EmbeddedSignup] Channel already active: ${existingChannel.id}`);
                // Update credentials with fresh token
                await supabaseAdmin
                    .from('integration_connections')
                    .update({
                        credentials: { access_token: data.accessToken },
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingChannel.id);
                return existingChannel.id;
            }

            // Reactivate deleted/disconnected channel
            console.log(`[EmbeddedSignup] Reactivating channel: ${existingChannel.id}`);
            await supabaseAdmin
                .from('integration_connections')
                .update({
                    status: 'active',
                    credentials: { access_token: data.accessToken },
                    metadata: {
                        asset_id: data.phoneNumberId,
                        asset_type: 'whatsapp',
                        asset_name: data.businessName,
                        waba_id: data.wabaId,
                        display_phone_number: data.displayPhoneNumber,
                        webhook_status: 'app_level',
                        source: 'embedded_signup',
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingChannel.id);

            return existingChannel.id;
        }

        // Create new connection — compatible with activateMetaChannel schema
        const channelData = {
            organization_id: orgId,
            provider_key: 'whatsapp_cloud',
            connection_name: `${data.businessName} (${data.displayPhoneNumber})`,
            credentials: {
                access_token: data.accessToken,
            },
            metadata: {
                asset_id: data.phoneNumberId,
                asset_type: 'whatsapp',
                asset_name: data.businessName,
                waba_id: data.wabaId,
                display_phone_number: data.displayPhoneNumber,
                webhook_status: 'app_level',
                source: 'embedded_signup',
            },
            config: {
                asset_type: 'whatsapp',
            },
            status: 'active',
            is_primary: false,
        };

        const { data: conn, error } = await supabaseAdmin
            .from('integration_connections')
            .insert(channelData)
            .select()
            .single();

        if (error) throw error;

        console.log(`[EmbeddedSignup] New channel created: ${conn.id}`);
        return conn.id;
    }
}

export const embeddedSignupHandler = new EmbeddedSignupHandler();
