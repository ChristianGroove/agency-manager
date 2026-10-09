// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { convertWebmToOgg } from '@/modules/infrastructure/audio/services/webm-to-ogg'
import fixture from '@/modules/infrastructure/audio/services/fixtures/chrome-opus.json'
const mocks = vi.hoisted(() => ({ download: vi.fn() }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { storage: { from: () => ({ download: mocks.download }) } } }))
import { MetaProvider } from './meta-provider'
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); mocks.download.mockReset() })
describe('WhatsApp private audio upload', () => {
    it('uploads real Ogg/Opus bytes with their correct MIME type and tenant path', async () => {
        const source = new Blob([Buffer.from(fixture.webmBase64, 'base64')], { type: 'audio/webm;codecs=opus' })
        const converted = await convertWebmToOgg(source)
        mocks.download.mockResolvedValue({ data: converted, error: null })
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'media-id' }), { status: 200 }))
        vi.stubGlobal('fetch', fetchMock)
        const result = await new MetaProvider('', '', '').uploadMedia('/api/media/chat/tenant/conversation/audio/voice.ogg', 'test-token', 'audio', 'phone', 'tenant')
        expect(result).toBe('media-id')
        expect(mocks.download).toHaveBeenCalledWith('tenant/conversation/audio/voice.ogg')
        const request = fetchMock.mock.calls[0] as any[]
        const form = request[1].body as FormData
        expect(form.get('type')).toBe('audio/ogg')
        const file = form.get('file') as File
        expect(file.type).toBe('audio/ogg')
        expect(Buffer.from(await file.arrayBuffer())).toEqual(Buffer.from(await converted.arrayBuffer()))
    })
    it('rejects disguised WebM before calling Graph, even when the extension and MIME claim MP4', async () => {
        mocks.download.mockResolvedValue({ data: new Blob([Buffer.from(fixture.webmBase64, 'base64')], { type: 'audio/mp4' }), error: null })
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
        vi.spyOn(console, 'error').mockImplementation(() => {})
        expect(await new MetaProvider('', '', '').uploadMedia('/api/media/chat/tenant/conversation/audio/voice.mp4', 'test-token', 'audio', 'phone', 'tenant')).toBeNull()
        expect(fetchMock).not.toHaveBeenCalled()
    })
    it('preserves native MP4 audio and rejects another tenant media path', async () => {
        const mp4 = new Blob([Uint8Array.of(0, 0, 0, 16, 102, 116, 121, 112, 77, 52, 65, 32, 0, 0, 0, 0)], { type: 'audio/mp4' })
        mocks.download.mockResolvedValue({ data: mp4, error: null })
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'mp4-id' }), { status: 200 }))
        vi.stubGlobal('fetch', fetchMock)
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const provider = new MetaProvider('', '', '')
        expect(await provider.uploadMedia('/api/media/chat/tenant/conversation/voice.mp4', 'test-token', 'audio', 'phone', 'tenant')).toBe('mp4-id')
        expect((fetchMock.mock.calls[0] as any[])[1].body.get('type')).toBe('audio/mp4')
        fetchMock.mockClear(); mocks.download.mockClear()
        expect(await provider.uploadMedia('/api/media/chat/other-tenant/conversation/voice.mp4', 'test-token', 'audio', 'phone', 'tenant')).toBeNull()
        expect(mocks.download).not.toHaveBeenCalled()
        expect(fetchMock).not.toHaveBeenCalled()
    })
})
