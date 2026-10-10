import { MarketingExecutionIssue } from './marketing-execution-issue'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { outboundService } from '@/modules/features/messaging/outbound-service'
import { normalizeDelay, normalizeMarketingPhone } from './marketing-contracts'
import { enforceScheduleWindow } from './marketing-utils'
import { buildCampaignTemplateMessage } from './marketing-template-contract'

/** Internal cron worker. Session cookies are never used as worker credentials. */
export async function runMarketingCycle() {
    if (process.env.MARKETING_EXECUTION_ENABLED !== 'true') {
        return { success: true, disabled: true, processed: 0, failed: 0, deferred: 0, logs: [] as string[] }
    }
    const db = supabaseAdmin
    const started = Date.now()
    const result = await db.rpc('claim_marketing_enrollments', { p_limit: 25 })
    if (result.error) throw new Error('No se pudieron adquirir los trabajos de Marketing.')
    let processed = 0, failed = 0, deferred = 0
    for (const claim of result.data || []) {
        // Leave unprocessed leases to expire; never run beyond the request budget.
        // A last Graph call can take 30s; reserve that time plus the health probe and finalization.
        if (Date.now() - started > 15_000) break
        try {
            const state = await processClaim(db, claim)
            if (state === 'processed') processed++
            else deferred++
        } catch (error) {
            const checkpoint = await db.from('marketing_enrollments').update({
                status: 'failed', last_error: error instanceof MarketingExecutionIssue ? error.message : 'No se pudo ejecutar el paso. Requiere revisión antes de reintentar.',
                claim_token: null, claimed_until: null, last_run_at: new Date().toISOString(),
            }).eq('id', claim.id).eq('organization_id', claim.organization_id).eq('claim_token', claim.claim_token).select('id').single()
            if (checkpoint.error || !checkpoint.data) throw new Error('No se pudo persistir el resultado del trabajo de Marketing.')
            failed++
        }
    }
    const finalized = await db.rpc('finalize_marketing_campaigns', { p_limit: 25 })
    if (finalized.error) throw new Error('No se pudo verificar el cierre de campañas.')
    return { success: true, processed, failed, deferred, finalized: finalized.data, logs: [] as string[] }
}

async function checkpoint(db: any, claim: any, data: Record<string, unknown>) {
    const result = await db.from('marketing_enrollments').update({ ...data, claim_token: null, claimed_until: null })
        .eq('id', claim.id).eq('organization_id', claim.organization_id).eq('claim_token', claim.claim_token)
        .select('id').single()
    if (result.error || !result.data) throw new Error('No se pudo guardar el avance de la campaña.')
}

async function processClaim(db: any, claim: any): Promise<'processed' | 'deferred'> {
    const result = await db.from('marketing_enrollments').select(`*,
        step:marketing_steps!current_step_id(*),
        sequence:marketing_sequences!sequence_id(id,campaign_id,organization_id,is_active),
        campaign:marketing_campaigns!campaign_id(id,organization_id,status,connection_id,execution_version,delivery_config,scheduled_for),
        lead:leads!contact_id(id,organization_id,phone,name,company:company_name,marketing_opted_out)`)
        .eq('id', claim.id).eq('organization_id', claim.organization_id).eq('claim_token', claim.claim_token).single()
    if (result.error || !result.data) throw new Error('Trabajo no disponible.')
    const row = result.data, { campaign, sequence, step, lead } = row
    if (!campaign || !sequence || !step || !lead || campaign.organization_id !== row.organization_id ||
        sequence.organization_id !== row.organization_id || step.organization_id !== row.organization_id ||
        lead.organization_id !== row.organization_id || sequence.campaign_id !== campaign.id || step.sequence_id !== sequence.id) {
        throw new Error('Relaciones de campaña inválidas.')
    }
    if (row.status !== 'active' || campaign.status !== 'active' || campaign.execution_version !== 2 || !sequence.is_active ||
        !campaign.connection_id || (campaign.scheduled_for && Date.parse(campaign.scheduled_for) > Date.now())) {
        await checkpoint(db, claim, { next_run_at: new Date(Date.now() + 300_000).toISOString() })
        return 'deferred'
    }
    if (lead.marketing_opted_out) {
        await checkpoint(db, claim, { status: 'cancelled', next_run_at: null, last_error: 'Consentimiento revocado.' })
        return 'processed'
    }
    const nextAllowed = enforceScheduleWindow(new Date(), campaign.delivery_config || {mode:'growth',humanize:false})
    if (nextAllowed.getTime() > Date.now() + 1000) {
        await checkpoint(db, claim, { next_run_at: nextAllowed.toISOString() })
        return 'deferred'
    }
    const next = await db.from('marketing_steps').select('id').eq('organization_id', row.organization_id)
        .eq('sequence_id', sequence.id).gt('order_index', step.order_index).order('order_index').limit(1).maybeSingle()
    if (next.error) throw new Error('No se pudo obtener el siguiente paso.')
    let nextRun = new Date()
    if (step.type === 'delay') {
        const delay = normalizeDelay(step.delay_config)
        const multiplier = delay.unit === 'days' ? 86400 : delay.unit === 'hours' ? 3600 : 60
        nextRun = new Date(Date.now() + delay.value * multiplier * 1000)
    } else {
        if (step.type !== 'whatsapp' || !step.content?.template_id) throw new Error('Solo se admiten plantillas WhatsApp validadas.')
        const recipient = normalizeMarketingPhone(lead.phone)
        if (!recipient || recipient !== row.recipient) throw new Error('El destinatario cambió; revisa la campaña.')
        const consent = await db.rpc('marketing_recipient_allowed', { p_org: row.organization_id, p_recipient: recipient })
        if (consent.error) throw new Error('No se pudo verificar la autorización vigente.')
        if (consent.data !== true) {
            await checkpoint(db, claim, { status: 'cancelled', next_run_at: null, last_error: 'No hay autorización vigente de marketing.' })
            return 'processed'
        }
        const template = await db.from('messaging_templates').select('id,channel_id,name,language,status,category,meta_id,components')
            .eq('organization_id', row.organization_id).eq('channel_id', campaign.connection_id).eq('id', step.content.template_id).single()
        if (template.error || !template.data) throw new Error('Plantilla no disponible en el número emisor.')
        const message = buildCampaignTemplateMessage(template.data, step.content, campaign.connection_id, { ...lead, ...row.recipient_snapshot, phone: recipient })
        const conversationId = await getConversation(db, row.organization_id, lead.id, campaign.connection_id, recipient)
        const sent = await outboundService.sendSystemMessage(conversationId, message,
            'whatsapp', campaign.connection_id, 'System', `campaign:${row.id}:${step.id}`)
        if (!sent.success || !sent.externalId) {
            // A committed queue item is recoverable; an ambiguous send must never be blindly repeated.
            const delivery = await db.from('meta_outbound_outbox').select('status,available_at,external_id,error_kind')
                .eq('organization_id', row.organization_id).eq('connection_id', campaign.connection_id)
                .eq('operation_key', `campaign:${row.id}:${step.id}`).maybeSingle()
            if (delivery.error || !delivery.data) throw new Error('No se confirmó la aceptación del envío.')
            if (['queued', 'sending'].includes(delivery.data.status)) {
                await checkpoint(db, claim, { next_run_at: new Date(Math.max(Date.now() + 30_000,
                    Date.parse(delivery.data.available_at) || 0)).toISOString(), last_error: null })
                return 'deferred'
            }
            if (delivery.data.status !== 'accepted' || !delivery.data.external_id) {
                const code = /^meta_([0-9]{1,9})$/.exec(delivery.data.error_kind || '')
                throw new MarketingExecutionIssue(code ? Number(code[1]) : undefined)
            }
        }
    }
    await checkpoint(db, claim, next.data ? {
        current_step_id: next.data.id, next_run_at: nextRun.toISOString(), last_run_at: new Date().toISOString(),
    } : { status: 'completed', next_run_at: null, completed_at: new Date().toISOString(), last_run_at: new Date().toISOString() })
    return 'processed'
}

async function getConversation(db: any, org: string, leadId: string, connectionId: string, recipient: string) {
    const result = await db.rpc('marketing_get_conversation', { p_org: org, p_contact: leadId,
        p_connection: connectionId, p_recipient: recipient })
    if (result.error || !result.data) throw new Error('No se pudo obtener la conversación de campaña.')
    return result.data
}
