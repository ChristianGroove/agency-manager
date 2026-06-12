import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    revalidatePath: vi.fn(),
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

function createQueuedClient(queues: Record<string, any[]>) {
    return {
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

function deleteEqEq(result: { error?: unknown }) {
    let eqCalls = 0
    const query: any = {
        delete: vi.fn(() => query),
        eq: vi.fn(() => {
            eqCalls += 1
            return eqCalls >= 2 ? Promise.resolve(result) : query
        }),
    }

    return query
}

function secretError(message = 'category secret-value failure') {
    return {
        message,
        code: '42501',
        status: 403,
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.revalidatePath.mockReset()
})

async function importCategoryActions() {
    mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
    return import('./categories-actions')
}

describe('client category actions', () => {
    it('creates categories without changing the success contract', async () => {
        const category = {
            id: 'category-1',
            organization_id: 'org-current',
            name: 'VIP',
            color: 'slate',
        }
        const insert = insertSelectSingle({ data: category, error: null })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            client_categories: [insert],
        }))

        const { createClientCategory } = await importCategoryActions()
        const result = await createClientCategory(' VIP ', 'slate')

        expect(result).toEqual({ success: true, data: category })
        expect(insert.insert).toHaveBeenCalledWith({
            organization_id: 'org-current',
            name: 'VIP',
            color: 'slate',
        })
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard/clients')
    })

    it('keeps duplicate category errors user-facing without exposing provider details', async () => {
        const insert = insertSelectSingle({
            data: null,
            error: secretError('duplicate category secret-value failed'),
        })
        ;(insert.single as any).mockResolvedValueOnce({
            data: null,
            error: { ...secretError('duplicate category secret-value failed'), code: '23505' },
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            client_categories: [insert],
        }))

        const { createClientCategory } = await importCategoryActions()
        const result = await createClientCategory('VIP')

        expect(result.success).toBe(false)
        expect(result.error).toContain('Ya existe')
        expect(result.error).not.toContain('secret-value')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it('does not expose category deletion failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const deletion = deleteEqEq({ error: secretError('delete category secret-value failed') })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            client_categories: [deletion],
        }))

        const { deleteClientCategory } = await importCategoryActions()
        const result = await deleteClientCategory('category-secret-id')

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de categorias' })
        expect(deletion.delete).toHaveBeenCalled()
        expect(deletion.eq).toHaveBeenCalledWith('id', 'category-secret-id')
        expect(deletion.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(consoleError).toHaveBeenCalledWith('Error deleting client category:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })
})
