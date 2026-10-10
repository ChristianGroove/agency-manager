import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { historyFiltersSchema } from '@/modules/features/broadcasts/marketing-history'
import { prepareMarketingHistory, readMarketingHistory, readMarketingSteps } from '@/modules/features/broadcasts/marketing-history-reader'
import { csvLine, recipientCsv, stepCsv, recipientHeaders, stepHeaders } from '@/modules/features/broadcasts/marketing-history-csv'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
const MAX_ROWS = 50_000

export async function GET(request: NextRequest, { params }: { params: Promise<{ campaignId: string }> }) {
    try {
        const { campaignId } = await params
        const context = await prepareMarketingHistory(campaignId, true)
        const query = z.object({ kind: z.enum(['recipients', 'steps']).default('recipients'),
            status: historyFiltersSchema.shape.status, search: historyFiltersSchema.shape.search, delivery: historyFiltersSchema.shape.delivery,
        }).strict().parse(Object.fromEntries(request.nextUrl.searchParams))
        const filters = { status: query.status, search: query.search, delivery: query.delivery }
        const steps = query.kind === 'steps'
        let page = steps ? await readMarketingSteps(context, filters, null, null, 100) : await readMarketingHistory(context, filters, null, 100)
        if (!steps && (page.total || 0) > MAX_ROWS) return NextResponse.json({ error: 'Filtra el reporte a un máximo de 50.000 filas.' }, { status: 422 })
        const encoder = new TextEncoder(), deadline = Date.now() + 45_000
        let rows = 0, headerSent = false, cancelled = false, nextPage = false
        const stream = new ReadableStream<Uint8Array>({
            async pull(controller) {
                try {
                    if (cancelled || request.signal.aborted) throw new Error('Export cancelled')
                    if (Date.now() > deadline) throw new Error('Export time exceeded')
                    if (nextPage) {
                        if (rows >= MAX_ROWS) throw new Error('Export size exceeded')
                        page = steps ? await readMarketingSteps(context, filters, null, page.nextCursor as import('@/modules/features/broadcasts/marketing-history').StepCursor, 100)
                            : await readMarketingHistory(context, filters, page.nextCursor as string, 100)
                    }
                    if (rows + page.items.length > MAX_ROWS) throw new Error('Export size exceeded')
                    let chunk = headerSent ? '' : '\uFEFF' + csvLine(steps ? stepHeaders : recipientHeaders)
                    headerSent = true
                    for (const row of page.items) chunk += steps
                        ? stepCsv(row as import('@/modules/features/broadcasts/marketing-history').HistoryStep, page.queriedAt)
                        : recipientCsv(row as import('@/modules/features/broadcasts/marketing-history').HistoryRecipient, page.queriedAt)
                    rows += page.items.length
                    controller.enqueue(encoder.encode(chunk))
                    if (!page.hasMore) controller.close()
                    else if (!page.nextCursor || !page.items.length) throw new Error('Invalid export cursor')
                    else nextPage = true
                } catch { controller.error(new Error('No se pudo completar el reporte. Revisa permisos y reduce los filtros.')) }
            },
            cancel() { cancelled = true },
        })
        return new Response(stream, { headers: {
            'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="campaign-${campaignId}-${query.kind}.csv"`,
            'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
        } })
    } catch {
        return NextResponse.json({ error: 'No se pudo exportar. Revisa permisos, campaña y filtros.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }
}
