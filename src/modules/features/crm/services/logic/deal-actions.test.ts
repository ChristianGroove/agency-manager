import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    revalidatePath: vi.fn(),
    dealService: {
        getOrCreateDealCart: vi.fn(),
        addToCart: vi.fn(),
        removeCartItem: vi.fn(),
        updateCartItem: vi.fn(),
        searchCatalog: vi.fn(),
        sendInteractiveQuote: vi.fn(),
    },
    DealService: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('../deal-service', () => ({
    DealService: mocks.DealService,
}))

function sessionClient() {
    return { auth: { getUser: vi.fn() } }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.DealService.mockReset()
    Object.values(mocks.dealService).forEach((fn) => fn.mockReset())
})

async function importDealActions() {
    mocks.createClient.mockResolvedValue(sessionClient())
    mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
    mocks.DealService.mockImplementation(function () {
        return mocks.dealService
    })
    return import('./deal-actions')
}

describe('CRM logic deal actions', () => {
    it('gets deal carts without changing the success contract', async () => {
        const cart = { id: 'cart-1', lead_id: 'lead-1' }
        mocks.dealService.getOrCreateDealCart.mockResolvedValue(cart)

        const { getDealCart } = await importDealActions()
        const result = await getDealCart('lead-1')

        expect(result).toEqual({ success: true, cart })
        expect(mocks.DealService).toHaveBeenCalledWith(expect.anything())
        expect(mocks.dealService.getOrCreateDealCart).toHaveBeenCalledWith('lead-1')
    })

    it('does not expose cart mutation failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.dealService.addToCart.mockRejectedValue(new Error('cart secret-value mutation failed'))

        const { addToCart } = await importDealActions()
        const result = await addToCart('cart-secret-id', { id: 'product-secret-id' }, 2)

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de deals CRM' })
        expect(mocks.dealService.addToCart).toHaveBeenCalledWith('cart-secret-id', { id: 'product-secret-id' }, 2)
        expect(consoleError).toHaveBeenCalledWith('addToCart Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it('does not expose catalog failures and keeps organization scope', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.dealService.searchCatalog.mockRejectedValue(new Error('catalog secret-value search failed'))

        const { searchCatalog } = await importDealActions()
        const result = await searchCatalog('chairs', 'furniture', 1, 20)

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de deals CRM' })
        expect(mocks.dealService.searchCatalog).toHaveBeenCalledWith('org-current', 'chairs', 'furniture', 1, 20)
        expect(consoleError).toHaveBeenCalledWith('searchCatalog Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose interactive quote failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.dealService.sendInteractiveQuote.mockRejectedValue(new Error('quote secret-value send failed'))

        const { sendInteractiveQuote } = await importDealActions()
        const result = await sendInteractiveQuote('cart-secret-id', 'conversation-secret-id')

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de deals CRM' })
        expect(mocks.DealService).toHaveBeenCalledWith(expect.anything())
        expect(mocks.dealService.sendInteractiveQuote).toHaveBeenCalledWith('cart-secret-id', 'conversation-secret-id')
        expect(consoleError).toHaveBeenCalledWith('Send Quote Error', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })
})
