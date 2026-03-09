import { BillingAdapter, SubscriptionStatus } from "../types";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
        console.log(`[Wompi] Initializing subscription for Org: ${orgId}, Plan: ${planId}`);
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
            console.log(`[Wompi] Transaction APPROVED: ${reference}`);
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
            console.error(`[Wompi] Cannot charge recurring: subscription or token missing`);
            return false;
        }

        // 1. Validate Bypass
        if (sub.bypass_until && new Date(sub.bypass_until) > new Date()) {
            console.log(`[Wompi] Bypassing charge for Sub: ${subscriptionId} (Active bypass until ${sub.bypass_until})`);
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

        console.log(`[Wompi] Charging ${amountInCents} cents for Sub: ${subscriptionId} (Ref: ${reference})`);

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

            return true;
        } catch (err) {
            console.error(`[Wompi] Recurring charge failed:`, err);
            return false;
        }
    }
}
