import type { Invoice } from "@/types"

export function isPortalInvoicePayable(invoice: Pick<Invoice, 'status' | 'payment_status' | 'total'>) {
    const status = String(invoice.status || '').toLowerCase()
    const paymentStatus = String(invoice.payment_status || 'UNPAID').toUpperCase()
    const total = typeof invoice.total === 'number' ? invoice.total : Number(invoice.total)

    if (!Number.isFinite(total) || total <= 0) return false
    if (status !== 'pending' && status !== 'overdue') return false
    if (paymentStatus === 'PAID' || paymentStatus === 'PARTIALLY_PAID') return false

    return true
}
