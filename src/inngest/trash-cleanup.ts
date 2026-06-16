import { inngest } from "@/modules/infrastructure/automation/inngest/client";
import { supabaseAdmin } from "@/modules/core/database/supabase-admin";

/**
 * Global Trash Purge Engine (Phase 2.2)
 * Runs daily at 3:00 AM to permanently delete old records.
 */
export const trashCleanup = inngest.createFunction(
    { id: "system-trash-purge-job", name: "System Wide Trash Purge" },
    { cron: "0 3 * * *" }, // Daily 3 AM
    async ({ step }) => {
        const TABLES_TO_PURGE = ['leads', 'services', 'briefings', 'quotes', 'invoices', 'organizations'];
        const RETENTION_DAYS = 30;
        const purgeDate = new Date();
        purgeDate.setDate(purgeDate.getDate() - RETENTION_DAYS);
        const purgeDateIso = purgeDate.toISOString();

        const results = [];

        for (const table of TABLES_TO_PURGE) {
            const result = await step.run(`purge-${table}`, async () => {
                const { count, error } = await supabaseAdmin
                    .from(table)
                    .delete({ count: 'exact' })
                    .lt('deleted_at', purgeDateIso)
                    .not('deleted_at', 'is', null);

                if (error) {
                    console.error(`[TrashPurge] Error in ${table}:`, error);
                    return { table, success: false, error };
                }

                return { table, success: true, count: count || 0 };
            });
            results.push(result);
        }

        return {
            processed_at: new Date().toISOString(),
            retention_policy: "30_days",
            results
        };
    }
);
