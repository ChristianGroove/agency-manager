"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { Lead, Client } from "@/types"
import { PaginatedLeadsResponse } from "../../types"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { LeadsService } from "./services/leads.service"
import { LeadsRepository } from "./repositories/leads.repository"

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

        const organizationId = await getCurrentOrganizationId()
        if (!organizationId) throw new Error("No organization context found")

        const service = new LeadsService(supabase, organizationId, user.id)
        const data = await service.createLead(input)

        revalidatePath('/crm/contacts')
        revalidatePath('/crm/deals')

        return { success: true, data }
    } catch (error: any) {
        console.error("Error creating lead:", error)
        return { success: false, error: error.message }
    }
}

/**
 * System-level Create Lead (Bypasses Auth/Cookies)
 */
export async function createLeadSystem(input: CreateLeadInput, organizationId: string): Promise<ActionResponse<Lead>> {
    try {
        const service = new LeadsService(supabaseAdmin, organizationId)
        const data = await service.createLead({ ...input, source: 'automation' })

        return { success: true, data }
    } catch (error: any) {
        console.error("Error creating lead (system):", error)
        return { success: false, error: error.message }
    }
}

export async function updateLeadStatusSystem(leadId: string, newStatus: string, organizationId?: string): Promise<ActionResponse<Lead>> {
    try {
        // Find org if not provided? System webhook sometimes doesn't have it locally.
        let targetOrgId = organizationId
        if (!targetOrgId) {
            const { data } = await supabaseAdmin.from('leads').select('organization_id').eq('id', leadId).single()
            if (!data) throw new Error("Lead not found")
            targetOrgId = data.organization_id
        }

        const repo = new LeadsRepository(supabaseAdmin)
        const data = await repo.update(leadId, { status: newStatus }, targetOrgId)

        return { success: true, data }
    } catch (error: any) {
        console.error("Error updating lead status (system):", error)
        return { success: false, error: error.message }
    }
}

export async function convertLeadToClient(leadId: string): Promise<ActionResponse<Client>> {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        const orgId = await getCurrentOrganizationId()
        if (!orgId) throw new Error("No organization selected")

        const service = new LeadsService(supabase, orgId, user.id)
        const client = await service.convertToClient(leadId)

        revalidatePath('/clients')
        revalidatePath('/crm')
        return { success: true, data: client }
    } catch (error: any) {
        console.error("Error converting lead:", error)
        return { success: false, error: error.message }
    }
}

export async function getLeads(limit = 300, connectionId?: string | null, allowedChannels?: string[], userId?: string): Promise<PaginatedLeadsResponse> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { leads: [], totalCount: 0, stageCounts: {} }

    try {
        const service = new LeadsService(supabaseAdmin, orgId)
        const result = await service.getPaginated({ pageSize: limit, connectionId, allowedChannels, userId })
        return result
    } catch (error) {
        console.error("Supabase Error fetching leads:", error)
        return { leads: [], totalCount: 0, stageCounts: {} }
    }
}


export async function getPaginatedLeads(params: {
    page?: number
    pageSize?: number
    search?: string
    stageId?: string
    connectionId?: string | null
    allowedChannels?: string[]
    dateFrom?: string
    dateTo?: string
} = {}): Promise<PaginatedLeadsResponse> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { leads: [], totalCount: 0, stageCounts: {} }

    try {
        const service = new LeadsService(supabaseAdmin, orgId)
        const data = await service.getPaginated(params)

        return data as PaginatedLeadsResponse
    } catch (error) {
        console.error("Error in getPaginatedLeads:", error)
        return { leads: [], totalCount: 0, stageCounts: {} }
    }
}

export async function updateLeadStatus(leadId: string, newStatus: string): Promise<ActionResponse<Lead>> {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        const organizationId = await getCurrentOrganizationId()
        if (!organizationId) throw new Error("No organization selected")

        const service = new LeadsService(supabaseAdmin, organizationId, user.id)
        const data = await service.updateLeadStatus(leadId, newStatus)

        revalidatePath('/crm')
        return { success: true, data }
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

        const organizationId = await getCurrentOrganizationId()
        if (!organizationId) throw new Error("No organization selected")

        const service = new LeadsService(supabase, organizationId, user.id)
        const data = await service.updateProfile(leadId, updates)

        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        console.error("Error updating lead:", error)
        return { success: false, error: error.message }
    }
}

export async function calculateLeadScore(leadId: string): Promise<ActionResponse<{ score: number, breakdown: Record<string, number> }>> {
    try {
        const organizationId = await getCurrentOrganizationId()
        if (!organizationId) throw new Error("Missing org")

        const service = new LeadsService(supabaseAdmin, organizationId)
        const data = await service.calculateScore(leadId)

        return { success: true, data }
    } catch (error: any) {
        console.error('[CRM_SCORING] Error calculating score:', error)
        return { success: false, error: error.message }
    }
}

export async function recalculateAllScores(organizationId: string): Promise<ActionResponse<{ updated: number }>> {
    try {
        const service = new LeadsService(supabaseAdmin, organizationId)
        const updated = await service.recalculateAllScores()
        return { success: true, data: { updated } }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function exportLeadsToCSV(): Promise<ActionResponse<string>> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No organization context" }

    try {
        const service = new LeadsService(supabaseAdmin, orgId)
        const data = await service.generateExportCSV()
        return { success: true, data }
    } catch (error: any) {
        console.error("[CRM_EXPORT] Error exporting leads:", error)
        return { success: false, error: error.message }
    }
}

export async function purgeColdLeads(criteria: { 
    inactiveDays: number, 
    minScore?: number 
    }): Promise<ActionResponse<{ deleted: number }>> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No organization context" }

    try {
        const service = new LeadsService(supabaseAdmin, orgId)
        const deleted = await service.purgeColdAccounts(criteria)
        revalidatePath('/crm')
        return { success: true, data: { deleted } }
    } catch (error: any) {
        console.error("[CRM_PURGE] Error purging leads:", error)
        return { success: false, error: error.message }
    }
}

