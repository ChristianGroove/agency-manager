'use server'

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"
import { ContactService } from "../contact-service"
import { CRMAdvancedService } from "./services/crm-advanced.service"

import type {
    UpdateLeadInput,
    CreateLeadTaskInput,
    UpdateLeadTaskInput,
    CreateLeadNoteInput,
    AssignLeadInput,
    SendEmailInput
} from "@/types/crm-advanced"

const PUBLIC_CRM_ADVANCED_ERROR = "No se pudo completar la accion de CRM"
const PUBLIC_CRM_FILE_UPLOAD_ERROR = "No se pudo subir el archivo"
const PUBLIC_CRM_LEAD_SCORE_ERROR = "No se pudo calcular el puntaje del lead"
const PUBLIC_CRM_EMAIL_ERROR = "No se pudo enviar el email del lead"

const SAFE_PUBLIC_ERROR_MESSAGES = new Set([
    "No file selected",
    "File too large (max 10MB)",
])

type CrmActionFailure = { success: false; error: string }
type CrmDataActionResult<T = any> = { success: true; data: T; error?: never } | CrmActionFailure
type CrmVoidActionResult = { success: true; error?: never } | CrmActionFailure
type CrmLeadScoreResult = ({ success: true; error?: never } & Record<string, any>) | CrmActionFailure
type UploadLeadFileResult = { success: true; url: string; size: number; type: string; error?: never } | CrmActionFailure

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeCrmAdvancedError(error: unknown) {
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

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message
    }
    return null
}

function logCrmAdvancedError(label: string, error: unknown) {
    console.error(label, isDeployedRuntime() ? summarizeCrmAdvancedError(error) : error)
}

function crmAdvancedFailure(label: string, error: unknown, fallback = PUBLIC_CRM_ADVANCED_ERROR): CrmActionFailure {
    logCrmAdvancedError(label, error)
    const message = getErrorMessage(error)
    if (isDeployedRuntime()) {
        return { success: false, error: message && SAFE_PUBLIC_ERROR_MESSAGES.has(message) ? message : fallback }
    }
    return { success: false, error: message || fallback }
}

// ============================================
// LEAD CORE (Now delegated to LeadsService)
// ============================================

export async function updateLead(leadId: string, input: UpdateLeadInput): Promise<CrmDataActionResult> {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()
        const { data: { user } } = await supabase.auth.getUser()
        if (!orgId || !user) throw new Error("Unauthorized")

        const service = new ContactService(supabase, orgId, user.id)
        const data = await service.updateProfile(leadId, input)

        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        return crmAdvancedFailure('updateLead error:', error)
    }
}

export async function getLeadWithRelations(leadId: string) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()
        if (!orgId) return null

        const service = new ContactService(supabase, orgId)
        return await service.getWithRelations(leadId)
    } catch (error) {
        logCrmAdvancedError('getLeadWithRelations error:', error)
        return null
    }
}

// ============================================
// CRM ADVANCED (Delegated to CRMAdvancedService)
// ============================================

async function getAdvancedService() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    const { data: { user } } = await supabase.auth.getUser()
    if (!orgId || !user) throw new Error("Unauthorized")
    return new CRMAdvancedService(supabase, orgId, user.id)
}

export async function getLeadActivities(leadId: string) {
    try {
        const service = await getAdvancedService()
        return await service.getActivities(leadId)
    } catch (error) {
        logCrmAdvancedError('getLeadActivities error:', error)
        return []
    }
}

export async function createActivity(leadId: string, activityType: string, description: string, metadata?: Record<string, any>): Promise<CrmVoidActionResult> {
    try {
        const service = await getAdvancedService()
        await service.createActivity(leadId, activityType, description, metadata)
        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        return crmAdvancedFailure('createActivity error:', error)
    }
}

export async function getLeadTasks(leadId?: string) {
    try {
        const service = await getAdvancedService()
        return await service.getTasks(leadId)
    } catch (error) {
        logCrmAdvancedError('getLeadTasks error:', error)
        return []
    }
}

export async function createLeadTask(input: CreateLeadTaskInput): Promise<CrmDataActionResult> {
    try {
        const service = await getAdvancedService()
        const data = await service.createTask(input)
        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        return crmAdvancedFailure('createLeadTask error:', error)
    }
}

export async function updateLeadTask(taskId: string, input: UpdateLeadTaskInput): Promise<CrmDataActionResult> {
    try {
        const service = await getAdvancedService()
        const data = await service.updateTask(taskId, input)
        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        return crmAdvancedFailure('updateLeadTask error:', error)
    }
}

export async function deleteLeadTask(taskId: string): Promise<CrmVoidActionResult> {
    try {
        const service = await getAdvancedService()
        await service.deleteTask(taskId)
        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        return crmAdvancedFailure('deleteLeadTask error:', error)
    }
}

export async function getLeadNotes(leadId: string) {
    try {
        const service = await getAdvancedService()
        return await service.getNotes(leadId)
    } catch (error) {
        logCrmAdvancedError('getLeadNotes error:', error)
        return []
    }
}

export async function createLeadNote(input: CreateLeadNoteInput): Promise<CrmDataActionResult> {
    try {
        const service = await getAdvancedService()
        const data = await service.createNote(input)
        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        return crmAdvancedFailure('createLeadNote error:', error)
    }
}

export async function updateLeadNote(noteId: string, content: string, isPinned?: boolean): Promise<CrmDataActionResult> {
    try {
        const service = await getAdvancedService()
        const data = await service.updateNote(noteId, content, isPinned)
        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        return crmAdvancedFailure('updateLeadNote error:', error)
    }
}

export async function deleteLeadNote(noteId: string): Promise<CrmVoidActionResult> {
    try {
        const service = await getAdvancedService()
        await service.deleteNote(noteId)
        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        return crmAdvancedFailure('deleteLeadNote error:', error)
    }
}

export async function uploadLeadFile(formData: FormData): Promise<UploadLeadFileResult> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Unauthorized")

        const file = formData.get("file") as File
        const bucket = "crm-documents"
        if (!file) throw new Error("No file selected")
        if (file.size > 10 * 1024 * 1024) throw new Error("File too large (max 10MB)")

        const fileExt = file.name.split(".").pop()
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`

        const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true })
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName)
        return { success: true, url: publicUrl, size: file.size, type: file.type }
    } catch (error: any) {
        return crmAdvancedFailure('uploadLeadFile error:', error, PUBLIC_CRM_FILE_UPLOAD_ERROR)
    }
}

export async function createLeadDocument(leadId: string, name: string, url: string, size: number, type: string): Promise<CrmDataActionResult> {
    try {
        const service = await getAdvancedService()
        const data = await service.createDocument(leadId, name, url, size, type)
        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        return crmAdvancedFailure('createLeadDocument error:', error)
    }
}

export async function deleteLeadDocument(documentId: string): Promise<CrmVoidActionResult> {
    try {
        const service = await getAdvancedService()
        await service.deleteDocument(documentId)
        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        return crmAdvancedFailure('deleteLeadDocument error:', error)
    }
}

export async function assignLeads(input: AssignLeadInput): Promise<CrmVoidActionResult> {
    try {
        const service = await getAdvancedService()
        await service.assignLeads(input.lead_ids, input.assigned_to)
        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        return crmAdvancedFailure('assignLeads error:', error)
    }
}

export async function calculateLeadScore(leadId: string): Promise<CrmLeadScoreResult> {
    try {
        // We use admin service for scoring if needed, but here we can stick to user service
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()
        if (!orgId) throw new Error("Unauthorized")

        const service = new ContactService(supabase, orgId)
        const result = await service.calculateScore(leadId)

        revalidatePath('/crm')
        return { success: true, ...result }
    } catch (error: any) {
        return crmAdvancedFailure('[CRM_ADV_SCORING] Error calculating score:', error, PUBLIC_CRM_LEAD_SCORE_ERROR)
    }
}

export async function sendLeadEmail(input: SendEmailInput): Promise<CrmVoidActionResult> {
    try {
        const service = await getAdvancedService()
        await service.sendEmail(input)
        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        return crmAdvancedFailure('sendLeadEmail error:', error, PUBLIC_CRM_EMAIL_ERROR)
    }
}

