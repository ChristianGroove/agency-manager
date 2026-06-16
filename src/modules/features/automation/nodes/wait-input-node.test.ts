import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    supabaseFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    }))
}))

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
    mocks.supabaseFrom.mockReset()
})

describe('WaitInputNode', () => {
    it('scopes completed pending input updates to the pending organization', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const pendingUpdate = updateQuery()
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'workflow_pending_inputs') return pendingUpdate
            throw new Error(`Unexpected table ${table}`)
        })

        const { WaitInputNode } = await import('./wait-input-node')
        const result = await new WaitInputNode({} as any).processInput(
            {
                config: { inputType: 'text' },
                id: 'pending-current',
                organization_id: 'org-current',
            },
            { type: 'text', content: 'si' }
        )

        expect(result).toEqual(expect.objectContaining({
            success: true,
            suspended: false,
            userInput: 'si',
        }))
        expect(pendingUpdate.query.eq).toHaveBeenCalledWith('id', 'pending-current')
        expect(pendingUpdate.query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('scopes timeout pending input updates to the pending organization', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const timeoutUpdate = updateQuery()
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'workflow_pending_inputs') return timeoutUpdate
            throw new Error(`Unexpected table ${table}`)
        })

        const { WaitInputNode } = await import('./wait-input-node')
        const result = await new WaitInputNode({} as any).handleTimeout({
            config: { timeoutAction: 'stop' },
            id: 'pending-current',
            organization_id: 'org-current',
        })

        expect(result).toEqual({
            error: 'Timeout - workflow stopped',
            success: false,
            suspended: false,
        })
        expect(timeoutUpdate.query.eq).toHaveBeenCalledWith('id', 'pending-current')
        expect(timeoutUpdate.query.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })
})
