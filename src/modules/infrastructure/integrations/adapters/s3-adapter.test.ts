import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
    const send = vi.fn()
    return {
        execute: vi.fn(async (_key: string, callback: () => Promise<unknown>) => callback()),
        send,
        S3Client: vi.fn(function (this: any, config: unknown) {
            this.config = config
            this.send = send
        }),
        PutObjectCommand: vi.fn(function (this: any, input: unknown) {
            this.input = input
        }),
        HeadBucketCommand: vi.fn(function (this: any, input: unknown) {
            this.input = input
        }),
    }
})

vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: mocks.S3Client,
    PutObjectCommand: mocks.PutObjectCommand,
    HeadBucketCommand: mocks.HeadBucketCommand,
}))

vi.mock('@/modules/infrastructure/resilience/circuit-breaker', () => ({
    globalCircuitBreaker: {
        execute: mocks.execute,
    },
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

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.execute.mockReset()
    mocks.execute.mockImplementation(async (_key: string, callback: () => Promise<unknown>) => callback())
    mocks.send.mockReset()
    mocks.S3Client.mockClear()
    mocks.PutObjectCommand.mockClear()
    mocks.HeadBucketCommand.mockClear()
})

describe('S3StorageAdapter', () => {
    it('verifies valid credentials without changing the success contract', async () => {
        mocks.send.mockResolvedValue({})

        const { S3StorageAdapter } = await import('./s3-adapter')
        const result = await new S3StorageAdapter().verifyCredentials({
            access_key: 'access-key-secret',
            secret_key: 'secret-key-secret',
            bucket: 'pixy-backups',
            region: 'us-east-1',
        })

        expect(result).toEqual({
            isValid: true,
            metadata: {
                provider: 'aws',
                bucket: 'pixy-backups',
                region: 'us-east-1',
            },
        })
        expect(mocks.execute).toHaveBeenCalledWith('aws_s3_status', expect.any(Function))
        expect(mocks.HeadBucketCommand).toHaveBeenCalledWith({ Bucket: 'pixy-backups' })
    })

    it('does not expose S3 verification failures in deployed results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.send.mockRejectedValue(Object.assign(new Error('access denied for pixy-backups using secret-key-secret'), {
            name: 'S3ServiceException',
            $metadata: { httpStatusCode: 403 },
        }))

        const { S3StorageAdapter } = await import('./s3-adapter')
        const result = await new S3StorageAdapter().verifyCredentials({
            access_key: 'access-key-secret',
            secret_key: 'secret-key-secret',
            bucket: 'pixy-backups',
            region: 'us-east-1',
        })

        expect(result).toEqual({
            isValid: false,
            error: 'S3 credentials could not be verified',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).toContain('S3ServiceException')
        expect(logText).toContain('403')
        expect(logText).not.toContain('secret-key-secret')
        expect(logText).not.toContain('pixy-backups')
        expect(logText).not.toContain('access denied')
    })

    it('does not expose bucket names or paths in deployed upload logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.send.mockResolvedValue({})

        const { S3StorageAdapter } = await import('./s3-adapter')
        const result = await new S3StorageAdapter().storage.uploadFile(
            {
                access_key: 'access-key-secret',
                secret_key: 'secret-key-secret',
                bucket: 'pixy-backups',
                region: 'us-east-1',
            },
            'backups/org-secret/snapshot.zip',
            'content',
            'application/zip'
        )

        expect(result).toEqual({
            url: 'https://pixy-backups.s3.us-east-1.amazonaws.com/backups/org-secret/snapshot.zip',
            fileId: 'backups/org-secret/snapshot.zip',
        })

        const logText = collectConsoleCalls(logSpy)
        expect(logText).toContain('bucketPresent')
        expect(logText).toContain('pathPresent')
        expect(logText).not.toContain('pixy-backups')
        expect(logText).not.toContain('org-secret')
        expect(logText).not.toContain('snapshot.zip')
    })
})
