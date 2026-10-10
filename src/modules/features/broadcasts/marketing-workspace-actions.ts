'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireMarketingAccess } from './marketing-access'
import { audienceFiltersSchema, publicMarketingError } from './marketing-contracts'
import { campaignPageSchema, CampaignPage, CampaignPageInput, audiencePageSchema, AudiencePage } from './marketing-workspace'

export async function getMarketingCampaignPage(input: CampaignPageInput = {}) {
    try {
        const access = await requireMarketingAccess('view')
        const data = campaignPageSchema.parse(input)
        const result = await access.session.rpc('read_marketing_campaign_page', {
            p_org: access.organizationId, p_search: data.search, p_status: data.status, p_channel: data.channel,
            p_before: data.cursor?.createdAt || null, p_before_id: data.cursor?.id || null,
        })
        if (result.error || !result.data) throw new Error('No se pudo consultar la página de campañas.')
        return { success: true as const, page: result.data as CampaignPage }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function getCampaignAudience(campaignId: string) {
    try {
        const access = await requireMarketingAccess('view')
        z.string().uuid().parse(campaignId)
        const result = await access.session.rpc('read_marketing_campaign_audience', { p_org: access.organizationId, p_campaign: campaignId })
        if (result.error) throw new Error('No se pudieron consultar los destinatarios guardados.')
        return { success: true as const, audience: result.data as { id: string; name: string; filters: z.infer<typeof audienceFiltersSchema> } | null }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function getMarketingAudiencePage(input: z.input<typeof audiencePageSchema> = {}) {
    try {
        const access = await requireMarketingAccess('view')
        const data = audiencePageSchema.parse(input)
        const result = await access.session.rpc('read_marketing_audience_page', {
            p_org: access.organizationId, p_search: data.search, p_before: data.cursor?.createdAt || null, p_before_id: data.cursor?.id || null,
        })
        if (result.error || !result.data) throw new Error('No se pudieron consultar los segmentos.')
        return { success: true as const, page: result.data as AudiencePage }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function saveCampaignAudience(campaignId: string, filters: unknown) {
    try {
        const access = await requireMarketingAccess('manage')
        z.string().uuid().parse(campaignId)
        const data = audienceFiltersSchema.parse(filters)
        const result = await access.session.rpc('save_marketing_campaign_audience', {
            p_org: access.organizationId, p_campaign: campaignId, p_filters: data,
        })
        if (result.error || !result.data) throw new Error('No se pudieron guardar los destinatarios. Revisa los permisos y el estado del borrador.')
        revalidatePath(`/crm/marketing/campaigns/${campaignId}`)
        return { success: true as const }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}
