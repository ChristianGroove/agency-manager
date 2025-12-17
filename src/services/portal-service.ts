import { supabase } from "@/lib/supabase"
import { Client, Invoice } from "@/types"

export const PortalService = {
    async getClientByToken(token: string) {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('portal_token', token)
            .single()

        if (error) throw error
        return data as Client
    },

    async getClientInvoices(clientId: string) {
        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as Invoice[]
    }
}
