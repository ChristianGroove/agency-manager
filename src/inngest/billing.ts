import { inngest } from "@/lib/inngest/client";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { WompiSaasAdapter } from "@/modules/billing/saas/adapters/wompi";

/**
 * Monthly Subscription Billing Job
 * Runs every day to check which subscriptions are due for a charge.
 */
export const monthlySubscriptionBilling = inngest.createFunction(
    { id: "monthly-subscription-billing" },
    { cron: "0 5 * * *" }, // Run daily at 5 AM
    async ({ step }) => {
        // 1. Find all active subscriptions that are expiring today or have already expired
        const today = new Date().toISOString();

        const dueSubscriptions = await step.run("fetch-due-subscriptions", async () => {
            const { data, error } = await supabaseAdmin
                .from("saas_subscriptions")
                .select("id, organization_id, payment_gateway")
                .eq("status", "active")
                .lte("current_period_end", today)
                .is("cancel_at_period_end", false);

            if (error) throw error;
            return data || [];
        });

        // 2. Process each subscription
        const results = [];
        for (const sub of dueSubscriptions) {
            const result = await step.run(`charge-subscription-${sub.id}`, async () => {
                if (sub.payment_gateway === 'wompi') {
                    const adapter = new WompiSaasAdapter();
                    const success = await adapter.chargeRecurring(sub.id);
                    return { id: sub.id, success };
                }
                return { id: sub.id, success: false, reason: "Unsupported gateway" };
            });
            results.push(result);
        }

        return { processed: dueSubscriptions.length, results };
    }
);
