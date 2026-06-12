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

const PUBLIC_LEAD_ACTION_ERROR = "No se pudo completar la accion de leads"

const SAFE_LEAD_ERROR_MESSAGES = new Set([
    "User not authenticated",
    "No organization context found",
    "No organization selected",
    "No organization context",
    "Missing org",
    "Lead not found",
    "Action blocked by Process Rules.",
    "Current process state definition missing",
])

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function getLeadErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message
    }
    return ''
}

function isSafeLeadErrorMessage(message: string) {
    return SAFE_LEAD_ERROR_MESSAGES.has(message) || message.startsWith('Process Rules prevent moving from ')
}

function summarizeLeadActionError(error: unknown) {
    if (error instanceof Error) return { name: error.name }

    if (error && typeof error === 'object') {
        return {
            code: (error as any).code,
            status: (error as any).status,
            statusCode: (error as any).statusCode,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function logLeadActionError(label: string, error: unknown) {
    console.error(label, isDeployedRuntime() ? summarizeLeadActionError(error) : error)
}

function leadActionFailure<T>(label: string, error: unknown): ActionResponse<T> {
    logLeadActionError(label, error)
    const message = getLeadErrorMessage(error)
    if (isDeployedRuntime()) {
        return { success: false, error: isSafeLeadErrorMessage(message) ? message : PUBLIC_LEAD_ACTION_ERROR }
    }
    return { success: false, error: message || PUBLIC_LEAD_ACTION_ERROR }
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
        return leadActionFailure<Lead>("Error creating lead:", error)
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
        return leadActionFailure<Lead>("Error creating lead (system):", error)
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
        return leadActionFailure<Lead>("Error updating lead status (system):", error)
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
        return leadActionFailure<Client>("Error converting lead:", error)
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
        logLeadActionError("Supabase Error fetching leads:", error)
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
        logLeadActionError("Error in getPaginatedLeads:", error)
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
        return leadActionFailure<Lead>("Error updating lead status:", error)
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
        return leadActionFailure<Lead>("Error updating lead:", error)
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
        return leadActionFailure<{ score: number, breakdown: Record<string, number> }>('[CRM_SCORING] Error calculating score:', error)
    }
}

export async function recalculateAllScores(organizationId: string): Promise<ActionResponse<{ updated: number }>> {
    try {
        const service = new LeadsService(supabaseAdmin, organizationId)
        const updated = await service.recalculateAllScores()
        return { success: true, data: { updated } }
    } catch (error: any) {
        return leadActionFailure<{ updated: number }>('Error recalculating lead scores:', error)
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
        return leadActionFailure<string>("[CRM_EXPORT] Error exporting leads:", error)
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
        return leadActionFailure<{ deleted: number }>("[CRM_PURGE] Error purging leads:", error)
    }
}

