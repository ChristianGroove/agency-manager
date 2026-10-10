import 'server-only'
import { z } from 'zod'
import { requireMarketingAccess, assertMarketingChannelAccess } from './marketing-access'
import { historyFiltersSchema, type HistoryFilters, type HistoryPage, type HistoryRecipient, type HistoryStep, type StepCursor } from './marketing-history'

export async function prepareMarketingHistory(campaignId: string, exporting = false) {
    const access = await requireMarketingAccess('view')
    if (exporting && !access.canExport) throw new Error('No tienes permiso para exportar campañas.')
    z.string().uuid().parse(campaignId)
    const campaign = await access.session.from('marketing_campaigns').select('connection_id')
        .eq('organization_id', access.organizationId).eq('id', campaignId).single()
    if (campaign.error || !campaign.data) throw new Error('Campaña no disponible.')
    if (campaign.data.connection_id) assertMarketingChannelAccess(access, campaign.data.connection_id)
    return { access, campaignId, exporting }
}
export async function readMarketingHistory(context: Awaited<ReturnType<typeof prepareMarketingHistory>>, filters: HistoryFilters,
    cursor: string | null = null, limit = 25): Promise<HistoryPage<HistoryRecipient, string>> {
    const parsed = historyFiltersSchema.parse(filters)
    const result = await context.access.session.rpc('read_marketing_history', {
        p_org: context.access.organizationId, p_campaign: context.campaignId, p_status: parsed.status, p_search: parsed.search,
        p_delivery: parsed.delivery, p_after: cursor, p_limit: limit, p_export: context.exporting,
    }).abortSignal(AbortSignal.timeout(10000))
    if (result.error || !result.data) throw new Error('No se pudo consultar el historial de destinatarios.')
    return result.data
}
export async function readMarketingSteps(context: Awaited<ReturnType<typeof prepareMarketingHistory>>, filters: HistoryFilters,
    enrollmentId: string | null, cursor: StepCursor | null = null, limit = 25): Promise<HistoryPage<HistoryStep, StepCursor>> {
    const parsed = historyFiltersSchema.parse(filters)
    const result = await context.access.session.rpc('read_marketing_step_history', {
        p_org: context.access.organizationId, p_campaign: context.campaignId, p_status: parsed.status, p_search: parsed.search,
        p_delivery: parsed.delivery, p_enrollment: enrollmentId, p_after: cursor, p_limit: limit, p_export: context.exporting,
    }).abortSignal(AbortSignal.timeout(10000))
    if (result.error || !result.data) throw new Error('No se pudo consultar el historial de pasos.')
    return result.data
}
