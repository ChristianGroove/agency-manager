import { describe, expect, it } from 'vitest'
import { isPortalInvoicePayable } from './invoice-payability'

describe('isPortalInvoicePayable', () => {
    it('allows positive pending and overdue invoices without completed payment status', () => {
        expect(isPortalInvoicePayable({ status: 'pending', payment_status: 'UNPAID', total: 1000 })).toBe(true)
        expect(isPortalInvoicePayable({ status: 'overdue', payment_status: 'OVERDUE', total: '2500' as any })).toBe(true)
    })

    it('blocks paid, partially paid, non-positive, and non-pending invoices', () => {
        expect(isPortalInvoicePayable({ status: 'paid', payment_status: 'PAID', total: 1000 })).toBe(false)
        expect(isPortalInvoicePayable({ status: 'pending', payment_status: 'PARTIALLY_PAID', total: 1000 })).toBe(false)
        expect(isPortalInvoicePayable({ status: 'pending', payment_status: 'UNPAID', total: 0 })).toBe(false)
        expect(isPortalInvoicePayable({ status: 'cancelled' as any, payment_status: 'UNPAID', total: 1000 })).toBe(false)
    })
})
