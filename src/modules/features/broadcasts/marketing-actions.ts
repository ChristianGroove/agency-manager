'use server'
import { emailEnvironmentIssues } from './marketing-email-environment'

import type { CampaignMetrics } from './marketing-metrics'
import { campaignDesignIssues } from './marketing-preflight'

import { createClient } from '@/modules/core/database/supabase-server'
import { requireMarketingAccess, assertMarketingChannelAccess } from './marketing-access'
import { audienceFiltersSchema, deliveryConfigSchema, normalizeDelay, publicMarketingError } from './marketing-contracts'
import { templateSelectionSchema, validateCampaignTemplate } from './marketing-template-contract'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { z } from 'zod'
import { emailContentSchema } from './marketing-email-contracts'
import { revalidatePath } from 'next/cache'

export interface Campaign {
    id: string
    name: string
    description?: string
    goal?: string
    status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
    tags?: string[]
    delivery_config?: DeliveryConfig
    connection_id?: string | null
    channel?: 'whatsapp' | 'email'
    smtp_config_id?: string | null
    scheduled_for?: string | null
    execution_version?: number | null
    paused_reason?: string | null
    total_enrolled: number
    total_completed: number
    engagement_score: number
    created_at: string
}

import { DeliveryConfig } from './marketing-utils'

export interface Audience {
    id: string
    name: string
    description?: string
    type: 'dynamic' | 'static'
    filter_config: any
    cached_count: number
    created_at: string
}

// ... (Existing interfaces: Sequence, MarketingStep) ...
export interface Sequence {
    id: string
    campaign_id: string
    name: string
    trigger_type: string
    trigger_config: any
    is_active: boolean
    steps?: MarketingStep[]
}

export interface MarketingStep {
    id: string
    sequence_id: string
    type: string
    name: string
    order_index: number
    content: any
    delay_config?: any
    condition_config?: any
}


// --- CAMPAIGNS ---

export async function getCampaigns() {
    try {
        const access = await requireMarketingAccess('view')

        const supabase = await createClient()
        const { data, error } = await supabase
            .from('marketing_campaigns')
            .select('*').eq('organization_id', access.organizationId)
            .order('created_at', { ascending: false })

        if (error) return { success: false, error: error.message }
        return { success: true, campaigns: data as Campaign[] }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function getCampaign(id: string) {
    try {
        const access = await requireMarketingAccess('view')

        const supabase = await createClient()
        const { data, error } = await supabase
            .from('marketing_campaigns')
            .select('*').eq('organization_id', access.organizationId)
            .eq('id', id)
            .single()

        if (error) return { success: false, error: error.message }
        return { success: true, campaign: data as Campaign, executionEnabled: process.env.MARKETING_EXECUTION_ENABLED === 'true' }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function createCampaign(data: { name: string, description?: string, goal?: string }) {
    try {
        const access = await requireMarketingAccess('manage')

        data = z.object({name:z.string().trim().min(1).max(160), description:z.string().max(2000).optional(),goal:z.string().max(100).optional()}).strict().parse(data)

        const supabase = await createClient()

        // Get Org ID
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const member = { organization_id: access.organizationId }

        const { data: campaign, error } = await supabase
            .from('marketing_campaigns')
            .insert({
                organization_id: member.organization_id,
                name: data.name,
                description: data.description,
                goal: data.goal,
                delivery_config: { mode: 'growth', humanize: true, timezone: 'America/Bogota', recipient_cooldown_hours: 24 },
                created_by: user.id
            })
            .select().eq('organization_id', access.organizationId)
            .single()

        if (error) return { success: false, error: error.message }

        revalidatePath('/crm/marketing')
        return { success: true, campaign }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function createQuickCampaign(input: {
    name: string; channel: 'whatsapp' | 'sms' | 'email'; filters: Record<string, unknown>;
    connection_id: string; template_id: string; template_name: string; template_language: string;
    bindings: Record<string, string>; delivery_config?: DeliveryConfig
}) {
    try {
        const access = await requireMarketingAccess('manage')
        const data = z.object({ name: z.string().trim().min(1).max(160), channel: z.literal('whatsapp'),
            filters: audienceFiltersSchema, connection_id: z.string().uuid(), template_id: z.string().uuid(),
            template_name: z.string().min(1).max(512), template_language: z.string().min(1).max(32),
            bindings: z.record(z.string(), z.string()), delivery_config: deliveryConfigSchema.optional(),
        }).strict().parse(input)
        assertMarketingChannelAccess(access, data.connection_id)
        const template = await access.session.from('messaging_templates').select('id,channel_id,name,language,status,category,meta_id,components')
            .eq('organization_id', access.organizationId).eq('channel_id', data.connection_id).eq('id', data.template_id).single()
        if (template.error || !template.data) throw new Error('Plantilla no disponible en el número seleccionado.')
        const content = validateCampaignTemplate(template.data, { template_id: data.template_id, template_name: data.template_name,
            template_language: data.template_language, bindings: data.bindings }, data.connection_id)
        const result = await access.session.rpc('create_marketing_quick_draft', { p_org: access.organizationId, p_name: data.name,
            p_connection: data.connection_id, p_template: data.template_id, p_content: content, p_filters: data.filters,
            p_delivery: data.delivery_config || { mode: 'growth', humanize: true, timezone: 'America/Bogota', recipient_cooldown_hours: 24 } })
        if (result.error || !result.data) throw new Error('No se pudo guardar el borrador completo. No se crearon registros parciales.')
        revalidatePath('/crm/marketing')
        return { success: true as const, campaign: result.data }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function updateCampaign(id: string, data: Partial<Campaign>) {
    try {
        const access = await requireMarketingAccess(data.status ? 'execute' : 'manage')

        if (data.status && Object.keys(data).some(key => key !== 'status')) return { success: false, error: 'El control de ejecución no puede modificar el contenido de la campaña.' }

        if (data.status === 'active') return { success: false, error: 'Usa la activación validada de la campaña.' }
        const updates = z.object({
            name: z.string().trim().min(1).max(160).optional(), description: z.string().max(2000).optional(),
            goal: z.string().max(100).optional(), tags: z.array(z.string().max(100)).max(50).optional(),
            status: z.enum(['draft', 'paused', 'archived']).optional(),
            connection_id: z.string().uuid().nullable().optional(),
            channel: z.enum(['whatsapp', 'email']).optional(),
            smtp_config_id: z.string().uuid().nullable().optional(),
            scheduled_for: z.string().datetime({ offset: true }).nullable().optional(),
            delivery_config: deliveryConfigSchema.optional(),
        }).strict().parse(data)

        if (updates.connection_id) assertMarketingChannelAccess(access, updates.connection_id)
        const supabase = data.status ? supabaseAdmin : access.session
        const current = await access.session.from('marketing_campaigns').select('id,status,execution_version')
            .eq('id', id).eq('organization_id', access.organizationId).single()
        if (current.error || !current.data) return { success: false, error: 'Campaña no encontrada.' }
        if (data.status === 'draft' && current.data.execution_version) return { success: false, error: 'Una campaña ejecutada no puede volver a borrador.' }
        const { error } = await supabase
            .from('marketing_campaigns')
            .update(updates).eq('organization_id', access.organizationId)
            .eq('id', id).select('id').single()

        if (error) return { success: false, error: error.message }

        revalidatePath('/crm/marketing')
        return { success: true }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function deleteCampaign(id: string) {
    try {
        const access = await requireMarketingAccess('manage')

        const supabase = await createClient()
        const { error } = await supabase
            .from('marketing_campaigns')
            .delete().eq('organization_id', access.organizationId)
            .eq('id', id).select('id').single()

        if (error) return { success: false, error: error.message }

        revalidatePath('/crm/marketing')
        return { success: true }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

// --- AUDIENCES (New) ---

export async function getAudiences() {
    try {
        const access = await requireMarketingAccess('view')

        const adminClient = (await createClient())
        const { data, error } = await adminClient
            .from('marketing_audiences')
            .select('*').eq('organization_id', access.organizationId)
            .order('created_at', { ascending: false })

        if (error) return { success: false, error: error.message }
        return { success: true, audiences: data as Audience[] }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function createAudience(data: { name: string, description?: string, filter_config: any }) {
    try {
        const access = await requireMarketingAccess('manage')

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const member = { organization_id: access.organizationId }

        data = z.object({ name: z.string().trim().min(1).max(160), description: z.string().max(2000).optional(), filter_config: audienceFiltersSchema }).strict().parse(data)
        const summary = await access.session.rpc('marketing_audience_summary', { p_org: access.organizationId, p_filters: data.filter_config })
        if (summary.error || !summary.data) throw new Error('No se pudo revisar la audiencia; no se guardó una estimación vacía.')
        const count = summary.data.eligible

        const freshAdmin = supabase

        const { data: audience, error } = await freshAdmin
            .from('marketing_audiences')
            .insert({
                organization_id: member.organization_id,
                name: data.name,
                description: data.description,
                type: 'dynamic',
                filter_config: data.filter_config,
                cached_count: count,
                created_by: user.id
            })
            .select().eq('organization_id', access.organizationId)
            .single()

        if (error) {
            console.error('Create Audience INSERT Error:', error)
            return { success: false, error: 'DB Error: ' + error.message }
        }

        revalidatePath('/crm/marketing')
        return { success: true, audience }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function deleteAudience(id: string) {
    try {
        const access = await requireMarketingAccess('manage')

        const freshAdmin = await createClient()

        const { error } = await freshAdmin.from('marketing_audiences').delete().eq('organization_id', access.organizationId).eq('id', id).select('id').single()
        if (error) return { success: false, error: error.message }
        revalidatePath('/crm/marketing')
        return { success: true }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function updateAudience(id: string, data: { name?: string, description?: string, filter_config?: any }) {
    try {
        const access = await requireMarketingAccess('manage')

        data = z.object({name:z.string().trim().min(1).max(160).optional(), description:z.string().max(2000).optional(),filter_config:z.record(z.string(),z.unknown()).optional()}).strict().parse(data)

        const adminClient = (await createClient())

        // If filter_config changed, recalculate count
        let updates: any = { ...data }
        if (data.filter_config) {
            const countResult = await previewAudienceCount(data.filter_config)
            if (!countResult.success) return { success: false, error: countResult.error }
            updates.cached_count = countResult.count
            updates.last_count_at = new Date().toISOString()
        }

        const { error } = await adminClient
            .from('marketing_audiences')
            .update(updates).eq('organization_id', access.organizationId)
            .eq('id', id).select('id').single()

        if (error) return { success: false, error: error.message }
        revalidatePath('/crm/marketing')
        return { success: true }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function getAudienceById(id: string) {
    try {
        const access = await requireMarketingAccess('view')

        const adminClient = (await createClient())
        const { data, error } = await adminClient
            .from('marketing_audiences')
            .select('*').eq('organization_id', access.organizationId)
            .eq('id', id)
            .single()

        if (error) return { success: false, error: error.message }
        return { success: true, audience: data as Audience }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function linkAudienceToCampaign(campaignId: string, audienceId: string | null) {
    try {
        const access = await requireMarketingAccess('manage')

        const adminClient = (await createClient())
        const { error } = await adminClient
            .from('marketing_campaigns')
            .update({ audience_id: audienceId }).eq('organization_id', access.organizationId)
            .eq('id', campaignId).select('id').single()

        if (error) return { success: false, error: error.message }
        revalidatePath('/crm/marketing')
        return { success: true }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function enrollAudienceInCampaign(campaignId: string, confirmation?: { token: string; confirmed: boolean }) {
    try {
        const access = await requireMarketingAccess('execute')

        // Deployment opt-in stays off until scheduling, incoming opt-outs and live validation are ready.
        if (process.env.MARKETING_EXECUTION_ENABLED !== 'true') return {
            success: false, enrolled: 0, error: 'El motor de campañas aún no está habilitado en este entorno.'
        }
        const confirmed = z.object({ token: z.string().uuid(), confirmed: z.literal(true) }).strict().parse(confirmation)
        z.string().uuid().parse(campaignId)
        const visible = await access.session.from('marketing_campaigns').select('connection_id,channel')
            .eq('organization_id', access.organizationId).eq('id', campaignId).single()
        if (visible.data?.channel === 'email') {
            const prepared = await supabaseAdmin.rpc('read_marketing_email_preflight', { p_org: access.organizationId, p_campaign: campaignId })
            if (prepared.error || !prepared.data) throw new Error('No se pudo revisar el diseño de email.')
            const issues = [...campaignDesignIssues(prepared.data, prepared.data.campaign.execution_version === 3), ...emailEnvironmentIssues()]
            if (issues.length) return { success: false, enrolled: 0, error: issues.join(' ') }
            const result = await supabaseAdmin.rpc('confirm_marketing_email_activation', { p_org: access.organizationId, p_actor: access.userId, p_campaign: campaignId, p_ticket: confirmed.token })
            if (result.error || !result.data) throw new Error('Cambió el diseño, el emisor, la audiencia o tus permisos. Revisa de nuevo.')
            revalidatePath('/crm/marketing')
            return { success: true, enrolled: result.data.enrolled, resumed: prepared.data.campaign.execution_version === 3 }
        }
        if (visible.error || !visible.data?.connection_id) throw new Error('Campaña o número emisor no disponible.')
        assertMarketingChannelAccess(access, visible.data.connection_id)
        const prepared = await supabaseAdmin.rpc('read_marketing_activation', { p_org: access.organizationId, p_campaign: campaignId })
        if (prepared.error || !prepared.data) throw new Error('No se pudo revisar el diseño antes de activar.')
        assertMarketingChannelAccess(access, prepared.data.design.campaign.connection_id)
        audienceFiltersSchema.parse(prepared.data.design.filters)
        const existingRecipients = prepared.data.review.campaign.execution_version === 2
            && ['paused', 'active'].includes(prepared.data.review.campaign.status)
        const issues = campaignDesignIssues(prepared.data.review, existingRecipients)
        if (issues.length) return { success: false, enrolled: 0, error: issues.join(' ') }
        const activated = await supabaseAdmin.rpc('confirm_marketing_activation_review', { p_org: access.organizationId,
            p_campaign: campaignId, p_ticket: confirmed.token, p_actor: access.userId })
        if (activated.error || !activated.data) throw new Error('No se pudo activar. El diseño o los permisos pudieron cambiar; revisa de nuevo.')
        revalidatePath('/crm/marketing')
        return { success: true, enrolled: activated.data.enrolled, resumed: activated.data.resumed }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function optOutLead(leadId: string) {
    try {
        const access = await requireMarketingAccess('execute')
        const lead = await access.session.from('leads').select('phone').eq('organization_id', access.organizationId).eq('id', leadId).single()
        if (lead.error || !lead.data) throw new Error('Contacto no encontrado.')
        const result = await supabaseAdmin.rpc('revoke_marketing_contact', { p_org: access.organizationId, p_contact: leadId, p_actor: access.userId })
        if (result.error) throw new Error('No se pudo guardar la baja de forma completa; reintenta.')
        return { success: true as const }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function previewAudienceCount(filters: unknown) {
    try {
        const access = await requireMarketingAccess('view')
        const result = await access.session.rpc('marketing_audience_summary', { p_org: access.organizationId, p_filters: audienceFiltersSchema.parse(filters || {}) })
        if (result.error || !result.data) throw new Error('No se pudo revisar la audiencia.')
        return { success: true as const, count: result.data.eligible as number }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function importLeads(_leads: any[]) {
    try {
        await requireMarketingAccess('import')
        return { success: false, count: 0, error: 'La importación de Marketing está en preparación: requiere revisión de duplicados y evidencia de consentimiento. No se importaron contactos.' }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

// --- SEQUENCES ---

export async function getSequences(campaignId?: string) {
    try {
        const access = await requireMarketingAccess('view')

        const supabase = await createClient()
        let query = supabase.from('marketing_sequences').select('*, steps:marketing_steps(*)').eq('organization_id', access.organizationId)

        if (campaignId) {
            query = query.eq('campaign_id', campaignId)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) return { success: false, error: error.message }

        // Sort steps by order_index
        const sequences = data?.map(seq => ({
            ...seq,
            steps: seq.steps?.sort((a: any, b: any) => a.order_index - b.order_index || a.id.localeCompare(b.id))
        }))

        return { success: true, sequences: sequences as Sequence[] }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function createSequence(data: { name: string, campaign_id: string, trigger_type: string }) {
    try {
        const access = await requireMarketingAccess('manage')

        data = z.object({name:z.string().trim().min(1).max(160),campaign_id:z.string().uuid(),trigger_type:z.literal('manual')}).strict().parse(data)

        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const member = { organization_id: access.organizationId }

        const { data: sequence, error } = await supabase
            .from('marketing_sequences')
            .insert({
                organization_id: member.organization_id,
                name: data.name,
                campaign_id: data.campaign_id,
                trigger_type: data.trigger_type,
                is_active: true
            })
            .select().eq('organization_id', access.organizationId)
            .single()

        if (error) return { success: false, error: error.message }

        revalidatePath(`/crm/marketing/campaigns/${data.campaign_id}`)
        return { success: true, sequence }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function setPrincipalSequence(campaignId: string, sequenceId: string) {
    try {
        const access = await requireMarketingAccess('manage')
        z.string().uuid().parse(campaignId); z.string().uuid().parse(sequenceId)
        const result = await access.session.rpc('set_marketing_principal', { p_org: access.organizationId, p_campaign: campaignId, p_sequence: sequenceId })
        if (result.error) throw new Error('No se pudo cambiar el flujo principal. Solo se permiten cambios en borradores de esta organización.')
        revalidatePath(`/crm/marketing/campaigns/${campaignId}`)
        return { success: true as const }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

// --- STEPS ---

async function validateStepSelection(access: Awaited<ReturnType<typeof requireMarketingAccess>>, sequenceId: string, input: unknown) {
    const selection = templateSelectionSchema.parse(input)
    const sequence = await access.session.from('marketing_sequences').select('campaign_id').eq('organization_id', access.organizationId).eq('id', sequenceId).single()
    if (sequence.error || !sequence.data) throw new Error('Secuencia no encontrada.')
    const campaign = await access.session.from('marketing_campaigns').select('connection_id').eq('organization_id', access.organizationId).eq('id', sequence.data.campaign_id).single()
    if (campaign.error || !campaign.data?.connection_id) throw new Error('Selecciona y guarda el número emisor de la campaña primero.')
    assertMarketingChannelAccess(access, campaign.data.connection_id)
    const template = await access.session.from('messaging_templates').select('id,channel_id,name,language,status,category,meta_id,components')
        .eq('organization_id', access.organizationId).eq('channel_id', campaign.data.connection_id).eq('id', selection.template_id).single()
    if (template.error || !template.data) throw new Error('La plantilla no está disponible en este canal.')
    return validateCampaignTemplate(template.data, selection, campaign.data.connection_id)
}

async function validateEmailStep(access: Awaited<ReturnType<typeof requireMarketingAccess>>, sequenceId: string, input: unknown) {
    const seq = await access.session.from('marketing_sequences').select('campaign_id').eq('organization_id', access.organizationId).eq('id', sequenceId).single()
    if (seq.error || !seq.data) throw new Error('Secuencia no disponible.')
    const campaign = await access.session.from('marketing_campaigns').select('channel,smtp_config_id').eq('organization_id', access.organizationId).eq('id', seq.data.campaign_id).single()
    if (campaign.error || campaign.data?.channel !== 'email' || !campaign.data.smtp_config_id) throw new Error('Selecciona y guarda el emisor de email primero.')
    return emailContentSchema.parse(input)
}

export async function addStepToSequence(sequenceId: string, stepData: {
    type: string,
    name: string,
    content: any,
    delay_config?: any
}) {
    try {
        const access = await requireMarketingAccess('manage')

        stepData = z.object({type:z.enum(['whatsapp','email','delay']),name:z.string().trim().min(1).max(160),content:z.record(z.string(),z.unknown()),delay_config:z.any().optional()}).strict().parse(stepData)
        if (stepData.type === 'delay') stepData.delay_config = normalizeDelay(stepData.delay_config)
        else if (stepData.type === 'email') stepData.content = await validateEmailStep(access, sequenceId, stepData.content)
        else stepData.content = await validateStepSelection(access, sequenceId, stepData.content)

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const member = { organization_id: access.organizationId }

        const { data: step, error } = await supabase
            .from('marketing_steps')
            .insert({
                organization_id: member.organization_id,
                sequence_id: sequenceId,
                type: stepData.type,
                name: stepData.name,
                content: stepData.content,
                delay_config: stepData.delay_config,
                // The database assigns max(order_index)+1 under the campaign lock.
                order_index: 0
            })
            .select().eq('organization_id', access.organizationId)
            .single()

        if (error) return { success: false, error: error.message }

        const { data: seq } = await supabase.from('marketing_sequences').select('campaign_id').eq('organization_id', access.organizationId).eq('id', sequenceId).single()
        if (seq) {
            revalidatePath(`/crm/marketing/campaigns/${seq.campaign_id}`)
        }

        return { success: true, step }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}


export async function deleteStep(stepId: string) {
    try {
        const access = await requireMarketingAccess('manage')

        const supabase = await createClient()
        const { data: step } = await supabase.from('marketing_steps').select('sequence_id').eq('organization_id', access.organizationId).eq('id', stepId).single()
        if (!step) return { success: false, error: 'Step not found' }

        const { error } = await supabase
            .from('marketing_steps')
            .delete().eq('organization_id', access.organizationId)
            .eq('id', stepId).select('id').single()

        if (error) return { success: false, error: error.message }

        const { data: seq } = await supabase.from('marketing_sequences').select('campaign_id').eq('organization_id', access.organizationId).eq('id', step.sequence_id).single()
        if (seq) {
            revalidatePath(`/crm/marketing/campaigns/${seq.campaign_id}`)
        }

        return { success: true }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}


export async function updateStep(stepId: string, data: any) {
    try {
        const access = await requireMarketingAccess('manage')

        const supabase = await createClient()
        const { data: step } = await supabase.from('marketing_steps').select('sequence_id').eq('organization_id', access.organizationId).eq('id', stepId).single()
        if (!step) return { success: false, error: 'Step not found' }

        const updates = z.object({
            type: z.enum(['whatsapp','email','delay']), name: z.string().trim().min(1).max(160),
            content: z.record(z.string(), z.unknown()), delay_config: z.any().optional(),
        }).strict().parse(data)
        if (updates.type === 'delay') updates.delay_config = normalizeDelay(updates.delay_config)
        else if (updates.type === 'email') updates.content = await validateEmailStep(access, step.sequence_id, updates.content)
        else updates.content = await validateStepSelection(access, step.sequence_id, updates.content)
        const { error } = await supabase
            .from('marketing_steps')
            .update(updates).eq('organization_id', access.organizationId)
            .eq('id', stepId).select('id').single()

        if (error) return { success: false, error: error.message }

        const { data: seq } = await supabase.from('marketing_sequences').select('campaign_id').eq('organization_id', access.organizationId).eq('id', step.sequence_id).single()
        if (seq) {
            revalidatePath(`/crm/marketing/campaigns/${seq.campaign_id}`)
        }
        return { success: true }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function deleteSequence(sequenceId: string) {
    try {
        const access = await requireMarketingAccess('manage')

        const supabase = await createClient()
        const { data: seq } = await supabase.from('marketing_sequences').select('campaign_id').eq('organization_id', access.organizationId).eq('id', sequenceId).single()
        if (!seq) return { success: false, error: 'Sequence not found' }

        const { error } = await supabase
            .from('marketing_sequences')
            .delete().eq('organization_id', access.organizationId)
            .eq('id', sequenceId).select('id').single()

        if (error) return { success: false, error: error.message }

        revalidatePath(`/crm/marketing/campaigns/${seq.campaign_id}`)
        return { success: true }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function getCampaignStats(campaignId: string) {
    try {
        const access = await requireMarketingAccess('view')

        z.string().uuid().parse(campaignId)
        const result = await access.session.rpc('read_marketing_campaign_metrics', {
            p_org: access.organizationId, p_campaign: campaignId,
        })
        if (result.error || !result.data) throw new Error('No se pudieron consultar los resultados de la campa\u00f1a.')
        return { success: true as const, ...result.data as CampaignMetrics }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

// --- ANALYTICS ---

export async function getMarketingStats() {
    try {
        const access = await requireMarketingAccess('view')

        const supabase = await createClient()
        const [campaignsParams, accepted, delivered, emails] = await Promise.all([
            supabase.from('marketing_campaigns').select('id', { count: 'exact', head: true }).eq('organization_id', access.organizationId),
            supabaseAdmin.from('meta_outbound_outbox').select('id', {count:'exact',head:true})
                .eq('organization_id',access.organizationId).like('operation_key','campaign:%').eq('status','accepted'),
            supabaseAdmin.from('meta_outbound_outbox').select('id,message:messages!inner(status)', {count:'exact',head:true})
                .eq('organization_id',access.organizationId).like('operation_key','campaign:%').in('message.status',['delivered','read']),
            supabaseAdmin.from('marketing_email_outbox').select('id', { count: 'exact', head: true }).eq('organization_id', access.organizationId).eq('status', 'accepted'),
        ])
        if (campaignsParams.error || accepted.error || delivered.error || emails.error) throw new Error('No se pudieron consultar los resultados de campañas.')

        const totalCampaigns = campaignsParams.count || 0
        const totalMessages = (accepted.count || 0) + (emails.count || 0)
        const totalDelivered = delivered.count || 0

        return {
            totalCampaigns,
            totalMessages,
            totalDelivered,
            deliveryRate: totalMessages > 0 ? Math.round((totalDelivered / totalMessages) * 100) : 0
        }

    } catch (error) { return { totalCampaigns: 0, totalMessages: 0, totalDelivered: 0, deliveryRate: 0, error: publicMarketingError(error) } }
}

export async function getRecipientCount(filters: Record<string, unknown>) {
    return previewAudienceCount(filters)
}
