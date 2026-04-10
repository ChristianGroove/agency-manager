"use server"

import { createClient } from "@/lib/supabase-server"
import { FullBriefingTemplate, Briefing, BriefingField } from "@/types/briefings"
import { revalidatePath } from "next/cache"
import { Resend } from 'resend'
import { getBriefingSubmissionEmailHtml } from '@/lib/email-templates'
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { FORM_TEMPLATES } from "./templates-data"

// --- Types Mapped to Generic Forms ---
// Ideally we should export these from a central types file, but for now we alias them
export type FormTemplate = FullBriefingTemplate
export type FormSubmission = Briefing
export type FormField = BriefingField


import * as BriefingService from "./services/briefing-service"

// --- Admin Actions ---

export async function getFormTemplates() {
    return await BriefingService.getBriefingTemplates()
}

export async function createFormTemplate(data: {
    name: string
    description?: string
    slug: string
    structure: any[]
}) {
    const template = await BriefingService.createBriefingTemplate(data)
    revalidatePath('/portfolio') // TODO: update path when UI moves
    return template
}

export async function updateFormTemplate(
    id: string,
    data: {
        name?: string
        description?: string
        slug?: string
        structure?: any[]
    }
) {
    const template = await BriefingService.updateBriefingTemplate(id, data)
    revalidatePath('/portfolio')
    return template
}

export async function deleteFormTemplate(id: string) {
    await BriefingService.deleteBriefingTemplate(id)
    revalidatePath('/portfolio')
}


// --- Submission Actions ---

export async function createFormSubmission(templateId: string, clientId: string | null, serviceId?: string | null) {
    const data = await BriefingService.createBriefingSubmission(templateId, clientId, serviceId)

    // Create client notification
    if (clientId) {
        const supabase = await createClient()
        const { supabaseAdmin } = await import('@/lib/supabase-admin')
        const { data: template } = await supabase
            .from('briefing_templates')
            .select('name')
            .eq('id', templateId)
            .single()

        await supabaseAdmin.from('client_events').insert({
            client_id: clientId,
            type: 'briefing', // Keep 'briefing' type for now for portal compatibility, or change to 'form'
            title: 'Nuevo Formulario Disponible',
            description: `Se requiere información para: ${template?.name || 'Formulario'}`,
            metadata: {
                briefing_id: data.id,
                template_id: templateId,
                template_name: template?.name,
                status: 'pending'
            },
            icon: 'FileText'
        })
    }

    revalidatePath('/briefings')
    return data as FormSubmission
}

export async function getFormSubmissions() {
    return await BriefingService.getBriefingSubmissions()
}

export async function getContactOptions() {
    return await BriefingService.getContactOptions()
}

export async function deleteFormSubmission(id: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error("Unauthorized")

    // We perform a soft delete by setting deleted_at
    const { error } = await supabase
        .from('briefings')
        .update({ 
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) {
        console.error("[deleteFormSubmission] Error:", error)
        throw new Error("No se pudo eliminar el envío")
    }

    revalidatePath('/briefings')
}

export async function getSubmissionById(id: string) {
    return await BriefingService.getBriefingById(id)
}

// --- Public / Wizard Actions ---

export async function getSubmissionByToken(token: string) {
    const supabase = await createClient()
    // Using existing RPC logic
    const { data: submissionData, error } = await supabase
        .rpc('get_briefing_by_token', { p_token: token })
        .maybeSingle()

    if (error || !submissionData) return null

    const templateId = (submissionData as any).template_id
    const { data: templateData } = await supabase
        .from('briefing_templates')
        .select('*')
        .eq('id', templateId)
        .single()

    return {
        ...submissionData,
        template: templateData,
        client: (submissionData as any).client_name ? {
            id: (submissionData as any).client_id,
            name: (submissionData as any).client_name,
            email: ''
        } : undefined
    } as FormSubmission
}

export async function saveSubmissionResponse(submissionId: string, fieldId: string, value: any) {
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    let sanitizedValue = value
    if (value instanceof File) sanitizedValue = value.name
    else if (value === undefined) sanitizedValue = null

    // Check existing
    const { data: existing } = await supabaseAdmin
        .from('briefing_responses')
        .select('id')
        .eq('briefing_id', submissionId)
        .eq('field_id', fieldId)
        .maybeSingle()

    if (existing) {
        await supabaseAdmin
            .from('briefing_responses')
            .update({ value: sanitizedValue })
            .eq('briefing_id', submissionId)
            .eq('field_id', fieldId)
    } else {
        await supabaseAdmin
            .from('briefing_responses')
            .insert({
                briefing_id: submissionId,
                field_id: fieldId,
                value: sanitizedValue
            })
    }

    // Auto-update status from draft -> in_progress
    const { data: current } = await supabaseAdmin
        .from('briefings')
        .select('status')
        .eq('id', submissionId)
        .single()

    if (current && current.status === 'draft') {
        await supabaseAdmin
            .from('briefings')
            .update({ status: 'in_progress' })
            .eq('id', submissionId)
    }

    revalidatePath(`/briefing`) // Public path
}

export async function submitForm(submissionId: string) {
    const supabase = await createClient()

    // Calls existing RPC
    const { error } = await supabase.rpc('submit_briefing', { p_briefing_id: submissionId })
    if (error) throw error

    // Fetch details for notifications
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const { data: submission } = await supabaseAdmin
        .from('briefings')
        .select(`*, template:briefing_templates(name), client:leads!client_id(name, user_id)`)
        .eq('id', submissionId)
        .single()

    if (!submission) return

    // Notify Client
    if (submission.client_id) {
        await supabaseAdmin.from('client_events').insert({
            client_id: submission.client_id,
            type: 'briefing',
            title: 'Formulario Completado',
            description: `Se ha completado: ${submission.template?.name}`,
            metadata: { briefing_id: submission.id },
            icon: 'FileText'
        })

        // Notify Admin
        if (submission.client?.user_id) {
            await supabaseAdmin.from('notifications').insert({
                user_id: submission.client.user_id,
                type: 'briefing_submitted',
                title: '📝 Formulario Recibido',
                message: `Cliente ${submission.client.name} envió: ${submission.template?.name}`,
                client_id: submission.client_id,
                action_url: `/dashboard/briefings/${submission.id}`,
                read: false
            })
        }
    }

    // Send Email (Reuse logic)
    // ... email sending logic here ...
}

export async function getSubmissionResponses(submissionId: string) {
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const { data } = await supabaseAdmin
        .from('briefing_responses')
        .select('*')
        .eq('briefing_id', submissionId)
    return data || []
}




