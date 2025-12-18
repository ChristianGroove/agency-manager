'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { Client, Invoice } from "@/types"

export async function getPortalData(token: string) {
    try {
        // 1. Fetch Client by Token
        const { data: client, error: clientError } = await supabaseAdmin
            .from('clients')
            .select('*')
            .eq('portal_token', token)
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
