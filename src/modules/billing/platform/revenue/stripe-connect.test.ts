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

function selectQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function upsertQuery(error: unknown = null) {
    return {
        upsert: vi.fn(async () => ({ error })),
    }
}

function updateQuery(error: unknown = null) {
    const eq = vi.fn(async () => ({ error }))
    const update = vi.fn(() => ({ eq }))

    return { update, eq }
}

function createQueuedClient(queues: Record<string, any[]>) {
    return {
        from: vi.fn((table: string) => {
            const queue = queues[table]
            if (!queue?.length) throw new Error(`Unexpected table ${table}`)
            return queue.shift()
        }),
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
})

describe('Stripe Connect placeholder actions', () => {
    it('starts placeholder onboarding for organizations without completed onboarding', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const existingAccountQuery = selectQuery({ data: null, error: null })
        const accountUpsertQuery = upsertQuery(null)
        const client = createQueuedClient({
            payment_accounts: [existingAccountQuery, accountUpsertQuery],
        })
        mocks.createClient.mockResolvedValue(client)

        const { initiateConnectOnboarding } = await import('./stripe-connect')
        const result = await initiateConnectOnboarding()

        expect(result).toEqual({
            success: true,
            onboarding_url: '/settings/payments/connect-placeholder',
            error: 'PLACEHOLDER: Stripe Connect no integrado aún. Esta URL es temporal.',
        })
        expect(accountUpsertQuery.upsert).toHaveBeenCalledWith(expect.objectContaining({
            organization_id: 'org-current',
            provider: 'stripe_connect',
            onboarding_complete: false,
            charges_enabled: false,
            payouts_enabled: false,
        }))
    })

    it('does not expose onboarding persistence failures in action results', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        const existingAccountQuery = selectQuery({ data: null, error: null })
        const accountUpsertQuery = upsertQuery({
            message: 'connect secret-value failed for org-secret-id',
            code: '42501',
        })
        const client = createQueuedClient({
            payment_accounts: [existingAccountQuery, accountUpsertQuery],
        })
        mocks.createClient.mockResolvedValue(client)

        const { initiateConnectOnboarding } = await import('./stripe-connect')
        const result = await initiateConnectOnboarding()

        expect(result).toEqual({
            success: false,
            error: 'Stripe Connect onboarding could not be started',
        })
    })

    it('rolls back and does not expose payout update failures in action results', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const settlementQuery = selectQuery({
            data: {
                id: 'settlement-secret-id',
                reseller_org_id: 'reseller-secret-id',
                status: 'approved',
                net_payout: 123,
            },
            error: null,
        })
        const accountQuery = selectQuery({
            data: {
                payouts_enabled: true,
                stripe_account_id: 'acct_secret',
            },
            error: null,
        })
        const markProcessing = updateQuery(null)
        const markCompleted = updateQuery({
            message: 'payout secret-value failed for settlement-secret-id',
            code: '42501',
        })
        const rollbackApproved = updateQuery(null)
        const client = createQueuedClient({
            settlements: [settlementQuery, markProcessing, markCompleted, rollbackApproved],
            payment_accounts: [accountQuery],
        })
        mocks.createClient.mockResolvedValue(client)

        const { executeConnectPayout } = await import('./stripe-connect')
        const result = await executeConnectPayout('settlement-secret-id')

        expect(result).toEqual({
            success: false,
            error: 'Stripe Connect payout could not be completed',
        })
        expect(markProcessing.update).toHaveBeenCalledWith({ status: 'processing' })
        expect(markCompleted.update).toHaveBeenCalledWith(expect.objectContaining({
            status: 'completed',
            stripe_payout_id: expect.stringMatching(/^po_mock_/),
        }))
        expect(rollbackApproved.update).toHaveBeenCalledWith({ status: 'approved' })
    })
})
