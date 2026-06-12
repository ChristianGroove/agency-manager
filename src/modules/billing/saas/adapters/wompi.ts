import { BillingAdapter, SubscriptionStatus } from "../types";
import { supabaseAdmin } from "@/modules/core/database/supabase-admin";

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV;
}

function sanitizeWompiSaasLogDetails(details: Record<string, unknown> = {}) {
    const sensitiveKeys = new Set([
        'bypassUntil',
        'organizationId',
        'orgId',
        'planId',
        'reference',
        'subscriptionId',
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

function summarizeWompiSaasError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name };
    }

    if (error && typeof error === 'object') {
        return {
            type: 'object',
            code: (error as { code?: unknown }).code,
            hasMessage: typeof (error as { message?: unknown }).message === 'string',
        };
    }

    return { type: typeof error };
}

function logWompiSaasInfo(label: string, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        console.log(label, details);
        return;
    }

    console.log(label, sanitizeWompiSaasLogDetails(details));
}

function logWompiSaasError(label: string, error: unknown, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        console.error(label, error, details);
        return;
    }

    console.error(label, {
        ...sanitizeWompiSaasLogDetails(details),
        detail: summarizeWompiSaasError(error),
    });
}

/**
 * Wompi Adapter for SaaS Subscriptions
 * 
 * Note: Wompi does not have native "subscriptions". 
 * We use tokenized payment methods and scheduled jobs to trigger recurrency.
 */
export class WompiSaasAdapter implements BillingAdapter {

    async createSubscription(orgId: string, planId: string): Promise<any> {
        // 1. Get Organization details
        // 2. Prepare transaction with Wompi
        // 3. Return payment URL or initialization data
        logWompiSaasInfo('[Wompi] Initializing subscription', { orgId, planId });
        return { message: "Wompi initialization pending" };
    }

    async cancelSubscription(subscriptionId: string): Promise<any> {
        // Mark as canceled in DB. Next cron won't charge.
        const { error } = await supabaseAdmin
            .from('saas_subscriptions')
            .update({
                status: 'canceled',
                cancel_at_period_end: true,
                canceled_at: new Date().toISOString()
            })
            .eq('id', subscriptionId);

        if (error) throw error;
        return { success: true };
    }

    async handleWebhook(payload: any): Promise<any> {
        const transaction = payload.data.transaction;
        if (!transaction) return { processed: false };

        if (transaction.status === 'APPROVED') {
            const reference = transaction.reference;
            // logic to update saas_subscriptions and record revenue
            logWompiSaasInfo('[Wompi] Transaction APPROVED', { reference });
        }

        return { processed: true };
    }

    async syncStatus(subscriptionId: string): Promise<SubscriptionStatus> {
        return 'active';
    }

    /**
     * Trigger a recurring charge using a stored token
     */
    async chargeRecurring(subscriptionId: string): Promise<boolean> {
        const { data: sub, error } = await supabaseAdmin
            .from('saas_subscriptions')
            .select(`
                *,
                organizations(name)
            `)
            .eq('id', subscriptionId)
            .single();

        if (error || !sub || !sub.payment_method_id) {
            logWompiSaasError('[Wompi] Cannot charge recurring: subscription or token missing', error || new Error('missing_subscription_or_token'), { subscriptionId });
            return false;
        }

        // 1. Validate Bypass
        if (sub.bypass_until && new Date(sub.bypass_until) > new Date()) {
            logWompiSaasInfo('[Wompi] Bypassing charge', {
                bypassUntil: sub.bypass_until,
                subscriptionId,
            });
            return true; // Consider success but skip transaction
        }

        // 2. Get Price (Custom Priority)
        let amount = sub.custom_price;

        if (!amount) {
            const { data: plan } = await supabaseAdmin
                .from('saas_products')
                .select('base_price')
                .eq('id', sub.plan_id)
                .single();
            amount = plan?.base_price || 0;
        }

        const amountInCents = Math.round((amount || 0) * 100);
        const reference = `SUB-${sub.id.split('-')[0]}-${Date.now()}`;

        logWompiSaasInfo('[Wompi] Charging recurring subscription', {
            amountInCents,
            reference,
            subscriptionId,
        });

        try {
            const privateKey = process.env.WOMPI_PRIVATE_KEY;
            const response = await fetch('https://api.wompi.co/v1/transactions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${privateKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount_in_cents: amountInCents,
                    currency: 'COP',
                    customer_email: 'admin@pixy.com.co', // Should come from org/owner
                    payment_method: {
                        type: 'CARD',
                        token: sub.payment_method_id,
                        installments: 1
                    },
                    reference: reference,
                    acceptance_token: sub.metadata?.acceptance_token,
                    metadata: {
                        subscription_id: sub.id,
                        organization_id: sub.organization_id,
                        type: 'saas_subscription_recurring'
                    }
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error?.type || 'Wompi API Error');

            // 3. Record Successful Transaction in History
            await supabaseAdmin.from('payment_transactions').insert({
                organization_id: sub.organization_id,
                reference: reference,
                amount_in_cents: amountInCents,
                currency: 'USD',
                status: 'APPROVED',
                metadata: {
                    type: 'subscription_payment',
                    concept: `Renovación Automática: ${sub.organizations?.name}`,
                    subscription_id: sub.id,
                    gateway: 'wompi',
                    transaction_id: result.data?.id
                }
            });

            return true;
        } catch (err) {
            logWompiSaasError('[Wompi] Recurring charge failed:', err, {
                reference,
                subscriptionId,
            });
            return false;
        }
    }
}
