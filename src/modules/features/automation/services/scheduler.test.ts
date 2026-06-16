import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    supabaseAdmin: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: mocks.supabaseAdmin,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

function updateQuery(result: unknown = { error: null }) {
    const promise = Promise.resolve(result)
    const query: any = {
        eq: vi.fn(() => query),
        then: promise.then.bind(promise),
        catch: promise.catch.bind(promise),
        finally: promise.finally.bind(promise),
    }

    return {
        query,
        update: vi.fn(() => query),
    }
}

function scheduledJobsQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        order: vi.fn(async () => result),
        select: vi.fn(() => query),
    }

    return query
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.supabaseAdmin.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
})

describe('workflow scheduler service', () => {
    it('scopes job completion updates to the active organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const completeUpdate = updateQuery()
        Object.assign(mocks.supabaseAdmin, {
            from: vi.fn((table: string) => {
                if (table === 'scheduled_workflow_jobs') return completeUpdate
                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { completeJob } = await import('./scheduler')
        const result = await completeJob('job-current')

        expect(result).toBe(true)
        expect(completeUpdate.query.eq).toHaveBeenCalledWith('id', 'job-current')
        expect(completeUpdate.query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('scopes scheduled job reads to the active organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const jobRead = scheduledJobsQuery({
            data: [{ id: 'job-current', organization_id: 'org-current' }],
            error: null,
        })
        Object.assign(mocks.supabaseAdmin, {
            from: vi.fn((table: string) => {
                if (table === 'scheduled_workflow_jobs') return jobRead
                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { getWorkflowScheduledJobs } = await import('./scheduler')
        const result = await getWorkflowScheduledJobs('workflow-current')

        expect(result).toEqual([{ id: 'job-current', organization_id: 'org-current' }])
        expect(jobRead.eq).toHaveBeenCalledWith('workflow_id', 'workflow-current')
        expect(jobRead.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('fails closed without an active organization', async () => {
        const from = vi.fn()
        mocks.getCurrentOrganizationId.mockResolvedValue(null)
        Object.assign(mocks.supabaseAdmin, { from })

        const { completeJob, getWorkflowScheduledJobs } = await import('./scheduler')

        await expect(completeJob('job-current')).resolves.toBe(false)
        await expect(getWorkflowScheduledJobs('workflow-current')).resolves.toEqual([])
        expect(from).not.toHaveBeenCalled()
    })
})
