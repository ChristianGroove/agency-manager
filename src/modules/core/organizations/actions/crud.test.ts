import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    supabaseFrom: vi.fn(),
    revalidatePath: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    },
}))

vi.mock('next/cache', () => ({
    unstable_cache: (fn: any) => fn,
    revalidatePath: mocks.revalidatePath,
}))

function createQueryBuilder(result: { data?: any; error?: any } = { data: null, error: null }) {
    const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        in: vi.fn(() => builder),
        delete: vi.fn(() => builder),
        order: vi.fn(() => builder),
        range: vi.fn(async () => result),
        single: vi.fn(async () => result),
        maybeSingle: vi.fn(async () => result),
    }
    builder.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)

    return builder
}

function mockAuthenticatedClient(memberships: any[], user: any = { id: 'user-1' }) {
    const membershipQuery = createQueryBuilder({
        data: memberships,
        error: null,
    })
    const client = {
        auth: {
            getUser: vi.fn(async () => ({ data: { user } })),
        },
        from: vi.fn((table: string) => {
            if (table !== 'organization_members') {
                throw new Error(`Unexpected table ${table}`)
            }

            return membershipQuery
        }),
    }

    mocks.createClient.mockResolvedValue(client)

    return { client, membershipQuery }
}

describe('deleteOrganizations', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('lets platform admins keep global deletion scope', async () => {
        mockAuthenticatedClient([
            {
                organization_id: 'platform-1',
                role: 'admin',
                organization: { organization_type: 'platform' },
            },
        ])
        const deleteQuery = createQueryBuilder({ error: null })
        mocks.supabaseFrom.mockReturnValueOnce(deleteQuery)

        const { deleteOrganizations } = await import('./crud')
        const result = await deleteOrganizations(['org-anywhere'])

        expect(result).toEqual({ success: true })
        expect(deleteQuery.delete).toHaveBeenCalled()
        expect(deleteQuery.in.mock.calls).toEqual([
            ['id', ['org-anywhere']],
        ])
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/platform/organizations')
    })

    it('scopes reseller deletions to organizations under that reseller', async () => {
        mockAuthenticatedClient([
            {
                organization_id: 'reseller-1',
                role: 'owner',
                organization: { organization_type: 'reseller' },
            },
        ])
        const targetLookup = createQueryBuilder({
            data: [{ id: 'child-1', parent_organization_id: 'reseller-1' }],
            error: null,
        })
        const deleteQuery = createQueryBuilder({ error: null })
        mocks.supabaseFrom
            .mockReturnValueOnce(targetLookup)
            .mockReturnValueOnce(deleteQuery)

        const { deleteOrganizations } = await import('./crud')
        const result = await deleteOrganizations(['child-1'])

        expect(result).toEqual({ success: true })
        expect(targetLookup.select).toHaveBeenCalledWith('id, parent_organization_id')
        expect(targetLookup.in).toHaveBeenCalledWith('id', ['child-1'])
        expect(deleteQuery.delete).toHaveBeenCalled()
        expect(deleteQuery.in.mock.calls).toEqual([
            ['id', ['child-1']],
            ['parent_organization_id', ['reseller-1']],
        ])
    })

    it('rejects reseller deletions outside their organization tree before deleting', async () => {
        mockAuthenticatedClient([
            {
                organization_id: 'reseller-1',
                role: 'admin',
                organization: { organization_type: 'reseller' },
            },
        ])
        const targetLookup = createQueryBuilder({
            data: [{ id: 'other-child', parent_organization_id: 'reseller-2' }],
            error: null,
        })
        mocks.supabaseFrom.mockReturnValueOnce(targetLookup)

        const { deleteOrganizations } = await import('./crud')
        const result = await deleteOrganizations(['other-child'])

        expect(result).toEqual({
            success: false,
            error: 'No tienes permisos suficientes para eliminar organizaciones.',
        })
        expect(mocks.supabaseFrom).toHaveBeenCalledTimes(1)
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })
})
