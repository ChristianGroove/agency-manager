import { supabase } from "@/lib/supabase"
import { Lead, Client } from "@/types"

export const LeadsService = {
    async createLead(lead: Omit<Lead, 'id' | 'created_at' | 'user_id' | 'status'>) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        const { data, error } = await supabase
            .from('leads')
            .insert({
                ...lead,
                user_id: user.id,
                status: 'open'
            })
            .select()
            .single()

        if (error) throw error
        return data as Lead
    },

    async convertLeadToClient(leadId: string) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        // 1. Get Lead
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single()

        if (leadError || !lead) throw leadError || new Error("Lead not found")

        // 2. Create Client
        const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
                name: lead.name,
                company_name: lead.company_name,
                email: lead.email,
                phone: lead.phone,
                user_id: user.id
            })
            .select()
            .single()

        if (clientError) throw clientError

        // 3. Update Quotes (Move from Lead to Client)
        const { error: quotesError } = await supabase
            .from('quotes')
            .update({
                client_id: newClient.id,
                lead_id: null
            })
            .eq('lead_id', leadId)

        if (quotesError) throw quotesError

        // 4. Update Lead Status
        const { error: updateLeadError } = await supabase
            .from('leads')
            .update({ status: 'converted' })
            .eq('id', leadId)

        if (updateLeadError) throw updateLeadError

        return newClient as Client
    }
}
