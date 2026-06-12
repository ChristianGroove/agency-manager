import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    isSuperAdmin: vi.fn(),
    requireSuperAdmin: vi.fn(),
    supabaseAdmin: {
        from: vi.fn(),
        rpc: vi.fn(),
    },
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: mocks.supabaseAdmin,
}))

vi.mock('@/modules/core/iam/services/platform-roles', () => ({
    isSuperAdmin: mocks.isSuperAdmin,
    requireSuperAdmin: mocks.requireSuperAdmin,
}))

function membershipQuery(data: unknown = null) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        maybeSingle: vi.fn(async () => ({ data })),
    }

    return query
}

function adminEqListQuery(data: unknown[] = []) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(async () => ({ data })),
    }

    return query
}

function adminEqInListQuery(data: unknown[] = []) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(async () => ({ data })),
    }

    return query
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

function createQueuedAdmin(queues: Record<string, any[]>) {
    mocks.supabaseAdmin.from.mockImplementation((table: string) => {
        const queue = queues[table]
        if (!queue?.length) throw new Error(`Unexpected admin table ${table}`)
        return queue.shift()
    })
}

afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.isSuperAdmin.mockReset()
    mocks.requireSuperAdmin.mockReset()
    mocks.supabaseAdmin.from.mockReset()
    mocks.supabaseAdmin.rpc.mockReset()
})

describe('usage plan actions', () => {
    it('does not expose organization usage when the user is not a member or super admin', async () => {
        mocks.createClient.mockResolvedValue(authClient('user-1', {
            organization_members: [membershipQuery(null)],
        }))
        mocks.isSuperAdmin.mockResolvedValue(false)

        const { getOrgUsageStatus } = await import('./plan-actions')
        const result = await getOrgUsageStatus('org-other')

        expect(result).toEqual([])
        expect(mocks.isSuperAdmin).toHaveBeenCalledWith('user-1')
        expect(mocks.supabaseAdmin.from).not.toHaveBeenCalled()
    })

    it('returns usage status for organization members through the guarded loader', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-06-10T12:00:00Z'))
        mocks.createClient.mockResolvedValue(authClient('user-1', {
            organization_members: [membershipQuery({ role: 'owner' })],
        }))
        createQueuedAdmin({
            usage_limits: [adminEqListQuery([
                {
                    engine: 'whatsapp',
                    period: 'month',
                    limit_value: 100,
                },
            ])],
            usage_counters: [adminEqInListQuery([
                {
                    engine: 'whatsapp',
                    period: 'month',
                    period_start: '2026-06-01',
                    used: 25,
                },
            ])],
        })

        const { getOrgUsageStatus } = await import('./plan-actions')
        const result = await getOrgUsageStatus('org-current')

        expect(result).toEqual([
            {
                engine: 'whatsapp',
                limit: 100,
                used: 25,
                remaining: 75,
                percentage: 25,
                is_unlimited: false,
                is_exceeded: false,
            },
        ])
        expect(mocks.isSuperAdmin).not.toHaveBeenCalled()
    })

    it('requires super admin before upgrading an organization plan', async () => {
        mocks.requireSuperAdmin.mockRejectedValue(new Error('Unauthorized: Super admin access required'))

        const { upgradePlan } = await import('./plan-actions')

        await expect(upgradePlan('org-current', 'business')).rejects.toThrow('Unauthorized')
        expect(mocks.supabaseAdmin.rpc).not.toHaveBeenCalled()
    })

    it('keeps the successful upgrade plan contract for super admins', async () => {
        mocks.requireSuperAdmin.mockResolvedValue(undefined)
        mocks.supabaseAdmin.rpc.mockResolvedValue({ data: true, error: null })

        const { upgradePlan } = await import('./plan-actions')
        const result = await upgradePlan('org-current', 'business')

        expect(result).toEqual({ success: true })
        expect(mocks.supabaseAdmin.rpc).toHaveBeenCalledWith('upgrade_org_plan', {
            p_organization_id: 'org-current',
            p_new_plan_code: 'business',
        })
    })
})
