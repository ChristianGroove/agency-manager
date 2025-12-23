'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { Client, Invoice, Quote, Briefing, ClientEvent, Service } from "@/types"
import { Briefing as PortalBriefing } from "@/types/briefings"

import { unstable_cache, revalidateTag } from 'next/cache'




async function fetchPortalData(token: string) {
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

// Cached version exposed to the app
export const getPortalData = unstable_cache(
    async (token: string) => fetchPortalData(token),
    ['portal-data'],
    {
        revalidate: 60, // Cache for 60 seconds
        tags: ['portal-data'] // Tag for manual invalidation if needed
    }
)

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
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

        let query = supabaseAdmin.from('clients').select('id, name')

        if (isUuid) {
            query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
        } else {
            query = query.eq('portal_short_token', token)
        }

        const { data: client, error: clientError } = await query.single()

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

        revalidateTag('portal-data')
        return { success: true }
    } catch (error) {
        console.error('acceptQuote Error:', error)
        return { success: false, error: 'Error accepting quote' }
    }
}

export async function rejectQuote(token: string, quoteId: string) {
    try {
        // 1. Verify Client
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

        let query = supabaseAdmin.from('clients').select('id, name')

        if (isUuid) {
            query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
        } else {
            query = query.eq('portal_short_token', token)
        }

        const { data: client, error: clientError } = await query.single()

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

        revalidateTag('portal-data')
        return { success: true }
    } catch (error) {
        console.error('rejectQuote Error:', error)
        return { success: false, error: 'Error rejecting quote' }
    }
}

export async function registerServiceInterest(token: string, serviceId: string, serviceName: string) {
    try {
        // 1. Verify Client
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

        let query = supabaseAdmin.from('clients').select('id, name')

        if (isUuid) {
            query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
        } else {
            query = query.eq('portal_short_token', token)
        }

        const { data: client, error: clientError } = await query.single()

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

        revalidateTag('portal-data')
        return { success: true }
    } catch (error) {
        console.error('registerServiceInterest Error:', error)
        return { success: false, error: 'Error registering interest' }
    }
}

export async function getPortalBriefing(token: string, briefingId: string) {
    // 1. Verify Client by Token
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

    let query = supabaseAdmin.from('clients').select('id')

    if (isUuid) {
        query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
    } else {
        query = query.eq('portal_short_token', token)
    }

    const { data: client, error: clientError } = await query.single()

    if (clientError || !client) throw new Error('Unauthorized')

    // 2. Fetch Briefing for this Client using Admin
    const { data, error } = await supabaseAdmin
        .from('briefings')
        .select(`
            *,
            template:briefing_templates(
                name,
                steps:briefing_steps(
                    id, title, description, order_index,
                    fields:briefing_fields(
                        id, label, type, required, options, order_index
                    )
                )
            ),
            client:clients(name, email)
        `)
        .eq('id', briefingId)
        .eq('client_id', client.id) // Security Check
        .single()

    if (error) throw error

    // Sort steps and fields
    if (data.template && data.template.steps) {
        data.template.steps.sort((a: any, b: any) => a.order_index - b.order_index)
        data.template.steps.forEach((step: any) => {
            if (step.fields) {
                step.fields.sort((a: any, b: any) => a.order_index - b.order_index)
            }
        })
    }

    return data as PortalBriefing
}

export async function getPortalBriefingResponses(token: string, briefingId: string) {
    // 1. Verify Client
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

    let query = supabaseAdmin.from('clients').select('id')

    if (isUuid) {
        query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
    } else {
        query = query.eq('portal_short_token', token)
    }

    const { data: client, error: clientError } = await query.single()

    if (clientError || !client) throw new Error('Unauthorized')

    // 2. Fetch Responses
    const { data, error } = await supabaseAdmin
        .from('briefing_responses')
        .select('*')
        .eq('briefing_id', briefingId)

    if (error) throw error
    return data
}

export async function getPortalCatalog(token: string) {
    // 1. Verify Client
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

    let query = supabaseAdmin.from('clients').select('id')

    if (isUuid) {
        query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
    } else {
        query = query.eq('portal_short_token', token)
    }

    const { data: client, error: clientError } = await query.single()

    if (clientError || !client) throw new Error('Unauthorized')

    // 2. Fetch Catalog (Admin bypasses RLS)
    const { data, error } = await supabaseAdmin
        .from('service_catalog')
        .select('*')
        .eq('is_visible_in_portal', true)
        .order('category')

    if (error) throw error
    return data
}

export async function getPortalQuote(token: string, quoteId: string) {
    // 1. Verify Client
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

    let query = supabaseAdmin.from('clients').select('id')

    if (isUuid) {
        query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
    } else {
        query = query.eq('portal_short_token', token)
    }

    const { data: client, error: clientError } = await query.single()

    if (clientError || !client) throw new Error('Unauthorized')

    // 2. Fetch Quote
    const { data, error } = await supabaseAdmin
        .from('quotes')
        .select(`
            *,
            client:clients (*),
            lead:leads (*)
        `)
        .eq('id', quoteId)
        .eq('client_id', client.id)
        .single()

    if (error) throw error
    return data as Quote
}

export async function getPortalInvoice(token: string, invoiceId: string) {
    // 1. Verify Client
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

    let query = supabaseAdmin.from('clients').select('id')

    if (isUuid) {
        query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
    } else {
        query = query.eq('portal_short_token', token)
    }

    const { data: client, error: clientError } = await query.single()

    if (clientError || !client) throw new Error('Unauthorized')

    // 2. Fetch Invoice
    const { data, error } = await supabaseAdmin
        .from('invoices')
        .select(`
            *,
            client:clients (*)
        `)
        .eq('id', invoiceId)
        .eq('client_id', client.id)
        .single()

    if (error) throw error
    return data as Invoice
}
