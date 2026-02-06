import { supabaseAdmin } from "@/lib/supabase-admin"
import { encryptObject } from "@/modules/core/integrations/encryption"
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
     * Complete the onboarding process given an OAuth code from the Embedded Signup flow
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

            // 2. Fetch WABA ID and Phone Numbers
            // In Embedded Signup, the token usually gives access to the WABA created/selected
            // We need to find the WABA ID. Often getting /me/accounts or debug_token helps.
            // But usually, the frontend might pass the wabaId. 
            // If not, we fetch:
            const wabaId = await this.resolveWabaId(tokenData.access_token, tokenData.waba_id); // tokenData often has config_id or we use what came back

            if (!wabaId) {
                throw new Error('Could not resolve WABA ID from token response');
            }

            // 3. Get Phone Numbers
            const phoneNumbers = await this.getPhoneNumbers(wabaId, tokenData.access_token);
            if (phoneNumbers.length === 0) {
                throw new Error('No phone numbers found for this WABA');
            }
            const primaryPhone = phoneNumbers[0]; // Auto-select first for now

            console.log(`[EmbeddedSignup] Found WABA: ${wabaId}, Phone: ${primaryPhone.display_phone_number}`);

            // 4. Register in Database (Supabase)
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
                // We don't fail the whole process, but log warning
            }

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
     * endpoint: oauth/access_token
     */
    private async exchangeCodeForToken(code: string): Promise<any> {
        // NOTE: In production, these should be env vars
        const appId = process.env.NEXT_PUBLIC_META_APP_ID;
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
        return data; // contains access_token, and potentially config_id / waba info depending on permission
    }

    /**
     * Resolve WABA ID from token inspection or direct query
     */
    private async resolveWabaId(accessToken: string, hintWabaId?: string): Promise<string> {
        if (hintWabaId) return hintWabaId;

        // If no hint, inspect token or check /me/accounts (if it's a user token)
        // For System User token from Embedded Signup, it often has the WABA scope.
        // Let's try fetching shared WABAs:
        const url = `${GRAPH_URL}/me/client_whatsapp_business_accounts?access_token=${accessToken}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.data && data.data.length > 0) {
            return data.data[0].id;
        }

        // Fallback: This might be a direct WABA access token? (unlikely)
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
     * Register logic in Supabase
     */
    private async registerConnection(orgId: string, data: {
        wabaId: string,
        accessToken: string,
        phoneNumberId: string,
        displayPhoneNumber: string,
        businessName: string
    }): Promise<string> {

        const credentials = {
            apiToken: data.accessToken,
            phoneNumberId: data.phoneNumberId,
            wabaId: data.wabaId
        };

        // Encrypt credentials
        const encrypted = encryptObject(credentials);

        const metadata = {
            business_name: data.businessName,
            display_phone: data.displayPhoneNumber,
            asset_id: data.phoneNumberId, // For inbox matching
            waba_id: data.wabaId,
            platform: 'whatsapp_cloud'
        };

        const { data: conn, error } = await supabaseAdmin
            .from('integration_connections')
            .insert({
                organization_id: orgId,
                provider_key: 'whatsapp_cloud',
                status: 'active', // Active immediately
                credentials: encrypted,
                metadata: metadata,
                name: `${data.businessName} (${data.displayPhoneNumber})`
            })
            .select()
            .single();

        if (error) throw error;
        return conn.id;
    }
}

export const embeddedSignupHandler = new EmbeddedSignupHandler();
