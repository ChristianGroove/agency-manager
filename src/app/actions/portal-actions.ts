'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { Client, Invoice } from "@/types"

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

        // 2. Fetch Invoices for Client
        const { data: invoices, error: invoicesError } = await supabaseAdmin
            .from('invoices')
            .select('*')
            .eq('client_id', client.id)
            .order('created_at', { ascending: false })

        if (invoicesError) {
            console.error('Portal Invoices Fetch Error:', invoicesError)
            throw new Error('Error fetching invoices')
        }

        return {
            client: client as Client,
            invoices: invoices as Invoice[]
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
        throw error
    }
}
