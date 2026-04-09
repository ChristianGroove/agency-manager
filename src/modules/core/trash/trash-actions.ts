'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
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
        .from('leads')
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

    // 4. Briefings
    const { data: briefings } = await supabase
        .from('briefings')
        .select(`
            id, 
            deleted_at,
            template:briefing_templates(name)
        `)
        .eq('organization_id', orgId)
        .not('deleted_at', 'is', null)

    if (briefings) {
        briefings.forEach((b: any) => {
            const daysLeft = calculateDaysLeft(b.deleted_at!)
            if (daysLeft >= 0) {
                results.push({
                    id: b.id,
                    type: 'briefing',
                    name: b.template?.name || "Briefing",
                    deleted_at: b.deleted_at!,
                    days_left: daysLeft,
                    original_table: 'briefings'
                })
            }
        })
    }

    // 5. Invoices
    const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, deleted_at')
        .eq('organization_id', orgId)
        .not('deleted_at', 'is', null)

    if (invoices) {
        invoices.forEach(i => {
            const daysLeft = calculateDaysLeft(i.deleted_at!)
            if (daysLeft >= 0) {
                results.push({
                    id: i.id,
                    type: 'invoice',
                    name: `Factura ${i.invoice_number}`,
                    deleted_at: i.deleted_at!,
                    days_left: daysLeft,
                    original_table: 'invoices'
                })
            }
        })
    }

    // 6. Quotes
    const { data: quotes } = await supabase
        .from('quotes')
        .select('id, number, deleted_at')
        .eq('organization_id', orgId)
        .not('deleted_at', 'is', null)

    if (quotes) {
        quotes.forEach(q => {
            const daysLeft = calculateDaysLeft(q.deleted_at!)
            if (daysLeft >= 0) {
                results.push({
                    id: q.id,
                    type: 'quote',
                    name: `CotizaciÃ³n ${q.number}`,
                    deleted_at: q.deleted_at!,
                    days_left: daysLeft,
                    original_table: 'quotes'
                })
            }
        })
    }

    // Sort by deleted_at desc
    return results.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime())
}

export async function restoreItem(id: string, type: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No org")

    let table = ''
    if (type === 'client') table = 'leads'
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

    // For clients/services/etc, check organization_id
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
    if (type === 'client') table = 'leads'
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

export async function emptyTrash(): Promise<{ success: boolean }> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No org")

    const tables = ['leads', 'services', 'briefings', 'quotes', 'invoices']
    
    // For child organizations, we need to check if current org is reseller
    const { data: orgDetails } = await supabase
        .from('organizations')
        .select('organization_type')
        .eq('id', orgId)
        .single()

    const allTables = [...tables]
    if (orgDetails?.organization_type !== 'client') {
        allTables.push('organizations')
    }

    const promises = allTables.map(table => {
        const query = supabase.from(table).delete().not('deleted_at', 'is', null)
        if (table === 'organizations') {
            return query.eq('acquired_by_reseller_id', orgId)
        }
        return query.eq('organization_id', orgId)
    })

    const results = await Promise.all(promises)
    const errors = results.filter(r => r.error)

    if (errors.length > 0) {
        console.error("[emptyTrash] Errors:", errors)
        throw new Error("Ocurrieron errores al vaciar algunas tablas")
    }

    revalidatePath('/')
    return { success: true }
}

export async function bulkTrashAction(
    items: { id: string, type: string }[], 
    action: 'restore' | 'delete'
): Promise<{ success: boolean }> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No org")

    // Group items by type for efficiency
    const grouped = items.reduce((acc, item) => {
        if (!acc[item.type]) acc[item.type] = []
        acc[item.type].push(item.id)
        return acc
    }, {} as Record<string, string[]>)

    const promises = Object.entries(grouped).map(([type, ids]) => {
        let table = ''
        if (type === 'client') table = 'leads'
        if (type === 'service') table = 'services'
        if (type === 'organization') table = 'organizations'
        if (type === 'invoice') table = 'invoices'
        if (type === 'briefing') table = 'briefings'
        if (type === 'quote') table = 'quotes'

        if (!table) return Promise.resolve({ error: new Error(`Unknown type: ${type}`) })

        if (action === 'restore') {
            const query = supabase.from(table).update({ deleted_at: null }).in('id', ids)
            if (type === 'organization') {
                return query.eq('acquired_by_reseller_id', orgId)
            }
            return query.eq('organization_id', orgId)
        } else {
            const query = supabase.from(table).delete().in('id', ids)
            if (type === 'organization') {
                return query.eq('acquired_by_reseller_id', orgId)
            }
            return query.eq('organization_id', orgId)
        }
    })

    const results = await Promise.all(promises)
    const errors = results.filter(r => r.error)

    if (errors.length > 0) {
        console.error("[bulkTrashAction] Errors:", errors)
        throw new Error(`Error al procesar ${action === 'restore' ? 'restauraciÃ³n' : 'eliminaciÃ³n'} masiva`)
    }

    revalidatePath('/')
    return { success: true }
}

