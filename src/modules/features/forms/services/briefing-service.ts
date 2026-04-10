import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { FullBriefingTemplate, Briefing } from "@/types/briefings"

/**
 * Service Layer for Forms/Briefings Module
 * Pure business logic and database interactions.
 */

export async function getBriefingTemplates() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    let query = supabase.from('briefing_templates').select('*').order('name')
    if (orgId) query = query.eq('organization_id', orgId)

    const { data: rawData, error } = await query
    if (error) throw error

    return (rawData || []).map(t => ({
        ...t,
        structure: t.structure || []
    })) as FullBriefingTemplate[]
}

export async function createBriefingTemplate(data: Partial<FullBriefingTemplate>) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No Organization Context")

    const { data: template, error } = await supabase
        .from('briefing_templates')
        .insert({
            ...data,
            organization_id: orgId
        })
        .select()
        .single()

    if (error) throw error
    return template as FullBriefingTemplate
}

export async function updateBriefingTemplate(id: string, data: Partial<FullBriefingTemplate>) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error("No organization context")

    const { data: template, error } = await supabase
        .from('briefing_templates')
        .update(data)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()

    if (error) throw error
    return template as FullBriefingTemplate
}

export async function deleteBriefingTemplate(id: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error("Unauthorized")

    // Check for existing briefings
    const { data: submissions } = await supabase
        .from('briefings')
        .select('id')
        .eq('template_id', id)
        .limit(1)

    if (submissions && submissions.length > 0) {
        throw new Error('No se puede eliminar una plantilla que tiene envíos asociados')
    }

    const { error } = await supabase
        .from('briefing_templates')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)

    if (error) throw error
}

// SUBMISSIONS

export async function getBriefingSubmissions() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('briefings')
        .select(`
            *,
            template:briefing_templates(name),
            client:leads!client_id(name, email)
        `)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("[BriefingService.getBriefingSubmissions] Error:", error)
        throw error
    }

    return data as Briefing[]
}

export async function getBriefingById(id: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    const { data, error } = await supabase
        .from('briefings')
        .select(`
            *,
            template:briefing_templates(*),
            client:leads!client_id(name, email)
        `)
        .eq('id', id)
        .eq('organization_id', orgId)
        .single()

    if (error) throw error
    return data as Briefing
}

export async function createBriefingSubmission(templateId: string, clientId: string | null, serviceId?: string | null) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No Organization Context")

    const { data, error } = await supabase
        .from('briefings')
        .insert({
            template_id: templateId,
            client_id: clientId,
            service_id: serviceId,
            status: 'draft',
            organization_id: orgId
        })
        .select()
        .single()

    if (error) throw error
    return data as Briefing
}

export async function updateBriefingStatus(id: string, status: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('briefings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

/**
 * Retrieves all "Master Contacts" (contact_type='client') for the current organization.
 */
export async function getContactOptions() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('leads')
        .select('id, name, email')
        .eq('organization_id', orgId)
        .eq('contact_type', 'client')
        .is('deleted_at', null)
        .order('name')

    if (error) {
        console.error('[BriefingService.getContactOptions] Error:', error)
        return []
    }

    return data
}

