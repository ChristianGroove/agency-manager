import { describe, expect, it, vi } from 'vitest'
import { DealService } from './deal-service'
import { DealsService } from './logic/services/deals.service'

function client(cart: any, conversation: any) {
    const from = vi.fn((table: string) => {
        const query: any = {
            select: vi.fn(() => query), eq: vi.fn(() => query),
            single: vi.fn(async () => ({ data: table === 'deal_carts' ? cart : conversation, error: null })),
        }
        return query
    })
    return { from }
}

describe.each([DealService, DealsService])('%s quote channel binding', Service => {
    it('rejects a cart from a different tenant before resolving a send', async () => {
        const db = client({ id: 'cart-a', organization_id: 'tenant-a', items: [{ id: 'item' }] },
            { id: 'conversation-b', organization_id: 'tenant-b', connection_id: 'channel-b', phone: '573001111111' })
        await expect(new Service(db as any).sendInteractiveQuote('cart-a', 'conversation-b'))
            .rejects.toThrow('canal vinculado')
        expect(db.from).toHaveBeenCalledTimes(2)
    })

    it('rejects an unbound conversation before selecting a default WhatsApp account', async () => {
        const db = client({ id: 'cart-a', organization_id: 'tenant-a', items: [{ id: 'item' }] },
            { id: 'conversation-a', organization_id: 'tenant-a', connection_id: null, phone: '573001111111' })
        await expect(new Service(db as any).sendInteractiveQuote('cart-a', 'conversation-a'))
            .rejects.toThrow('canal vinculado')
        expect(db.from).toHaveBeenCalledTimes(2)
    })
})
