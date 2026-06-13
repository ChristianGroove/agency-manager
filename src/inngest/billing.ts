import { inngest } from "@/modules/infrastructure/automation/inngest/client";
import { WompiSaasAdapter } from "@/modules/billing/saas/adapters/wompi";
import { createClient } from "@/modules/core/database/supabase-server";

/**
 * Monthly Subscription Billing Job
 * Runs every day to check which subscriptions are due for a charge.
 */
export const monthlySubscriptionBilling = inngest.createFunction(
    { id: "monthly-subscription-billing" },
    { cron: "0 5 * * *" }, // Run daily at 5 AM
    async ({ step }) => {
        // 1. Find all active subscriptions that are due for renewal
        // Exclusion: active bypasses (access is granted without charge)
        const today = new Date().toISOString();

        const dueSubscriptions = await step.run("fetch-due-subscriptions", async () => {
            const { data, error } = await (await createClient())
                .from("saas_subscriptions")
                .select("id, organization_id, payment_gateway, billing_cycle, bypass_until")
                .eq("status", "active")
                .lte("current_period_end", today)
                .is("cancel_at_period_end", false);

            if (error) throw error;

            // Filter out those with active bypasses
            return (data || []).filter(sub => {
                if (sub.bypass_until && new Date(sub.bypass_until) > new Date()) {
                    return false;
                }
                return true;
            });
        });

        // 2. Process each subscription
        const results = [];
        for (const sub of dueSubscriptions) {
            const result = await step.run(`charge-subscription-${sub.id}`, async () => {
                if (sub.payment_gateway === 'wompi') {
                    const adapter = new WompiSaasAdapter();
                    const success = await adapter.chargeRecurring(sub.id);

                    if (success) {
                        // Calculate next renewal date based on cycle
                        const nextDate = new Date();
                        const cycle = sub.billing_cycle || 'monthly';

                        if (cycle === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                        else if (cycle === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
                        else if (cycle === 'semi_annual') nextDate.setMonth(nextDate.getMonth() + 6);
                        else if (cycle === 'annual') nextDate.setFullYear(nextDate.getFullYear() + 1);

                        await (await createClient())
                            .from('saas_subscriptions')
                            .update({
                                current_period_end: nextDate.toISOString(),
                                last_payment_at: new Date().toISOString()
                            })
                            .eq('id', sub.id);
                    }

                    return { id: sub.id, success };
                }
                return { id: sub.id, success: false, reason: "Unsupported gateway" };
            });
            results.push(result);
        }

        return { processed: dueSubscriptions.length, results };
    }
);
