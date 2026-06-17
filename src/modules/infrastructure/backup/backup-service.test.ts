import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
    getAdapter: vi.fn(),
    uploadFile: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.from,
    }))
}))

vi.mock('@/modules/infrastructure/integrations/registry', () => ({
    integrationRegistry: {
        getAdapter: mocks.getAdapter,
    },
}))

function collectConsoleCalls(spy: ReturnType<typeof vi.spyOn>) {
    return (spy.mock.calls as unknown[][])
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

function mockBackupTables() {
    mocks.from.mockImplementation((table: string) => {
        if (table === 'integration_connections') {
            const builder: any = {
                select: vi.fn(() => builder),
                eq: vi.fn(() => builder),
                in: vi.fn(async () => ({
                    data: [{
                        integration: { key: 'aws_s3', name: 'AWS S3' },
                        credentials: { accessKeyId: 'secret-value' },
                    }],
                    error: null,
                })),
            }

            return builder
        }

        if (table === 'leads') {
            const builder: any = {
                select: vi.fn(() => builder),
                eq: vi.fn(async () => ({ data: [], error: null })),
            }

            return builder
        }

        throw new Error(`Unexpected table ${table}`)
    })
}

describe('BackupService', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.from.mockReset()
        mocks.getAdapter.mockReset()
        mocks.uploadFile.mockReset()
    })

    it('does not expose provider upload failures in production results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mockBackupTables()
        mocks.getAdapter.mockReturnValue({
            storage: { uploadFile: mocks.uploadFile },
        })
        mocks.uploadFile.mockRejectedValue(
            new Error('aws secret access key secret-value failed during backup upload')
        )

        const { BackupService } = await import('./backup-service')
        const result = await BackupService.performBackup('org-1')
        const resultText = JSON.stringify(result)

        expect(result).toEqual({ success: false, error: 'Backup failed' })
        expect(resultText).not.toContain('secret-value')
        expect(resultText).not.toContain('secret access key')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('secret access key')
    })
})
