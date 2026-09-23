import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MetaEmbeddedSignup } from './meta-embedded-signup'

vi.mock('@/modules/core/i18n/use-translation', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('@/modules/core/organizations/hooks/use-current-organization', () => ({
    useCurrentOrganization: () => ({ organizationId: 'org', loading: false }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() } }))

describe('WhatsApp SDK completion', () => {
    afterEach(() => { delete (window as any).FB; vi.unstubAllGlobals() })

    it('waits for both the Meta finish event and authorization code before completing standard signup', async () => {
        let loginCallback: (response: any) => void = () => {}
        const login = vi.fn((callback: (response: any) => void) => { loginCallback = callback })
        ;(window as any).FB = { login }
        const fetchMock = vi.fn(async (url: string, _options?: RequestInit) => ({
            ok: true,
            json: async () => url.endsWith('/session') ? { state: 'signed-state' }
                : { success: true, wabaId: '111', syncStatus: 'not_applicable' },
        }))
        vi.stubGlobal('fetch', fetchMock)

        render(<MetaEmbeddedSignup mode="cloud" organizationId="org" />)
        fireEvent.click(screen.getByRole('button', { name: 'meta.embedded_signup.button' }))
        await act(async () => { window.dispatchEvent(new MessageEvent('message', {
            origin: 'https://www.facebook.com',
            data: { type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH',
                data: { waba_id: '111', phone_number_id: '222' } },
        })) })
        expect(fetchMock).toHaveBeenCalledTimes(1)
        await act(async () => { loginCallback({ authResponse: { code: 'auth-code' } }) })
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
        const sent = JSON.parse(String(fetchMock.mock.calls[1][1]?.body || '{}'))
        expect(sent).toMatchObject({ orgId: 'org', code: 'auth-code', wabaId: '111',
            phoneNumberId: '222', mode: 'cloud', state: 'signed-state' })
    })

    it('does not complete a standard signup with a coexistence finish event', async () => {
        ;(window as any).FB = { login: vi.fn() }
        const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ state: 'signed-state' }) }))
        vi.stubGlobal('fetch', fetchMock)
        render(<MetaEmbeddedSignup mode="cloud" organizationId="org" />)
        fireEvent.click(screen.getByRole('button', { name: 'meta.embedded_signup.button' }))
        await act(async () => { window.dispatchEvent(new MessageEvent('message', {
            origin: 'https://www.facebook.com',
            data: { type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
                data: { waba_id: '111', phone_number_id: '222' } },
        })) })
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(await screen.findByText('meta.embedded_signup.error_mode_mismatch')).toBeTruthy()
    })
})
