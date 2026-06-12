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

function listQuery(result: { data?: unknown[] | null; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        order: vi.fn(async () => result),
    }

    return query
}

function insertSingleQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        insert: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function updateSingleQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        update: vi.fn(() => query),
        eq: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function deleteFilterQuery(error: unknown = null) {
    const query: any = {
        error,
        delete: vi.fn(() => query),
        eq: vi.fn(() => query),
    }

    return query
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

describe('emitter settings actions', () => {
    it('does not log organization ids when listing emitters in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        const emitters = listQuery({
            data: [{ id: 'emitter-1', organization_id: 'org-secret-id' }],
            error: null,
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            emitters: [emitters],
        }))

        const { getEmitters } = await import('./emitters-actions')
        const result = await getEmitters()

        expect(result).toEqual([{ id: 'emitter-1', organization_id: 'org-secret-id' }])
        expect(consoleLog).toHaveBeenCalledWith('DEBUG: getEmitters called.', { organizationIdPresent: true })
        expect(JSON.stringify(consoleLog.mock.calls)).not.toContain('org-secret-id')
    })

    it('creates emitters without changing the success contract', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const insert = insertSingleQuery({
            data: { id: 'emitter-1', organization_id: 'org-current', display_name: 'Main' },
            error: null,
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            emitters: [insert],
        }))

        const { createEmitter } = await import('./emitters-actions')
        const result = await createEmitter({ display_name: 'Main' } as any)

        expect(result).toEqual({
            data: { id: 'emitter-1', organization_id: 'org-current', display_name: 'Main' },
        })
        expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({
            display_name: 'Main',
            organization_id: 'org-current',
        }))
    })

    it('does not expose emitter creation failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        const insert = insertSingleQuery({
            data: null,
            error: {
                message: 'emitter secret-value insert failed',
                code: '42501',
            },
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            emitters: [insert],
        }))

        const { createEmitter } = await import('./emitters-actions')
        const result = await createEmitter({ display_name: 'Main' } as any)

        expect(result).toEqual({ error: 'No se pudo crear el emisor' })
        expect(consoleError).toHaveBeenCalledWith('Error creating emitter:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose emitter update failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        const update = updateSingleQuery({
            data: null,
            error: {
                message: 'emitter secret-value update failed',
                code: '42501',
            },
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            emitters: [update],
        }))

        const { updateEmitter } = await import('./emitters-actions')
        const result = await updateEmitter('emitter-secret-id', { display_name: 'Main' } as any)

        expect(result).toEqual({ error: 'No se pudo actualizar el emisor' })
        expect(consoleError).toHaveBeenCalledWith('Error updating emitter:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose emitter delete failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        const remove = deleteFilterQuery({
            message: 'emitter secret-value delete failed',
            code: '42501',
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            emitters: [remove],
        }))

        const { deleteEmitter } = await import('./emitters-actions')

        await expect(deleteEmitter('emitter-secret-id')).rejects.toThrow('No se pudo eliminar el emisor')
        expect(consoleError).toHaveBeenCalledWith('Error deleting emitter:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })
})
