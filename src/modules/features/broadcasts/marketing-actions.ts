'use server'

import { createClient } from '@/modules/core/database/supabase-server'
import { requireMarketingAccess } from './marketing-access'
import { applyAudienceFilters, normalizeDelay, publicMarketingError } from './marketing-contracts'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { z } from 'zod'
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
        return { success: true, campaign: data as Campaign }

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
                created_by: user.id
            })
            .select().eq('organization_id', access.organizationId)
            .single()

        if (error) return { success: false, error: error.message }

        revalidatePath('/crm/marketing')
        return { success: true, campaign }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function createQuickCampaign(data: {
    name: string
    message: string
    channel: 'whatsapp' | 'sms' | 'email'
    filters: Record<string, unknown>
    // Template-specific fields for WhatsApp HSM
    template_name?: string
    template_language?: string
    template_params?: Record<string, string>
    ttl_seconds?: number
    delivery_config?: DeliveryConfig
}) {
    try {
        const access = await requireMarketingAccess('manage')

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const member = { organization_id: access.organizationId }

        if (data.channel !== 'whatsapp') return { success: false, error: 'Las campañas masivas de este módulo se están preparando para WhatsApp.' }
        if (!data.name.trim() || data.name.length > 160) return { success: false, error: 'Nombre de campaña inválido.' }

        // 1. Create Campaign
        const { data: campaign, error: cError } = await supabase
            .from('marketing_campaigns')
            .insert({
                organization_id: member.organization_id,
                name: data.name,
                description: 'Quick Broadcast Campaign',
                goal: 'broadcast',
                status: 'draft',
                created_by: user.id,
                delivery_config: data.delivery_config || { mode: 'growth', humanize: true }
            })
            .select().eq('organization_id', access.organizationId)
            .single()
        if (cError) return { success: false, error: cError.message }

        // 2. Create Default Sequence
        const { data: sequence, error: sError } = await supabase
            .from('marketing_sequences')
            .insert({
                organization_id: member.organization_id,
                campaign_id: campaign.id,
                name: 'Main Flow',
                trigger_type: 'manual',
                is_active: true
            })
            .select().eq('organization_id', access.organizationId)
            .single()
        if (sError) return { success: false, error: sError.message }

        // 3. Create Step 1 (The Message)
        // Include template data when channel is WhatsApp with HSM
        const stepContent: any = { body: data.message }
        if (data.template_name) {
            stepContent.template_name = data.template_name
            stepContent.template_language = data.template_language || 'en_US'
            stepContent.template_params = data.template_params || {}
        }

        const { error: stError } = await supabase
            .from('marketing_steps')
            .insert({
                organization_id: member.organization_id,
                sequence_id: sequence.id,
                type: data.channel,
                name: 'Broadcast Message',
                order_index: 0,
                content: stepContent
            })
        if (stError) return { success: false, error: stError.message }

        // 4. Create Broadcast Log
        const { error: bError } = await supabase
            .from('broadcasts')
            .insert({
                organization_id: member.organization_id,
                campaign_id: campaign.id,
                name: data.name,
                message: data.message,
                channel: data.channel,
                filters: data.filters,
                status: 'draft',
                total_recipients: 0
            })

        if (bError) return { success: false, error: bError.message }

        revalidatePath('/crm/marketing')
        return { success: true, campaign }

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
            scheduled_for: z.string().datetime({ offset: true }).nullable().optional(),
            delivery_config: z.object({ mode: z.enum(['stealth','growth','turbo']), humanize: z.boolean(),
                timezone: z.string().optional(), schedule_window: z.object({start:z.number().int().min(0).max(23),end:z.number().int().min(1).max(24)}).optional(),
            }).optional(),
        }).strict().parse(data)

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

        // Calculate initial count
        // NOTE: This logic should ideally be shared with getRecipientCount
        let count = 0
        let query = supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', access.organizationId)

        query = applyAudienceFilters(query.eq('marketing_opted_out', false), data.filter_config)

        const { count: c } = await query
        count = c || 0

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

export async function enrollAudienceInCampaign(campaignId: string) {
    try {
        const access = await requireMarketingAccess('execute')

        // Until transactional activation, consent and selected-channel validation are
        // installed, a legacy action must not silently enable real campaigns.
        return { success: false, enrolled: 0, error: 'La activación está bloqueada mientras se completa la validación del motor de campañas.' }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function optOutLead(leadId: string) {
    try {
        const access = await requireMarketingAccess('execute')

        const adminClient = (await createClient())
        const { error } = await adminClient
            .from('leads')
            .update({
                marketing_opted_out: true,
                opted_out_at: new Date().toISOString()
            }).eq('organization_id', access.organizationId)
            .eq('id', leadId).select('id').single()

        if (error) return { success: false, error: error.message }

        // Cancel any active enrollments for this lead
        const cancelled = await supabaseAdmin
            .from('marketing_enrollments')
            .update({ status: 'cancelled' }).eq('organization_id', access.organizationId)
            .eq('contact_id', leadId)
            .eq('status', 'active')
        if (cancelled.error) return { success: false, error: 'Baja registrada; no se pudieron cancelar todos los trabajos.' }

        return { success: true }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}


export async function previewAudienceCount(filters: any) {
    try {
        const access = await requireMarketingAccess('view')

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const member = { organization_id: access.organizationId }

        const adminClient = (await createClient())
        let query = adminClient
            .from('leads')
            .select('id', { count: 'exact', head: true }).eq('organization_id', access.organizationId)

            .eq('marketing_opted_out', false) // Always exclude opted-out

        query = applyAudienceFilters(query, filters)

        const { count, error } = await query
        if (error) return { success: false, error: error.message }
        return { success: true, count: count || 0 }

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
            steps: seq.steps?.sort((a: any, b: any) => a.order_index - b.order_index)
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

// --- STEPS ---

export async function addStepToSequence(sequenceId: string, stepData: {
    type: string,
    name: string,
    content: any,
    delay_config?: any
}) {
    try {
        const access = await requireMarketingAccess('manage')

        stepData = z.object({type:z.enum(['whatsapp','delay']),name:z.string().trim().min(1).max(160),content:z.record(z.string(),z.unknown()),delay_config:z.any().optional()}).strict().parse(stepData)
        if (stepData.type === 'delay') stepData.delay_config = normalizeDelay(stepData.delay_config)

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'Unauthorized' }

        const member = { organization_id: access.organizationId }

        // Get current steps count to set order_index
        const { count } = await supabase
            .from('marketing_steps')
            .select('id', { count: 'exact', head: true }).eq('organization_id', access.organizationId)
            .eq('sequence_id', sequenceId)

        const { data: step, error } = await supabase
            .from('marketing_steps')
            .insert({
                organization_id: member.organization_id,
                sequence_id: sequenceId,
                type: stepData.type,
                name: stepData.name,
                content: stepData.content,
                delay_config: stepData.delay_config,
                order_index: count || 0
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
            type: z.enum(['whatsapp','delay']), name: z.string().trim().min(1).max(160),
            content: z.record(z.string(), z.unknown()), delay_config: z.any().optional(),
        }).strict().parse(data)
        if (updates.type === 'delay') updates.delay_config = normalizeDelay(updates.delay_config)
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

        const supabase = await createClient()

        // 1. Get Status Counts
        // We can't use .count() with group by easily in Supabase JS without writing raw SQL or multiple queries.
        // For now, simpler: multiple count queries or one fetch of 'status' column if not huge.
        // Given potentially thousands, multiple count queries is safer.

        const { count: total } = await supabase.from('marketing_enrollments').select('id', { count: 'exact', head: true }).eq('organization_id', access.organizationId).eq('campaign_id', campaignId)
        const { count: active } = await supabase.from('marketing_enrollments').select('id', { count: 'exact', head: true }).eq('organization_id', access.organizationId).eq('campaign_id', campaignId).eq('status', 'active')
        const { count: completed } = await supabase.from('marketing_enrollments').select('id', { count: 'exact', head: true }).eq('organization_id', access.organizationId).eq('campaign_id', campaignId).eq('status', 'completed')
        const { count: failed } = await supabase.from('marketing_enrollments').select('id', { count: 'exact', head: true }).eq('organization_id', access.organizationId).eq('campaign_id', campaignId).eq('status', 'failed')

        // 2. Get Recent Logs (from recent enrollments)
        // Detailed global log table doesn't exist, logs are inside Enrollments.
        // Fetch last 10 updated enrollments to show recent activity.
        const { data: recent } = await supabase
            .from('marketing_enrollments')
            .select('id, status, last_run_at, execution_logs, lead:leads(phone, name)').eq('organization_id', access.organizationId)
            .eq('campaign_id', campaignId)
            .order('last_run_at', { ascending: false })
            .limit(10)

        // Unwind logs? Or just return recent enrollments as "Recent Activity"
        const recentActivity = recent?.map(r => ({
            id: r.id,
            lead: r.lead,
            status: r.status,
            last_updated: r.last_run_at,
            last_log: r.execution_logs && Array.isArray(r.execution_logs) && r.execution_logs.length > 0
                ? r.execution_logs[r.execution_logs.length - 1]
                : null
        })) || []

        return {
            success: true,
            stats: {
                total: total || 0,
                active: active || 0,
                completed: completed || 0,
                failed: failed || 0
            },
            recentActivity
        }

    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

// --- ANALYTICS ---

export async function getMarketingStats() {
    try {
        const access = await requireMarketingAccess('view')

        const supabase = await createClient()
        const [campaignsParams, accepted, delivered] = await Promise.all([
            supabase.from('marketing_campaigns').select('id', { count: 'exact', head: true }).eq('organization_id', access.organizationId),
            supabaseAdmin.from('meta_outbound_outbox').select('id', {count:'exact',head:true})
                .eq('organization_id',access.organizationId).like('operation_key','campaign:%').eq('status','accepted'),
            supabaseAdmin.from('meta_outbound_outbox').select('id,message:messages!inner(status)', {count:'exact',head:true})
                .eq('organization_id',access.organizationId).like('operation_key','campaign:%').in('message.status',['delivered','read']),
        ])
        if (campaignsParams.error || accepted.error || delivered.error) throw new Error('No se pudieron consultar los resultados de campañas.')

        const totalCampaigns = campaignsParams.count || 0
        const totalMessages = accepted.count || 0
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
