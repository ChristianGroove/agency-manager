"use server"

import { createClient } from "@/lib/supabase-server"
import { FullBriefingTemplate, Briefing } from "@/types/briefings"
import { revalidatePath } from "next/cache"
import { Resend } from 'resend'
import { getBriefingSubmissionEmailHtml } from '@/lib/email-templates'

// --- Admin Actions ---

// --- Admin Actions ---

export async function getBriefingTemplates() {
    const supabase = await createClient()
    const { data: rawData, error } = await supabase
        .from('briefing_templates')
        .select('*')
        .order('name')

    if (error) throw error

    // Ensure structure is typed correctly if needed, generally it comes as JSON
    const data = rawData?.map(t => ({
        ...t,
        structure: t.structure || []
    }))

    return data as FullBriefingTemplate[]
}

export async function createBriefingTemplate(data: {
    name: string
    description?: string
    slug: string
    structure: any[] // BriefingField[] but we accept any for flexibility
}) {
    const supabase = await createClient()

    const { data: template, error } = await supabase
        .from('briefing_templates')
        .insert({
            name: data.name,
            description: data.description || null,
            slug: data.slug,
            structure: data.structure
        })
        .select()
        .single()

    if (error) throw error
    revalidatePath('/portfolio')
    return template as FullBriefingTemplate
}

export async function updateBriefingTemplate(
    id: string,
    data: {
        name?: string
        description?: string
        slug?: string
        structure?: any[]
    }
) {
    const supabase = await createClient()

    const { data: template, error } = await supabase
        .from('briefing_templates')
        .update(data)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    revalidatePath('/portfolio')
    return template as FullBriefingTemplate
}

export async function deleteBriefingTemplate(id: string) {
    const supabase = await createClient()

    // Check if template is in use
    const { data: briefings } = await supabase
        .from('briefings')
        .select('id')
        .eq('template_id', id)
        .limit(1)

    if (briefings && briefings.length > 0) {
        throw new Error('No se puede eliminar una plantilla que está en uso')
    }

    const { error } = await supabase
        .from('briefing_templates')
        .delete()
        .eq('id', id)

    if (error) throw error
    revalidatePath('/portfolio')
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
        .is('deleted_at', null)
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
        .update({ deleted_at: new Date().toISOString() })
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
            template:briefing_templates(*),
            client:clients(name, email)
        `)
        .eq('id', id)
        .single()

    if (error) throw error
    // No sorting needed for JSONB structure if it's already sorted
    return data as Briefing
}

// --- Public / Wizard Actions ---

export async function getBriefingByToken(token: string) {
    const supabase = await createClient()

    // 1. Get Briefing via RPC
    const { data: briefingData, error: briefingError } = await supabase
        .rpc('get_briefing_by_token', { p_token: token })
        .maybeSingle()

    if (briefingError) {
        console.error("❌ Error in getBriefingByToken (RPC):", JSON.stringify(briefingError, null, 2))
        return null
    }

    if (!briefingData) {
        console.warn("⚠️ getBriefingByToken returned no data for token:", token)
        return null
    }

    if (!briefingData) return null

    // 2. Fetch Template Details (Publicly accessible)
    // Cast to any to access template_id which might be missing in inferred type
    const templateId = (briefingData as any).template_id

    const { data: templateData, error: templateError } = await supabase
        .from('briefing_templates')
        .select('*')
        .eq('id', templateId)
        .single()

    if (templateError) {
        console.error("Error fetching template for briefing:", JSON.stringify(templateError, null, 2))
        throw templateError
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
    // Use Admin client to bypass RLS (portal clients aren't authenticated)
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    // Ensure value is JSON-serializable (handles File objects, undefined, etc.)
    let sanitizedValue = value
    if (value instanceof File) {
        // For files, we'd need to upload separately - for now just store filename
        sanitizedValue = value.name
    } else if (value === undefined) {
        sanitizedValue = null
    }

    // NOTE: Supabase automatically handles JSON serialization for JSONB columns
    // We send the value directly, no need to wrap it

    // First, try to check if response already exists
    const { data: existing } = await supabaseAdmin
        .from('briefing_responses')
        .select('id')
        .eq('briefing_id', briefingId)
        .eq('field_id', fieldId)
        .maybeSingle() // Use maybeSingle() - returns null if not found, no error

    if (existing) {
        // Update existing response (trigger handles updated_at)
        const { error } = await supabaseAdmin
            .from('briefing_responses')
            .update({ value: sanitizedValue })
            .eq('briefing_id', briefingId)
            .eq('field_id', fieldId)

        if (error) {
            console.error("Error updating response:", error)
            throw error
        }
    } else {
        // Insert new response
        const { error } = await supabaseAdmin
            .from('briefing_responses')
            .insert({
                briefing_id: briefingId,
                field_id: fieldId,
                value: sanitizedValue
            })

        if (error) {
            console.error("Error inserting response:", error)
            throw error
        }
    }

    // Update briefing status to 'in_progress' if it's currently 'draft'
    // This ensures that as soon as the user starts typing/saving, it moves out of draft
    const { data: currentBriefing } = await supabaseAdmin
        .from('briefings')
        .select('status')
        .eq('id', briefingId)
        .single()

    if (currentBriefing && currentBriefing.status === 'draft') {
        await supabaseAdmin
            .from('briefings')
            .update({ status: 'in_progress' })
            .eq('id', briefingId)
    }

    revalidatePath(`/briefing`)
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
            client:clients(name, user_id)
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

        // Create Admin Notification
        if (briefing.client?.user_id) {
            await supabaseAdmin.from('notifications').insert({
                user_id: briefing.client.user_id,
                type: 'briefing_submitted',
                title: '📝 Briefing Completado',
                message: `El cliente ${briefing.client.name} ha completado el briefing: ${briefing.template?.name}`,
                client_id: briefing.client_id,
                action_url: `/dashboard/briefings/${briefing.id}`,
                read: false
            })
        }
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
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    // Direct query to briefing_responses (bypasses RLS for admin)
    const { data, error } = await supabaseAdmin
        .from('briefing_responses')
        .select('*')
        .eq('briefing_id', briefingId)

    if (error) {
        console.error("Error fetching briefing responses:", error)
        throw error
    }

    // Return responses directly (values are stored as-is in JSONB)
    return data || []
}
