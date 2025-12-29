"use server"

import { createClient } from "@/lib/supabase-server"
import { Lead, Client } from "@/types"
import { revalidatePath } from "next/cache"

export type CreateLeadInput = {
    name: string
    company_name?: string
    email?: string
    phone?: string
}

export type ActionResponse<T> = {
    success: boolean
    data?: T
    error?: string
}

export async function createLead(input: CreateLeadInput): Promise<ActionResponse<Lead>> {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        const { data, error } = await supabase
            .from('leads')
            .insert({
                ...input,
                user_id: user.id,
                status: 'open'
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/leads')
        return { success: true, data: data as Lead }
    } catch (error: any) {
        console.error("Error creating lead:", error)
        return { success: false, error: error.message }
    }
}

export async function convertLeadToClient(leadId: string): Promise<ActionResponse<Client>> {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        // 1. Get Lead
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single()

        if (leadError || !lead) throw new Error("Lead not found")

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

        revalidatePath('/clients')
        revalidatePath('/leads')
        revalidatePath(`/quotes`) // Quotes modified

        return { success: true, data: newClient as Client }
    } catch (error: any) {
        console.error("Error converting lead:", error)
        return { success: false, error: error.message }
    }
}
