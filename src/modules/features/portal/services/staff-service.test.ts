import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.from,
    }))
}))

function query(result: { data?: unknown; error?: unknown }) {
    const chain: any = {}
    chain.select = vi.fn(() => chain)
    chain.update = vi.fn(() => chain)
    chain.eq = vi.fn(() => chain)
    chain.is = vi.fn(() => chain)
    chain.single = vi.fn(async () => result)
    chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
    return chain
}

function useTableQueues(queues: Record<string, any[]>) {
    const tableQueues = Object.fromEntries(
        Object.entries(queues).map(([table, tableQueue]) => [table, [...tableQueue]])
    )

    mocks.from.mockImplementation((table: string) => {
        const queue = tableQueues[table]
        if (!queue?.length) throw new Error(`Unexpected table ${table}`)
        return queue.shift()
    })
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.from.mockReset()
})

describe('staff portal actions tenant safety', () => {
    it('starts jobs only for the staff token organization', async () => {
        const staffLookup = query({
            data: { id: 'staff-current', organization_id: 'org-current' },
            error: null,
        })
        const jobLookup = query({
            data: { id: 'job-current', start_time: '2026-01-01T00:00:00.000Z', organization_id: 'org-current' },
            error: null,
        })
        const jobUpdate = query({ data: null, error: null })
        useTableQueues({
            cleaning_staff_profiles: [staffLookup],
            appointments: [jobLookup, jobUpdate],
        })

        const { startJob } = await import('./staff-service')
        const result = await startJob('staff-token', 'job-current', { lat: 4.7, lng: -74.1 })

        expect(result).toEqual({ success: true })
        expect(staffLookup.select).toHaveBeenCalledWith('id, organization_id')
        expect(jobLookup.eq).toHaveBeenCalledWith('id', 'job-current')
        expect(jobLookup.eq).toHaveBeenCalledWith('staff_id', 'staff-current')
        expect(jobLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(jobUpdate.update).toHaveBeenCalledWith({
            status: 'in_progress',
            gps_coordinates: { lat: 4.7, lng: -74.1 },
        })
        expect(jobUpdate.eq).toHaveBeenCalledWith('id', 'job-current')
        expect(jobUpdate.eq).toHaveBeenCalledWith('staff_id', 'staff-current')
        expect(jobUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('does not start jobs outside the staff token organization', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const staffLookup = query({
            data: { id: 'staff-current', organization_id: 'org-current' },
            error: null,
        })
        const jobLookup = query({
            data: null,
            error: { code: 'PGRST116', message: 'No rows' },
        })
        useTableQueues({
            cleaning_staff_profiles: [staffLookup],
            appointments: [jobLookup],
        })

        const { startJob } = await import('./staff-service')
        const result = await startJob('staff-token', 'job-other-org')

        expect(result).toEqual({ success: false, error: 'Error starting job' })
        expect(jobLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.from).toHaveBeenCalledTimes(2)
        expect(consoleError).toHaveBeenCalled()
    })

    it('completes jobs only for the staff token organization', async () => {
        const staffLookup = query({
            data: { id: 'staff-current', organization_id: 'org-current' },
            error: null,
        })
        const jobLookup = query({
            data: { id: 'job-current', organization_id: 'org-current' },
            error: null,
        })
        const jobUpdate = query({ data: null, error: null })
        useTableQueues({
            cleaning_staff_profiles: [staffLookup],
            appointments: [jobLookup, jobUpdate],
        })

        const { completeJob } = await import('./staff-service')
        const result = await completeJob('staff-token', 'job-current')

        expect(result).toEqual({ success: true })
        expect(jobLookup.eq).toHaveBeenCalledWith('id', 'job-current')
        expect(jobLookup.eq).toHaveBeenCalledWith('staff_id', 'staff-current')
        expect(jobLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(jobUpdate.update).toHaveBeenCalledWith({ status: 'completed' })
        expect(jobUpdate.eq).toHaveBeenCalledWith('id', 'job-current')
        expect(jobUpdate.eq).toHaveBeenCalledWith('staff_id', 'staff-current')
        expect(jobUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })
})
