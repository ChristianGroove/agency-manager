'use server'

import { z } from 'zod'
import { requireMarketingAccess, assertMarketingChannelAccess } from './marketing-access'
import { audienceFiltersSchema, normalizeMarketingPhone, publicMarketingError } from './marketing-contracts'
import { CampaignTemplate } from './marketing-template-contract'
import { campaignDesignIssues } from './marketing-preflight'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'

export interface MarketingChannel { id: string; name: string }
export interface AudienceReadiness { matched: number; eligible: number; duplicates: number; invalidFormat: number; optedOut: number; missingConsent: number }
export interface CampaignPreflight { audience: AudienceReadiness | null; issues: string[]; missingData: number; checkedAt: string }

export async function getMarketingSetup(connectionId?: string) {
    try {
        const access = await requireMarketingAccess('view')
        if (connectionId) { z.string().uuid().parse(connectionId); assertMarketingChannelAccess(access, connectionId) }
        let query = access.session.from('integration_connections').select('id,connection_name,display_phone_number:metadata->>display_phone_number')
            .eq('organization_id', access.organizationId).eq('status', 'active').in('provider_key', ['whatsapp_cloud', 'meta_whatsapp'])
        if (!access.inbox.hasGlobalView) query = query.in('id', access.inbox.authorizedChannels)
        const channels = await query.order('connection_name')
        if (channels.error) throw new Error('No se pudieron consultar los números emisores.')
        let templates: CampaignTemplate[] = []
        if (connectionId) {
            if (!channels.data?.some(channel => channel.id === connectionId)) throw new Error('El número seleccionado ya no está activo o disponible.')
            const result = await access.session.from('messaging_templates').select('id,channel_id,name,language,status,category,meta_id,components')
                .eq('organization_id', access.organizationId).eq('channel_id', connectionId).eq('status', 'APPROVED').eq('category', 'MARKETING')
                .not('meta_id', 'is', null).order('name')
            if (result.error) throw new Error('No se pudieron consultar las plantillas de este número.')
            templates = result.data || []
        }
        return { success: true as const, canExecute: access.canExecute, canImport: access.canImport, channels: (channels.data || []).map(channel => ({ id: channel.id,
            name: [channel.connection_name, channel.display_phone_number].filter(Boolean).join(' · ') })), templates }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function getAudienceReadiness(filters: unknown) {
    try {
        const access = await requireMarketingAccess('view')
        const result = await access.session.rpc('marketing_audience_summary', { p_org: access.organizationId, p_filters: audienceFiltersSchema.parse(filters || {}) })
        if (result.error || !result.data) throw new Error('No se pudo revisar la autorización de los destinatarios.')
        return { success: true as const, audience: result.data as AudienceReadiness }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function reviewCampaign(campaignId: string) {
    try {
        const access = await requireMarketingAccess('view')
        z.string().uuid().parse(campaignId)
        const result = await access.session.rpc('read_marketing_preflight', { p_org: access.organizationId, p_campaign: campaignId })
        if (result.error || !result.data) throw new Error('No se pudo revisar la campaña. Comprueba el canal y los filtros de la audiencia.')
        if (result.data.campaign.connection_id) assertMarketingChannelAccess(access, result.data.campaign.connection_id)
        const issues = campaignDesignIssues(result.data)
        const { audience, missingData } = result.data
        // This read-only review never enrolls recipients or calls Meta.
        return { success: true as const, review: { audience, issues, missingData: missingData || 0, checkedAt: new Date().toISOString() } as CampaignPreflight }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function recordMarketingPermission(input: { phone: string; source: string; evidence: string; occurredAt: string; confirmed: boolean }) {
    try {
        const access = await requireMarketingAccess('execute')
        const data = z.object({ phone: z.string().max(40), source: z.string().trim().min(1).max(120), evidence: z.string().trim().min(1).max(2000),
            occurredAt: z.string().datetime({ offset: true }).refine(value => Date.parse(value) <= Date.now()), confirmed: z.literal(true) }).strict().parse(input)
        const recipient = normalizeMarketingPhone(data.phone)
        if (!recipient) throw new Error('Indica un teléfono internacional válido con código de país; Pixy no lo añadirá automáticamente.')
        const result = await supabaseAdmin.rpc('record_marketing_consent', { p_org: access.organizationId, p_recipient: recipient, p_event: 'granted',
            p_source: data.source, p_evidence: data.evidence, p_occurred_at: data.occurredAt, p_actor: access.userId })
        if (result.error) throw new Error(result.error.message.includes('opt-out') ? 'Este destinatario tiene una baja registrada. No se puede sobrescribir con una autorización importada.' : 'No se pudo registrar la autorización. El teléfono debe pertenecer a un contacto de esta organización.')
        return { success: true as const }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}
