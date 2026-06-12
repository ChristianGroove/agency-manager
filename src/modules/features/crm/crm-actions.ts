"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { ContactService } from "./services/contact-service"
import { ClientService } from "./services/client-service"
import { PipelineService } from "./services/logic/services/pipeline.service"
import { TagService } from "./services/tag-service"
import { CrmTaskService } from "./services/crm-task-service"
import { DealService } from "./services/deal-service"
import { getCurrentUserPermissions } from "@/modules/core/settings/actions/team"
import { ActionResponse, PipelineStage, Pipeline, PaginatedLeadsResponse } from "./types"
import { Lead, Client } from "@/types"

const PUBLIC_CRM_CONTACT_ACTION_ERROR = "No se pudo completar la accion de contactos"
const PUBLIC_CRM_PIPELINE_ACTION_ERROR = "No se pudo completar la accion de pipeline"
const PUBLIC_CRM_TAG_ACTION_ERROR = "No se pudo completar la accion de etiquetas"
const PUBLIC_CRM_SETTINGS_ACTION_ERROR = "No se pudo completar la accion de configuracion CRM"
const PUBLIC_CRM_TASK_ACTION_ERROR = "No se pudo completar la accion de tareas CRM"
const PUBLIC_CRM_DEAL_ACTION_ERROR = "No se pudo completar la accion de deals CRM"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeCrmActionError(error: unknown) {
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

function logCrmActionError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizeCrmActionError(error))
}

function crmActionErrorMessage(error: unknown, publicMessage: string) {
    if (isDeployedRuntime()) return publicMessage
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
        return error.message
    }
    return publicMessage
}

function crmContactActionFailure(label: string, error: unknown): ActionResponse<any> {
    logCrmActionError(label, error)
    return { success: false, error: crmActionErrorMessage(error, PUBLIC_CRM_CONTACT_ACTION_ERROR) }
}

function crmPipelineActionFailure(label: string, error: unknown): ActionResponse<any> {
    logCrmActionError(label, error)
    return { success: false, error: crmActionErrorMessage(error, PUBLIC_CRM_PIPELINE_ACTION_ERROR) }
}

function crmTagActionFailure(label: string, error: unknown): ActionResponse<any> {
    logCrmActionError(label, error)
    return { success: false, error: crmActionErrorMessage(error, PUBLIC_CRM_TAG_ACTION_ERROR) }
}

function crmSettingsActionFailure(label: string, error: unknown): ActionResponse<any> {
    logCrmActionError(label, error)
    return { success: false, error: crmActionErrorMessage(error, PUBLIC_CRM_SETTINGS_ACTION_ERROR) }
}

function crmTaskActionFailure(label: string, error: unknown): { success: false; error: string } {
    logCrmActionError(label, error)
    return { success: false, error: crmActionErrorMessage(error, PUBLIC_CRM_TASK_ACTION_ERROR) }
}

function crmDealActionFailure(label: string, error: unknown): { success: false; error: string } {
    logCrmActionError(label, error)
    return { success: false, error: crmActionErrorMessage(error, PUBLIC_CRM_DEAL_ACTION_ERROR) }
}

export async function getLeadsCountAction(userId?: string): Promise<ActionResponse<number>> {
    const { supabase, orgId } = await getCrmServices()
    try {
        let query = supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId)
        
        if (userId) {
            // Filter by creator or assignee
            query = query.or(`user_id.eq.${userId},assigned_to.eq.${userId}`)
        }
            
        const { count, error } = await query
        
        if (error) throw error
        return { success: true, data: count || 0 }
    } catch (e: any) {
        return crmContactActionFailure("[getLeadsCountAction] Error:", e)
    }
}

/**
 * UTILITY: Get services with current context
 */
async function getCrmServices() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!orgId) throw new Error("No organization context found")
    
    return {
        supabase,
        orgId,
        user,
        contacts: new ContactService(supabase, orgId, user?.id),
        pipelines: new PipelineService(supabase, orgId),
        tags: new TagService(supabase, orgId),
        tasks: new CrmTaskService(supabase, orgId, user?.id),
        deals: new DealService(supabase)
    }
}

// ============================================
// CONTACT ACTIONS (Leads & Clients)
// ============================================

export async function createContactAction(input: any): Promise<ActionResponse<Lead>> {
    try {
        const { contacts } = await getCrmServices()
        const data = await contacts.createContact(input)
        revalidatePath('/crm')
        revalidatePath('/clients')
        return { success: true, data }
    } catch (e: any) {
        return crmContactActionFailure("[createContactAction] Error:", e)
    }
}

/**
 * System-level contact creation (Bypasses Auth)
 */
export async function createContactSystemAction(input: any, orgId: string): Promise<ActionResponse<Lead>> {
    try {
        const contacts = new ContactService(supabaseAdmin, orgId)
        const data = await contacts.createContact(input)
        return { success: true, data }
    } catch (e: any) {
        return crmContactActionFailure("[createContactSystemAction] Error:", e)
    }
}

export async function createLeadAction(input: any): Promise<ActionResponse<Lead>> {
    return createContactAction({ ...input, contact_type: 'lead' })
}

export async function createLeadSystemAction(input: any, orgId: string): Promise<ActionResponse<Lead>> {
    return createContactSystemAction({ ...input, contact_type: 'lead' }, orgId)
}

export async function getLeadsAction(params: any = {}): Promise<ActionResponse<any>> {
    try {
        const { contacts } = await getCrmServices()
        const data = await contacts.getPaginated({ ...params, contactType: 'lead' })
        return { success: true, data }
    } catch (e: any) {
        return crmContactActionFailure("[getLeadsAction] Error:", e)
    }
}

export async function getClientsAction(params: any = {}): Promise<ActionResponse<any>> {
    try {
        const { supabase, orgId } = await getCrmServices()
        const clientService = new ClientService(supabase, orgId || "")
        const data = await clientService.getPaginated(params)
        return { success: true, data }
    } catch (e: any) {
        return crmContactActionFailure("[getClientsAction] Error:", e)
    }
}

export async function updateContactStatusAction(id: string, newStatus: string): Promise<ActionResponse<Lead>> {
    try {
        const { contacts } = await getCrmServices()
        const data = await contacts.updateContactStatus(id, newStatus)
        revalidatePath('/crm')
        return { success: true, data }
    } catch (e: any) {
        return crmContactActionFailure("[updateContactStatusAction] Error:", e)
    }
}

export async function updateContactStatusSystemAction(id: string, newStatus: string, orgId: string): Promise<ActionResponse<Lead>> {
    try {
        const contacts = new ContactService(supabaseAdmin, orgId)
        const data = await contacts.updateContactStatus(id, newStatus)
        return { success: true, data }
    } catch (e: any) {
        return crmContactActionFailure("[updateContactStatusSystemAction] Error:", e)
    }
}

export async function convertLeadToClientAction(id: string): Promise<ActionResponse<Client>> {
    try {
        const { contacts } = await getCrmServices()
        const data = await contacts.convertToClient(id)
        revalidatePath('/crm')
        revalidatePath('/clients')
        return { success: true, data }
    } catch (e: any) {
        return crmContactActionFailure("[convertLeadToClientAction] Error:", e)
    }
}

export async function updateContactProfileAction(id: string, updates: any): Promise<ActionResponse<Lead>> {
    try {
        const { contacts } = await getCrmServices()
        const data = await contacts.updateProfile(id, updates)
        revalidatePath('/crm')
        revalidatePath('/clients')
        return { success: true, data }
    } catch (e: any) {
        return crmContactActionFailure("[updateContactProfileAction] Error:", e)
    }
}

export async function deleteContactsAction(ids: string[]): Promise<ActionResponse<void>> {
    try {
        const { contacts } = await getCrmServices()
        await contacts.deleteContacts(ids)
        revalidatePath('/crm')
        revalidatePath('/clients')
        return { success: true }
    } catch (e: any) {
        return crmContactActionFailure("[deleteContactsAction] Error:", e)
    }
}

export async function deleteClientsAction(ids: string[]): Promise<ActionResponse<void>> {
    try {
        const { supabase, orgId } = await getCrmServices()
        const clientService = new ClientService(supabase, orgId || "")
        await clientService.deleteClients(ids)
        revalidatePath('/crm')
        revalidatePath('/clients')
        return { success: true }
    } catch (e: any) {
        return crmContactActionFailure("[deleteClientsAction] Error:", e)
    }
}

// ============================================
// PIPELINE & STAGE ACTIONS
// ============================================

export async function getPipelineStagesAction(): Promise<PipelineStage[]> {
    try {
        const { pipelines } = await getCrmServices()
        return await pipelines.getStages()
    } catch (e) {
        logCrmActionError("[getPipelineStagesAction] Error:", e)
        return []
    }
}

export async function getPipelineViewDataAction(connectionId?: string | null) {
    try {
        const { pipelines, user } = await getCrmServices()
        const perms = await getCurrentUserPermissions()
        
        const role = perms?.role?.toLowerCase()
        const isGlobalRole = role === 'owner' || role === 'dueño' || role === 'admin' || role === 'administrador'
        
        // Convert UI 'all' to null for backend logic
        const cid = connectionId === 'all' ? null : connectionId
        
        // If not a global role, restrict to current user's leads
        const userId = isGlobalRole ? undefined : user?.id
        
        return await pipelines.getPipelineViewData(cid, userId)
    } catch (e) {
        logCrmActionError("[getPipelineViewDataAction] Error:", e)
        return null
    }
}

export async function createPipelineStageAction(input: any): Promise<ActionResponse<PipelineStage>> {
    try {
        const { pipelines } = await getCrmServices()
        const data = await pipelines.createStage(input)
        revalidatePath('/crm')
        return { success: true, data }
    } catch (e: any) {
        return crmPipelineActionFailure("[createPipelineStageAction] Error:", e)
    }
}

export async function updatePipelineStageAction(id: string, updates: any): Promise<ActionResponse<PipelineStage>> {
    try {
        const { pipelines } = await getCrmServices()
        const data = await pipelines.updateStage(id, updates)
        revalidatePath('/crm')
        return { success: true, data }
    } catch (e: any) {
        return crmPipelineActionFailure("[updatePipelineStageAction] Error:", e)
    }
}

export async function reorderPipelineStagesAction(ids: string[]): Promise<ActionResponse<void>> {
    try {
        const { pipelines } = await getCrmServices()
        await pipelines.reorderStages(ids)
        revalidatePath('/crm')
        return { success: true }
    } catch (e: any) {
        return crmPipelineActionFailure("[reorderPipelineStagesAction] Error:", e)
    }
}

export async function deletePipelineStageAction(id: string): Promise<ActionResponse<void>> {
    try {
        const { pipelines } = await getCrmServices()
        await pipelines.deleteStage(id)
        revalidatePath('/crm')
        return { success: true }
    } catch (e: any) {
        return crmPipelineActionFailure("[deletePipelineStageAction] Error:", e)
    }
}

export async function getDefaultPipelineAction(): Promise<Pipeline | null> {
    try {
        const { pipelines } = await getCrmServices()
        return await pipelines.getDefaultPipeline()
    } catch (e) {
        logCrmActionError("[getDefaultPipelineAction] Error:", e)
        return null
    }
}

export async function togglePipelineStrictModeAction(id: string, enabled: boolean): Promise<ActionResponse<Pipeline>> {
    try {
        const { pipelines } = await getCrmServices()
        const data = await pipelines.toggleStrictMode(id, enabled)
        revalidatePath('/crm')
        return { success: true, data }
    } catch (e: any) {
        return crmPipelineActionFailure("[togglePipelineStrictModeAction] Error:", e)
    }
}

// ============================================
// TAG ACTIONS
// ============================================

export async function getTagsAction() {
    try {
        const { tags } = await getCrmServices()
        return await tags.getTags()
    } catch (e) {
        logCrmActionError("[getTagsAction] Error:", e)
        return []
    }
}

export async function createTagAction(name: string, color?: string) {
    try {
        const { tags } = await getCrmServices()
        const data = await tags.createTag(name, color)
        return { success: true, data }
    } catch (e: any) {
        return crmTagActionFailure("[createTagAction] Error:", e)
    }
}

export async function updateTagAction(tagId: string, updates: { name?: string; color?: string }) {
    try {
        const { tags } = await getCrmServices()
        const data = await tags.updateTag(tagId, updates)
        return { success: true, data }
    } catch (e: any) {
        return crmTagActionFailure("[updateTagAction] Error:", e)
    }
}

export async function deleteTagAction(tagId: string) {
    try {
        const { tags } = await getCrmServices()
        await tags.deleteTag(tagId)
        return { success: true }
    } catch (e: any) {
        return crmTagActionFailure("[deleteTagAction] Error:", e)
    }
}

/**
 * System-level tag assignment
 */
export async function addContactTagSystemAction(leadId: string, tagName: string, orgId: string) {
    try {
        const tags = new TagService(supabaseAdmin, orgId)
        const data = await tags.addTagByName(leadId, tagName)
        return { success: true, data }
    } catch (e: any) {
        return crmTagActionFailure("[addContactTagSystemAction] Error:", e)
    }
}

export async function toggleLeadTagAction(leadId: string, tagId: string) {
    try {
        const { tags } = await getCrmServices()
        const data = await tags.toggleLeadTag(leadId, tagId)
        return { success: true, data }
    } catch (e: any) {
        return crmTagActionFailure("[toggleLeadTagAction] Error:", e)
    }
}

export async function getLeadTagsAction(leadId: string) {
    try {
        const { tags } = await getCrmServices()
        return await tags.getLeadTags(leadId)
    } catch (e) {
        logCrmActionError("[getLeadTagsAction] Error:", e)
        return []
    }
}

export async function clearContactTagsAction(leadId: string) {
    try {
        const { tags } = await getCrmServices()
        await tags.clearLeadTags(leadId)
        return { success: true }
    } catch (e: any) {
        return crmTagActionFailure("[clearContactTagsAction] Error:", e)
    }
}

export async function getSettingsAction(): Promise<ActionResponse<any>> {
    const { getSettings } = await import("@/modules/core/settings/actions/crud")
    try {
        const data = await getSettings()
        return { success: true, data }
    } catch (e: any) {
        return crmSettingsActionFailure("[getSettingsAction] Error:", e)
    }
}

export async function getCategoriesAction(): Promise<ActionResponse<any[]>> {
    const { supabase, orgId } = await getCrmServices()
    try {
        const { data, error } = await supabase
            .from('client_categories')
            .select('*')
            .eq('organization_id', orgId)
        
        if (error) throw error
        return { success: true, data }
    } catch (e: any) {
        return crmSettingsActionFailure("[getCategoriesAction] Error:", e)
    }
}

// ============================================
// TASK ACTIONS
// ============================================

export async function createContactTaskAction(data: any) {
    try {
        const { tasks } = await getCrmServices()
        const result = await tasks.createTask(data)
        revalidatePath('/crm')
        return { success: true as const, data: result }
    } catch (e: any) {
        return crmTaskActionFailure("[createContactTaskAction] Error:", e)
    }
}

export async function updateContactTaskAction(id: string, data: any) {
    try {
        const { tasks } = await getCrmServices()
        await tasks.updateTask(id, data)
        revalidatePath('/crm')
        return { success: true as const }
    } catch (e: any) {
        return crmTaskActionFailure("[updateContactTaskAction] Error:", e)
    }
}

export async function completeContactTaskAction(id: string) {
    return updateContactTaskAction(id, { status: 'completed', completed_at: new Date().toISOString() })
}

export async function deleteContactTaskAction(id: string) {
    try {
        const { tasks } = await getCrmServices()
        await tasks.deleteTask(id)
        revalidatePath('/crm')
        return { success: true as const }
    } catch (e: any) {
        return crmTaskActionFailure("[deleteContactTaskAction] Error:", e)
    }
}

export async function getContactTasksAction(leadId: string) {
    try {
        const { tasks } = await getCrmServices()
        const data = await tasks.getTasksForLead(leadId)
        return { success: true as const, tasks: data }
    } catch (e: any) {
        return crmTaskActionFailure("[getContactTasksAction] Error:", e)
    }
}

export async function getMyTasksAction(filters: any = {}) {
    try {
        const { tasks } = await getCrmServices()
        const data = await tasks.getMyTasks(filters)
        return { success: true as const, data }
    } catch (e: any) {
        return crmTaskActionFailure("[getMyTasksAction] Error:", e)
    }
}

export async function getTaskStatsAction() {
    try {
        const { tasks } = await getCrmServices()
        const data = await tasks.getTaskStats()
        return { success: true as const, data }
    } catch (e: any) {
        return crmTaskActionFailure("[getTaskStatsAction] Error:", e)
    }
}

// ============================================
// DEAL / CART ACTIONS
// ============================================

export async function getDealCartAction(leadId: string) {
    try {
        const { deals } = await getCrmServices()
        const cart = await deals.getOrCreateDealCart(leadId)
        return { success: true as const, data: cart }
    } catch (e: any) {
        return crmDealActionFailure("[getDealCartAction] Error:", e)
    }
}

export async function addToCartAction(cartId: string, product: any, quantity: number = 1) {
    try {
        const { deals } = await getCrmServices()
        await deals.addToCart(cartId, product, quantity)
        revalidatePath('/crm')
        return { success: true as const }
    } catch (e: any) {
        return crmDealActionFailure("[addToCartAction] Error:", e)
    }
}

export async function updateCartItemAction(itemId: string, quantity: number) {
    try {
        const { deals } = await getCrmServices()
        await deals.updateCartItem(itemId, quantity)
        revalidatePath('/crm')
        return { success: true as const }
    } catch (e: any) {
        return crmDealActionFailure("[updateCartItemAction] Error:", e)
    }
}

export async function removeCartItemAction(itemId: string) {
    try {
        const { deals } = await getCrmServices()
        await deals.removeCartItem(itemId)
        revalidatePath('/crm')
        return { success: true as const }
    } catch (e: any) {
        return crmDealActionFailure("[removeCartItemAction] Error:", e)
    }
}

export async function searchCatalogAction(query: string = '', category?: string, page: number = 0, pageSize: number = 10) {
    try {
        const { deals, orgId } = await getCrmServices()
        const result = await deals.searchCatalog(orgId, query, category, page, pageSize)
        return { success: true as const, ...result }
    } catch (e: any) {
        return crmDealActionFailure("[searchCatalogAction] Error:", e)
    }
}

export async function sendInteractiveQuoteAction(cartId: string, conversationId: string) {
    try {
        const { deals } = await getCrmServices()
        await deals.sendInteractiveQuote(cartId, conversationId)
        revalidatePath('/inbox')
        return { success: true as const }
    } catch (e: any) {
        return crmDealActionFailure("[sendInteractiveQuoteAction] Error:", e)
    }
}

