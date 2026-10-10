'use server'

import { z } from 'zod'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { requireMarketingAccess, assertMarketingChannelAccess } from './marketing-access'
import { publicMarketingError, audienceFiltersSchema, normalizeMarketingPhone } from './marketing-contracts'
import { campaignDesignIssues } from './marketing-preflight'
import { importRowSchema, ImportReview } from './marketing-import'

export async function prepareMarketingImport(rows: unknown) {
    try {
        const access = await requireMarketingAccess('import')
        if (!access.canExecute) throw new Error('La importación con evidencia también requiere permiso para registrar autorizaciones de marketing.')
        const data = z.array(importRowSchema).min(1).max(100).parse(rows)
        const result = await supabaseAdmin.rpc('prepare_marketing_import', { p_org: access.organizationId, p_actor: access.userId, p_rows: data })
        if (result.error || !result.data) throw new Error('No se pudo revisar el archivo. No se importaron contactos.')
        return { success: true as const, review: result.data as ImportReview }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function confirmMarketingImport(input: unknown) {
    try {
        const access = await requireMarketingAccess('import')
        if (!access.canExecute) throw new Error('La importación con evidencia también requiere permiso para registrar autorizaciones de marketing.')
        const data = z.object({ token: z.string().uuid(), rows: z.array(z.number().int().min(2).max(10002)).min(1).max(100), confirmed: z.literal(true), listName: z.string().trim().min(1).max(160).optional() }).strict().parse(input)
        const args = { p_org: access.organizationId, p_actor: access.userId, p_ticket: data.token, p_rows: data.rows }
        const result = data.listName
            ? await supabaseAdmin.rpc('confirm_marketing_list_import', { ...args, p_name: data.listName })
            : await supabaseAdmin.rpc('confirm_marketing_import', args)
        if (result.error || !result.data) throw new Error('No se pudo confirmar: la revisión caducó, cambió un destinatario o tus permisos. Revisa de nuevo; una ejecución fallida se revierte completa.')
        return { success: true as const, result: result.data as { created: number; existing: number; consents: number; listId?: string; listName?: string } }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export interface ActivationReview {
    token: string; expiresAt: string; issues: string[]; enabled: boolean; resume: boolean;
    audience: { matched: number; eligible: number; duplicates: number; invalidFormat: number; optedOut: number; missingConsent: number } | null;
    connectionId: string | null; channelName: string; timezone: string; mode: string; window: { start: number; end: number } | null;
    scheduledFor: string | null; steps: { id: string; name: string; type: string; template: string | null; language: string | null; text: string; bindings: Record<string, string>; delay: unknown }[];
}

export async function prepareCampaignActivation(campaignId: string) {
    try {
        const access = await requireMarketingAccess('execute')
        z.string().uuid().parse(campaignId)
        const visible = await access.session.from('marketing_campaigns').select('connection_id').eq('organization_id', access.organizationId).eq('id', campaignId).single()
        if (visible.error || !visible.data) throw new Error('Campaña no disponible.')
        if (visible.data.connection_id) assertMarketingChannelAccess(access, visible.data.connection_id)
        const result = await supabaseAdmin.rpc('prepare_marketing_activation_review', { p_org: access.organizationId, p_actor: access.userId, p_campaign: campaignId })
        if (result.error || !result.data?.review) throw new Error('No se pudo preparar la revisión final.')
        const { review, token, expiresAt } = result.data
        if (review.campaign.connection_id) assertMarketingChannelAccess(access, review.campaign.connection_id)
        const resume = review.campaign.execution_version === 2 && ['paused', 'active'].includes(review.campaign.status)
        audienceFiltersSchema.parse(result.data.design.filters || {})
        const config = review.campaign.delivery_config || {}
        const steps = review.sequences.filter((seq: any) => seq.is_active).flatMap((seq: any) => seq.steps)
        return { success: true as const, review: {
            token, expiresAt, issues: campaignDesignIssues(review, resume), enabled: process.env.MARKETING_EXECUTION_ENABLED === 'true', resume,
            audience: review.audience, connectionId: review.campaign.connection_id, channelName: review.channel?.name || '', timezone: config.timezone || 'America/Bogota',
            mode: config.mode || '', window: config.schedule_window || null, scheduledFor: review.campaign.scheduled_for,
            steps: steps.map((step: any) => ({ id: step.id, name: step.name, type: step.type, template: step.content?.template_name || null,
                language: step.content?.template_language || null,
                text: (review.templates.find((template: any) => template.id === step.content?.template_id)?.components || [])
                    .filter((component: any) => ['HEADER', 'BODY', 'FOOTER'].includes(component.type) && component.text)
                    .map((component: any) => component.text).join('\n'),
                bindings: step.content?.bindings || {}, delay: step.delay_config || null })),
        } as ActivationReview }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function prepareMarketingRenewal(phone: string) {
    try {
        const access = await requireMarketingAccess('execute')
        const recipient = normalizeMarketingPhone(z.string().max(40).parse(phone))
        if (!recipient) throw new Error('Indica un teléfono internacional válido.')
        const result = await supabaseAdmin.rpc('prepare_marketing_renewal', { p_org: access.organizationId, p_actor: access.userId, p_recipient: recipient })
        if (result.error || !result.data) throw new Error('No se pudo revisar la baja. Debe pertenecer a un contacto existente y no tener solicitudes de baja pendientes.')
        return { success: true as const, review: result.data as { token: string; expiresAt: string; after: string } }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function confirmMarketingRenewal(input: unknown) {
    try {
        const access = await requireMarketingAccess('execute')
        const data = z.object({ token: z.string().uuid(), source: z.string().trim().min(1).max(120), evidence: z.string().trim().min(1).max(2000),
            occurredAt: z.string().datetime({ offset: true }).refine(value => Date.parse(value) <= Date.now()), confirmed: z.literal(true) }).strict().parse(input)
        const result = await supabaseAdmin.rpc('confirm_marketing_renewal', { p_org: access.organizationId, p_actor: access.userId, p_ticket: data.token,
            p_source: data.source, p_evidence: data.evidence, p_occurred_at: data.occurredAt })
        if (result.error || !result.data) throw new Error('No se pudo renovar. La autorización debe ser posterior a la baja; si cambió el contacto, los permisos o caducó la revisión, revisa de nuevo.')
        return { success: true as const }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}
