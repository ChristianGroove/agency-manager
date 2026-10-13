import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ client: vi.fn(), superAdmin: vi.fn(), cookieSet: vi.fn(), cookieGet: vi.fn() }))
vi.mock('@/modules/core/database/supabase-server', () => ({ createClient: mocks.client }))
vi.mock('@/modules/core/iam/services/platform-roles', () => ({ isSuperAdmin: mocks.superAdmin }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: mocks.cookieGet, set: mocks.cookieSet }) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { getCurrentOrganizationId, getUserOrganizations } from './crud'
import { switchOrganization } from './context'

const org = (status = 'active', deleted_at: string | null = null) => ({ status, deleted_at })
const member = (id: string, status = 'active', organization = org()) => ({ organization_id: id, status, deleted_at: null, organization })

function query(data: unknown, list?: unknown) {
    const result = { data, error: null }
    const builder = { select: vi.fn(), eq: vi.fn(), neq: vi.fn(), is: vi.fn(),
        maybeSingle: vi.fn(async () => result), single: vi.fn(async () => result),
        then: (resolve: (value: { data: unknown; error: null }) => unknown) => Promise.resolve({ data: list ?? data, error: null }).then(resolve) }
    for (const method of [builder.select, builder.eq, builder.neq, builder.is]) method.mockReturnValue(builder)
    return builder
}
beforeEach(() => {
    vi.resetAllMocks()
    mocks.superAdmin.mockResolvedValue(false)
    mocks.cookieGet.mockReturnValue(undefined)
})
function client(membership: ReturnType<typeof query>, organization?: ReturnType<typeof query>) {
    const from = vi.fn((table: string) => table === 'organizations' ? organization : membership)
    mocks.client.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) }, from })
    return from
}
describe('available organizations and stale context', () => {
    it('hides archived/deleted organizations and blocked/deleted memberships while keeping suspended tenants visible', async () => {
        const rows = [member('real'), member('suspended', 'active', org('suspended')),
            member('archived', 'active', org('archived')), member('blocked', 'blocked'),
            member('deleted-org', 'active', org('active', '2026-10-13')),
            { ...member('deleted-member'), deleted_at: '2026-10-13' }, { ...member('hidden-org'), organization: null }]
        const membersQuery = query(rows)
        client(membersQuery)
        expect((await getUserOrganizations()).map(row => row.organization_id)).toEqual(['real', 'suspended'])
        expect(membersQuery.select.mock.calls[0][0]).toContain('deleted_at')
        expect(membersQuery.select.mock.calls[0][0]).toContain('status')
    })
    it('normalizes an unambiguous joined organization and rejects empty or multiple joined rows', async () => {
        client(query([
            { ...member('one'), organization: [org()] },
            { ...member('none'), organization: [] },
            { ...member('ambiguous'), organization: [org(), org()] }
        ]))
        const organizations = await getUserOrganizations()
        expect(organizations.map(row => row.organization_id)).toEqual(['one'])
        expect(organizations[0].organization?.status).toBe('active')
    })
    it.each(['archived', 'blocked', 'deleted'])('falls back to the real tenant when the cookie points to a %s membership', async state => {
        const stale = state === 'archived' ? member('old', 'active', org('archived')) :
            state === 'blocked' ? member('old', 'blocked') : { ...member('old'), deleted_at: '2026-10-13' }
        mocks.cookieGet.mockReturnValue({ value: 'old' })
        client(query(stale, [stale, member('real')]))
        expect(await getCurrentOrganizationId()).toBe('real')
        expect(mocks.cookieSet).not.toHaveBeenCalled()
    })
    it('does not let the platform bypass select an archived tenant', async () => {
        mocks.cookieGet.mockReturnValue({ value: 'old' })
        mocks.superAdmin.mockResolvedValue(true)
        client(query(null, [member('real')]), query(org('archived')))
        expect(await getCurrentOrganizationId()).toBe('real')
    })
    it('keeps the platform bypass for an available tenant without direct membership', async () => {
        mocks.cookieGet.mockReturnValue({ value: 'support-target' })
        mocks.superAdmin.mockResolvedValue(true)
        client(query(null, []), query(org()))
        expect(await getCurrentOrganizationId()).toBe('support-target')
    })
})
describe('validated tenant switching', () => {
    it.each(['archived', 'deleted', 'missing'])('rejects a %s target before changing the cookie, including for platform administrators', async state => {
        mocks.superAdmin.mockResolvedValue(true)
        const target = state === 'archived' ? org('archived') : state === 'deleted' ? org('active', '2026-10-13') : null
        client(query({ organization_id: 'old' }), query(target))
        await expect(switchOrganization('old')).rejects.toThrow('ya no está disponible')
        expect(mocks.cookieSet).not.toHaveBeenCalled()
    })
    it('sets the cookie only after validating an available organization and membership', async () => {
        const membership = query({ organization_id: 'real' })
        client(membership, query(org()))
        await switchOrganization('real')
        expect(membership.is).toHaveBeenCalledWith('deleted_at', null)
        expect(membership.neq).toHaveBeenCalledWith('status', 'blocked')
        expect(mocks.cookieSet).toHaveBeenCalledWith('pixy_org_id', 'real', expect.objectContaining({ path: '/' }))
    })
    it.each(['active', 'archived'])('requires an available %s parent for hierarchical access', async status => {
        const memberQueries = [query(null), query({ ...member('parent', 'active', org(status)), role: 'owner' })]
        mocks.client.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
            from: (table: string) => table === 'organizations' ? query({ ...org(), parent_organization_id: 'parent' }) : memberQueries.shift() })
        if (status === 'active') {
            await switchOrganization('child')
            expect(mocks.cookieSet).toHaveBeenCalled()
        } else {
            await expect(switchOrganization('child')).rejects.toThrow('not a member')
            expect(mocks.cookieSet).not.toHaveBeenCalled()
        }
    })
})
