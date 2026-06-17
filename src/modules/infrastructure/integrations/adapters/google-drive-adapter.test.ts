import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    execute: vi.fn(async (_key: string, callback: () => Promise<unknown>) => callback()),
    filesCreate: vi.fn(),
    filesGet: vi.fn(),
    GoogleAuth: vi.fn(function (this: any, config: unknown) {
        this.config = config
    }),
    drive: vi.fn(),
}))

mocks.drive.mockImplementation(() => ({
    files: {
        create: mocks.filesCreate,
        get: mocks.filesGet,
    },
}))

vi.mock('googleapis', () => ({
    google: {
        auth: {
            GoogleAuth: mocks.GoogleAuth,
        },
        drive: mocks.drive,
    },
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
    mocks.filesCreate.mockReset()
    mocks.filesGet.mockReset()
    mocks.GoogleAuth.mockClear()
    mocks.drive.mockClear()
    mocks.drive.mockImplementation(() => ({
        files: {
            create: mocks.filesCreate,
            get: mocks.filesGet,
        },
    }))
})

describe('GoogleDriveAdapter', () => {
    it('verifies valid credentials without changing the success contract', async () => {
        mocks.filesGet.mockResolvedValue({})

        const { GoogleDriveAdapter } = await import('./google-drive-adapter')
        const result = await new GoogleDriveAdapter().verifyCredentials({
            client_email: 'service-account@example.com',
            private_key: 'line1\\nline2',
            folder_id: 'folder-secret-id',
        })

        expect(result).toEqual({
            isValid: true,
            metadata: {
                provider: 'google',
                account: 'service-account@example.com',
            },
        })
        expect(mocks.execute).toHaveBeenCalledWith('gdrive_status', expect.any(Function))
        expect(mocks.filesGet).toHaveBeenCalledWith({ fileId: 'folder-secret-id' })
        expect(mocks.GoogleAuth).toHaveBeenCalledWith(expect.objectContaining({
            credentials: expect.objectContaining({
                private_key: 'line1\nline2',
            }),
        }))
    })

    it('does not expose verification failures in deployed results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.filesGet.mockRejectedValue(Object.assign(new Error('private key secret-value denied folder-secret-id'), {
            name: 'GoogleApiError',
            code: 403,
        }))

        const { GoogleDriveAdapter } = await import('./google-drive-adapter')
        const result = await new GoogleDriveAdapter().verifyCredentials({
            client_email: 'service-account@example.com',
            private_key: 'private-key-secret',
            folder_id: 'folder-secret-id',
        })

        expect(result).toEqual({
            isValid: false,
            error: 'Google Drive credentials could not be verified',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).toContain('GoogleApiError')
        expect(logText).toContain('403')
        expect(logText).not.toContain('private-key-secret')
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('folder-secret-id')
    })

    it('does not expose folder ids or paths in deployed upload logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.filesCreate.mockResolvedValue({
            data: {
                id: 'file-secret-id',
                webViewLink: 'https://drive.google.com/file/d/file-secret-id',
            },
        })

        const { GoogleDriveAdapter } = await import('./google-drive-adapter')
        const result = await new GoogleDriveAdapter().storage.uploadFile(
            {
                client_email: 'service-account@example.com',
                private_key: 'private-key-secret',
                folder_id: 'folder-secret-id',
            },
            'backups/org-secret/snapshot.zip',
            'content',
            'application/zip'
        )

        expect(result).toEqual({
            url: 'https://drive.google.com/file/d/file-secret-id',
            fileId: 'file-secret-id',
        })

        const logText = collectConsoleCalls(logSpy)
        expect(logText).toContain('folderPresent')
        expect(logText).toContain('pathPresent')
        expect(logText).not.toContain('folder-secret-id')
        expect(logText).not.toContain('org-secret')
        expect(logText).not.toContain('snapshot.zip')
    })
})
