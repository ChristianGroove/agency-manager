import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    decryptObject: vi.fn((value: unknown) => value),
    execute: vi.fn(async (_key: string, fn: () => Promise<unknown>) => fn()),
    uploadMedia: vi.fn(async () => 'uploaded-media-id'),
}))

vi.mock('@/modules/features/messaging/providers/meta-provider', () => ({
    MetaProvider: class { uploadMedia = mocks.uploadMedia },
}))

vi.mock('@/modules/infrastructure/integrations/encryption', () => ({
    decryptObject: mocks.decryptObject,
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
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.decryptObject.mockReset()
    mocks.decryptObject.mockImplementation((value: unknown) => value)
    mocks.execute.mockReset()
    mocks.execute.mockImplementation(async (_key: string, fn: () => Promise<unknown>) => fn())
    mocks.uploadMedia.mockReset()
    mocks.uploadMedia.mockResolvedValue('uploaded-media-id')
})

describe('MetaAdapter', () => {
    it('checks token health without placing the credential in the URL', async () => {
        const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}', { status: 200 }))
        vi.stubGlobal('fetch', fetchMock)
        const { MetaAdapter } = await import('./meta-adapter')
        const result = await new MetaAdapter().checkConnectionStatus({ accessToken: 'private-health-token' })
        expect(result.status).toBe('active')
        expect(fetchMock).toHaveBeenCalledWith('https://graph.facebook.com/v21.0/me?fields=id', {
            headers: { Authorization: 'Bearer private-health-token' },
        })
        expect(String(fetchMock.mock.calls[0][0])).not.toContain('private-health-token')
    })

    it('does not expose Meta send credentials or payload details in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            error: {
                message: 'meta token secret-value failed for +1555secret',
                type: 'OAuthException',
                code: 190,
            },
        }), { status: 400, statusText: 'Bad Request' }))
        vi.stubGlobal('fetch', fetchMock)

        const { MetaAdapter } = await import('./meta-adapter')
        const adapter = new MetaAdapter()

        await expect(adapter.sendMessage(
            {
                phoneNumberId: 'phone_secret_id',
                accessToken: 'meta-access-secret',
            },
            '+1555secret',
            { type: 'text', text: 'hello' },
            {
                channel: 'whatsapp',
                phoneNumberId: 'phone_secret_id',
                secret: 'metadata-secret',
            }
        )).rejects.toThrow('Meta send failed')

        expect(fetchMock).toHaveBeenCalledWith(
            'https://graph.facebook.com/v21.0/phone_secret_id/messages',
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer meta-access-secret',
                }),
            })
        )

        const logText = collectConsoleCalls(logSpy, warnSpy, errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('meta-access-secret')
        expect(logText).not.toContain('phone_secret_id')
        expect(logText).not.toContain('+1555secret')
        expect(logText).not.toContain('metadata-secret')
    })
})

it('sends a WhatsApp template instead of silently converting it into free-form text', async () => {
 const fetcher=vi.fn(async (_url:any,_init:any)=>new Response(JSON.stringify({messages:[{id:'wamid.template'}]}),{status:200}));vi.stubGlobal('fetch',fetcher)
 const {MetaAdapter}=await import('./meta-adapter')
 await new MetaAdapter().sendMessage({phoneNumberId:'phone',accessToken:'token'},'573001234567',{type:'template',templateName:'hello',templateLanguage:'es',templateComponents:[{type:'body',parameters:[{type:'text',text:'Ana'}]}]},{channel:'whatsapp'})
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({type:'template',template:{name:'hello',language:{code:'es'},components:[{type:'body',parameters:[{type:'text',text:'Ana'}]}]}})
})

it('does not send a second text message when a button response is ambiguous', async () => {
 const fetcher=vi.fn(async (_url:any,_init:any)=>new Response(JSON.stringify({error:{message:'ambiguous'}}),{status:500}));vi.stubGlobal('fetch',fetcher)
 const {MetaAdapter}=await import('./meta-adapter')
 await expect(new MetaAdapter().sendMessage({phoneNumberId:'phone',accessToken:'token'},'573001234567',
  {type:'interactive_buttons',body:'Elige',buttons:[{id:'one',title:'Uno'}]},{channel:'whatsapp'})).rejects.toThrow()
 expect(fetcher).toHaveBeenCalledTimes(1)
})

it('routes WhatsApp by channel even when credentials also carry a Page ID', async () => {
 const fetcher = vi.fn(async (_url: string, _init?: RequestInit) =>
  new Response(JSON.stringify({messages:[{id:'wamid.correct'}]}),{status:200}))
 vi.stubGlobal('fetch', fetcher)
 const {MetaAdapter}=await import('./meta-adapter')
 await new MetaAdapter().sendMessage({phoneNumberId:'wa-phone',pageId:'social-page',accessToken:'token'},
  '573001234567',{type:'location',latitude:4.6,longitude:-74.1,address:'Bogotá'},
  {channel:'whatsapp',phoneNumberId:'wa-phone'})
 expect(fetcher).toHaveBeenCalledTimes(1)
 expect(fetcher.mock.calls[0][0]).toBe('https://graph.facebook.com/v21.0/wa-phone/messages')
 expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({type:'location',location:{latitude:4.6,longitude:-74.1}})
})

it('uploads WhatsApp image before the Graph send and uses its media ID', async () => {
 const fetcher = vi.fn(async (_url: string, _init?: RequestInit) =>
  new Response(JSON.stringify({messages:[{id:'wamid.media'}]}),{status:200}))
 vi.stubGlobal('fetch', fetcher)
 const {MetaAdapter}=await import('./meta-adapter')
 await new MetaAdapter().sendMessage({phoneNumberId:'wa-phone',accessToken:'token'},'573001234567',
  {type:'image',mediaUrl:'https://example.test/product.webp',caption:'Producto'}, {channel:'whatsapp'})
 expect(mocks.uploadMedia).toHaveBeenCalledWith('https://example.test/product.webp','token','image','wa-phone')
 expect(fetcher).toHaveBeenCalledTimes(1)
 expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({
  type:'image',image:{id:'uploaded-media-id',caption:'Producto'},
 })
})

it('preserves the WhatsApp list header used by CRM quote rejection', async () => {
 const fetcher = vi.fn(async (_url: string, _init?: RequestInit) =>
  new Response(JSON.stringify({messages:[{id:'wamid.list'}]}),{status:200}))
 vi.stubGlobal('fetch', fetcher)
 const {MetaAdapter}=await import('./meta-adapter')
 await new MetaAdapter().sendMessage({phoneNumberId:'wa-phone',accessToken:'token'},'573001234567',
  {type:'interactive_list',header:'Motivo',body:'Seleccione',buttonText:'Opciones',
   sections:[{title:'Razones',rows:[{id:'one',title:'Precio'}]}]}, {channel:'whatsapp'})
 expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({
  type:'interactive',interactive:{type:'list',header:{type:'text',text:'Motivo'}},
 })
})
