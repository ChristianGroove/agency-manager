import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    revalidatePath: vi.fn(),
    storageFrom: vi.fn(),
    supabaseFrom: vi.fn(),
    vaultRegistry: {
        getAllModules: vi.fn(),
        getModule: vi.fn(),
        getSortedModules: vi.fn(),
    },
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

vi.mock('./registry', () => ({
    vaultRegistry: mocks.vaultRegistry,
}))

function collectConsoleCalls(...spies: ReturnType<typeof vi.spyOn>[]) {
    return spies
        .flatMap(spy => spy.mock.calls as unknown[][])
        .map(call => call.map(value => {
            if (typeof value === 'string') return value
            if (value instanceof Error) return `${value.name}: ${value.message}`
            try {
                return JSON.stringify(value)
            } catch {
                return String(value)
            }
        }).join(' '))
        .join('\n')
}

function createSupabaseMock(user: { id: string } | null = { id: 'user-current' }) {
    return {
        auth: {
            getUser: vi.fn(async () => ({
                data: { user },
                error: null,
            })),
        },
        from: mocks.supabaseFrom,
        storage: {
            from: mocks.storageFrom,
        },
    }
}

function orderQuery(result: unknown) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        order: vi.fn(async () => result),
    }

    return query
}

function insertSelectSingleQuery(result: unknown) {
    const query: any = {
        insert: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function updateEqQuery(result: unknown) {
    const query: any = {
        update: vi.fn(() => query),
        eq: vi.fn(async () => result),
    }

    return query
}

function selectEqSingleQuery(result: unknown) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function deleteEqQuery(result: unknown) {
    const query: any = {
        delete: vi.fn(() => query),
        eq: vi.fn(async () => result),
    }

    return query
}

function useTableQueues(queues: Record<string, unknown[]>) {
    const tableQueues = Object.fromEntries(
        Object.entries(queues).map(([table, tableQueue]) => [table, [...tableQueue]])
    )

    mocks.supabaseFrom.mockImplementation((table: string) => {
        const queue = tableQueues[table]
        if (!queue?.length) throw new Error(`Unexpected table ${table}`)
        return queue.shift()
    })
}

function createStorageMock(overrides: {
    upload?: ReturnType<typeof vi.fn>
    remove?: ReturnType<typeof vi.fn>
    download?: ReturnType<typeof vi.fn>
} = {}) {
    const bucket = {
        upload: overrides.upload ?? vi.fn(async () => ({ error: null })),
        remove: overrides.remove ?? vi.fn(async () => ({ error: null })),
        download: overrides.download ?? vi.fn(async () => ({
            data: { text: vi.fn(async () => JSON.stringify({ meta: { orgId: 'org-current' } })) },
            error: null,
        })),
    }

    mocks.storageFrom.mockReturnValue(bucket)
    return bucket
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.storageFrom.mockReset()
    mocks.supabaseFrom.mockReset()
    mocks.vaultRegistry.getAllModules.mockReset()
    mocks.vaultRegistry.getModule.mockReset()
    mocks.vaultRegistry.getSortedModules.mockReset()
})

describe('data vault actions', () => {
    it('creates a snapshot without changing the success contract', async () => {
        const crmModule = {
            key: 'crm',
            dependencies: [],
            exportData: vi.fn(async () => ({ leads: [] })),
        }
        const storage = createStorageMock()
        mocks.createClient.mockResolvedValue(createSupabaseMock())
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.vaultRegistry.getModule.mockReturnValue(crmModule)
        useTableQueues({
            data_snapshots: [
                orderQuery({ count: 0, data: [], error: null }),
                insertSelectSingleQuery({ data: { id: 'snapshot-current' }, error: null }),
                updateEqQuery({ error: null }),
            ],
        })

        const { createSnapshot } = await import('./data-vault-actions')
        const result = await createSnapshot('Daily backup', ['crm'])

        expect(result).toEqual({ success: true, snapshotId: 'snapshot-current' })
        expect(crmModule.exportData).toHaveBeenCalledWith('org-current')
        expect(storage.upload).toHaveBeenCalledWith(
            'org-current/snapshot-current.json',
            expect.any(String),
            expect.objectContaining({ contentType: 'application/json', upsert: true })
        )
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/platform/settings')
    })

    it('does not expose snapshot creation failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(createSupabaseMock({ id: 'user-secret-id' }))
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        useTableQueues({
            data_snapshots: [
                orderQuery({ count: 0, data: [], error: null }),
                insertSelectSingleQuery({
                    data: null,
                    error: {
                        code: '42501',
                        message: 'insert denied org-secret-id user-secret-id vault-token-secret Backup secret name',
                    },
                }),
            ],
        })

        const { createSnapshot } = await import('./data-vault-actions')
        const result = await createSnapshot('Backup secret name')

        expect(result).toEqual({ success: false, error: 'No se pudo crear el backup' })
        const logText = collectConsoleCalls(errorSpy, logSpy)
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('user-secret-id')
        expect(logText).not.toContain('vault-token-secret')
        expect(logText).not.toContain('Backup secret name')
        expect(logText).not.toContain('insert denied')
        expect(logText).toContain('42501')
    })

    it('does not expose snapshot deletion failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        createStorageMock()
        mocks.createClient.mockResolvedValue(createSupabaseMock())
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        useTableQueues({
            data_snapshots: [
                selectEqSingleQuery({
                    data: {
                        organization_id: 'org-secret-id',
                        storage_path: 'org-secret-id/path-token-secret.json',
                    },
                    error: null,
                }),
                deleteEqQuery({
                    error: {
                        code: '42501',
                        message: 'delete denied org-secret-id path-token-secret delete-token-secret',
                    },
                }),
            ],
        })

        const { deleteSnapshot } = await import('./data-vault-actions')
        const result = await deleteSnapshot('snapshot-secret-id')

        expect(result).toEqual({ success: false, error: 'No se pudo eliminar el backup' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('snapshot-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('path-token-secret')
        expect(logText).not.toContain('delete-token-secret')
        expect(logText).not.toContain('delete denied')
        expect(logText).toContain('42501')
    })

    it('does not expose restore validation failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const storage = createStorageMock({
            download: vi.fn(async () => ({
                data: null,
                error: {
                    code: '404',
                    message: 'download denied org-secret-id path-token-secret restore-token-secret',
                },
            })),
        })
        mocks.createClient.mockResolvedValue(createSupabaseMock())
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        useTableQueues({
            data_snapshots: [
                selectEqSingleQuery({
                    data: {
                        organization_id: 'org-secret-id',
                        storage_path: 'org-secret-id/path-token-secret.json',
                    },
                    error: null,
                }),
            ],
        })

        const { restoreSnapshot } = await import('./data-vault-actions')
        const result = await restoreSnapshot('snapshot-secret-id')

        expect(result).toEqual({ success: false, error: 'No se pudo validar el backup' })
        expect(storage.download).toHaveBeenCalledWith('org-secret-id/path-token-secret.json')
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('snapshot-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('path-token-secret')
        expect(logText).not.toContain('restore-token-secret')
        expect(logText).not.toContain('download denied')
        expect(logText).toContain('404')
    })

    it('does not expose vault config failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(createSupabaseMock())
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        useTableQueues({
            organizations: [
                updateEqQuery({
                    error: {
                        code: '42501',
                        message: 'config denied org-secret-id config-token-secret',
                    },
                }),
            ],
        })

        const { updateVaultConfig } = await import('./data-vault-actions')
        const result = await updateVaultConfig({ enabled: true, frequency: 'daily' })

        expect(result).toEqual({ success: false, error: 'No se pudo actualizar la configuracion de backup' })
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('config-token-secret')
        expect(logText).not.toContain('config denied')
        expect(logText).toContain('42501')
    })
})
