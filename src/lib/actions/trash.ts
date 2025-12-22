'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"

export type TrashItemType = 'client' | 'briefing' | 'quote' | 'invoice'

export interface TrashItem {
    id: string
    type: TrashItemType
    title: string
    description?: string
    deleted_at: string
    metadata?: any
}

export async function getTrashItems(): Promise<TrashItem[]> {
    try {
        const items: TrashItem[] = []

        // 1. Fetch Deleted Clients
        const { data: clients } = await supabaseAdmin
            .from('clients')
            .select('id, name, email, deleted_at')
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false })

        if (clients) {
            clients.forEach(c => items.push({
                id: c.id,
                type: 'client',
                title: c.name,
                description: c.email,
                deleted_at: c.deleted_at
            }))
        }

        // 2. Fetch Deleted Briefings
        const { data: briefings } = await supabaseAdmin
            .from('briefings')
            .select('id, template:briefing_templates(name), client:clients(name), deleted_at')
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false })

        if (briefings) {
            briefings.forEach(b => {
                const templateName = Array.isArray(b.template) ? b.template[0]?.name : (b.template as any)?.name
                const clientName = Array.isArray(b.client) ? b.client[0]?.name : (b.client as any)?.name

                items.push({
                    id: b.id,
                    type: 'briefing',
                    title: `Briefing: ${templateName || 'Unknown'}`,
                    description: clientName || 'No Client',
                    deleted_at: b.deleted_at
                })
            })
        }

        // 3. Fetch Deleted Quotes
        const { data: quotes } = await supabaseAdmin
            .from('quotes')
            .select('id, number, total, client:clients(name), deleted_at')
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false })

        if (quotes) {
            quotes.forEach(q => {
                const clientName = Array.isArray(q.client) ? q.client[0]?.name : (q.client as any)?.name
                items.push({
                    id: q.id,
                    type: 'quote',
                    title: `Cotización #${q.number}`,
                    description: `${clientName || 'No Client'} - $${q.total.toLocaleString()}`,
                    deleted_at: q.deleted_at
                })
            })
        }

        // 4. Fetch Deleted Invoices
        const { data: invoices } = await supabaseAdmin
            .from('invoices')
            .select('id, number, total, client:clients(name), deleted_at')
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false })

        if (invoices) {
            invoices.forEach(i => {
                const clientName = Array.isArray(i.client) ? i.client[0]?.name : (i.client as any)?.name
                items.push({
                    id: i.id,
                    type: 'invoice',
                    title: `Factura #${i.number}`,
                    description: `${clientName || 'No Client'} - $${i.total.toLocaleString()}`,
                    deleted_at: i.deleted_at
                })
            })
        }

        // Sort all by deleted_at desc
        return items.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime())

    } catch (error) {
        console.error('Error fetching trash items:', error)
        return []
    }
}

export async function restoreItem(type: TrashItemType, id: string) {
    try {
        const table = type === 'client' ? 'clients' :
            type === 'briefing' ? 'briefings' :
                type === 'quote' ? 'quotes' : 'invoices'

        const { error } = await supabaseAdmin
            .from(table)
            .update({ deleted_at: null })
            .eq('id', id)

        if (error) throw error

        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Error restoring item:', error)
        return { success: false, error: 'Failed to restore item' }
    }
}

export async function permanentlyDeleteItem(type: TrashItemType, id: string) {
    try {
        const table = type === 'client' ? 'clients' :
            type === 'briefing' ? 'briefings' :
                type === 'quote' ? 'quotes' : 'invoices'

        const { error } = await supabaseAdmin
            .from(table)
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Error permanently deleting item:', error)
        return { success: false, error: 'Failed to delete item' }
    }
}
