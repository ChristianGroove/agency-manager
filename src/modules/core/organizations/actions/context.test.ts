import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    isSuperAdmin: vi.fn(),
    revalidatePath: vi.fn(),
    cookieSet: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/iam/services/platform-roles', () => ({
    isSuperAdmin: mocks.isSuperAdmin,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('next/headers', () => ({
    cookies: vi.fn(async () => ({
        set: mocks.cookieSet,
    })),
}))

function singleQuery(data: unknown = null) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => ({ data })),
    }

    return query
}

function upsertQuery(error: unknown = null) {
    return {
        upsert: vi.fn(async () => ({ error })),
    }
}

function authClient(userId: string | null, queues: Record<string, any[]> = {}) {
    return {
        auth: {
            getUser: vi.fn(async () => ({
                data: {
                    user: userId ? { id: userId } : null,
                },
            })),
        },
        from: vi.fn((table: string) => {
            const queue = queues[table]
            if (!queue?.length) throw new Error(`Unexpected table ${table}`)
            return queue.shift()
        }),
    }
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.isSuperAdmin.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.cookieSet.mockReset()
})

describe('organization context actions', () => {
    it('does not write the active organization cookie without an authenticated user', async () => {
        mocks.createClient.mockResolvedValue(authClient(null))

        const { switchOrganization } = await import('./context')

        await expect(switchOrganization('org-any')).rejects.toThrow('Unauthorized')
        expect(mocks.cookieSet).not.toHaveBeenCalled()
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it('rejects root organization limit updates when the user is not owner, admin, or super admin', async () => {
        mocks.createClient.mockResolvedValue(authClient('user-1', {
            organization_members: [singleQuery({ role: 'member' })],
            organizations: [singleQuery({ parent_organization_id: null })],
        }))
        mocks.isSuperAdmin.mockResolvedValue(false)

        const { updateOrganizationLimits } = await import('./context')
        const result = await updateOrganizationLimits('org-root', [
            { engine: 'whatsapp', period: 'month', limit: 1000 },
        ])

        expect(result).toEqual({
            success: false,
            error: 'No tienes permiso para gestionar limites de esta organizacion.',
        })
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it('allows root organization owners to update limits', async () => {
        const upsert = upsertQuery(null)
        mocks.createClient.mockResolvedValue(authClient('user-1', {
            organization_members: [singleQuery({ role: 'owner' })],
            organizations: [singleQuery({ parent_organization_id: null })],
            usage_limits: [upsert],
        }))
        mocks.isSuperAdmin.mockResolvedValue(false)

        const { updateOrganizationLimits } = await import('./context')
        const result = await updateOrganizationLimits('org-root', [
            { engine: 'whatsapp', period: 'month', limit: 1000 },
        ])

        expect(result).toEqual({ success: true })
        expect(upsert.upsert).toHaveBeenCalledWith([
            {
                organization_id: 'org-root',
                engine: 'whatsapp',
                period: 'month',
                limit_value: 1000,
            },
        ])
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/platform/organizations')
    })

    it('allows parent organization admins to update child organization limits', async () => {
        const upsert = upsertQuery(null)
        mocks.createClient.mockResolvedValue(authClient('user-1', {
            organization_members: [singleQuery({ role: 'admin' })],
            organizations: [singleQuery({ parent_organization_id: 'parent-org' })],
            usage_limits: [upsert],
        }))
        mocks.isSuperAdmin.mockResolvedValue(false)

        const { updateOrganizationLimits } = await import('./context')
        const result = await updateOrganizationLimits('child-org', [
            { engine: 'ai', period: 'day', limit: 50 },
        ])

        expect(result).toEqual({ success: true })
        expect(upsert.upsert).toHaveBeenCalledWith([
            {
                organization_id: 'child-org',
                engine: 'ai',
                period: 'day',
                limit_value: 50,
            },
        ])
    })

    it('does not expose limit persistence errors in action results', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(authClient('user-1', {
            organization_members: [singleQuery({ role: 'owner' })],
            organizations: [singleQuery({ parent_organization_id: null })],
            usage_limits: [upsertQuery({
                message: 'usage limit secret-value failed',
                code: '42501',
            })],
        }))
        mocks.isSuperAdmin.mockResolvedValue(false)

        const { updateOrganizationLimits } = await import('./context')
        const result = await updateOrganizationLimits('org-root', [
            { engine: 'whatsapp', period: 'month', limit: 1000 },
        ])

        expect(result).toEqual({
            success: false,
            error: 'No se pudieron actualizar los limites',
        })
        expect(JSON.stringify(result)).not.toContain('secret-value')
        expect(consoleError).toHaveBeenCalledWith('Error updating limits:', expect.objectContaining({
            code: '42501',
        }))
    })
})
