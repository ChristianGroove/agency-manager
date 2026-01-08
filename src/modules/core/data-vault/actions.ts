
"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { vaultRegistry } from "./registry"
import { DataSnapshot } from "./types"
import { revalidatePath } from "next/cache"

// Constants
const BUCKET_NAME = 'vault-backups'

/**
 * Creates a new data snapshot for the current organization
 */
export async function createSnapshot(name: string, includedModules: string[] = []) {
    try {
        const orgId = await getCurrentOrganizationId()
        if (!orgId) throw new Error("Unauthorized")

        const MAX_SNAPSHOTS_PER_ORG = 5

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        // 0. Enforce Snapshot Limits (Rotation Policy)
        const { count, data: oldSnapshots } = await supabaseAdmin
            .from('data_snapshots')
            .select('id, created_at', { count: 'exact' })
            .eq('organization_id', orgId)
            .order('created_at', { ascending: true }) // Oldest first

        if (count && count >= MAX_SNAPSHOTS_PER_ORG) {
            const oldest = oldSnapshots[0]
            console.log(`[Vault] Limit reached. Rotating oldest snapshot: ${oldest.id}`)
            await deleteSnapshot(oldest.id)
        }

        const payload = {
            organization_id: orgId,
            name,
            status: 'processing',
            included_modules: includedModules,
            created_by: user?.id ?? null
        }
        console.log('[CreateSnapshot] Payload:', JSON.stringify(payload, null, 2))

        const { data: snapshot, error: insertError } = await supabaseAdmin
            .from('data_snapshots')
            .insert(payload)
            .select()
            .single()

        if (insertError) throw insertError

        // 2. Perform Data Export (Async in theory, but here we await for simplicity in V1)
        // In V2 this should be a background job (Inngest)

        const exportPayload: Record<string, any> = {
            meta: {
                version: '1.0',
                orgId,
                timestamp: new Date().toISOString(),
                snapshotId: snapshot.id
            },
            modules: {}
        }

        const modulesToExport = includedModules.length > 0
            ? includedModules
            : vaultRegistry.getAllModules().map(m => m.key)

        for (const moduleKey of modulesToExport) {
            const module = vaultRegistry.getModule(moduleKey)
            if (module) {
                console.log(`[Vault] Exporting module: ${moduleKey}`)
                const moduleData = await module.exportData(orgId)
                exportPayload.modules[moduleKey] = moduleData
            }
        }

        // 3. Serialize & Store
        const jsonString = JSON.stringify(exportPayload)
        const fileSize = Buffer.byteLength(jsonString)
        const filePath = `${orgId}/${snapshot.id}.json` // .gz if we implemented compression

        const { error: uploadError } = await supabaseAdmin
            .storage
            .from(BUCKET_NAME)
            .upload(filePath, jsonString, {
                contentType: 'application/json',
                upsert: true
            })

        if (uploadError) {
            console.error("Upload error:", uploadError)
            await supabaseAdmin.from('data_snapshots').update({ status: 'failed' }).eq('id', snapshot.id)
            throw new Error("Failed to upload snapshot file")
        }

        // 4. Update Record (Completed)
        await supabaseAdmin
            .from('data_snapshots')
            .update({
                status: 'completed',
                storage_path: filePath,
                file_size_bytes: fileSize,
                completed_at: new Date().toISOString()
            })
            .eq('id', snapshot.id)

        revalidatePath('/platform/settings')
        return { success: true, snapshotId: snapshot.id }

    } catch (error: any) {
        console.error("Create Snapshot Error:", error)
        return { success: false, error: error.message }
    }
}

export async function getSnapshots() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    const { data } = await supabaseAdmin
        .from('data_snapshots')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

    return (data || []) as DataSnapshot[]
}

export async function deleteSnapshot(id: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")

    // 1. Get path
    const { data: snapshot } = await supabaseAdmin
        .from('data_snapshots')
        .select('storage_path, organization_id')
        .eq('id', id)
        .single()

    if (!snapshot) throw new Error("Snapshot not found")
    if (snapshot.organization_id !== orgId) throw new Error("Unauthorized access to snapshot")

    // 2. Delete file
    if (snapshot.storage_path) {
        await supabaseAdmin.storage.from(BUCKET_NAME).remove([snapshot.storage_path])
    }

    // 3. Delete record
    const { error } = await supabaseAdmin
        .from('data_snapshots')
        .delete()
        .eq('id', id)

    if (error) throw error
    revalidatePath('/platform/settings')
    return { success: true }
}

export async function restoreSnapshot(snapshotId: string) {
    // This is a DESTRUCTIVE operation.
    // In V1, we simply log intention or verify file exists. 
    // Implementing full restore requires careful "Drop & Import" logic.
    // For this task, we will verify availability and return "Ready to Restore" status, 
    // or actually implement it if requested. Given the "Surgical Plan" request, let's implement validation.

    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")

    const { data: snapshot } = await supabaseAdmin
        .from('data_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .single()

    if (!snapshot || snapshot.organization_id !== orgId) throw new Error("Invalid snapshot")

    // Check file exists
    const { data: file, error: downloadError } = await supabaseAdmin
        .storage
        .from(BUCKET_NAME)
        .download(snapshot.storage_path!)

    if (downloadError) throw new Error("Snapshot file not found in vault")

    const textData = await file.text()
    const payload = JSON.parse(textData)

    // Validate Integrity
    if (payload.meta.orgId !== orgId) throw new Error("Snapshot integrity mismatch: Org ID mismatch")

    /* 
       REAL RESTORE LOGIC (Commented out for safety unless explicitly enabled)
       
       1. Set Maintenance Mode
       2. Clean Data (Reverse Dependency Order)
       const modules = vaultRegistry.getSortedModules().reverse()
       for (const mod of modules) { await mod.clearData(orgId) }
       
       3. Import Data (Forward Order)
       const modulesImport = vaultRegistry.getSortedModules()
       for (const mod of modulesImport) { 
           if (payload.modules[mod.key]) await mod.importData(orgId, payload.modules[mod.key])
       }
    */

    return { success: true, message: "Snapshot validated and ready for restoration" }
}

// --- CONFIGURATION MANAGEMENT ---

export async function getVaultConfig() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return null

    const { data } = await supabaseAdmin
        .from('organizations')
        .select('vault_config')
        .eq('id', orgId)
        .single()

    // Return default if null
    return data?.vault_config || { enabled: false, frequency: 'weekly' }
}

export async function updateVaultConfig(config: { enabled: boolean, frequency: 'daily' | 'weekly' | 'monthly' }) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")

    const { error } = await supabaseAdmin
        .from('organizations')
        .update({ vault_config: config })
        .eq('id', orgId)

    if (error) throw error
    revalidatePath('/platform/settings')
    return { success: true }
}
