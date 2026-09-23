import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { issueMetaOAuthSession } = vi.hoisted(() => ({ issueMetaOAuthSession: vi.fn(async () => 'signed-state') }))
vi.mock('@/modules/infrastructure/meta/services/oauth-session', () => ({ issueMetaOAuthSession }))

import { POST } from './route'

describe('embedded signup session origin', () => {
    beforeEach(() => {
        vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://pixy-test.ngrok-free.dev')
        issueMetaOAuthSession.mockClear()
    })

    it('accepts the configured public origin behind a local tunnel', async () => {
        const request = new NextRequest('http://127.0.0.1:3001/api/integrations/meta/embedded-signup/session', {
            method: 'POST',
            headers: { origin: 'https://pixy-test.ngrok-free.dev', 'content-type': 'application/json' },
            body: JSON.stringify({ orgId: 'org-123' }),
        })
        const response = await POST(request)
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ state: 'signed-state' })
        expect(issueMetaOAuthSession).toHaveBeenCalledWith('org-123', { flow: 'embedded' })
    })

    it('rejects an unrelated origin', async () => {
        const request = new NextRequest('http://127.0.0.1:3001/api/integrations/meta/embedded-signup/session', {
            method: 'POST',
            headers: { origin: 'https://unrelated.example', 'content-type': 'application/json' },
            body: JSON.stringify({ orgId: 'org-123' }),
        })
        const response = await POST(request)
        expect(response.status).toBe(403)
        expect(issueMetaOAuthSession).not.toHaveBeenCalled()
    })
})
