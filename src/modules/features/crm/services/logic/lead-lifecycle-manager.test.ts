import { describe, expect, it, vi } from 'vitest'
import { LeadLifecycleManager } from './lead-lifecycle-manager'

const mocks = vi.hoisted(() => ({
    calculateLeadScore: vi.fn(),
}))

vi.mock('./scoring', () => ({
    calculateLeadScore: mocks.calculateLeadScore,
}))

function createQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {}
    query.select = vi.fn(() => query)
    query.update = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.maybeSingle = vi.fn(async () => result)
    return query
}

function createSupabaseMock(queues: Record<string, any[]>) {
    const tableQueues = Object.fromEntries(
        Object.entries(queues).map(([table, tableQueue]) => [table, [...tableQueue]])
    )

    return {
        from: vi.fn((table: string) => {
            const queue = tableQueues[table]
            if (!queue?.length) throw new Error(`Unexpected table ${table}`)
            return queue.shift()
        }),
    } as any
}

describe('LeadLifecycleManager tenant safety', () => {
    it('records a reply without promoting a marketing contact or changing its commercial status', async () => {
        mocks.calculateLeadScore.mockResolvedValue({ score: 40 })
        const update = createQuery({ data: { id: 'contact-1', status: 'marketing_contact', contact_type: 'prospect' } })
        const score = createQuery({ data: { id: 'contact-1', score: 40 } })
        const supabase = createSupabaseMock({ leads: [createQuery({ data: { id: 'contact-1', status: 'marketing_contact', contact_type: 'prospect' } }), update, score] })
        await new LeadLifecycleManager(supabase).handleLeadIncomingActivity('contact-1', 'org-current')
        await new Promise(resolve => setTimeout(resolve, 0))
        expect(update.update).toHaveBeenCalledWith({ last_activity_at: expect.any(String), updated_at: expect.any(String) })
        expect(score.update).toHaveBeenCalledWith({ score: 40 })
        expect(update.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })
    it('scopes background re-score writes to the activity organization', async () => {
        mocks.calculateLeadScore.mockResolvedValue({ score: 84 })

        const leadLookup = createQuery({
            data: { id: 'lead-1', status: 'new' },
            error: null,
        })
        const lifecycleUpdate = createQuery({
            data: { id: 'lead-1', status: 'contacted' },
            error: null,
        })
        const scoreUpdate = createQuery({
            data: { id: 'lead-1', score: 84 },
            error: null,
        })
        const supabase = createSupabaseMock({
            leads: [leadLookup, lifecycleUpdate, scoreUpdate],
        })

        const manager = new LeadLifecycleManager(supabase)
        await manager.handleLeadIncomingActivity('lead-1', 'org-current')
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(lifecycleUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(scoreUpdate.eq).toHaveBeenCalledWith('id', 'lead-1')
        expect(scoreUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })
})
