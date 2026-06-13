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

function memberQuery(data: unknown) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => ({ data, error: null })),
    }

    return query
}

function authClient(adminFrom: any) {
    return {
        auth: {
            getUser: vi.fn(async () => ({
                data: {
                    user: { id: 'user-1' },
                },
            })),
        },
        from: vi.fn((table: string) => {
            if (table === 'organization_roles') {
                return adminFrom(table);
            }
            if (table !== 'organization_members') {
                throw new Error(`Unexpected table ${table}`)
            }
            return memberQuery({
                role: 'owner',
                role_id: null,
                permissions: {},
            })
        }),
    }
}

function insertSelectSingleQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        insert: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function selectEqSingleQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function createQueuedAdmin(queues: Record<string, any[]>) {
    const adminFrom = vi.fn((table: string) => {
        const queue = queues[table]
        if (!queue?.length) throw new Error(`Unexpected admin table ${table}`)
        return queue.shift()
    })
    mocks.createClient.mockResolvedValue(authClient(adminFrom))
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
})

describe('role service safeguards', () => {
    it('strips owner-level permission and clamps hierarchy when creating custom roles', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const insert = insertSelectSingleQuery({
            data: { id: 'role-1', name: 'Custom Admin' },
            error: null,
        })
        createQueuedAdmin({
            organization_roles: [insert],
        })

        const { upsertRole } = await import('./role-service')
        const result = await upsertRole({
            name: 'Custom Admin',
            description: 'Unsafe client payload',
            permissions: {
                all: true,
                'crm.view_leads': true,
                'crm.edit_leads': false,
                ignored: 'yes',
            } as any,
            hierarchy_level: 100,
        })

        expect(result).toEqual({ id: 'role-1', name: 'Custom Admin' })
        expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({
            organization_id: 'org-current',
            name: 'Custom Admin',
            hierarchy_level: 49,
            permissions: {
                'crm.view_leads': true,
                'crm.edit_leads': false,
            },
        }))
        expect(JSON.stringify(insert.insert.mock.calls)).not.toContain('"all"')
    })

    it('blocks editing system roles through the custom role upsert path', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const existingRole = selectEqSingleQuery({
            data: { is_system_role: true },
            error: null,
        })
        createQueuedAdmin({
            organization_roles: [existingRole],
        })

        const { upsertRole } = await import('./role-service')

        await expect(upsertRole({
            id: 'owner-role',
            name: 'Owner',
            permissions: {
                all: true,
            } as any,
            hierarchy_level: 100,
        })).rejects.toThrow('Cannot modify a System Role')
    })
})
