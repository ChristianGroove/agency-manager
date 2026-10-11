import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ createServerClient: vi.fn(), from: vi.fn() }))
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createServerClient }))
vi.mock('@/modules/core/security/rate-limit', () => ({ checkRateLimit: () => ({ success: true }), checkPortalRateLimit: () => ({ success: true }) }))
vi.mock('@/modules/core/security/headers', () => ({ applySecurityHeaders: vi.fn() }))
import { proxy } from './proxy'

let metadata: Record<string, unknown>
let appMetadata: Record<string, unknown>
beforeEach(() => {
    vi.clearAllMocks()
    metadata = { onboarding_completed: false }
    appMetadata = {}
    mocks.createServerClient.mockImplementation((_url, _key, options) => ({
        auth: { getUser: async () => {
            options.cookies.setAll([
                { name: 'session.0', value: 'first', options: { path: '/' } },
                { name: 'session.1', value: 'second', options: { path: '/' } }
            ])
            return { data: { user: { id: 'owner', user_metadata: metadata, app_metadata: appMetadata } } }
        } },
        from: mocks.from
    }))
})

describe('onboarding session routing', () => {
    it.each(['/update-password', '/forgot-password', '/onboarding', '/auth/confirm'])('allows %s during onboarding and keeps every refreshed cookie', async pathname => {
        const response = await proxy(new NextRequest(`http://localhost:3000${pathname}`, { headers: { host: 'localhost:3000' } }))
        expect(response.headers.get('location')).toBeNull()
        expect(response.cookies.get('session.0')?.value).toBe('first')
        expect(response.cookies.get('session.1')?.value).toBe('second')
        expect(mocks.from).not.toHaveBeenCalled()
    })

    it('keeps refreshed cookies when redirecting unfinished onboarding', async () => {
        const response = await proxy(new NextRequest('http://localhost:3000/dashboard', { headers: { host: 'localhost:3000' } }))
        expect(response.headers.get('location')).toBe('http://localhost:3000/onboarding')
        expect(response.cookies.get('session.0')?.value).toBe('first')
        expect(response.cookies.get('session.1')?.value).toBe('second')
    })

    it('requires password activation even when direct provisioning has already completed organizational onboarding', async () => {
        metadata = { onboarding_completed: true }
        appMetadata = { password_setup_required: true }
        const response = await proxy(new NextRequest('http://localhost:3000/dashboard', { headers: { host: 'localhost:3000' } }))
        expect(response.headers.get('location')).toBe('http://localhost:3000/onboarding')
    })
})
