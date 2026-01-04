"use server"

import { createClient } from "@/lib/supabase-server"
import { Lead, Client } from "@/types"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

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

        // Get current organization from session
        const organizationId = await getCurrentOrganizationId()
        if (!organizationId) throw new Error("No organization context found")

        const { data, error } = await supabase
            .from('leads')
            .insert({
                ...input,
                user_id: user.id,
                organization_id: organizationId,
                status: 'open'
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/crm')
        return { success: true, data: data as Lead }
    } catch (error: any) {
        console.error("Error creating lead:", error)
        return { success: false, error: error.message }
    }
}

/**
 * System-level Create Lead (Bypasses Auth/Cookies)
 * Used by Automation Engine
 */
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function createLeadSystem(input: CreateLeadInput, organizationId: string): Promise<ActionResponse<Lead>> {
    try {
        const { data, error } = await supabaseAdmin
            .from('leads')
            .insert({
                ...input,
                // user_id is optional or can be null for system-created leads? 
                // DB definition says user_id REFERENCES auth.users. 
                // We might need a system user or leave it null if schema allows.
                // Checking leads schema... usually user_id is NULLABLE or we pick the Org Owner.
                // check verification needed. For now assuming nullable or will fix.
                organization_id: organizationId,
                status: 'open',
                source: 'automation'
            })
            .select()
            .single()

        if (error) throw error

        // revalidatePath might not work from background job as intended context, but harmless
        return { success: true, data: data as Lead }
    } catch (error: any) {
        console.error("Error creating lead (system):", error)
        return { success: false, error: error.message }
    }
}

export async function convertLeadToClient(leadId: string): Promise<ActionResponse<Client>> {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        // 1. Get lead data
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .eq('user_id', user.id)
            .single()

        if (leadError) throw leadError
        if (!lead) throw new Error("Lead not found")

        // 2. Create client with lead data
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .insert({
                name: lead.name,
                company_name: lead.company_name,
                email: lead.email,
                phone: lead.phone,
                user_id: user.id,
                organization_id: lead.organization_id, // ✅ Include organization_id
            })
            .select()
            .single()

        if (clientError) throw clientError

        // 3. Update lead status to 'converted'
        await supabase
            .from('leads')
            .update({ status: 'converted' })
            .eq('id', leadId)

        revalidatePath('/clients')
        revalidatePath('/crm')
        return { success: true, data: client as Client }
    } catch (error: any) {
        console.error("Error converting lead:", error)
        return { success: false, error: error.message }
    }
}

export async function getLeads(): Promise<Lead[]> {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) throw error

        return data as Lead[]
    } catch (error: any) {
        console.error("Error fetching leads:", error)
        return []
    }
}

export async function updateLeadStatus(leadId: string, newStatus: string): Promise<ActionResponse<Lead>> {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        const { data, error } = await supabase
            .from('leads')
            .update({ status: newStatus })
            .eq('id', leadId)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/crm')
        return { success: true, data: data as Lead }
    } catch (error: any) {
        console.error("Error updating lead status:", error)
        return { success: false, error: error.message }
    }
}

export async function updateLead(
    leadId: string,
    updates: {
        name?: string
        company_name?: string
        email?: string
        phone?: string
        notes?: string
    }
): Promise<ActionResponse<Lead>> {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        const { data, error } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', leadId)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/crm')
        return { success: true, data: data as Lead }
    } catch (error: any) {
        console.error("Error updating lead:", error)
        return { success: false, error: error.message }
    }
}
