import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
    decryptObject: vi.fn(),
    performBackup: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.from,
    })),
}))

vi.mock('@/modules/infrastructure/integrations/encryption', () => ({
    decryptObject: mocks.decryptObject,
}))

vi.mock('@/modules/infrastructure/backup/backup-service', () => ({
    BackupService: {
        performBackup: mocks.performBackup,
    },
}))

type QueryResult = { data?: any, error?: any }

function cronRequest() {
    return new Request('https://pixy.test/api/cron/backup', {
        method: 'GET',
        headers: { authorization: 'Bearer cron-secret' },
    }) as any
}

function setupProductionCron() {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('CRON_SECRET', 'cron-secret')
}

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

function mockConnections(result: QueryResult) {
    mocks.from.mockImplementation((table: string) => {
        if (table !== 'integration_connections') {
            throw new Error(`Unexpected table ${table}`)
        }

        const builder: any = {
            select: vi.fn(() => builder),
            eq: vi.fn(() => builder),
            in: vi.fn(async () => result),
        }

        return builder
    })
}

describe('/api/cron/backup', () => {
    beforeEach(() => {
        Object.assign(supabaseAdmin, { from: mocks.from })
    })

    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.from.mockReset()
        mocks.decryptObject.mockReset()
        mocks.performBackup.mockReset()
    })

    it('does not expose credential decryption failures in production responses or logs', async () => {
        setupProductionCron()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mockConnections({
            data: [{
                organization_id: 'org-1',
                credentials: { encrypted: 'ciphertext' },
                integration: { key: 'aws_s3' },
            }],
            error: null,
        })
        mocks.decryptObject.mockImplementation(() => {
            throw new Error('kms backup secret-value failed while decrypting credentials')
        })

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Backup cron failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('kms backup')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('kms backup')
    })

    it('does not expose failed provider backup results in production responses', async () => {
        setupProductionCron()
        mockConnections({
            data: [{
                organization_id: 'org-1',
                credentials: { encrypted: 'ciphertext' },
                integration: { key: 'aws_s3' },
            }],
            error: null,
        })
        mocks.decryptObject.mockReturnValue({ schedule: 'daily' })
        mocks.performBackup.mockResolvedValue({
            success: false,
            error: 'aws access key secret-value failed during upload',
        })

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const body = await response.json()
        const responseText = JSON.stringify(body)

        expect(response.status).toBe(200)
        expect(body).toEqual({
            success: true,
            results: [{ success: false, error: 'Backup failed' }],
        })
        expect(responseText).not.toContain('org-1')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('access key')
    })
})
