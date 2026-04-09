'use server'

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"
import { LeadsService } from "./services/leads.service"
import { CRMAdvancedService } from "./services/crm-advanced.service"

import type {
    UpdateLeadInput,
    CreateLeadTaskInput,
    UpdateLeadTaskInput,
    CreateLeadNoteInput,
    AssignLeadInput,
    SendEmailInput
} from "@/types/crm-advanced"

// ============================================
// LEAD CORE (Now delegated to LeadsService)
// ============================================

export async function updateLead(leadId: string, input: UpdateLeadInput) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()
        const { data: { user } } = await supabase.auth.getUser()
        if (!orgId || !user) throw new Error("Unauthorized")

        const service = new LeadsService(supabase, orgId, user.id)
        const data = await service.updateProfile(leadId, input)

        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        console.error('updateLead error:', error)
        return { success: false, error: error.message }
    }
}

export async function getLeadWithRelations(leadId: string) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()
        if (!orgId) return null

        const service = new LeadsService(supabase, orgId)
        return await service.getWithRelations(leadId)
    } catch (error) {
        console.error('getLeadWithRelations error:', error)
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
        console.error('getLeadActivities error:', error)
        return []
    }
}

export async function createActivity(leadId: string, activityType: string, description: string, metadata?: Record<string, any>) {
    try {
        const service = await getAdvancedService()
        await service.createActivity(leadId, activityType, description, metadata)
        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        console.error('createActivity error:', error)
        return { success: false, error: error.message }
    }
}

export async function getLeadTasks(leadId?: string) {
    try {
        const service = await getAdvancedService()
        return await service.getTasks(leadId)
    } catch (error) {
        console.error('getLeadTasks error:', error)
        return []
    }
}

export async function createLeadTask(input: CreateLeadTaskInput) {
    try {
        const service = await getAdvancedService()
        const data = await service.createTask(input)
        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        console.error('createLeadTask error:', error)
        return { success: false, error: error.message }
    }
}

export async function updateLeadTask(taskId: string, input: UpdateLeadTaskInput) {
    try {
        const service = await getAdvancedService()
        const data = await service.updateTask(taskId, input)
        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        console.error('updateLeadTask error:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteLeadTask(taskId: string) {
    try {
        const service = await getAdvancedService()
        await service.deleteTask(taskId)
        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        console.error('deleteLeadTask error:', error)
        return { success: false, error: error.message }
    }
}

export async function getLeadNotes(leadId: string) {
    try {
        const service = await getAdvancedService()
        return await service.getNotes(leadId)
    } catch (error) {
        console.error('getLeadNotes error:', error)
        return []
    }
}

export async function createLeadNote(input: CreateLeadNoteInput) {
    try {
        const service = await getAdvancedService()
        const data = await service.createNote(input)
        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        console.error('createLeadNote error:', error)
        return { success: false, error: error.message }
    }
}

export async function updateLeadNote(noteId: string, content: string, isPinned?: boolean) {
    try {
        const service = await getAdvancedService()
        const data = await service.updateNote(noteId, content, isPinned)
        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        console.error('updateLeadNote error:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteLeadNote(noteId: string) {
    try {
        const service = await getAdvancedService()
        await service.deleteNote(noteId)
        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        console.error('deleteLeadNote error:', error)
        return { success: false, error: error.message }
    }
}

export async function uploadLeadFile(formData: FormData) {
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
        console.error('uploadLeadFile error:', error)
        return { success: false, error: error.message }
    }
}

export async function createLeadDocument(leadId: string, name: string, url: string, size: number, type: string) {
    try {
        const service = await getAdvancedService()
        const data = await service.createDocument(leadId, name, url, size, type)
        revalidatePath('/crm')
        return { success: true, data }
    } catch (error: any) {
        console.error('createLeadDocument error:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteLeadDocument(documentId: string) {
    try {
        const service = await getAdvancedService()
        await service.deleteDocument(documentId)
        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        console.error('deleteLeadDocument error:', error)
        return { success: false, error: error.message }
    }
}

export async function assignLeads(input: AssignLeadInput) {
    try {
        const service = await getAdvancedService()
        await service.assignLeads(input.lead_ids, input.assigned_to)
        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        console.error('assignLeads error:', error)
        return { success: false, error: error.message }
    }
}

export async function calculateLeadScore(leadId: string) {
    try {
        // We use admin service for scoring if needed, but here we can stick to user service
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()
        if (!orgId) throw new Error("Unauthorized")

        const service = new LeadsService(supabase, orgId)
        const result = await service.calculateScore(leadId)

        revalidatePath('/crm')
        return { success: true, ...result }
    } catch (error: any) {
        console.error('[CRM_ADV_SCORING] Error calculating score:', error)
        return { success: false, error: error.message }
    }
}

export async function sendLeadEmail(input: SendEmailInput) {
    try {
        const service = await getAdvancedService()
        await service.sendEmail(input)
        revalidatePath('/crm')
        return { success: true }
    } catch (error: any) {
        console.error('sendLeadEmail error:', error)
        return { success: false, error: error.message }
    }
}

