import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    revalidatePath: vi.fn(),
    logDomainEvent: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/modules/infrastructure/logging/services/event-logger', () => ({
    logDomainEvent: mocks.logDomainEvent,
}))

function secretError(message = 'crm secret-value failure') {
    return {
        message,
        code: '42501',
        status: 403,
    }
}

function createQueuedClient(queues: Record<string, any[]>, extra: Record<string, any> = {}) {
    return {
        ...extra,
        from: vi.fn((table: string) => {
            const queue = queues[table]
            if (!queue?.length) throw new Error(`Unexpected table ${table}`)
            return queue.shift()
        }),
    }
}

function insertSelectSingle(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        insert: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function updateInEq(error: unknown = null) {
    const query: any = {
        update: vi.fn(() => query),
        in: vi.fn(() => query),
        eq: vi.fn(async () => ({ error })),
    }

    return query
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.logDomainEvent.mockReset()
})

async function importCrmLogicActions() {
    mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
    return import('./actions')
}

describe('CRM logic actions sanitized errors', () => {
    it('quick creates prospects without changing the success contract', async () => {
        const insert = insertSelectSingle({
            data: {
                id: 'client-1',
                name: 'Ada',
                organization_id: 'org-current',
            },
            error: null,
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            leads: [insert],
        }))
        mocks.logDomainEvent.mockResolvedValue(undefined)

        const { quickCreateProspect } = await importCrmLogicActions()
        const result = await quickCreateProspect({
            name: 'Ada',
            email: 'ada@example.com',
            phone: '555',
            userId: 'user-1',
        })

        expect(result).toEqual({
            success: true,
            client: {
                id: 'client-1',
                name: 'Ada',
                organization_id: 'org-current',
            },
        })
        expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({
            organization_id: 'org-current',
            user_id: 'user-1',
            name: 'Ada',
            contact_type: 'client',
        }))
        expect(mocks.logDomainEvent).toHaveBeenCalledWith(expect.objectContaining({
            entity_type: 'client',
            entity_id: 'client-1',
        }))
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/quotes')
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/clients')
    })

    it('does not expose prospect insert failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const insert = insertSelectSingle({
            data: null,
            error: secretError('prospect secret-value insert failed'),
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            leads: [insert],
        }))

        const { quickCreateProspect } = await importCrmLogicActions()
        const result = await quickCreateProspect({
            name: 'Ada',
            userId: 'user-1',
        })

        expect(result).toEqual({ success: false, error: 'No se pudo crear el prospecto' })
        expect(consoleError).toHaveBeenCalledWith('Supabase insert error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose paginated client RPC failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const rpc = vi.fn(async () => ({
            data: null,
            error: secretError('paginated clients secret-value rpc failed'),
        }))
        mocks.createClient.mockResolvedValue(createQueuedClient({}, { rpc }))

        const { getPaginatedClients } = await importCrmLogicActions()
        const result = await getPaginatedClients(2, 10, 'ada', 'active')

        expect(result).toEqual({
            clients: [],
            totalCount: 0,
            counts: { all: 0, overdue: 0, urgent: 0, active: 0, inactive: 0 },
        })
        expect(rpc).toHaveBeenCalledWith('get_paginated_clients', {
            p_org_id: 'org-current',
            p_search: 'ada',
            p_status: 'active',
            p_page: 2,
            p_page_size: 10,
        })
        expect(consoleError).toHaveBeenCalledWith('RPC get_paginated_clients error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose client delete failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const update = updateInEq(secretError('delete clients secret-value failed'))
        mocks.createClient.mockResolvedValue(createQueuedClient({
            leads: [update],
        }))

        const { deleteClients } = await importCrmLogicActions()
        const result = await deleteClients(['client-secret-id'])

        expect(result).toEqual({ success: false, error: 'No se pudieron eliminar los clientes' })
        expect(update.update).toHaveBeenCalledWith({
            deleted_at: expect.any(String),
        })
        expect(update.in).toHaveBeenCalledWith('id', ['client-secret-id'])
        expect(update.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(consoleError).toHaveBeenCalledWith('Error deleting clients:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })
})
