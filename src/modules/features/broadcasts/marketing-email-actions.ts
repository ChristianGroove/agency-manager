'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireMarketingAccess, assertMarketingChannelAccess } from './marketing-access'
import { publicMarketingError } from './marketing-contracts'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { emailImportRowSchema, normalizeMarketingEmail } from './marketing-email-contracts'

export async function recordEmailPermission(input: unknown) {
    try {
        const access = await requireMarketingAccess('execute')
        const data = z.object({ phone: z.string(), source: z.string().trim().min(1).max(120), evidence: z.string().trim().min(1).max(2000), occurredAt: z.string().datetime(), confirmed: z.literal(true) }).strict().parse(input)
        const email = normalizeMarketingEmail(data.phone)
        if (!email || Date.parse(data.occurredAt) > Date.now()) throw new Error('Revisa el email y la fecha de autorización.')
        const result = await supabaseAdmin.rpc('record_marketing_email_permission', { p_org: access.organizationId, p_actor: access.userId, p_email: email, p_reference: JSON.stringify({ source: data.source, evidence: data.evidence, occurredAt: data.occurredAt }) })
        if (result.error || result.data !== true) throw new Error('No se pudo registrar el permiso. El contacto debe existir y no haber solicitado la baja.')
        return { success: true as const }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function getMarketingEmailSenders() {
    try {
        const access = await requireMarketingAccess('view')
        const result = await access.session.from('organization_smtp_configs').select('id,from_name,from_email,port')
            .eq('organization_id', access.organizationId).eq('is_verified', true).in('port', [465, 587])
        if (result.error) throw new Error('No se pudieron consultar los emisores de email.')
        return { success: true as const, channels: (result.data || []).map(item => ({ id: `smtp:${item.id}`, name: `${item.from_name} · ${item.from_email}`, type: 'email' as const })) }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}
export async function saveCampaignSender(campaignId: string, value: string, reset = false) {
    try {
        const access = await requireMarketingAccess('manage')
        z.string().uuid().parse(campaignId)
        const email = value.startsWith('smtp:'), id = z.string().uuid().parse(email ? value.slice(5) : value)
        if (!email) assertMarketingChannelAccess(access, id)
        const result = await access.session.rpc('save_marketing_campaign_emitter', { p_org: access.organizationId, p_campaign: campaignId, p_channel: email ? 'email' : 'whatsapp', p_sender: id, p_reset: z.boolean().parse(reset) })
        if (result.error || result.data !== true) throw new Error('No se pudo guardar el emisor. Revisa el canal, los permisos y el estado del borrador.')
        revalidatePath('/crm/marketing')
        return { success: true as const }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}
export async function prepareEmailContactImport(rows: unknown) {
    try {
        const access = await requireMarketingAccess('import')
        const data = z.array(emailImportRowSchema).min(1).max(1000).parse(rows)
        const result = await supabaseAdmin.rpc('prepare_marketing_email_import', { p_org: access.organizationId, p_actor: access.userId, p_rows: data })
        if (result.error || !result.data) throw new Error('No se pudo revisar la lista de email. No se importaron contactos.')
        return { success: true as const, review: result.data as import('./marketing-import').ImportReview }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}
export async function confirmEmailContactImport(input: unknown) {
    try {
        const access = await requireMarketingAccess('import')
        const data = z.object({ token: z.string().uuid(), rows: z.array(z.number().int().min(2).max(10002)).min(1).max(1000), confirmed: z.literal(true), listName: z.string().trim().min(1).max(160) }).strict().parse(input)
        const result = await supabaseAdmin.rpc('confirm_marketing_email_import', { p_org: access.organizationId, p_actor: access.userId, p_ticket: data.token, p_rows: data.rows, p_name: data.listName })
        if (result.error || !result.data) throw new Error('La revisión caducó o cambió un contacto o tus permisos. Revisa de nuevo.')
        return { success: true as const, result: result.data as { created: number; existing: number; consents: number; listId: string; listName: string } }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}
export async function prepareEmailListAuthorization(listId: string) {
    try {
        const access = await requireMarketingAccess('execute')
        z.string().uuid().parse(listId)
        const result = await supabaseAdmin.rpc('prepare_marketing_email_list_authorization', { p_org: access.organizationId, p_actor: access.userId, p_list: listId })
        if (result.error || !result.data) throw new Error('No se pudo revisar el permiso de email de esta lista.')
        return { success: true as const, review: result.data as import('./marketing-review-actions').ListAuthorizationReview }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}
export async function confirmEmailListAuthorization(input: unknown) {
    try {
        const access = await requireMarketingAccess('execute')
        const data = z.object({ token: z.string().uuid(), confirmed: z.literal(true), reference: z.string().trim().max(1600).default('') }).strict().parse(input)
        const result = await supabaseAdmin.rpc('confirm_marketing_email_list_authorization', { p_org: access.organizationId, p_actor: access.userId, p_ticket: data.token, p_confirmed: true, p_reference: data.reference })
        if (result.error || !result.data) throw new Error('La lista, permisos o bajas cambiaron. Revisa de nuevo.')
        return { success: true as const, result: result.data as { authorized: number } }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}
