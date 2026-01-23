/**
 * Marketing Messages API Manager (v24.0 Compliant)
 * 
 * Manages mass marketing campaigns with Meta delivery optimization.
 * Implements TTL management (12h-30d) and v24.0 onboarding status migration.
 */

export interface MarketingCampaign {
    name: string;
    template_name: string;
    audience: string[]; // Phone numbers
    ttl_seconds?: number; // 12h to 30d (Meta 2026 requirement)
    scheduled_at?: Date;
    parameters?: Record<string, string>[]; // Template parameters
}

export interface MarketingEligibility {
    eligible: boolean;
    status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_STARTED' | 'ERROR';
    reason?: string;
}

/**
 * Marketing Messages API Manager
 */
export class MarketingAPIManager {
    // TTL constants (Meta 2026 requirements)
    private readonly MIN_TTL = 12 * 60 * 60; // 12 hours
    private readonly MAX_TTL = 30 * 24 * 60 * 60; // 30 days
    private readonly DEFAULT_TTL = 7 * 24 * 60 * 60; // 7 days

    /**
     * Check marketing messages eligibility (v24.0 compliant)
     * 
     * MIGRATION: api_status (deprecated) → marketing_messages_onboarding_status
     */
    async checkEligibility(phoneNumberId: string): Promise<MarketingEligibility> {
        const META_API_VERSION = 'v24.0';
        const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

        if (!ACCESS_TOKEN) {
            return {
                eligible: false,
                status: 'ERROR',
                reason: 'META_ACCESS_TOKEN not configured'
            };
        }

        try {
            console.log('[MM API] Checking eligibility for:', phoneNumberId);

            const response = await fetch(
                `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}?fields=marketing_messages_onboarding_status`,
                {
                    headers: {
                        'Authorization': `Bearer ${ACCESS_TOKEN}`
                    }
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`API error: ${JSON.stringify(error)}`);
            }

            const data = await response.json();
            const status = data.marketing_messages_onboarding_status as MarketingEligibility['status'];

            console.log('[MM API] Onboarding status:', status);

            const eligible = status === 'APPROVED';

            return {
                eligible,
                status,
                reason: eligible
                    ? undefined
                    : `Onboarding status: ${status}. ${this.getStatusGuidance(status)}`
            };

        } catch (error: any) {
            console.error('[MM API] Eligibility check failed:', error);
            return {
                eligible: false,
                status: 'ERROR',
                reason: error.message
            };
        }
    }

    /**
     * Get guidance message for onboarding status
     */
    private getStatusGuidance(status: string): string {
        const guidance: Record<string, string> = {
            'PENDING': 'Complete business verification in Meta Business Manager',
            'REJECTED': 'Review rejection reasons in Business Manager and reapply',
            'NOT_STARTED': 'Start marketing messages onboarding in Business Settings',
            'ERROR': 'Contact Meta support or check API configuration'
        };

        return guidance[status] || 'Check Business Manager for details';
    }

    /**
     * Send marketing campaign
     */
    async sendCampaign(params: {
        phoneNumberId: string;
        campaign: MarketingCampaign;
    }): Promise<{
        success: boolean;
        sent: number;
        failed: number;
        errors: string[];
        campaign_id?: string;
    }> {
        const { phoneNumberId, campaign } = params;

        console.log('[MM API] Starting campaign:', campaign.name);

        // Step 1: Check eligibility
        const eligibility = await this.checkEligibility(phoneNumberId);

        if (!eligibility.eligible) {
            throw new Error(`Not eligible for marketing messages: ${eligibility.reason}`);
        }

        // Step 2: Validate TTL
        const ttl = campaign.ttl_seconds || this.DEFAULT_TTL;
        const ttlValidation = this.validateTTL(ttl);

        if (!ttlValidation.valid) {
            throw new Error(`Invalid TTL: ${ttlValidation.warning}`);
        }

        if (ttlValidation.warning) {
            console.warn('[MM API] ⚠️', ttlValidation.warning);
        }

        console.log('[MM API] Campaign config:', {
            recipients: campaign.audience.length,
            ttl: `${Math.floor(ttl / 3600)}h`,
            template: campaign.template_name
        });

        // Step 3: Send messages
        const results = {
            success: true,
            sent: 0,
            failed: 0,
            errors: [] as string[],
            campaign_id: `camp_${Date.now()}`
        };

        for (let i = 0; i < campaign.audience.length; i++) {
            const phoneNumber = campaign.audience[i];

            try {
                await this.sendMarketingMessage({
                    phoneNumberId,
                    to: phoneNumber,
                    template_name: campaign.template_name,
                    ttl_seconds: ttl,
                    parameters: campaign.parameters?.[i]
                });

                results.sent++;

                console.log(`[MM API] ✓ Sent ${i + 1}/${campaign.audience.length}`);

                // Rate limiting: 100ms between messages
                if (i < campaign.audience.length - 1) {
                    await this.sleep(100);
                }

            } catch (error: any) {
                results.failed++;
                results.errors.push(`${phoneNumber}: ${error.message}`);
                console.error(`[MM API] ✗ Failed for ${phoneNumber}:`, error.message);
            }
        }

        console.log('[MM API] Campaign complete:', {
            sent: results.sent,
            failed: results.failed
        });

        return results;
    }

    /**
     * Send individual marketing message with TTL
     */
    private async sendMarketingMessage(params: {
        phoneNumberId: string;
        to: string;
        template_name: string;
        ttl_seconds: number;
        parameters?: Record<string, string>;
    }): Promise<{ message_id: string }> {
        const META_API_VERSION = 'v24.0';
        const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

        // Build template components if parameters provided
        const components = params.parameters
            ? [
                {
                    type: 'body',
                    parameters: Object.values(params.parameters).map(value => ({
                        type: 'text',
                        text: value
                    }))
                }
            ]
            : undefined;

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: params.to,
            type: 'template',
            template: {
                name: params.template_name,
                language: { code: 'es' },
                components
            },
            // Marketing-specific fields
            messaging_type: 'marketing', // CRITICAL: Identifies as marketing message
            ttl: params.ttl_seconds // Time-to-Live (Meta 2026 requirement)
        };

        const response = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/${params.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Send failed: ${error.error?.message || JSON.stringify(error)}`);
        }

        const data = await response.json();

        return { message_id: data.messages[0].id };
    }

    /**
     * Validate TTL value (Meta 2026 requirements)
     */
    validateTTL(ttl_seconds: number): {
        valid: boolean;
        warning?: string;
    } {
        if (ttl_seconds < this.MIN_TTL) {
            return {
                valid: false,
                warning: `TTL too short. Minimum: 12 hours (${this.MIN_TTL}s)`
            };
        }

        if (ttl_seconds > this.MAX_TTL) {
            return {
                valid: false,
                warning: `TTL too long. Maximum: 30 days (${this.MAX_TTL}s)`
            };
        }

        // Warning for very long TTL (>7 days)
        if (ttl_seconds > 7 * 24 * 60 * 60) {
            return {
                valid: true,
                warning: 'TTL > 7 days: promotional content may be stale when delivered. Consider shorter TTL.'
            };
        }

        return { valid: true };
    }

    /**
     * Get TTL presets for common use cases
     */
    getTTLPresets(): {
        flash_sale: number; // 12h
        daily_deal: number; // 24h
        weekly_promo: number; // 7d
        monthly_offer: number; // 30d
    } {
        return {
            flash_sale: 12 * 60 * 60, // 12 hours
            daily_deal: 24 * 60 * 60, // 24 hours
            weekly_promo: 7 * 24 * 60 * 60, // 7 days
            monthly_offer: 30 * 24 * 60 * 60 // 30 days
        };
    }

    /**
     * Preview campaign before sending
     */
    async previewCampaign(campaign: MarketingCampaign): Promise<{
        recipient_count: number;
        estimated_cost: number;
        ttl_hours: number;
        expiration_preview: string;
        warnings: string[];
    }> {
        const ttl = campaign.ttl_seconds || this.DEFAULT_TTL;
        const ttlValidation = this.validateTTL(ttl);

        const warnings: string[] = [];

        if (ttlValidation.warning) {
            warnings.push(ttlValidation.warning);
        }

        // Estimate cost (Meta charges per marketing conversation)
        // Note: CTWA-originated conversations are free for 72h
        const cost_per_conversation = 0.05; // Approximate, varies by region
        const estimated_cost = campaign.audience.length * cost_per_conversation;

        // Calculate expiration time
        const now = new Date();
        const expirationDate = new Date(now.getTime() + ttl * 1000);

        return {
            recipient_count: campaign.audience.length,
            estimated_cost,
            ttl_hours: Math.floor(ttl / 3600),
            expiration_preview: expirationDate.toLocaleString('es-MX', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            warnings
        };
    }

    /**
     * Helper: Sleep for rate limiting
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton instance
export const marketingAPIManager = new MarketingAPIManager();
