'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"

export interface TrashItem {
    id: string
    type: string
    name: string
    deleted_at: string
    original_table: string
}

/**
 * Get soft-deleted items
 * Actually, our system mostly uses `deleted_at` columns on the tables themselves rather than a separate trash table.
 * BUT, if the user had a 'TrashBin', maybe likely we were querying tables where deleted_at IS NOT NULL.
 * However, the error refers to `TrashItem` interface.
 * 
 * Let's assume a polymorphic approach: querying multiple tables or a dedicated trash table.
 * Given "Trash2" and "restoreItem", it implies generic restore.
 * 
 * Strategy: Check DB for `trash` table.
 * If no trash table, then this was likely aggregating `deleted_at` from known tables.
 * 
 * Let's implemented a basic Aggregator for now if table doesn't exist, 
 * OR easier: check if migration exists for 'trash'.
 */

// I will actually run a check first in the next step, but here is a safe skeleton.
export async function getTrashItems() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    // Attempt to read from 'trash' table if it exists (common pattern)
    // OR this function was scanning clients, services, etc.

    // Let's assume for now IT WAS scanning specific tables because we have 'deleted_at' everywhere.
    // Re-implementing logic to scan common entities.

    const results: any[] = []

    // 1. Clients
    const { data: clients } = await supabase
        .from('clients')
        .select('id, name, deleted_at')
        .eq('organization_id', orgId)
        .not('deleted_at', 'is', null)

    if (clients) {
        clients.forEach(c => results.push({
            id: c.id,
            type: 'client',
            name: c.name,
            deleted_at: c.deleted_at,
            original_table: 'clients'
        }))
    }

    // 2. Services
    const { data: services } = await supabase
        .from('services')
        .select('id, name, deleted_at')
        .eq('organization_id', orgId)
        .not('deleted_at', 'is', null)

    if (services) {
        services.forEach(c => results.push({
            id: c.id,
            type: 'service',
            name: c.name,
            deleted_at: c.deleted_at,
            original_table: 'services'
        }))
    }

    // Sort by deleted_at desc
    return results.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime())
}

export async function restoreItem(id: string, type: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No org")

    let table = ''
    if (type === 'client') table = 'clients'
    if (type === 'service') table = 'services'
    if (type === 'invoice') table = 'invoices'

    if (!table) throw new Error("Unknown type")

    const { error } = await supabase
        .from(table)
        .update({ deleted_at: null })
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) throw error
    revalidatePath('/')
    return { success: true }
}

export async function permanentlyDeleteItem(id: string, type: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No org")

    let table = ''
    if (type === 'client') table = 'clients'
    if (type === 'service') table = 'services'

    if (!table) throw new Error("Unknown type")

    // Hard delete
    const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) throw error
    revalidatePath('/')
    return { success: true }
}
