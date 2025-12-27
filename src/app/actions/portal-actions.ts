'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { Client, Invoice, Quote, Briefing, ClientEvent, Service } from "@/types"
import { Briefing as PortalBriefing } from "@/types/briefings"




// Internal fetch function (uncached) - Exported directly for live data
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

        // 2. First, fetch settings to check for super admin mode
        const { data: settings } = await supabaseAdmin
            .from('organization_settings')
            .select('*')
            .eq('organization_id', client.organization_id)
            .single()

        // 3. Fetch Related Data in Parallel
        const [
            { data: invoices },
            { data: quotes },
            { data: briefings },
            { data: events },
            { data: services }
        ] = await Promise.all([
            // Invoices: Filter out cancelled and deleted
            supabaseAdmin.from('invoices').select('*').eq('client_id', client.id).is('deleted_at', null).neq('status', 'cancelled').order('created_at', { ascending: false }),
            // Quotes: Add deleted_at filter
            supabaseAdmin.from('quotes').select('*').eq('client_id', client.id).is('deleted_at', null).order('created_at', { ascending: false }),
            // Briefings: Add deleted_at filter + organization_id for multi-tenant isolation
            supabaseAdmin.from('briefings').select('*, template:briefing_templates(name)').eq('client_id', client.id).eq('organization_id', client.organization_id).is('deleted_at', null).order('created_at', { ascending: false }),
            // Events: Add deleted_at filter
            supabaseAdmin.from('client_events').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
            // Services: Add deleted_at filter
            supabaseAdmin.from('services').select('*').eq('client_id', client.id).eq('status', 'active').is('deleted_at', null).order('created_at', { ascending: false })
        ])

        // 4. Fetch portal modules (conditional based on super admin mode)
        let activePortalModules: Array<{
            slug: string
            portal_tab_label: string
            portal_icon_key: string
        }> = []

        if (settings?.show_all_portal_modules) {
            // Super Admin Mode: Load ALL portal modules
            const { data: allModules } = await supabaseAdmin
                .from('system_modules')
                .select('key, portal_tab_label, portal_icon_key, has_client_portal_view')
                .eq('has_client_portal_view', true)

            activePortalModules = (allModules || [])
                .filter(mod => mod && mod.portal_tab_label)
                .map(mod => ({
                    slug: mod.key,
                    portal_tab_label: mod.portal_tab_label,
                    portal_icon_key: mod.portal_icon_key
                }))
        } else {
            // Normal Mode: Load only subscription-based modules  
            const { data: productModules } = await supabaseAdmin
                .from('saas_product_modules')
                .select(`
                    module:system_modules!inner(
                        slug,
                        portal_tab_label,
                        portal_icon_key,
                        has_client_portal_view
                    )
                `)
                .eq('product_id', client.subscription_product_id || '')
                .eq('system_modules.has_client_portal_view', true)

            activePortalModules = (productModules || [])
                .map((pm: any) => pm.module)
                .filter((mod: any) => mod && mod.portal_tab_label)
        }

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
            services: filteredServices as Service[],
            activePortalModules: activePortalModules as Array<{
                slug: string
                portal_tab_label: string
                portal_icon_key: string
            }>
        }

    } catch (error) {
        console.error('getPortalData Error:', error)
        throw error
    }
}



export async function getPortalMetadata(token: string) {
    // Lightweight fetch for metadata only - NOW WITH SECURITY!
    try {
        // Step 1: Get client from token to know which organization
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
        let query = supabaseAdmin.from('clients').select('organization_id')

        if (isUuid) {
            query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
        } else {
            query = query.eq('portal_short_token', token)
        }

        const { data: client } = await query.single()
        if (!client) return {}

        // Step 2: Get settings for THAT organization only
        const { data: settings } = await supabaseAdmin
            .from('organization_settings')
            .select('*')
            .eq('organization_id', client.organization_id)
            .single()

        return settings || {}
    } catch {
        return {}
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
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

        let query = supabaseAdmin.from('clients').select('id, name, user_id')

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

        // 4. Create Notification
        if (client.user_id) {
            await supabaseAdmin.from('notifications').insert({
                user_id: client.user_id,
                type: 'quote_accepted',
                title: '✅ Cotización Aprobada',
                message: `El cliente ${client.name} ha aprobado la cotización #${quote.number}. Monto: $${quote.total.toLocaleString()}`,
                client_id: client.id,
                action_url: `/dashboard/quotes/${quote.id}`,
                read: false
            })
        } else {
            console.warn('⚠️ No admin user_id found for client', client.id)
        }

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

        let query = supabaseAdmin.from('clients').select('id, name, user_id')

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

        // 4. Create Notification
        if (client.user_id) {
            await supabaseAdmin.from('notifications').insert({
                user_id: client.user_id,
                type: 'quote_rejected',
                title: '❌ Cotización Rechazada',
                message: `El cliente ${client.name} ha rechazado la cotización #${quote.number}.`,
                client_id: client.id,
                action_url: `/dashboard/quotes/${quote.id}`,
                read: false
            })
        }

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

        let query = supabaseAdmin.from('clients').select('id, name, user_id')

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

            // 3. Create Notification
            if (client.user_id) {
                await supabaseAdmin.from('notifications').insert({
                    user_id: client.user_id,
                    type: 'service_interest',
                    title: '❤️ Interés en Servicio',
                    message: `El cliente ${client.name} está interesado en: ${serviceName}`,
                    client_id: client.id,
                    action_url: `/dashboard/clients/${client.id}`,
                    read: false
                })

            }


            return { success: true }
        }

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

    // 2. Fetch Briefing with template structure (NEW: use structure column)
    const { data, error } = await supabaseAdmin
        .from('briefings')
        .select(`
            *,
            template:briefing_templates(
                id,
                name,
                description,
                structure
            ),
            client:clients(name, email)
        `)
        .eq('id', briefingId)
        .eq('client_id', client.id) // Security Check
        .single()

    if (error) {
        console.error("Error fetching portal briefing:", error)
        throw error
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

    // Return responses directly (values are stored as-is in JSONB)
    return data || []
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
        .from('services')
        .select('*')
        .eq('is_catalog_item', true)
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
        .is('deleted_at', null)
        .single()

    if (error) throw error
    return data as Invoice
}
