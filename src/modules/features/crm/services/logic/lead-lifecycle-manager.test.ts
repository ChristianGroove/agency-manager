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
