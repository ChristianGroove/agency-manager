'use server'

import { z } from 'zod'
import { historyFiltersSchema, stepCursorSchema } from './marketing-history'
import { prepareMarketingHistory, readMarketingHistory, readMarketingSteps } from './marketing-history-reader'
import { publicMarketingError } from './marketing-contracts'

export async function getMarketingHistory(input: { campaignId: string; filters: unknown; cursor?: string | null }) {
    try {
        const context = await prepareMarketingHistory(input.campaignId)
        const data = z.object({ campaignId: z.string().uuid(), filters: historyFiltersSchema, cursor: z.string().uuid().nullable().optional() }).strict().parse(input)
        const page = await readMarketingHistory(context, data.filters, data.cursor || null)
        return { success: true as const, page, canExport: context.access.canExport }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}
export async function getMarketingStepHistory(input: { campaignId: string; enrollmentId: string; cursor?: unknown }) {
    try {
        const context = await prepareMarketingHistory(input.campaignId)
        const data = z.object({ campaignId: z.string().uuid(), enrollmentId: z.string().uuid(), cursor: stepCursorSchema.nullable().optional() }).strict().parse(input)
        const page = await readMarketingSteps(context, historyFiltersSchema.parse({}), data.enrollmentId, data.cursor || null)
        return { success: true as const, page }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}
