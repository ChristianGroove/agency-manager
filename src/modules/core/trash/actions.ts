'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"

export interface TrashItem {
    id: string
    type: 'client' | 'service' | 'organization' | 'invoice' | 'briefing' | 'quote'
    name: string
    deleted_at: string
    days_left: number
    original_table: string
}

export async function getTrashItems(): Promise<TrashItem[]> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    // Get org details to see if we can see child orgs
    const { data: orgDetails } = await supabase
        .from('organizations')
        .select('organization_type')
        .eq('id', orgId)
        .single()

    const results: TrashItem[] = []
    const now = new Date()
    const GRACE_PERIOD_DAYS = 30

    const calculateDaysLeft = (deletedAt: string) => {
        const deletedDate = new Date(deletedAt)
        const diffTime = now.getTime() - deletedDate.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        return Math.max(0, GRACE_PERIOD_DAYS - diffDays)
    }

    // 1. Clients
    const { data: clients } = await supabase
        .from('clients')
        .select('id, name, deleted_at')
        .eq('organization_id', orgId)
        .not('deleted_at', 'is', null)

    if (clients) {
        clients.forEach(c => {
            const daysLeft = calculateDaysLeft(c.deleted_at!)
            if (daysLeft >= 0) {
                results.push({
                    id: c.id,
                    type: 'client',
                    name: c.name,
                    deleted_at: c.deleted_at!,
                    days_left: daysLeft,
                    original_table: 'clients'
                })
            }
        })
    }

    // 2. Services
    const { data: services } = await supabase
        .from('services')
        .select('id, name, deleted_at')
        .eq('organization_id', orgId)
        .not('deleted_at', 'is', null)

    if (services) {
        services.forEach(s => {
            const daysLeft = calculateDaysLeft(s.deleted_at!)
            if (daysLeft >= 0) {
                results.push({
                    id: s.id,
                    type: 'service',
                    name: s.name,
                    deleted_at: s.deleted_at!,
                    days_left: daysLeft,
                    original_table: 'services'
                })
            }
        })
    }

    // 3. Child Organizations (For Resellers/Platform)
    if (orgDetails?.organization_type !== 'client') {
        const { data: childOrgs } = await supabase
            .from('organizations')
            .select('id, name, deleted_at')
            .eq('acquired_by_reseller_id', orgId)
            .not('deleted_at', 'is', null)

        if (childOrgs) {
            childOrgs.forEach(o => {
                const daysLeft = calculateDaysLeft(o.deleted_at!)
                if (daysLeft >= 0) {
                    results.push({
                        id: o.id,
                        type: 'organization',
                        name: o.name,
                        deleted_at: o.deleted_at!,
                        days_left: daysLeft,
                        original_table: 'organizations'
                    })
                }
            })
        }
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
    if (type === 'organization') table = 'organizations'
    if (type === 'briefing') table = 'briefings'
    if (type === 'quote') table = 'quotes'

    if (!table) throw new Error("Unknown type")

    const query = supabase
        .from(table)
        .update({ deleted_at: null })
        .eq('id', id)

    // For clients/services, check organization_id
    if (type !== 'organization') {
        query.eq('organization_id', orgId)
    } else {
        // For organizations, check acquired_by_reseller_id
        query.eq('acquired_by_reseller_id', orgId)
    }

    const { error } = await query

    if (error) throw error

    // Security Log
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { SecurityLogger, SecurityAction } = await import('@/lib/security-logger')
        await SecurityLogger.log({
            organizationId: orgId,
            actorId: user.id,
            action: type === 'organization' ? SecurityAction.ORG_RESTORED : 'ITEM_RESTORED',
            resourceEntity: type,
            resourceId: id,
            metadata: { type }
        })
    }

    revalidatePath('/')
    return { success: true }
}

export async function permanentlyDeleteItem(id: string, type: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No org")

    // Security Check: Only allow permanent delete of orgs if current org is NOT the one being deleted
    // and is a platform/reseller. 
    if (type === 'organization' && id === orgId) {
        throw new Error("Cannot delete current organization")
    }

    let table = ''
    if (type === 'client') table = 'clients'
    if (type === 'service') table = 'services'
    if (type === 'organization') table = 'organizations'
    if (type === 'invoice') table = 'invoices'
    if (type === 'briefing') table = 'briefings'
    if (type === 'quote') table = 'quotes'

    if (!table) throw new Error("Unknown type")

    const query = supabase
        .from(table)
        .delete()
        .eq('id', id)

    // Permission enforcement
    if (type !== 'organization') {
        query.eq('organization_id', orgId)
    } else {
        query.eq('acquired_by_reseller_id', orgId)
    }

    const { error } = await query

    if (error) throw error

    // Security Log
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { SecurityLogger, SecurityAction } = await import('@/lib/security-logger')
        await SecurityLogger.log({
            organizationId: orgId,
            actorId: user.id,
            action: type === 'organization' ? SecurityAction.ORG_DELETED : 'ITEM_PERMANENTLY_DELETED',
            resourceEntity: type,
            resourceId: id,
            metadata: { type, permanent: true }
        })
    }

    revalidatePath('/')
    return { success: true }
}
