import crypto from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
    supabaseFrom: vi.fn(),
    processBitbucketEvent: vi.fn(),
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
        processBitbucketEvent: mocks.processBitbucketEvent,
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
    requestUuid?: string
}) {
    const {
        body,
        secret,
        signatureHeaderName = 'x-hub-signature-256',
        signatureOverride,
        eventKey = 'repo:push',
        requestUuid,
    } = options

    const headers = new Headers({
        'content-type': 'application/json',
        'x-event-key': eventKey,
    })

    if (requestUuid) {
        headers.set('x-request-uuid', requestUuid)
    }

    if (signatureOverride !== undefined) {
        if (signatureOverride !== '') {
            headers.set(signatureHeaderName, signatureOverride)
        }
    } else if (secret) {
        const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex')
        headers.set(signatureHeaderName, `sha256=${hmac}`)
    }

    const request = new NextRequest(new URL(`http://localhost/api/webhooks/vcs/bitbucket/${options.connectionId}`), {
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
                    eq: vi.fn(() => ({
                        neq: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: connectionData,
                                error,
                            })),
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
    mocks.processBitbucketEvent.mockReset()
    mocks.resolveConnectionCredentials.mockReset()
    mocks.decryptObject.mockReset()
})

describe('Bitbucket Webhook Route Handler (/api/webhooks/vcs/bitbucket/[connectionId])', () => {
    const validConnection = {
        id: 'conn-bitbucket-001',
        organization_id: 'org-pixy-100',
        credentials: { encrypted_token: 'enc_abc' },
        config: {},
        metadata: {},
        status: 'active',
    }

    const testSecret = 'whsec_bitbucket_super_secret_key_12345'
    const samplePayload = {
        repository: { full_name: 'acme/webapp' },
        push: { changes: [] },
    }
    const rawBody = JSON.stringify(samplePayload)

    it('successfully processes valid HMAC-SHA256 signature and executes taskVcsService directly', async () => {
        mockSupabaseConnection(validConnection)
        mocks.resolveConnectionCredentials.mockResolvedValue({
            webhook_secret: testSecret,
        })
        const mockResult = { processed: true, summary: 'Processed 1 ticket association' }
        mocks.processBitbucketEvent.mockResolvedValue(mockResult)

        const request = createSignedRequest({
            connectionId: 'conn-bitbucket-001',
            body: rawBody,
            secret: testSecret,
            eventKey: 'repo:push',
            requestUuid: 'uuid-trace-8888',
        })

        const { POST } = await import('./route')
        const response = await POST(request, {
            params: Promise.resolve({ connectionId: 'conn-bitbucket-001' }),
        })
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toEqual({
            received: true,
            event: 'repo:push',
            result: mockResult,
        })

        // Verify taskVcsService was called with direct payload
        expect(mocks.processBitbucketEvent).toHaveBeenCalledTimes(1)
        expect(mocks.processBitbucketEvent).toHaveBeenCalledWith({
            provider: 'bitbucket',
            connectionId: 'conn-bitbucket-001',
            organizationId: 'org-pixy-100',
            eventKey: 'repo:push',
            payload: samplePayload,
        })
    })

    it('accepts raw 64-char hex HMAC signature without sha256= prefix', async () => {
        mockSupabaseConnection(validConnection)
        mocks.resolveConnectionCredentials.mockResolvedValue({
            webhook_secret: testSecret,
        })
        mocks.processBitbucketEvent.mockResolvedValue({ processed: true })

        const rawHmac = crypto.createHmac('sha256', testSecret).update(rawBody).digest('hex')
        const request = createSignedRequest({
            connectionId: 'conn-bitbucket-001',
            body: rawBody,
            signatureOverride: rawHmac,
            eventKey: 'pullrequest:created',
        })

        const { POST } = await import('./route')
        const response = await POST(request, {
            params: Promise.resolve({ connectionId: 'conn-bitbucket-001' }),
        })

        expect(response.status).toBe(200)
        expect(mocks.processBitbucketEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                provider: 'bitbucket',
                eventKey: 'pullrequest:created',
                connectionId: 'conn-bitbucket-001',
                organizationId: 'org-pixy-100',
            })
        )
    })

    it('rejects with 401 when HMAC signature does not match (tampered body)', async () => {
        mockSupabaseConnection(validConnection)
        mocks.resolveConnectionCredentials.mockResolvedValue({
            webhook_secret: testSecret,
        })

        // Valid 64-char hex but calculated with wrong secret
        const wrongHmac = crypto.createHmac('sha256', 'wrong-secret-key').update(rawBody).digest('hex')
        const request = createSignedRequest({
            connectionId: 'conn-bitbucket-001',
            body: rawBody,
            signatureOverride: `sha256=${wrongHmac}`,
        })

        const { POST } = await import('./route')
        const response = await POST(request, {
            params: Promise.resolve({ connectionId: 'conn-bitbucket-001' }),
        })
        const body = await response.json()

        expect(response.status).toBe(401)
        expect(body).toEqual({ error: 'Invalid HMAC signature' })
        expect(mocks.processBitbucketEvent).not.toHaveBeenCalled()
    })

    it('rejects with 401 when HMAC signature format is invalid (length != 64)', async () => {
        mockSupabaseConnection(validConnection)
        mocks.resolveConnectionCredentials.mockResolvedValue({
            webhook_secret: testSecret,
        })

        const request = createSignedRequest({
            connectionId: 'conn-bitbucket-001',
            body: rawBody,
            signatureOverride: 'sha256=tooshort',
        })

        const { POST } = await import('./route')
        const response = await POST(request, {
            params: Promise.resolve({ connectionId: 'conn-bitbucket-001' }),
        })
        const body = await response.json()

        expect(response.status).toBe(401)
        expect(body).toEqual({ error: 'Invalid HMAC signature format' })
        expect(mocks.processBitbucketEvent).not.toHaveBeenCalled()
    })

    it('rejects with 401 when HMAC signature has 64 characters but contains invalid non-hex characters', async () => {
        mockSupabaseConnection(validConnection)
        mocks.resolveConnectionCredentials.mockResolvedValue({
            webhook_secret: testSecret,
        })

        // 64 non-hex characters
        const nonHexSig = 'z'.repeat(64)
        const request = createSignedRequest({
            connectionId: 'conn-bitbucket-001',
            body: rawBody,
            signatureOverride: `sha256=${nonHexSig}`,
        })

        const { POST } = await import('./route')
        const response = await POST(request, {
            params: Promise.resolve({ connectionId: 'conn-bitbucket-001' }),
        })
        const body = await response.json()

        expect(response.status).toBe(401)
        expect(body).toEqual({ error: 'Invalid HMAC signature format' })
        expect(mocks.processBitbucketEvent).not.toHaveBeenCalled()
    })

    it('verifies constant-time signature comparison using crypto.timingSafeEqual', async () => {
        const timingSafeEqualSpy = vi.spyOn(crypto, 'timingSafeEqual')
        mockSupabaseConnection(validConnection)
        mocks.resolveConnectionCredentials.mockResolvedValue({
            webhook_secret: testSecret,
        })
        mocks.processBitbucketEvent.mockResolvedValue({ processed: true })

        const request = createSignedRequest({
            connectionId: 'conn-bitbucket-001',
            body: rawBody,
            secret: testSecret,
            signatureHeaderName: 'x-hub-signature', // Test X-Hub-Signature header as used by Bitbucket Cloud
        })

        const { POST } = await import('./route')
        const response = await POST(request, {
            params: Promise.resolve({ connectionId: 'conn-bitbucket-001' }),
        })

        expect(response.status).toBe(200)
        expect(timingSafeEqualSpy).toHaveBeenCalledTimes(1)
        expect(timingSafeEqualSpy).toHaveReturnedWith(true)
    })

    it('rejects with 401 when signature header is missing but secret is configured', async () => {
        mockSupabaseConnection(validConnection)
        mocks.resolveConnectionCredentials.mockResolvedValue({
            webhook_secret: testSecret,
        })

        const request = createSignedRequest({
            connectionId: 'conn-bitbucket-001',
            body: rawBody,
            signatureOverride: '', // Omit signature header
        })

        const { POST } = await import('./route')
        const response = await POST(request, {
            params: Promise.resolve({ connectionId: 'conn-bitbucket-001' }),
        })
        const body = await response.json()

        expect(response.status).toBe(401)
        expect(body.error).toContain('Missing HMAC signature header')
        expect(mocks.processBitbucketEvent).not.toHaveBeenCalled()
    })

    it('processes payload without signature verification when connection has no secret configured', async () => {
        mockSupabaseConnection(validConnection)
        mocks.resolveConnectionCredentials.mockResolvedValue({}) // No webhook_secret
        mocks.processBitbucketEvent.mockResolvedValue({ processed: true })

        const request = createSignedRequest({
            connectionId: 'conn-bitbucket-001',
            body: rawBody,
            signatureOverride: '',
        })

        const { POST } = await import('./route')
        const response = await POST(request, {
            params: Promise.resolve({ connectionId: 'conn-bitbucket-001' }),
        })
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.received).toBe(true)
        expect(mocks.processBitbucketEvent).toHaveBeenCalledTimes(1)
    })

    it('resolves webhook secret from fallback locations (credentials.secret, config, or metadata)', async () => {
        const connectionWithMetadataSecret = {
            ...validConnection,
            metadata: { webhook_secret: 'metadata-fallback-secret' },
        }
        mockSupabaseConnection(connectionWithMetadataSecret)
        mocks.resolveConnectionCredentials.mockResolvedValue({}) // Empty credentials
        mocks.processBitbucketEvent.mockResolvedValue({ processed: true })

        const request = createSignedRequest({
            connectionId: 'conn-bitbucket-001',
            body: rawBody,
            secret: 'metadata-fallback-secret',
        })

        const { POST } = await import('./route')
        const response = await POST(request, {
            params: Promise.resolve({ connectionId: 'conn-bitbucket-001' }),
        })

        expect(response.status).toBe(200)
        expect(mocks.processBitbucketEvent).toHaveBeenCalledTimes(1)
    })

    it('returns 404 when connection does not exist or is deleted', async () => {
        mockSupabaseConnection(null, { message: 'Not found' })

        const request = createSignedRequest({
            connectionId: 'non-existent-conn',
            body: rawBody,
        })

        const { POST } = await import('./route')
        const response = await POST(request, {
            params: Promise.resolve({ connectionId: 'non-existent-conn' }),
        })
        const body = await response.json()

        expect(response.status).toBe(404)
        expect(body).toEqual({ error: 'Connection not found or inactive' })
        expect(mocks.processBitbucketEvent).not.toHaveBeenCalled()
    })

    it('returns 400 when connectionId parameter is missing or empty', async () => {
        const request = createSignedRequest({
            connectionId: '',
            body: rawBody,
        })

        const { POST } = await import('./route')
        const response = await POST(request, {
            params: Promise.resolve({ connectionId: '' }),
        })
        const body = await response.json()

        expect(response.status).toBe(400)
        expect(body).toEqual({ error: 'Missing connectionId parameter' })
        expect(mocks.processBitbucketEvent).not.toHaveBeenCalled()
    })

    it('returns 400 when request body is invalid JSON', async () => {
        mockSupabaseConnection(validConnection)
        mocks.resolveConnectionCredentials.mockResolvedValue({})

        const malformedBody = '{"bad_json: missing_bracket'
        const request = createSignedRequest({
            connectionId: 'conn-bitbucket-001',
            body: malformedBody,
        })

        const { POST } = await import('./route')
        const response = await POST(request, {
            params: Promise.resolve({ connectionId: 'conn-bitbucket-001' }),
        })
        const body = await response.json()

        expect(response.status).toBe(400)
        expect(body).toEqual({ error: 'Invalid JSON body' })
        expect(mocks.processBitbucketEvent).not.toHaveBeenCalled()
    })

    it('catches unexpected internal errors and responds with 500 without leaking details', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        mockSupabaseConnection(validConnection)
        mocks.resolveConnectionCredentials.mockResolvedValue({})
        mocks.processBitbucketEvent.mockRejectedValue(new Error('Internal processing failure'))

        const request = createSignedRequest({
            connectionId: 'conn-bitbucket-001',
            body: rawBody,
        })

        const { POST } = await import('./route')
        const response = await POST(request, {
            params: Promise.resolve({ connectionId: 'conn-bitbucket-001' }),
        })
        const body = await response.json()

        expect(response.status).toBe(500)
        expect(body).toEqual({ error: 'Internal server error' })
        expect(consoleErrorSpy).toHaveBeenCalled()
    })
})
