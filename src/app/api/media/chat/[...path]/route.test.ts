import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ user: vi.fn(), member: vi.fn(), download: vi.fn() }))
vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: async () => ({ auth: { getUser: mocks.user } }),
}))
vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ maybeSingle: mocks.member }) }) }) }) }),
        storage: { from: () => ({ download: mocks.download }) },
    },
}))

const org = '91aa45c4-a7c4-4af6-96df-5f0fb1a35af7'
const path = [org, 'conversation', 'voice.ogg']

describe('private chat media', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.user.mockResolvedValue({ data: { user: { id: 'agent' } } })
        mocks.member.mockResolvedValue({ data: { user_id: 'agent' } })
        mocks.download.mockResolvedValue({ data: {
            type: 'audio/ogg', arrayBuffer: async () => new TextEncoder().encode('abcdef').buffer,
        }, error: null })
    })

    it('serves byte ranges so the browser can play and seek audio', async () => {
        const { GET } = await import('./route')
        const response = await GET(new NextRequest('https://pixy.test/api/media/chat/file', {
            headers: { range: 'bytes=2-4' },
        }), { params: Promise.resolve({ path }) })
        expect(response.status).toBe(206)
        expect(response.headers.get('content-range')).toBe('bytes 2-4/6')
        expect(response.headers.get('content-type')).toBe('audio/ogg')
        expect(await response.text()).toBe('cde')
    })

    it('does not serve the media without a signed-in user', async () => {
        mocks.user.mockResolvedValue({ data: { user: null } })
        const { GET } = await import('./route')
        const response = await GET(new NextRequest('https://pixy.test/api/media/chat/file'),
            { params: Promise.resolve({ path }) })
        expect(response.status).toBe(401)
        expect(mocks.download).not.toHaveBeenCalled()
    })
})
