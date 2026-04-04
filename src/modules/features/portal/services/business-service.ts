'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * Business Actions and Activity Logging for the Portal
 */
export async function logPortalAccess(params: {
    clientId: string
    organizationId: string
    tokenUsed: string
    ipAddress?: string
    userAgent?: string
    accessType?: 'view' | 'pay' | 'download' | 'action'
    metadata?: Record<string, any>
}) {
    try {
        await supabaseAdmin.from('portal_access_logs').insert({
            client_id: params.clientId,
            organization_id: params.organizationId,
            token_used: params.tokenUsed,
            ip_address: params.ipAddress || null,
            user_agent: params.userAgent || null,
            access_type: params.accessType || 'view',
            metadata: params.metadata || {}
        })
    } catch (error) {
        console.error('Portal access logging failed:', error)
    }
}

export async function getPortalAccessLogs(clientId: string, limit: number = 50) {
    try {
        const { data, error } = await supabaseAdmin
            .from('portal_access_logs')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error
        return { success: true, data }
    } catch (error) {
        console.error('getPortalAccessLogs Error:', error)
        return { success: false, data: [] }
    }
}

export async function acceptQuote(token: string, quoteId: string) {
    try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
        let query = supabaseAdmin.from('leads').select('id, name, user_id')
        if (isUuid) query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
        else query = query.eq('portal_short_token', token)
        const { data: client, error: clientError } = await query.single()
        if (clientError || !client) throw new Error('Unauthorized')

        const { data: quote, error: quoteError } = await supabaseAdmin
            .from('quotes')
            .update({ status: 'accepted' })
            .eq('id', quoteId)
            .eq('client_id', client.id)
            .select()
            .single()

        if (quoteError) throw quoteError

        await supabaseAdmin.from('client_events').insert({
            client_id: client.id, type: 'quote', title: 'Cotización Aprobada',
            description: `Se ha aprobado la cotización #${quote.number}`,
            metadata: { quote_id: quote.id, amount: quote.total }, icon: 'FileCheck'
        })

        if (client.user_id) {
            await supabaseAdmin.from('notifications').insert({
                user_id: client.user_id, type: 'quote_accepted', title: '✅ Cotización Aprobada',
                message: `El cliente ${client.name} ha aprobado la cotización #${quote.number}. Monto: $${quote.total.toLocaleString()}`,
                client_id: client.id, action_url: `/dashboard/quotes/${quote.id}`, read: false
            })
        }
        return { success: true }
    } catch (error) {
        console.error('acceptQuote Error:', error)
        return { success: false, error: 'Error accepting quote' }
    }
}

export async function rejectQuote(token: string, quoteId: string) {
    try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
        let query = supabaseAdmin.from('leads').select('id, name, user_id')
        if (isUuid) query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
        else query = query.eq('portal_short_token', token)
        const { data: client, error: clientError } = await query.single()
        if (clientError || !client) throw new Error('Unauthorized')

        const { data: quote, error: quoteError } = await supabaseAdmin
            .from('quotes')
            .update({ status: 'rejected' })
            .eq('id', quoteId)
            .eq('client_id', client.id)
            .select()
            .single()

        if (quoteError) throw quoteError

        await supabaseAdmin.from('client_events').insert({
            client_id: client.id, type: 'quote', title: 'Cotización Rechazada',
            description: `Se ha rechazado la cotización #${quote.number}`,
            metadata: { quote_id: quote.id, amount: quote.total }, icon: 'FileX'
        })

        if (client.user_id) {
            await supabaseAdmin.from('notifications').insert({
                user_id: client.user_id, type: 'quote_rejected', title: '❌ Cotización Rechazada',
                message: `El cliente ${client.name} ha rechazado la cotización #${quote.number}.`,
                client_id: client.id, action_url: `/dashboard/quotes/${quote.id}`, read: false
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
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
        let query = supabaseAdmin.from('leads').select('id, name, user_id')
        if (isUuid) query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
        else query = query.eq('portal_short_token', token)
        const { data: client, error: clientError } = await query.single()
        if (clientError || !client) throw new Error('Unauthorized')

        const { data: existing } = await supabaseAdmin
            .from('client_events')
            .select('id').eq('client_id', client.id).eq('type', 'interest')
            .eq('metadata->>service_id', serviceId)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .single()

        if (!existing) {
            await supabaseAdmin.from('client_events').insert({
                client_id: client.id, type: 'interest', title: 'Interés en Servicio',
                description: `El cliente ha mostrado interés en: ${serviceName}`,
                metadata: { service_id: serviceId, service_name: serviceName, channel: 'whatsapp_click' },
                icon: 'Heart'
            })

            if (client.user_id) {
                await supabaseAdmin.from('notifications').insert({
                    user_id: client.user_id, type: 'service_interest', title: '❤️ Interés en Servicio',
                    message: `El cliente ${client.name} está interesado en: ${serviceName}`,
                    client_id: client.id, action_url: `/dashboard/clients/${client.id}`, read: false
                })
            }
        }
        return { success: true }
    } catch (error) {
        console.error('registerServiceInterest Error:', error)
        return { success: false, error: 'Error registering interest' }
    }
}
