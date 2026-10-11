import 'server-only'
import { normalizeMarketingEmail, emailContentSchema, personalizeEmail } from './marketing-email-contracts'
import { openCampaignSmtp, smtpFailure } from './marketing-email-transport'
import { normalizeDelay } from './marketing-contracts'
import { enforceScheduleWindow } from './marketing-utils'

/** Keep SMTP campaign operations separate from Meta delivery and transactional email. */
export async function processEmailClaim(db: any, claim: any, row: any): Promise<'processed' | 'deferred'> {
    const { campaign, sequence, step, lead } = row
    async function checkpoint(data: Record<string, unknown>) {
        const saved = await db.from('marketing_enrollments').update({ ...data, claim_token: null, claimed_until: null })
            .eq('organization_id', row.organization_id).eq('id', row.id).eq('claim_token', claim.claim_token).select('id').maybeSingle()
        if (saved.error || !saved.data) throw new Error('No se pudo guardar el resultado de email.')
    }
    if (row.status !== 'active' || campaign.status !== 'active' || campaign.execution_version !== 3 || !sequence.is_active || !campaign.smtp_config_id ||
        (campaign.scheduled_for && Date.parse(campaign.scheduled_for) > Date.now())) {
        await checkpoint({ next_run_at: new Date(Date.now() + 300000).toISOString() }); return 'deferred'
    }
    const recipient = normalizeMarketingEmail(lead.email)
    if (!recipient || recipient !== row.recipient) { await checkpoint({ status: 'cancelled', next_run_at: null, last_error: 'El email del contacto cambió o dejó de estar disponible.' }); return 'processed' }
    const permission = await db.rpc('marketing_email_allowed', { p_org: row.organization_id, p_email: recipient })
    if (permission.error) throw new Error('No se pudo comprobar la autorización de email.')
    if (permission.data !== true) { await checkpoint({ status: 'cancelled', next_run_at: null, last_error: 'Baja o ausencia de autorización para email.' }); return 'processed' }
    const nextAllowed = enforceScheduleWindow(new Date(), campaign.delivery_config)
    if (nextAllowed.getTime() > Date.now() + 1000) { await checkpoint({ next_run_at: nextAllowed.toISOString() }); return 'deferred' }
    const next = await db.from('marketing_steps').select('id').eq('organization_id', row.organization_id).eq('sequence_id', sequence.id)
        .gt('order_index', step.order_index).order('order_index').limit(1).maybeSingle()
    if (next.error) throw new Error('No se pudo consultar el siguiente paso.')
    let nextRun = new Date()
    if (step.type === 'delay') {
        const delay = normalizeDelay(step.delay_config)
        nextRun = new Date(Date.now() + delay.value * (delay.unit === 'days' ? 86400000 : delay.unit === 'hours' ? 3600000 : 60000))
    } else {
        if (step.type !== 'email') throw new Error('El paso no corresponde al canal email.')
        const content = personalizeEmail(emailContentSchema.parse(step.content), { ...row.recipient_snapshot, email: recipient })
        const base = new URL(process.env.NEXT_PUBLIC_APP_URL || '')
        if (base.protocol !== 'https:' || base.username || base.password) throw new Error('Configura una URL pública HTTPS para los enlaces de baja.')
        const reservation = await db.rpc('reserve_marketing_email', { p_org: row.organization_id, p_enrollment: row.id, p_step: step.id, p_claim: claim.claim_token })
        if (reservation.error || !reservation.data) throw new Error('No se pudo reservar el envío de email.')
        const operation = reservation.data
        if (operation.state === 'cancelled') { await checkpoint({ status: 'cancelled', next_run_at: null, last_error: 'El contacto no puede recibir email.' }); return 'processed' }
        if (operation.state === 'deferred' || operation.state === 'sending') {
            await checkpoint({ next_run_at: operation.retryAt || new Date(Date.now() + 120000).toISOString(), last_error: 'En espera del ritmo o de otro envío al contacto.' }); return 'deferred'
        }
        if (operation.state === 'unknown' || operation.state === 'failed') throw new Error('Envío sin confirmar o rechazado. No se reenvía automáticamente.')
        if (operation.state === 'reserved') {
            let transport: Awaited<ReturnType<typeof openCampaignSmtp>> | undefined
            let result: { status: 'accepted' | 'failed' | 'unknown'; messageId: string | null }, errorKind: string | null = null
            try {
                const smtp = await db.from('organization_smtp_configs').select('host,port,user_email,password_encrypted,iv,from_email,from_name')
                    .eq('organization_id', row.organization_id).eq('id', campaign.smtp_config_id).eq('is_verified', true).single()
                if (smtp.error || !smtp.data) throw new Error('SMTP unavailable')
                transport = await openCampaignSmtp(smtp.data)
                const unsubscribeUrl = new URL(`/api/marketing/email/unsubscribe?token=${operation.unsubscribeToken}`, base.origin).toString()
                result = await transport.send({ recipient, content, unsubscribeUrl, messageId: `<pixy-${operation.id}@${smtp.data.from_email.split('@')[1]}>` })
            } catch (error) {
                // No SMTP transport means no submission was attempted. An uncertain
                // failure after submission is retained and never blindly retried.
                const failure = transport ? smtpFailure(error) : { status: 'failed' as const, reason: 'smtp_configuration' }
                result = { status: failure.status, messageId: null }; errorKind = failure.reason
            } finally { transport?.close() }
            const saved = await db.rpc('finish_marketing_email', { p_org: row.organization_id, p_outbox: operation.id, p_status: result.status, p_provider: result.messageId, p_error: errorKind })
            if (saved.error || saved.data !== true) throw new Error('No se confirmó el registro del envío. Requiere revisión antes de reintentar.')
            if (result.status !== 'accepted') throw new Error('El servidor no confirmó la aceptación del correo. Revisa el historial.')
        } else if (operation.state !== 'accepted') throw new Error('Estado de email desconocido.')
    }
    await checkpoint(next.data ? { current_step_id: next.data.id, next_run_at: nextRun.toISOString(), last_run_at: new Date().toISOString(), last_error: null } :
        { status: 'completed', next_run_at: null, completed_at: new Date().toISOString(), last_run_at: new Date().toISOString(), last_error: null })
    return 'processed'
}
