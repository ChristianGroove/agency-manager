"use server"

import { createClient } from "@/lib/supabase-server"
import { FullBriefingTemplate, Briefing } from "@/types/briefings"
import { revalidatePath } from "next/cache"
import { Resend } from 'resend'
import { getBriefingSubmissionEmailHtml } from '@/lib/email-templates'

// --- Admin Actions ---

export async function getBriefingTemplates() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('briefing_templates')
        .select('*')
        .order('name')

    if (error) throw error
    return data
}

export async function createBriefing(templateId: string, clientId: string | null, serviceId?: string | null) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log("CreateBriefing User:", user?.id, "Auth Error:", authError)

    if (!user) {
        throw new Error("User not authenticated")
    }

    const { data, error } = await supabase
        .from('briefings')
        .insert({
            template_id: templateId,
            client_id: clientId,
            service_id: serviceId,
            status: 'draft'
        })
        .select()
        .single()

    if (error) throw error
    revalidatePath('/briefings')
    return data as Briefing
}

export async function getBriefings() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('briefings')
        .select(`
            *,
            template:briefing_templates(name),
            client:clients(name, email)
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching briefings:", JSON.stringify(error, null, 2))
        throw error
    }

    return data as Briefing[]
}

export async function deleteBriefing(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('briefings')
        .delete()
        .eq('id', id)

    if (error) throw error
    revalidatePath('/briefings')
}

export async function getBriefingById(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('briefings')
        .select(`
            *,
            template:briefing_templates(
                name,
                steps:briefing_steps(
                    id, title, description, order_index,
                    fields:briefing_fields(
                        id, label, type, required, options, order_index
                    )
                )
            ),
            client:clients(name, email)
        `)
        .eq('id', id)
        .single()

    if (error) throw error

    // Sort steps and fields
    if (data.template && data.template.steps) {
        data.template.steps.sort((a: any, b: any) => a.order_index - b.order_index)
        data.template.steps.forEach((step: any) => {
            if (step.fields) {
                step.fields.sort((a: any, b: any) => a.order_index - b.order_index)
            }
        })
    }

    return data as Briefing
}

// --- Public / Wizard Actions ---

export async function getBriefingByToken(token: string) {
    const supabase = await createClient()

    // 1. Get Briefing via RPC
    const { data: briefingData, error: briefingError } = await supabase
        .rpc('get_briefing_by_token', { p_token: token })
        .single()

    if (briefingError) {
        console.error("Error in getBriefingByToken (RPC):", JSON.stringify(briefingError, null, 2))
        return null
    }

    if (!briefingData) return null

    // 2. Fetch Template Details (Publicly accessible)
    // Cast to any to access template_id which might be missing in inferred type
    const templateId = (briefingData as any).template_id

    const { data: templateData, error: templateError } = await supabase
        .from('briefing_templates')
        .select(`
            *,
            steps:briefing_steps(
                id, title, description, order_index,
                fields:briefing_fields(
                    id, label, type, required, options, order_index
                )
            )
        `)
        .eq('id', templateId)
        .single()

    if (templateError) {
        console.error("Error fetching template for briefing:", JSON.stringify(templateError, null, 2))
        throw templateError
    }

    // Sort steps and fields
    if (templateData && templateData.steps) {
        templateData.steps.sort((a: any, b: any) => a.order_index - b.order_index)
        templateData.steps.forEach((step: any) => {
            if (step.fields) {
                step.fields.sort((a: any, b: any) => a.order_index - b.order_index)
            }
        })
    }

    return {
        ...briefingData,
        template: templateData,
        client: (briefingData as any).client_name ? {
            id: (briefingData as any).client_id,
            name: (briefingData as any).client_name,
            email: '' // Not available via public RPC
        } : undefined
    } as Briefing
}

export async function saveBriefingResponse(briefingId: string, fieldId: string, value: any) {
    const supabase = await createClient()

    // Use RPC to save response securely
    const { error } = await supabase
        .rpc('save_briefing_response', {
            p_briefing_id: briefingId,
            p_field_id: fieldId,
            p_value: value
        })

    if (error) {
        console.error("Error saving response:", error)
        throw error
    }
}



export async function submitBriefing(briefingId: string) {
    const supabase = await createClient()

    // Use RPC to submit securely
    const { error } = await supabase
        .rpc('submit_briefing', { p_briefing_id: briefingId })

    if (error) throw error

    // Fetch briefing details for event and email
    // Fetch briefing details for event and email using Admin (bypass RLS)
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    const { data: briefing, error: fError } = await supabaseAdmin
        .from('briefings')
        .select(`
            *,
            template:briefing_templates(name),
            client:clients(name)
        `)
        .eq('id', briefingId)
        .single()

    if (fError || !briefing) {
        console.error("Error fetching briefing for event:", fError)
        return // Can't send email or create event if we can't fetch details
    }

    // Create Client Event
    if (briefing.client_id) {
        await supabaseAdmin.from('client_events').insert({
            client_id: briefing.client_id,
            type: 'briefing',
            title: 'Briefing Completado',
            description: `Se ha completado el briefing: ${briefing.template?.name}`,
            metadata: {
                briefing_id: briefing.id,
                template_name: briefing.template?.name
            },
            icon: 'FileText'
        })
    }

    // Send email notification
    try {
        const apiKey = process.env.RESEND_API_KEY
        if (apiKey) {
            const resend = new Resend(apiKey)

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            const briefingLink = `${appUrl}/briefings/${briefingId}`

            const emailHtml = getBriefingSubmissionEmailHtml(
                briefing.client?.name || 'Cliente',
                briefing.template?.name || 'Briefing',
                briefingLink
            )

            await resend.emails.send({
                from: 'Pixy <facturacion@billing.pixy.com.co>',
                to: ['contact@pixy.com.co'],
                subject: `Nuevo Briefing: ${briefing.client?.name} - ${briefing.template?.name}`,
                html: emailHtml
            })
        } else {
            console.warn("RESEND_API_KEY missing, skipping email notification")
        }
    } catch (emailError) {
        console.error("Error sending submission email:", emailError)
        // Don't throw, let the submission succeed
    }
}

export async function getBriefingResponses(briefingId: string) {
    const supabase = await createClient()

    // Use RPC
    const { data, error } = await supabase
        .rpc('get_briefing_responses', { p_briefing_id: briefingId })

    if (error) throw error
    return data
}
