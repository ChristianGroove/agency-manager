import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getCurrentOrganizationId: vi.fn(),
    supabaseFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.supabaseFrom,
    }))
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

function singleQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function useAdminQueues(queues: Record<string, any[]>) {
    const tableQueues = Object.fromEntries(
        Object.entries(queues).map(([table, tableQueue]) => [table, [...tableQueue]])
    )

    mocks.supabaseFrom.mockImplementation((table: string) => {
        const queue = tableQueues[table]
        if (!queue?.length) throw new Error(`Unexpected table ${table}`)
        return queue.shift()
    })
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.supabaseFrom.mockReset()
})

describe('ProcessMapper tenant safety', () => {
    it('scopes pipeline mappings and process instances to the current organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const mappingLookup = singleQuery({
            data: {
                process_type: 'sale',
                process_state_key: 'won',
            },
            error: null,
        })
        const processLookup = singleQuery({
            data: {
                id: 'process-1',
                organization_id: 'org-current',
                current_state: 'new',
            },
            error: null,
        })
        const stateLookup = singleQuery({
            data: {
                allowed_next_states: ['won'],
            },
            error: null,
        })
        useAdminQueues({
            pipeline_process_map: [mappingLookup],
            process_instances: [processLookup],
            process_states: [stateLookup],
        })

        const { ProcessMapper } = await import('./map-service')
        const result = await ProcessMapper.validatePipelineMove('lead-current', 'stage-current')

        expect(result).toEqual({ allowed: true, requiredProcessState: 'won' })
        expect(mappingLookup.eq).toHaveBeenCalledWith('pipeline_stage_id', 'stage-current')
        expect(mappingLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(processLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(processLookup.eq).toHaveBeenCalledWith('lead_id', 'lead-current')
        expect(stateLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })
})
