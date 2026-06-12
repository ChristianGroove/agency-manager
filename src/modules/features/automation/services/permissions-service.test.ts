import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

function selectQuery(result: unknown) {
    const promise = Promise.resolve(result)
    const query: any = {
        eq: vi.fn(() => query),
        select: vi.fn(() => query),
        then: promise.then.bind(promise),
        catch: promise.catch.bind(promise),
        finally: promise.finally.bind(promise),
    }

    return query
}

function deleteQuery(result: unknown = { error: null }) {
    const promise = Promise.resolve(result)
    const query: any = {
        delete: vi.fn(() => query),
        eq: vi.fn(() => query),
        then: promise.then.bind(promise),
        catch: promise.catch.bind(promise),
        finally: promise.finally.bind(promise),
    }

    return query
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
})

describe('workflow permissions service', () => {
    it('scopes permission reads to the active organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const permissionRead = selectQuery({
            data: [{
                id: 'permission-current',
                role: 'editor',
                user_id: 'user-current',
                workflow_id: 'workflow-current',
                user: {
                    email: 'user@example.com',
                    raw_user_meta_data: { full_name: 'User Current' },
                },
            }],
            error: null,
        })
        mocks.createClient.mockResolvedValue({
            from: vi.fn((table: string) => {
                if (table === 'workflow_permissions') return permissionRead
                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { getWorkflowPermissions } = await import('./permissions-service')
        const result = await getWorkflowPermissions('workflow-current')

        expect(result).toEqual([expect.objectContaining({
            id: 'permission-current',
            workflow_id: 'workflow-current',
            role: 'editor',
        })])
        expect(permissionRead.eq).toHaveBeenCalledWith('workflow_id', 'workflow-current')
        expect(permissionRead.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('scopes permission deletes to the active organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const permissionDelete = deleteQuery()
        mocks.createClient.mockResolvedValue({
            from: vi.fn((table: string) => {
                if (table === 'workflow_permissions') return permissionDelete
                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { removeWorkflowPermission } = await import('./permissions-service')
        const result = await removeWorkflowPermission('workflow-current', 'user-current')

        expect(result).toBe(true)
        expect(permissionDelete.eq).toHaveBeenCalledWith('workflow_id', 'workflow-current')
        expect(permissionDelete.eq).toHaveBeenCalledWith('user_id', 'user-current')
        expect(permissionDelete.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('fails closed without an active organization', async () => {
        const from = vi.fn()
        mocks.getCurrentOrganizationId.mockResolvedValue(null)
        mocks.createClient.mockResolvedValue({ from })

        const { getWorkflowPermissions, removeWorkflowPermission } = await import('./permissions-service')

        await expect(getWorkflowPermissions('workflow-current')).resolves.toEqual([])
        await expect(removeWorkflowPermission('workflow-current', 'user-current')).resolves.toBe(false)
        expect(from).not.toHaveBeenCalled()
    })
})
