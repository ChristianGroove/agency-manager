import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { wabaSubscriptionManager } from "@/modules/infrastructure/meta/services/waba-subscription-manager"

const GRAPH_URL = 'https://graph.facebook.com/v24.0';

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV;
}

function sanitizeEmbeddedSignupHandlerLogDetails(details: Record<string, unknown> = {}) {
    const sensitiveKeys = new Set([
        'channelId',
        'connectionId',
        'orgId',
        'phoneNumber',
        'phoneNumberId',
        'wabaId',
    ]);

    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => {
            if (sensitiveKeys.has(key)) {
                return [`${key}Present`, Boolean(value)];
            }

            return [key, value];
        })
    );
}

function summarizeEmbeddedSignupHandlerError(error: unknown) {
    return error instanceof Error
        ? { name: error.name }
        : { type: typeof error };
}

function logEmbeddedSignupHandlerInfo(label: string, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        console.log(label, details);
        return;
    }

    console.log(label, sanitizeEmbeddedSignupHandlerLogDetails(details));
}

function logEmbeddedSignupHandlerWarning(label: string, error: unknown, details?: Record<string, unknown>) {
    if (!isDeployedRuntime()) {
        if (details) console.warn(label, error, details);
        else console.warn(label, error);
        return;
    }

    console.warn(label, {
        ...(details ? sanitizeEmbeddedSignupHandlerLogDetails(details) : {}),
        detail: summarizeEmbeddedSignupHandlerError(error),
    });
}

function logEmbeddedSignupHandlerError(label: string, error: unknown, details?: Record<string, unknown>) {
    if (!isDeployedRuntime()) {
        if (details) console.error(label, error, details);
        else console.error(label, error);
        return;
    }

    console.error(label, {
        ...(details ? sanitizeEmbeddedSignupHandlerLogDetails(details) : {}),
        detail: summarizeEmbeddedSignupHandlerError(error),
    });
}

function publicOnboardingError(error: unknown) {
    if (isDeployedRuntime()) {
        return 'Embedded signup failed';
    }

    return error instanceof Error
        ? error.message
        : 'Unknown error during onboarding';
}

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
            logEmbeddedSignupHandlerInfo('[EmbeddedSignup] Starting onboarding', { orgId });

            // 1. Exchange Code for Access Token
            const tokenData = await this.exchangeCodeForToken(code);
            if (!tokenData.access_token) {
                throw new Error('Failed to obtain access token');
            }
            logEmbeddedSignupHandlerInfo('[EmbeddedSignup] Access token obtained');

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

            logEmbeddedSignupHandlerInfo('[EmbeddedSignup] Found WABA phone number', {
                wabaId,
                phoneNumber: primaryPhone.display_phone_number,
                phoneNumberId: primaryPhone.id,
            });

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
                logEmbeddedSignupHandlerWarning('[EmbeddedSignup] Webhook subscription warning:', subResult.error, { wabaId });
            }

            // 6. Subscribe smb_message_echoes for Coexistence mode
            await this.subscribeSmbMessageEchoes(wabaId, tokenData.access_token);

            return {
                success: true,
                connectionId,
                wabaId
            };

        } catch (error: any) {
            logEmbeddedSignupHandlerError('[EmbeddedSignup] Onboarding Failed:', error);
            return {
                success: false,
                error: publicOnboardingError(error)
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
                logEmbeddedSignupHandlerWarning('[EmbeddedSignup] Coexistence fields subscription warning:', data, { wabaId });
            } else {
                logEmbeddedSignupHandlerInfo('[EmbeddedSignup] Coexistence fields subscribed');
            }

            // Configure rate limiter for coexistence mode (20 mps limit)
            try {
                const { metaRateLimiter } = await import('@/modules/infrastructure/meta/services/rate-limiter');
                metaRateLimiter.configureWaba(wabaId, {
                    maxTokens: 20,
                    refillRate: 20,
                });
                logEmbeddedSignupHandlerInfo('[EmbeddedSignup] Rate limiter configured for coexistence', {
                    wabaId,
                    maxTokens: 20,
                });
            } catch (rlError) {
                logEmbeddedSignupHandlerWarning('[EmbeddedSignup] Rate limiter config warning:', rlError, { wabaId });
            }
        } catch (error) {
            // Non-fatal: log but don't break onboarding
            logEmbeddedSignupHandlerWarning('[EmbeddedSignup] Coexistence subscription error:', error, { wabaId });
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
                logEmbeddedSignupHandlerInfo('[EmbeddedSignup] Channel already active', { channelId: existingChannel.id });
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
            logEmbeddedSignupHandlerInfo('[EmbeddedSignup] Reactivating channel', { channelId: existingChannel.id });
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

        logEmbeddedSignupHandlerInfo('[EmbeddedSignup] New channel created', { channelId: conn.id });
        return conn.id;
    }
}

export const embeddedSignupHandler = new EmbeddedSignupHandler();
