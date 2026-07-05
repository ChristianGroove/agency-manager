import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    supabaseAdmin: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    revalidatePath: vi.fn(),
    sendInngest: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: mocks.supabaseAdmin,
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => mocks.supabaseAdmin),
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/modules/infrastructure/automation/inngest/client', () => ({
    inngest: {
        send: mocks.sendInngest,
    },
}))

function selectSingleQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function updateQuery(result: unknown = { data: null, error: null }) {
    const promise = Promise.resolve(result)
    const query: any = {
        eq: vi.fn(() => query),
        select: vi.fn(async () => result),
        then: promise.then.bind(promise),
        catch: promise.catch.bind(promise),
        finally: promise.finally.bind(promise),
    }

    return {
        query,
        update: vi.fn(() => query),
    }
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.supabaseAdmin.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.sendInngest.mockReset()
})

describe('automation actions tenant scope', () => {
    it('scopes workflow saves to the active organization when updating an existing workflow', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')

        const existingWorkflow = selectSingleQuery({ data: { id: 'workflow-current' }, error: null })
        const workflowUpdate = updateQuery({ data: [{ id: 'workflow-current' }], error: null })
        let workflowCalls = 0

        Object.assign(mocks.supabaseAdmin, {
            from: vi.fn((table: string) => {
                if (table === 'workflows') {
                    workflowCalls += 1
                    return workflowCalls === 1 ? existingWorkflow : workflowUpdate
                }

                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { saveWorkflow } = await import('./actions')
        const result = await saveWorkflow(
            'workflow-current',
            'Workflow Current',
            'Description',
            { nodes: [{ id: 'trigger-1', type: 'trigger', data: { triggerType: 'webhook' } }], edges: [] } as any,
            true
        )

        expect(result).toEqual({
            success: true,
            data: { id: 'workflow-current' },
        })
        expect(existingWorkflow.eq).toHaveBeenCalledWith('id', 'workflow-current')
        expect(existingWorkflow.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(workflowUpdate.query.eq).toHaveBeenCalledWith('id', 'workflow-current')
        expect(workflowUpdate.query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('scopes workflow reads to the active organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const workflowRead = selectSingleQuery({
            data: { id: 'workflow-current', organization_id: 'org-current' },
            error: null,
        })
        Object.assign(mocks.supabaseAdmin, {
            from: vi.fn((table: string) => {
                if (table === 'workflows') return workflowRead
                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { getWorkflow } = await import('./actions')
        const result = await getWorkflow('workflow-current')

        expect(result).toEqual({ id: 'workflow-current', organization_id: 'org-current' })
        expect(workflowRead.eq).toHaveBeenCalledWith('id', 'workflow-current')
        expect(workflowRead.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('scopes workflow channel updates to the active organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const workflowRead = selectSingleQuery({
            data: {
                definition: {
                    nodes: [{ id: 'trigger-1', type: 'trigger', data: {} }],
                },
                trigger_config: {},
            },
            error: null,
        })
        const workflowUpdate = updateQuery({ data: null, error: null })
        let workflowCalls = 0
        Object.assign(mocks.supabaseAdmin, {
            from: vi.fn((table: string) => {
                if (table === 'workflows') {
                    workflowCalls += 1
                    return workflowCalls === 1 ? workflowRead : workflowUpdate
                }

                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { updateWorkflowChannel } = await import('./actions')
        const result = await updateWorkflowChannel('workflow-current', 'connection-current')

        expect(result).toEqual({ success: true })
        expect(workflowRead.eq).toHaveBeenCalledWith('id', 'workflow-current')
        expect(workflowRead.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(workflowUpdate.query.eq).toHaveBeenCalledWith('id', 'workflow-current')
        expect(workflowUpdate.query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })
})
