'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { Client, Invoice, Quote, Briefing, ClientEvent, Service } from "@/types"

export async function getPortalData(token: string) {
    try {
        // 1. Fetch Client by Token
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

        let query = supabaseAdmin.from('clients').select('*')

        if (isUuid) {
            query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
        } else {
            query = query.eq('portal_short_token', token)
        }

        const { data: client, error: clientError } = await query.single()

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
            { data: services },
            { data: templates }
        ] = await Promise.all([
            supabaseAdmin.from('invoices').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
            supabaseAdmin.from('quotes').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
            supabaseAdmin.from('briefings').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
            supabaseAdmin.from('client_events').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
            supabaseAdmin.from('organization_settings').select('*').single(),
            supabaseAdmin.from('services').select('*').eq('client_id', client.id).eq('status', 'active').order('created_at', { ascending: false }),
            supabaseAdmin.from('briefing_templates').select('id, name')
        ])

        // Manually Join Templates to Briefings
        const enrichedBriefings = (briefings || []).map(b => ({
            ...b,
            template: (templates || []).find(t => t.id === b.template_id) || { name: 'Sin Plantilla' }
        }))

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
            briefings: (enrichedBriefings || []) as Briefing[],
            events: (events || []) as ClientEvent[],
            settings: settings || {},
            services: filteredServices as Service[]
        }

    } catch (error) {
        console.error('getPortalData Error:', error)
        throw error
    }
}

export async function getPortalMetadata(token: string) {
    // Lightweight fetch for metadata only
    const { data: settings } = await supabaseAdmin.from('organization_settings').select('*').single()
    return settings || {}
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

export async function registerServiceInterest(token: string, serviceId: string, serviceName: string) {
    try {
        // 1. Verify Client
        const { data: client, error: clientError } = await supabaseAdmin
            .from('clients')
            .select('id, name')
            .eq('portal_short_token', token)
            .single()

        if (clientError || !client) throw new Error('Unauthorized')

        // 2. Create Event (Interest)
        // Check if recently requested to avoid spam
        const { data: existing } = await supabaseAdmin
            .from('client_events')
            .select('id')
            .eq('client_id', client.id)
            .eq('type', 'interest')
            .eq('metadata->>service_id', serviceId)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
            .single()

        if (!existing) {
            await supabaseAdmin.from('client_events').insert({
                client_id: client.id,
                type: 'interest',
                title: 'Interés en Servicio',
                description: `El cliente ha mostrado interés en: ${serviceName}`,
                metadata: {
                    service_id: serviceId,
                    service_name: serviceName,
                    channel: 'whatsapp_click'
                },
                icon: 'Heart'
            })
        }

        return { success: true }
    } catch (error) {
        console.error('registerServiceInterest Error:', error)
        return { success: false, error: 'Error registering interest' }
    }
}
