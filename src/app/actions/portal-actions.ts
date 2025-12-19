'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { Client, Invoice, Quote, Briefing, ClientEvent, Service } from "@/types"

export async function getPortalData(token: string) {
    try {
        // 1. Fetch Client by Token
        const { data: client, error: clientError } = await supabaseAdmin
            .from('clients')
            .select('*')
            .eq('portal_short_token', token)
            .single()

        if (clientError || !client) {
            console.error('Portal Client Fetch Error:', clientError)
            throw new Error('Invalid token or client not found')
        }

        // 2. Fetch Related Data in Parallel
        const [
            { data: invoices },
            { data: quotes },
            { data: briefings },
            { data: events },
            { data: settings },
            { data: services }
        ] = await Promise.all([
            supabaseAdmin.from('invoices').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
            supabaseAdmin.from('quotes').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
            supabaseAdmin.from('briefings').select('*, template:briefing_templates(name)').eq('client_id', client.id).order('created_at', { ascending: false }),
            supabaseAdmin.from('client_events').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
            supabaseAdmin.from('organization_settings').select('*').single(),
            supabaseAdmin.from('services').select('*').eq('client_id', client.id).eq('status', 'active').order('created_at', { ascending: false })
        ])

        // Filter Services logic
        const filteredServices = (services || []).filter((service: Service) => {
            if (service.type === 'one_off') {
                // One-off: Show ONLY if active AND has pending/overdue invoices
                const hasPendingOrOverdue = invoices?.some(inv =>
                    inv.service_id === service.id &&
                    (inv.status === 'pending' || inv.status === 'overdue')
                )
                return hasPendingOrOverdue
            }
            // Recurring services are shown if active (already filtered by query)
            return true
        })

        return {
            client: client as Client,
            invoices: (invoices || []) as Invoice[],
            quotes: (quotes || []) as Quote[],
            briefings: (briefings || []) as Briefing[],
            events: (events || []) as ClientEvent[],
            settings: settings || {},
            services: filteredServices as Service[]
        }

    } catch (error) {
        console.error('getPortalData Error:', error)
        throw error
    }
}

export async function regeneratePortalToken(clientId: string) {
    try {
        // 1. Generate new token using DB function
        const { data: newToken, error: tokenError } = await supabaseAdmin
            .rpc('generate_short_token')

        if (tokenError) throw tokenError

        // 2. Update client
        const { error: updateError } = await supabaseAdmin
            .from('clients')
            .update({
                portal_short_token: newToken,
                portal_token_created_at: new Date().toISOString()
            })
            .eq('id', clientId)

        if (updateError) throw updateError

        return { success: true, token: newToken }
    } catch (error) {
        console.error('regeneratePortalToken Error:', error)
        return { success: false, error: 'Error regenerating token' }
    }
}

export async function acceptQuote(token: string, quoteId: string) {
    try {
        // 1. Verify Client
        const { data: client, error: clientError } = await supabaseAdmin
            .from('clients')
            .select('id, name')
            .eq('portal_short_token', token)
            .single()

        if (clientError || !client) throw new Error('Unauthorized')

        // 2. Update Quote
        const { data: quote, error: quoteError } = await supabaseAdmin
            .from('quotes')
            .update({ status: 'accepted' })
            .eq('id', quoteId)
            .eq('client_id', client.id) // Ensure ownership
            .select()
            .single()

        if (quoteError) throw quoteError

        // 3. Create Event
        await supabaseAdmin.from('client_events').insert({
            client_id: client.id,
            type: 'quote',
            title: 'Cotización Aprobada',
            description: `Se ha aprobado la cotización #${quote.number}`,
            metadata: {
                quote_id: quote.id,
                amount: quote.total
            },
            icon: 'FileCheck'
        })

        return { success: true }
    } catch (error) {
        console.error('acceptQuote Error:', error)
        return { success: false, error: 'Error accepting quote' }
    }
}

export async function rejectQuote(token: string, quoteId: string) {
    try {
        // 1. Verify Client
        const { data: client, error: clientError } = await supabaseAdmin
            .from('clients')
            .select('id, name')
            .eq('portal_short_token', token)
            .single()

        if (clientError || !client) throw new Error('Unauthorized')

        // 2. Update Quote
        const { data: quote, error: quoteError } = await supabaseAdmin
            .from('quotes')
            .update({ status: 'rejected' })
            .eq('id', quoteId)
            .eq('client_id', client.id) // Ensure ownership
            .select()
            .single()

        if (quoteError) throw quoteError

        // 3. Create Event
        await supabaseAdmin.from('client_events').insert({
            client_id: client.id,
            type: 'quote',
            title: 'Cotización Rechazada',
            description: `Se ha rechazado la cotización #${quote.number}`,
            metadata: {
                quote_id: quote.id,
                amount: quote.total
            },
            icon: 'FileX'
        })

        return { success: true }
    } catch (error) {
        console.error('rejectQuote Error:', error)
        return { success: false, error: 'Error rejecting quote' }
    }
}
