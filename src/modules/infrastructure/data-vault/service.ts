
import { createClient } from "@supabase/supabase-js"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { vaultRegistry } from "./registry"

// CONSTANTS
const BUCKET_NAME = 'vault-backups'
const MAX_SNAPSHOTS_PER_ORG = 5

/**
 * Internal service function to create snapshots without Next.js Request Context
 * Usage: Background Jobs, Cron, CLI
 */
export async function createSnapshotInternal(orgId: string, name: string) {
    console.log(`[Vault-Service] Starting snapshot for ${orgId}`)

    // 0. Enforce Rotation Policy
    const { count, data: oldSnapshots } = await supabaseAdmin
        .from('data_snapshots')
        .select('id, created_at', { count: 'exact' })
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true })

    if (count && count >= MAX_SNAPSHOTS_PER_ORG) {
        const oldest = oldSnapshots[0]
        console.log(`[Vault-Service] Rotation: Deleting ${oldest.id}`)
        // Manually delete - reuse logic or copy? Copy for now to avoid circular dependency on Action
        // Get path 
        const { data: snap } = await supabaseAdmin.from('data_snapshots').select('storage_path').eq('id', oldest.id).single()
        if (snap?.storage_path) await supabaseAdmin.storage.from(BUCKET_NAME).remove([snap.storage_path])
        await supabaseAdmin.from('data_snapshots').delete().eq('id', oldest.id)
    }

    // 1. Create DB Record
    const payload = {
        organization_id: orgId,
        name,
        status: 'processing',
        included_modules: vaultRegistry.getAllModules().map(m => m.key),
        created_by: null // System
    }

    const { data: snapshot, error: insertError } = await supabaseAdmin
        .from('data_snapshots')
        .insert(payload)
        .select()
        .single()

    if (insertError) throw insertError

    try {
        // 2. Export Data
        const exportPayload: Record<string, any> = {
            meta: {
                version: '1.0',
                orgId,
                timestamp: new Date().toISOString(),
                snapshotId: snapshot.id,
                source: 'automated-scheduler'
            },
            modules: {}
        }

        for (const module of vaultRegistry.getAllModules()) {
            // We need to ensure module exportData doesn't use Request Context either.
            // checking adapter code... 
            // crm-adapter uses supabaseAdmin -> OK
            // messaging-adapter uses supabaseAdmin -> OK
            // automation-adapter uses supabaseAdmin -> OK
            const moduleData = await module.exportData(orgId)
            exportPayload.modules[module.key] = moduleData
        }

        // 3. Store
        const jsonString = JSON.stringify(exportPayload)
        const fileSize = Buffer.byteLength(jsonString)
        const filePath = `${orgId}/${snapshot.id}.json`

        const { error: uploadError } = await supabaseAdmin
            .storage
            .from(BUCKET_NAME)
            .upload(filePath, jsonString, { contentType: 'application/json', upsert: true })

        if (uploadError) throw uploadError

        // 4. Update Success
        await supabaseAdmin
            .from('data_snapshots')
            .update({
                status: 'completed',
                storage_path: filePath,
                file_size_bytes: fileSize,
                completed_at: new Date().toISOString()
            })
            .eq('id', snapshot.id)

        return { success: true, snapshotId: snapshot.id }

    } catch (error: any) {
        // Fail status
        await supabaseAdmin.from('data_snapshots').update({ status: 'failed' }).eq('id', snapshot.id)
        throw error
    }
}
