import { describe, expect, it, vi } from 'vitest'
import { LeadsService } from './leads.service'

const mocks = vi.hoisted(() => ({
    startProcess: vi.fn(),
}))

vi.mock('../../process-engine/engine', () => ({
    ProcessEngine: {
        startProcess: mocks.startProcess,
        getActiveProcess: vi.fn(),
        transition: vi.fn(),
    },
}))

vi.mock('../../process-engine/map-service', () => ({
    ProcessMapper: {
        validatePipelineMove: vi.fn(),
    },
}))

vi.mock('@/modules/core/security/logger', () => ({
    SecurityLogger: {
        log: vi.fn(),
    },
}))

function createQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {}
    query.insert = vi.fn(() => query)
    query.update = vi.fn(() => query)
    query.select = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.single = vi.fn(async () => result)
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

describe('LeadsService tenant safety', () => {
    it('scopes process-start lead updates to the current organization', async () => {
        mocks.startProcess.mockResolvedValue({
            success: true,
            process: { current_state: 'qualified' },
        })

        const createLead = createQuery({
            data: { id: 'lead-1', name: 'Ada' },
            error: null,
        })
        const stageLookup = createQuery({
            data: { id: 'stage-1', status_key: 'qualified' },
            error: null,
        })
        const updateLead = createQuery({
            data: { id: 'lead-1', status: 'qualified' },
            error: null,
        })
        const supabase = createSupabaseMock({
            leads: [createLead, updateLead],
            pipeline_stages: [stageLookup],
        })

        const service = new LeadsService(supabase, 'org-current')
        await service.createLead({ name: 'Ada' })

        expect(updateLead.eq).toHaveBeenCalledWith('id', 'lead-1')
        expect(updateLead.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })
})
