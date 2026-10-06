import crypto from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
    supabaseFrom: vi.fn(),
    processGithubEvent: vi.fn(),
    resolveConnectionCredentials: vi.fn(),
    decryptObject: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    },
}))

vi.mock('@/modules/features/tasks/services/task-vcs-service', () => ({
    taskVcsService: {
        processGithubEvent: mocks.processGithubEvent,
    },
}))

vi.mock('@/modules/infrastructure/integrations/connection-secrets', () => ({
    resolveConnectionCredentials: mocks.resolveConnectionCredentials,
}))

vi.mock('@/modules/infrastructure/integrations/encryption', () => ({
    decryptObject: mocks.decryptObject,
}))

function createSignedRequest(options: {
    connectionId: string
    body: string
    secret?: string
    signatureHeaderName?: string
    signatureOverride?: string
    eventKey?: string
}) {
    const {
        body,
        secret,
        signatureHeaderName = 'x-hub-signature-256',
        signatureOverride,
        eventKey = 'push',
    } = options

    const headers = new Headers({
        'content-type': 'application/json',
        'x-github-event': eventKey,
    })

    if (signatureOverride !== undefined) {
        if (signatureOverride !== '') {
            headers.set(signatureHeaderName, signatureOverride)
        }
    } else if (secret) {
        const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex')
        headers.set(signatureHeaderName, `sha256=${hmac}`)
    }

    const request = new NextRequest(new URL(`http://localhost/api/webhooks/vcs/github/${options.connectionId}`), {
        method: 'POST',
        headers,
        body,
    })

    return request
}

function mockSupabaseConnection(connectionData: Record<string, any> | null, error: any = null) {
    mocks.supabaseFrom.mockImplementation((table: string) => {
        if (table === 'integration_connections') {
            return {
                select: vi.fn(() => ({
                    eq: vi.fn((col1: string, _val1: any) => ({
                        eq: vi.fn((col2: string, val2: any) => ({
                            single: vi.fn(async () => {
                                if (error) return { data: null, error }
                                if (!connectionData) return { data: null, error: { message: 'Not found' } }
                                if (col2 === 'status' && connectionData.status !== val2) {
                                    return { data: null, error: { message: 'Row not found or status inactive' } }
                                }
                                return { data: connectionData, error: null }
                            }),
                        })),
                    })),
                })),
            }
        }
        return {}
    })
}

afterEach(() => {
    vi.restoreAllMocks()
    mocks.supabaseFrom.mockReset()
    mocks.processGithubEvent.mockReset()
    mocks.resolveConnectionCredentials.mockReset()
    mocks.decryptObject.mockReset()
})

describe('Webhook Route: /api/webhooks/vcs/github/[connectionId]', () => {
    it('returns 200 for ping event only AFTER connection lookup and valid HMAC verification', async () => {
        const { POST } = await import('./route')

        const secret = 'webhook-secret-ping-123'
        mockSupabaseConnection({
            id: 'conn-gh-123',
            organization_id: 'org-tenant-1',
            status: 'active',
            credentials: {},
        })
        mocks.resolveConnectionCredentials.mockResolvedValue({
            webhook_secret: secret,
        })

        const request = createSignedRequest({
            connectionId: 'conn-gh-123',
            eventKey: 'ping',
            secret,
            body: JSON.stringify({ zen: 'Keep it logically awesome.', hook_id: 123456 }),
        })

        const response = await POST(request, { params: Promise.resolve({ connectionId: 'conn-gh-123' }) })
        expect(response.status).toBe(200)

        const json = await response.json()
        expect(json.ok).toBe(true)
        expect(json.zen).toBe('Keep it logically awesome.')
        expect(mocks.supabaseFrom).toHaveBeenCalled()
    })

    it('returns 401 for ping event when HMAC is invalid', async () => {
        const { POST } = await import('./route')

        const secret = 'webhook-secret-ping-123'
        mockSupabaseConnection({
            id: 'conn-gh-123',
            organization_id: 'org-tenant-1',
            status: 'active',
            credentials: {},
        })
        mocks.resolveConnectionCredentials.mockResolvedValue({
            webhook_secret: secret,
        })

        const request = createSignedRequest({
            connectionId: 'conn-gh-123',
            eventKey: 'ping',
            secret: 'wrong-secret',
            body: JSON.stringify({ zen: 'Keep it logically awesome.', hook_id: 123456 }),
        })

        const response = await POST(request, { params: Promise.resolve({ connectionId: 'conn-gh-123' }) })
        expect(response.status).toBe(401)

        const json = await response.json()
        expect(json.error).toContain('Invalid HMAC signature')
    })

    it('returns 500 when webhook secret is not configured on connection', async () => {
        const { POST } = await import('./route')

        mockSupabaseConnection({
            id: 'conn-gh-123',
            organization_id: 'org-tenant-1',
            status: 'active',
            credentials: {},
        })
        mocks.resolveConnectionCredentials.mockResolvedValue({})

        const request = createSignedRequest({
            connectionId: 'conn-gh-123',
            body: JSON.stringify({ action: 'opened' }),
        })

        const response = await POST(request, { params: Promise.resolve({ connectionId: 'conn-gh-123' }) })
        expect(response.status).toBe(500)
        const json = await response.json()
        expect(json.error).toBe('Webhook secret not configured on connection')
    })

    it('returns 400 when connectionId param is missing', async () => {
        const { POST } = await import('./route')

        const request = createSignedRequest({
            connectionId: '',
            body: JSON.stringify({ action: 'opened' }),
        })

        const response = await POST(request, { params: Promise.resolve({ connectionId: '' }) })
        expect(response.status).toBe(400)
        const json = await response.json()
        expect(json.error).toContain('Missing connectionId')
    })

    it('returns 404 when connection does not exist or is inactive in DB', async () => {
        const { POST } = await import('./route')
        mockSupabaseConnection(null, { message: 'Not found' })

        const request = createSignedRequest({
            connectionId: 'conn-missing',
            body: JSON.stringify({ action: 'opened' }),
        })

        const response = await POST(request, { params: Promise.resolve({ connectionId: 'conn-missing' }) })
        expect(response.status).toBe(404)
        const json = await response.json()
        expect(json.error).toContain('Connection not found or inactive')
    })

    it('returns 404 when connection exists but has inactive status in DB', async () => {
        const { POST } = await import('./route')
        mockSupabaseConnection({
            id: 'conn-inactive-1',
            organization_id: 'org-tenant-1',
            status: 'inactive',
            credentials: {},
        })

        const request = createSignedRequest({
            connectionId: 'conn-inactive-1',
            body: JSON.stringify({ action: 'opened' }),
        })

        const response = await POST(request, { params: Promise.resolve({ connectionId: 'conn-inactive-1' }) })
        expect(response.status).toBe(404)
        const json = await response.json()
        expect(json.error).toContain('Connection not found or inactive')
    })

    it('returns 401 when webhook has secret configured but signature header is missing', async () => {
        const { POST } = await import('./route')

        mockSupabaseConnection({
            id: 'conn-gh-123',
            organization_id: 'org-tenant-1',
            status: 'active',
            credentials: { encrypted: 'creds' },
        })
        mocks.resolveConnectionCredentials.mockResolvedValue({
            webhook_secret: 'my-super-secret',
        })

        const request = createSignedRequest({
            connectionId: 'conn-gh-123',
            body: JSON.stringify({ ref: 'refs/heads/feature/PIX-1' }),
            signatureOverride: '',
        })

        const response = await POST(request, { params: Promise.resolve({ connectionId: 'conn-gh-123' }) })
        expect(response.status).toBe(401)
        const json = await response.json()
        expect(json.error).toContain('Missing HMAC signature header')
    })

    it('returns 401 when signature format is invalid (not 64 hex characters)', async () => {
        const { POST } = await import('./route')

        mockSupabaseConnection({
            id: 'conn-gh-123',
            organization_id: 'org-tenant-1',
            status: 'active',
            credentials: {},
        })
        mocks.resolveConnectionCredentials.mockResolvedValue({
            webhook_secret: 'my-super-secret',
        })

        const request = createSignedRequest({
            connectionId: 'conn-gh-123',
            body: JSON.stringify({ ref: 'refs/heads/main' }),
            signatureOverride: 'sha256=invalid-short-hash',
        })

        const response = await POST(request, { params: Promise.resolve({ connectionId: 'conn-gh-123' }) })
        expect(response.status).toBe(401)
        const json = await response.json()
        expect(json.error).toContain('Invalid HMAC signature format')
    })

    it('returns 401 when signature does not match (tampered payload or incorrect secret)', async () => {
        const { POST } = await import('./route')

        mockSupabaseConnection({
            id: 'conn-gh-123',
            organization_id: 'org-tenant-1',
            status: 'active',
            credentials: {},
        })
        mocks.resolveConnectionCredentials.mockResolvedValue({
            webhook_secret: 'real-secret-123',
        })

        // Signed with a different secret
        const request = createSignedRequest({
            connectionId: 'conn-gh-123',
            body: JSON.stringify({ ref: 'refs/heads/main' }),
            secret: 'wrong-secret-abc',
        })

        const response = await POST(request, { params: Promise.resolve({ connectionId: 'conn-gh-123' }) })
        expect(response.status).toBe(401)
        const json = await response.json()
        expect(json.error).toContain('Invalid HMAC signature')
    })

    it('returns 400 when body is invalid JSON', async () => {
        const { POST } = await import('./route')

        const secret = 'test-json-secret'
        mockSupabaseConnection({
            id: 'conn-gh-123',
            organization_id: 'org-tenant-1',
            status: 'active',
            credentials: {},
        })
        mocks.resolveConnectionCredentials.mockResolvedValue({
            webhook_secret: secret,
        })

        const request = createSignedRequest({
            connectionId: 'conn-gh-123',
            secret,
            body: '{ broken json ',
        })

        const response = await POST(request, { params: Promise.resolve({ connectionId: 'conn-gh-123' }) })
        expect(response.status).toBe(400)
        const json = await response.json()
        expect(json.error).toContain('Invalid JSON body')
    })

    it('authenticates valid HMAC and dispatches synchronously to taskVcsService.processGithubEvent', async () => {
        const { POST } = await import('./route')

        const secret = 'valid-super-webhook-secret'
        mockSupabaseConnection({
            id: 'conn-gh-999',
            organization_id: 'org-tenant-100',
            status: 'active',
            credentials: {},
        })
        mocks.resolveConnectionCredentials.mockResolvedValue({
            webhook_secret: secret,
        })

        const serviceResult = { processed: true, summary: 'Updated 1 task' }
        mocks.processGithubEvent.mockResolvedValue(serviceResult)

        const payloadObj = {
            ref: 'refs/heads/feature/PIX-101-auth',
            commits: [
                { id: 'commit123', message: 'PIX-101: initial commit' }
            ],
            repository: { full_name: 'org/repo' }
        }

        const request = createSignedRequest({
            connectionId: 'conn-gh-999',
            eventKey: 'push',
            secret,
            body: JSON.stringify(payloadObj),
        })

        const response = await POST(request, { params: Promise.resolve({ connectionId: 'conn-gh-999' }) })
        expect(response.status).toBe(200)

        const json = await response.json()
        expect(json.received).toBe(true)
        expect(json.event).toBe('push')
        expect(json.result).toEqual(serviceResult)

        expect(mocks.processGithubEvent).toHaveBeenCalledWith({
            provider: 'github',
            eventKey: 'push',
            connectionId: 'conn-gh-999',
            organizationId: 'org-tenant-100',
            payload: payloadObj,
        })
    })

    it('authenticates valid HMAC when signature header has uppercase SHA256= prefix and whitespace', async () => {
        const { POST } = await import('./route')

        const secret = 'valid-case-secret'
        mockSupabaseConnection({
            id: 'conn-gh-case',
            organization_id: 'org-tenant-1',
            status: 'active',
            credentials: {},
        })
        mocks.resolveConnectionCredentials.mockResolvedValue({
            webhook_secret: secret,
        })
        mocks.processGithubEvent.mockResolvedValue({ processed: true })

        const body = JSON.stringify({ ref: 'refs/heads/main' })
        const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex')

        const request = createSignedRequest({
            connectionId: 'conn-gh-case',
            body,
            signatureOverride: `  SHA256=${hmac}  `,
        })

        const response = await POST(request, { params: Promise.resolve({ connectionId: 'conn-gh-case' }) })
        expect(response.status).toBe(200)
    })

    it('validates HMAC and succeeds for payloads containing multibyte UTF-8 Unicode characters', async () => {
        const { POST } = await import('./route')

        const secret = 'valid-unicode-secret'
        mockSupabaseConnection({
            id: 'conn-gh-unicode',
            organization_id: 'org-tenant-1',
            status: 'active',
            credentials: {},
        })
        mocks.resolveConnectionCredentials.mockResolvedValue({
            webhook_secret: secret,
        })
        mocks.processGithubEvent.mockResolvedValue({ processed: true })

        const payloadObj = {
            ref: 'refs/heads/feature/PIX-200-español',
            commits: [
                { id: 'c123', message: 'Corrección de autenticación 🚀 en producción — ñ y acentos' }
            ]
        }
        const body = JSON.stringify(payloadObj)

        const request = createSignedRequest({
            connectionId: 'conn-gh-unicode',
            secret,
            body,
        })

        const response = await POST(request, { params: Promise.resolve({ connectionId: 'conn-gh-unicode' }) })
        expect(response.status).toBe(200)
        const json = await response.json()
        expect(json.received).toBe(true)
    })
})
