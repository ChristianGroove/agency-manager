
import { inngest } from "@/lib/inngest/client"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { createSnapshotInternal } from "./service"

// 1. Weekly Trigger
export const vaultSnapshotScheduler = inngest.createFunction(
    { id: "vault-snapshot-weekly" },
    { cron: "0 0 * * 0" }, // Every Sunday at Midnight
    async ({ step }) => {
        // Step A: Fetch eligible organizations
        const orgs = await step.run("fetch-eligible-orgs", async () => {
            const { data, error } = await supabaseAdmin
                .from('organizations')
                .select('id, vault_config, name')
                .not('vault_config', 'is', null) // Optimisation

            if (error) throw error

            // Filter in code for JSONB until we rely on PG indexes
            return (data || []).filter(org => {
                const config = org.vault_config as any
                return config?.enabled === true
            })
        })

        if (!orgs || orgs.length === 0) {
            return { message: "No organizations scheduled for backup" }
        }

        // Step B: Fan-out / Iterate
        // For V1 we iterate. For Scale, we would send events.
        const results = await step.run("process-backups", async () => {
            const results = []
            for (const org of orgs) {
                try {
                    console.log(`[Vault-Cron] Backing up: ${org.name} (${org.id})`)
                    // We need an internal service function that doesn't check cookies
                    await createSnapshotInternal(org.id, `Auto-Backup: ${new Date().toISOString().split('T')[0]}`)
                    results.push({ orgId: org.id, status: 'success' })
                } catch (err: any) {
                    console.error(`[Vault-Cron] Failed for ${org.name}:`, err)
                    results.push({ orgId: org.id, status: 'failed', error: err.message })
                }
            }
            return results
        })

        return { processed: results.length, details: results }
    }
)
