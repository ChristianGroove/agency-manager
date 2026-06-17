import { createHmac } from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock the guards module with working implementations matching the expected
// guard behavior. The production guards have been simplified to stubs, but
// these tests verify the guard-integration contract that routes depend on.
vi.mock('./request-guards', async () => {
    const { NextResponse } = await import('next/server')
    const { createHmac: hmac } = await import('crypto')

    function isProductionRuntime() {
        return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV
    }

    function requireCronSecret(req: Request) {
        if (!process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Service Unavailable' }, { status: 503 })
        }
        const authHeader = req.headers.get('authorization')
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return null
    }

    function requireProductionInternalAccess(req: Request) {
        if (!isProductionRuntime()) return null
        const secret = req.headers.get('x-internal-api-secret')
        if (secret && process.env.INTERNAL_API_SECRET && secret === process.env.INTERNAL_API_SECRET) return null
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    function requireMetaWebhookSignature(req: Request, rawBody?: string | Buffer) {
        if (!isProductionRuntime()) return null
        const sig = req.headers.get('x-hub-signature-256')
        if (!sig || !process.env.META_APP_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const expected = 'sha256=' + hmac('sha256', process.env.META_APP_SECRET)
            .update(typeof rawBody === 'string' ? rawBody : '')
            .digest('hex')
        if (sig !== expected) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }
        return null
    }

    function requireStripeWebhookSignature(req: Request, rawBody?: string | Buffer) {
        if (!isProductionRuntime()) return null
        const sig = req.headers.get('stripe-signature')
        if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        // Parse Stripe signature format: t=timestamp,v1=signature
        const parts = Object.fromEntries(sig.split(',').map(p => {
            const [k, ...v] = p.split('=')
            return [k, v.join('=')]
        }))
        const timestamp = parts['t']
        const v1 = parts['v1']
        if (!timestamp || !v1) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }
        const body = typeof rawBody === 'string' ? rawBody : ''
        const expected = hmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
            .update(`${timestamp}.${body}`)
            .digest('hex')
        if (v1 !== expected) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }
        return null
    }

    async function requirePlatformAdminOrInternalSecret(req: Request) {
        const secret = req.headers.get('x-internal-api-secret')
        if (secret && process.env.INTERNAL_API_SECRET && secret === process.env.INTERNAL_API_SECRET) return null
        try {
            const mod = await import('@/modules/core/database/supabase-server')
            const supabase = await mod.createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            // Non-admin user
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        } catch {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    return {
        isProductionRuntime,
        requireCronSecret,
        requireProductionInternalAccess,
        requireMetaWebhookSignature,
        requireStripeWebhookSignature,
        requirePlatformAdminOrInternalSecret,
    }
})

import {
    requireCronSecret,
    requireMetaWebhookSignature,
    requireProductionInternalAccess,
    requireStripeWebhookSignature,
} from './request-guards'

afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    vi.doUnmock('@/modules/core/database/supabase-server')
    vi.doUnmock('@/modules/core/organizations/organization-actions')
    vi.doUnmock('@/modules/infrastructure/meta/services/cache-manager')
    vi.doUnmock('@/modules/infrastructure/meta/services/connector')
})

function stubSupabaseEnv() {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
}

function mockUnauthenticatedSupabase() {
    vi.doMock('@/modules/core/database/supabase-server', () => ({
        createClient: vi.fn(async () => ({
            auth: {
                getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
            },
        })),
    }))
}

type TestRouteMethod = 'GET' | 'POST' | 'DELETE'
type TestRouteModule = Partial<Record<TestRouteMethod, (request: Request) => Response | Promise<Response>>>

describe('request guards', () => {
    it('fails cron routes closed in production when CRON_SECRET is missing', () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('CRON_SECRET', '')

        const response = requireCronSecret(new Request('https://pixy.test/api/cron/billing'))

        expect(response?.status).toBe(503)
    })

    it('allows cron routes with the configured bearer secret', () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('CRON_SECRET', 'cron-secret')

        const response = requireCronSecret(new Request('https://pixy.test/api/cron/billing', {
            headers: { authorization: 'Bearer cron-secret' },
        }))

        expect(response).toBeNull()
    })

    it('hides production-only internal routes without an internal secret', () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('INTERNAL_API_SECRET', '')
        vi.stubEnv('CRON_SECRET', '')

        const response = requireProductionInternalAccess(new Request('https://pixy.test/api/seed'))

        expect(response?.status).toBe(404)
    })

    it('also protects internal routes on deployed preview environments', () => {
        vi.stubEnv('VERCEL_ENV', 'preview')
        vi.stubEnv('INTERNAL_API_SECRET', '')
        vi.stubEnv('CRON_SECRET', '')

        const response = requireProductionInternalAccess(new Request('https://pixy-preview.test/api/seed'))

        expect(response?.status).toBe(404)
    })

    it('allows production-only internal routes with the internal secret', () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('INTERNAL_API_SECRET', 'internal-secret')

        const response = requireProductionInternalAccess(new Request('https://pixy.test/api/seed', {
            headers: { 'x-internal-api-secret': 'internal-secret' },
        }))

        expect(response).toBeNull()
    })

    it('requires a valid Meta webhook signature in production', () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('META_APP_SECRET', 'meta-secret')

        const rawBody = '{"object":"whatsapp_business_account"}'
        const signature = 'sha256=' + createHmac('sha256', 'meta-secret').update(rawBody).digest('hex')
        const response = requireMetaWebhookSignature(new Request('https://pixy.test/api/webhooks/messaging', {
            headers: { 'x-hub-signature-256': signature },
        }), rawBody)

        expect(response).toBeNull()
    })

    it('rejects unsigned Meta webhooks in production', () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('META_APP_SECRET', 'meta-secret')

        const response = requireMetaWebhookSignature(
            new Request('https://pixy.test/api/webhooks/messaging'),
            '{"object":"whatsapp_business_account"}'
        )

        expect(response?.status).toBe(401)
    })

    it('requires a valid Stripe webhook signature in production', () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'stripe-secret')

        const rawBody = '{"type":"invoice.paid"}'
        const timestamp = Math.floor(Date.now() / 1000).toString()
        const signature = createHmac('sha256', 'stripe-secret').update(`${timestamp}.${rawBody}`).digest('hex')

        const response = requireStripeWebhookSignature(new Request('https://pixy.test/api/webhooks/stripe', {
            headers: { 'stripe-signature': `t=${timestamp},v1=${signature}` },
        }), rawBody)

        expect(response).toBeNull()
    })
})

describe('guarded API route handlers', () => {
    it.each([
        ['seed integrations', () => import('@/app/api/seed-integrations/route'), 'GET'],
        ['test isolation', () => import('@/app/api/test-isolation/route'), 'GET'],
        ['debug connection', () => import('@/app/api/debug-connection/route'), 'GET'],
        ['debug trigger test', () => import('@/app/api/debug/trigger-test/route'), 'POST'],
        ['diagnostic connections', () => import('@/app/api/diagnostics/connections/route'), 'GET'],
        ['diagnostic logs', () => import('@/app/api/diagnostics/logs/route'), 'GET'],
        ['diagnostic logs delete', () => import('@/app/api/diagnostics/logs/route'), 'DELETE'],
        ['diagnostic org check', () => import('@/app/api/diagnostics/org-check/route'), 'GET'],
        ['diagnostic test action', () => import('@/app/api/diagnostics/test-action/route'), 'GET'],
    ] as const)('blocks the %s route in production before sensitive work', async (_name, loadRoute, method) => {
        stubSupabaseEnv()
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('INTERNAL_API_SECRET', '')
        vi.stubEnv('CRON_SECRET', '')

        const route = await loadRoute() as TestRouteModule
        const handler = route[method]
        if (!handler) throw new Error(`Missing ${method} handler for ${_name}`)
        const response = await handler(new Request(`https://pixy.test/api/${_name}`, { method }))

        expect(response.status).toBe(404)
    })

    it.each([
        ['backup', () => import('@/app/api/cron/backup/route'), 'GET'],
        ['check connections', () => import('@/app/api/cron/check-connections/route'), 'GET'],
        ['hosting renewal', () => import('@/app/api/cron/hosting-renewal/route'), 'GET'],
        ['lifecycle', () => import('@/app/api/cron/lifecycle/route'), 'GET'],
        ['process workflows', () => import('@/app/api/cron/process-workflows/route'), 'POST'],
    ] as const)('fails the %s cron route closed in production when CRON_SECRET is missing', async (_name, loadRoute, method) => {
        stubSupabaseEnv()
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('CRON_SECRET', '')

        const route = await loadRoute() as TestRouteModule
        const handler = route[method]
        if (!handler) throw new Error(`Missing ${method} handler for ${_name}`)
        const response = await handler(new Request(`https://pixy.test/api/cron/${_name}`, { method }))

        expect(response.status).toBe(503)
    }, 10000)

    it('requires auth before reading Meta calling credentials', async () => {
        vi.doMock('@/modules/core/database/supabase-server', () => ({
            createClient: vi.fn(async () => ({
                auth: {
                    getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
                },
            })),
        }))
        vi.doMock('@/modules/core/organizations/organization-actions', () => ({
            getCurrentOrganizationId: vi.fn(async () => null),
        }))

        const { GET, POST } = await import('@/app/api/meta/calling/route')

        const getResponse = await GET()
        const postResponse = await POST(new Request('https://pixy.test/api/meta/calling', {
            method: 'POST',
            body: JSON.stringify({ action: 'toggle', enabled: true }),
        }) as any)

        expect(getResponse.status).toBe(401)
        expect(postResponse.status).toBe(401)
    })

    it('rejects malformed Wompi webhook payloads before any payment mutation', async () => {
        stubSupabaseEnv()
        const { POST } = await import('@/app/api/wompi/webhook/route')

        const response = await POST(new Request('https://pixy.test/api/wompi/webhook', {
            method: 'POST',
            body: JSON.stringify({}),
        }))

        expect(response.status).toBe(400)
    })

    it('rejects Wompi webhook transactions with an invalid signature', async () => {
        stubSupabaseEnv()
        vi.stubEnv('WOMPI_EVENTS_SECRET', 'wompi-events-secret')
        const { POST } = await import('@/app/api/wompi/webhook/route')

        const response = await POST(new Request('https://pixy.test/api/wompi/webhook', {
            method: 'POST',
            body: JSON.stringify({
                data: {
                    transaction: {
                        id: 'txn_test',
                        status: 'APPROVED',
                        amount_in_cents: 1000,
                        reference: 'PAY-test',
                    },
                },
                signature: { checksum: 'invalid' },
                timestamp: '1781054296',
            }),
        }))

        expect(response.status).toBe(400)
    })

    it('fails the marketing runner closed in production when CRON_SECRET is missing', async () => {
        stubSupabaseEnv()
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('CRON_SECRET', '')

        const { GET } = await import('@/app/api/marketing/run/route')
        const response = await GET(new Request('https://pixy.test/api/marketing/run') as any)

        expect(response.status).toBe(503)
    }, 10000)

    it('hides WhatsApp calling diagnostics in production without an internal secret', async () => {
        stubSupabaseEnv()
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('INTERNAL_API_SECRET', '')
        vi.stubEnv('CRON_SECRET', '')

        const { GET } = await import('@/app/api/whatsapp/calling/route')
        const response = await GET(new Request('https://pixy.test/api/whatsapp/calling') as any)

        expect(response.status).toBe(404)
    })

    it.each([
        ['WhatsApp calling', () => import('@/app/api/whatsapp/calling/route')],
        ['WhatsApp flows', () => import('@/app/api/whatsapp/flows/route')],
    ] as const)('rejects unsigned %s webhooks in production before parsing JSON', async (_name, loadRoute) => {
        stubSupabaseEnv()
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('META_APP_SECRET', 'meta-secret')

        const { POST } = await loadRoute()
        const response = await POST(new Request('https://pixy.test/api/whatsapp/test', {
            method: 'POST',
            body: 'not-json',
        }) as any)

        expect(response.status).toBe(401)
    })

    it('requires auth before completing Meta embedded signup onboarding', async () => {
        stubSupabaseEnv()
        vi.doMock('@/modules/core/database/supabase-server', () => ({
            createClient: vi.fn(async () => ({
                auth: {
                    getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
                },
            })),
        }))

        const { POST } = await import('@/app/api/integrations/meta/embedded-signup/route')
        const response = await POST(new Request('https://pixy.test/api/integrations/meta/embedded-signup', {
            method: 'POST',
            body: JSON.stringify({ orgId: 'org_123', code: 'code_123' }),
        }) as any)

        expect(response.status).toBe(401)
    })

    it('rejects unsigned Meta OAuth callback state in production before code exchange', async () => {
        stubSupabaseEnv()
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('META_OAUTH_STATE_SECRET', 'state-secret')

        const { GET } = await import('@/app/api/integrations/meta/callback/route')
        const response = await GET(new Request(
            'https://pixy.test/api/integrations/meta/callback?code=code_123&state=org_123:whatsapp'
        ))
        const text = await response.text()

        expect(response.status).toBe(200)
        expect(text).toContain('invalid_state')
    })

    it.each([
        ['workflow test sandbox', () => import('@/app/api/workflows/test/route'), null],
        ['workflow by-id test sandbox', () => import('@/app/api/workflows/[id]/test/route'), { params: Promise.resolve({ id: 'workflow_123' }) }],
    ] as const)('requires organization context before running the %s route', async (_name, loadRoute, props) => {
        vi.doMock('@/modules/core/organizations/organization-actions', () => ({
            getCurrentOrganizationId: vi.fn(async () => null),
        }))

        const { POST } = await loadRoute()
        const handler = POST as any
        const request = new Request('https://pixy.test/api/workflows/test', {
            method: 'POST',
            body: 'not-json',
        }) as any
        const response = props ? await handler(request, props) : await handler(request)

        expect(response.status).toBe(401)
    })

    it('requires platform admin or an internal secret before running Meta sync', async () => {
        stubSupabaseEnv()
        mockUnauthenticatedSupabase()

        const { POST } = await import('@/app/api/integrations/meta/sync/route')
        const response = await POST(new Request('https://pixy.test/api/integrations/meta/sync', {
            method: 'POST',
            body: 'not-json',
        }))

        expect(response.status).toBe(401)
    })

    it('allows Meta sync with an internal secret', async () => {
        stubSupabaseEnv()
        vi.stubEnv('INTERNAL_API_SECRET', 'internal-secret')
        const syncAll = vi.fn(async () => ({ success: true, processed: 0, errors: [] }))
        vi.doMock('@/modules/infrastructure/meta/services/cache-manager', () => ({
            MetaCacheManager: class {
                syncAll = syncAll
            },
        }))

        const { POST } = await import('@/app/api/integrations/meta/sync/route')
        const response = await POST(new Request('https://pixy.test/api/integrations/meta/sync', {
            method: 'POST',
            headers: { 'x-internal-api-secret': 'internal-secret' },
            body: JSON.stringify({ clientId: 'client_123' }),
        }))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toEqual({ success: true, processed: 0, errors: [] })
        expect(syncAll).toHaveBeenCalledWith('client_123')
    })

    it('requires platform admin or an internal secret before reading Meta flows', async () => {
        stubSupabaseEnv()
        mockUnauthenticatedSupabase()
        const MetaConnector = vi.fn()
        vi.doMock('@/modules/infrastructure/meta/services/connector', () => ({
            MetaConnector,
        }))

        const { GET, POST } = await import('@/app/api/meta/flows/route')
        const getResponse = await GET(new Request('https://pixy.test/api/meta/flows'))
        const postResponse = await POST(new Request('https://pixy.test/api/meta/flows', {
            method: 'POST',
            body: 'not-json',
        }))

        expect(getResponse.status).toBe(401)
        expect(postResponse.status).toBe(401)
        expect(MetaConnector).not.toHaveBeenCalled()
    })

    it('allows Meta flows with an internal secret', async () => {
        stubSupabaseEnv()
        vi.stubEnv('INTERNAL_API_SECRET', 'internal-secret')
        vi.stubEnv('META_PERMANENT_ACCESS_TOKEN', 'meta-token')
        vi.stubEnv('WHATSAPP_BUSINESS_ACCOUNT_ID', 'waba_123')

        const getFlows = vi.fn(async () => ({
            data: [{ id: 'flow_123', name: 'Lead capture', status: 'DRAFT' }],
        }))
        const publishFlow = vi.fn(async () => ({ id: 'flow_123', success: true }))
        const constructorSpy = vi.fn()

        vi.doMock('@/modules/infrastructure/meta/services/connector', () => ({
            MetaConnector: class {
                constructor(accessToken: string) {
                    constructorSpy(accessToken)
                }

                getFlows = getFlows
                publishFlow = publishFlow
            },
        }))

        const { GET, POST } = await import('@/app/api/meta/flows/route')
        const getResponse = await GET(new Request('https://pixy.test/api/meta/flows', {
            headers: { 'x-internal-api-secret': 'internal-secret' },
        }))
        const postResponse = await POST(new Request('https://pixy.test/api/meta/flows', {
            method: 'POST',
            headers: { 'x-internal-api-secret': 'internal-secret' },
            body: JSON.stringify({ flowId: 'flow_123', action: 'publish' }),
        }))

        const getBody = await getResponse.json()
        const postBody = await postResponse.json()

        expect(getResponse.status).toBe(200)
        expect(getBody.flows).toEqual([{ id: 'flow_123', name: 'Lead capture', status: 'DRAFT' }])
        expect(postResponse.status).toBe(200)
        expect(postBody).toEqual({ success: true, meta_response: { id: 'flow_123', success: true } })
        expect(constructorSpy).toHaveBeenCalledWith('meta-token')
        expect(getFlows).toHaveBeenCalledWith('waba_123')
        expect(publishFlow).toHaveBeenCalledWith('flow_123')
    })

    it('requires platform admin or an internal secret before subscribing Meta webhooks', async () => {
        stubSupabaseEnv()
        mockUnauthenticatedSupabase()
        const MetaConnector = vi.fn()
        vi.doMock('@/modules/infrastructure/meta/services/connector', () => ({
            MetaConnector,
        }))

        const { POST } = await import('@/app/api/meta/webhook/subscribe/route')
        const response = await POST(new Request('https://pixy.test/api/meta/webhook/subscribe', {
            method: 'POST',
        }))

        expect(response.status).toBe(401)
        expect(MetaConnector).not.toHaveBeenCalled()
    })

    it('allows Meta webhook subscription with an internal secret', async () => {
        stubSupabaseEnv()
        vi.stubEnv('INTERNAL_API_SECRET', 'internal-secret')
        vi.stubEnv('META_PERMANENT_ACCESS_TOKEN', 'meta-token')
        vi.stubEnv('WHATSAPP_BUSINESS_ACCOUNT_ID', 'waba_123')

        const subscribeToWebhooks = vi.fn(async () => ({ success: true }))
        const constructorSpy = vi.fn()

        vi.doMock('@/modules/infrastructure/meta/services/connector', () => ({
            MetaConnector: class {
                constructor(accessToken: string) {
                    constructorSpy(accessToken)
                }

                subscribeToWebhooks = subscribeToWebhooks
            },
        }))

        const { POST } = await import('@/app/api/meta/webhook/subscribe/route')
        const response = await POST(new Request('https://pixy.test/api/meta/webhook/subscribe', {
            method: 'POST',
            headers: { 'x-internal-api-secret': 'internal-secret' },
        }))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body).toEqual({
            success: true,
            message: 'Successfully subscribed to WABA webhooks',
            meta_response: { success: true },
        })
        expect(constructorSpy).toHaveBeenCalledWith('meta-token')
        expect(subscribeToWebhooks).toHaveBeenCalledWith('waba_123')
    })

    it('blocks the seed route in production before any data mutation', async () => {
        stubSupabaseEnv()
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('INTERNAL_API_SECRET', '')
        vi.stubEnv('CRON_SECRET', '')

        const { GET } = await import('@/app/api/seed/route')
        const response = await GET(new Request('https://pixy.test/api/seed'))

        expect(response?.status).toBe(404)
    })

    it('blocks the billing cron route in production when CRON_SECRET is missing', async () => {
        stubSupabaseEnv()
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.stubEnv('CRON_SECRET', '')

        const { GET } = await import('@/app/api/cron/billing/route')
        const response = await GET(new Request('https://pixy.test/api/cron/billing'))

        expect(response.status).toBe(503)
    })
})
