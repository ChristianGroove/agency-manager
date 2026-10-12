import { afterEach, expect, it, vi } from 'vitest'
import { createSupabaseFetchInterceptor } from './logger'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('keeps token query strings and reflected DB errors out of logs', async () => {
    const secret = 'private-token-value'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, clone: () => ({ json: async () => ({ message: `invalid ${secret}` }) }) }))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await createSupabaseFetchInterceptor('Admin')(`https://local.test/rest/v1/organization_staff?access_token=eq.${secret}&select=pin_code`)
    expect(error).toHaveBeenCalled()
    expect(JSON.stringify(error.mock.calls)).not.toContain(secret)
    expect(JSON.stringify(error.mock.calls)).not.toContain('access_token=')
    expect(JSON.stringify(error.mock.calls)).toContain('PRIVATE_QUERY_FAILED')
})

it('redacts private URLs in slow-query and network-error logs without swallowing failures', async () => {
    const secret = 'private-pin-value'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(2000)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    const intercept = createSupabaseFetchInterceptor('Admin')
    await intercept(`https://local.test/rest/v1/staff?pin_code=eq.${secret}`)
    expect(warn).toHaveBeenCalled()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error(`network url contains ${secret}`)))
    await expect(intercept(`https://local.test/rest/v1/staff?access_token=eq.${secret}`)).rejects.toThrow()
    expect(JSON.stringify([...warn.mock.calls, ...error.mock.calls])).not.toContain(secret)
})
