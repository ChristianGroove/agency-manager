import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    canMakeCall: vi.fn(),
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    isWithinCallHours: vi.fn(),
    CallHoursManager: vi.fn(function () {
        return { isWithinCallHours: mocks.isWithinCallHours }
    }),
    CallPermissionManager: vi.fn(function () {
        return { canMakeCall: mocks.canMakeCall }
    }),
    supabaseFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/infrastructure/meta/services/calling/call-permission-manager', () => ({
    CallPermissionManager: mocks.CallPermissionManager,
}))

vi.mock('@/modules/infrastructure/meta/services/calling/call-hours-manager', () => ({
    CallHoursManager: mocks.CallHoursManager,
}))

function singleQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function authUser(user: unknown = { id: 'user-1' }) {
    return {
        getUser: vi.fn(async () => ({ data: { user } })),
    }
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.canMakeCall.mockReset()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.isWithinCallHours.mockReset()
    mocks.CallHoursManager.mockClear()
    mocks.CallPermissionManager.mockClear()
    mocks.supabaseFrom.mockReset()
})

describe('call actions', () => {
    it('does not inspect call status for conversations outside the current organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const conversationQuery = singleQuery({ data: null, error: null })
        mocks.createClient.mockResolvedValue({
            auth: authUser(),
            from: vi.fn((table: string) => {
                if (table === 'conversations') return conversationQuery
                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { getCallStatus } = await import('./calls')
        const result = await getCallStatus('conversation-foreign')

        expect(result).toEqual({ success: false, error: 'Conversation not found' })
        expect(conversationQuery.eq).toHaveBeenCalledWith('id', 'conversation-foreign')
        expect(conversationQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.supabaseFrom).not.toHaveBeenCalled()
        expect(mocks.CallPermissionManager).not.toHaveBeenCalled()
        expect(mocks.CallHoursManager).not.toHaveBeenCalled()
    })

    it('loads call hours only from a connection in the current organization', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.canMakeCall.mockResolvedValue({
            allowed: true,
            expiresAt: new Date('2026-01-01T00:00:00.000Z'),
            reason: 'ok',
        })
        mocks.isWithinCallHours.mockResolvedValue(true)
        const conversationQuery = singleQuery({
            data: {
                organization_id: 'org-current',
                connection_id: 'connection-current',
                lead_id: 'lead-1',
            },
            error: null,
        })
        const connectionQuery = singleQuery({
            data: {
                working_hours: { enabled: true },
            },
            error: null,
        })
        mocks.createClient.mockResolvedValue({
            auth: authUser(),
            from: vi.fn((table: string) => {
                if (table === 'conversations') return conversationQuery
                if (table === 'integration_connections') return connectionQuery
                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { getCallStatus } = await import('./calls')
        const result = await getCallStatus('conversation-current')

        expect(result).toEqual({
            success: true,
            callingEnabled: true,
            permStatus: {
                hasPermission: true,
                expiresAt: '2026-01-01T00:00:00.000Z',
                reason: 'ok',
            },
            isWithinHours: true,
            isSessionActive: true,
        })
        expect(conversationQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(connectionQuery.eq).toHaveBeenCalledWith('id', 'connection-current')
        expect(connectionQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.CallHoursManager).toHaveBeenCalledWith({ enabled: true })
        expect(mocks.canMakeCall).toHaveBeenCalledWith('conversation-current')
    })
})
