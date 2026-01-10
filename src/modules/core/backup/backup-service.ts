import { supabaseAdmin } from "@/lib/supabase-admin"
import { integrationRegistry } from "@/modules/core/integrations/registry"
import { StorageProvider } from "@/modules/core/integrations/adapters/types"

export class BackupService {

    /**
     * Run a backup for a specific organization
     */
    static async performBackup(organizationId: string) {
        console.log(`[BackupService] Starting backup for Org: ${organizationId}`)

        // 1. Find Active Backup Integration
        // Query 'integration_connections' joined with 'integrations'
        // We look for integrations with 'aws_s3' or 'google_drive' key
        const { data: connections, error } = await supabaseAdmin
            .from('integration_connections')
            .select(`
                *,
                integration:integrations (
                    key,
                    name
                )
            `)
            .eq('organization_id', organizationId)
            .eq('status', 'active')
            .in('integration.key', ['aws_s3', 'google_drive']) // Filter storage providers

        if (error || !connections || connections.length === 0) {
            console.log(`[BackupService] No active storage integration found for Org: ${organizationId}`)
            return { success: false, reason: 'no-storage-provider' }
        }

        const connection = connections[0]
        const providerKey = connection.integration.key
        const credentials = connection.credentials

        console.log(`[BackupService] Found provider: ${providerKey}`)

        // 2. Resolve Adapter
        const adapter = integrationRegistry.getAdapter(providerKey)
        if (!adapter || !adapter.storage) {
            return { success: false, reason: 'adapter-missing-storage-capability' }
        }

        // 3. Fetch Data to Backup (Example: Leads)
        // In a real system, we'd loop through tables: leads, clients, invoices, etc.
        const { data: leads } = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('organization_id', organizationId)

        // 4. Format Data (JSON)
        const backupPayload = JSON.stringify({
            timestamp: new Date().toISOString(),
            organizationId,
            data: {
                leads: leads || []
            }
        }, null, 2)

        const dateStr = new Date().toISOString().split('T')[0]
        const fileName = `backup-${organizationId}-${dateStr}.json`
        const path = `backups/${fileName}`

        // 5. Upload via Adapter
        try {
            const result = await adapter.storage.uploadFile(credentials, path, backupPayload, 'application/json')
            console.log(`[BackupService] Backup SUCCESS: ${result.url}`)

            // 6. Log Success (could write to 'system_jobs_log')
            return { success: true, url: result.url }
        } catch (uploadError: any) {
            console.error(`[BackupService] Upload FAILED:`, uploadError)
            return { success: false, error: uploadError.message }
        }
    }
}
