import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    engineResume: vi.fn(),
    processInput: vi.fn(),
    supabaseFrom: vi.fn(),
    workflowEngineCtor: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    },
}))

vi.mock('./nodes/wait-input-node', () => ({
    WaitInputNode: vi.fn(function () {
        return {
            processInput: mocks.processInput,
        }
    }),
}))

vi.mock('./engine', () => ({
    WorkflowEngine: vi.fn(function (...args: unknown[]) {
        mocks.workflowEngineCtor(...args)
        return {
            context: { resumed: true },
            resume: mocks.engineResume,
        }
    }),
}))

function singleQuery(result: unknown) {
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
    mocks.engineResume.mockReset()
    mocks.processInput.mockReset()
    mocks.supabaseFrom.mockReset()
    mocks.workflowEngineCtor.mockReset()
})

describe('resumeSuspendedWorkflow', () => {
    it('scopes pending input and execution updates to the pending input organization', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.processInput.mockResolvedValue({
            buttonId: 'btn-yes',
            nextBranchId: 'branch-yes',
            success: true,
            suspended: false,
            userInput: 'si',
        })
        mocks.engineResume.mockResolvedValue(undefined)

        const pendingRead = singleQuery({
            data: {
                config: { inputType: 'text' },
                execution_id: 'execution-current',
                id: 'pending-current',
                node_id: 'wait-node',
                organization_id: 'org-current',
                status: 'waiting',
            },
            error: null,
        })
        const executionRead = singleQuery({
            data: {
                context: { existing: true },
                id: 'execution-current',
                organization_id: 'org-current',
                workflows: {
                    definition: { nodes: [] },
                },
            },
            error: null,
        })
        const pendingUpdate = updateQuery()
        const executionUpdate = updateQuery()
        let pendingInputCalls = 0
        let executionCalls = 0

        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'workflow_pending_inputs') {
                pendingInputCalls += 1
                return pendingInputCalls === 1 ? pendingRead : pendingUpdate
            }
            if (table === 'workflow_executions') {
                executionCalls += 1
                return executionCalls === 1 ? executionRead : executionUpdate
            }

            throw new Error(`Unexpected table ${table}`)
        })

        const { resumeSuspendedWorkflow } = await import('./runner')
        const result = await resumeSuspendedWorkflow(
            'execution-current',
            'pending-current',
            {
                buttonId: 'btn-yes',
                content: { type: 'text', text: 'si' },
            } as any
        )

        expect(result).toEqual({ success: true })
        expect(pendingRead.eq).toHaveBeenCalledWith('id', 'pending-current')
        expect(pendingRead.eq).toHaveBeenCalledWith('execution_id', 'execution-current')
        expect(executionRead.eq).toHaveBeenCalledWith('id', 'execution-current')
        expect(executionRead.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(pendingUpdate.query.eq).toHaveBeenCalledWith('id', 'pending-current')
        expect(pendingUpdate.query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(executionUpdate.query.eq).toHaveBeenCalledWith('id', 'execution-current')
        expect(executionUpdate.query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.workflowEngineCtor).toHaveBeenCalledWith(
            { nodes: [] },
            { existing: true }
        )
        expect(mocks.engineResume).toHaveBeenCalledWith(
            'wait-node',
            expect.objectContaining({
                executionId: 'execution-current',
                organization_id: 'org-current',
            })
        )
    })
})
