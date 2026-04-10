
import { Invoice, InvoiceStatus } from "@/types"

/**
 * PURE FUNCTION: Resolves the effective state of an invoice.
 * Does NOT modify the invoice object.
 * 
 * Rules:
 * 1. If status is 'paid', it's 'paid'.
 * 2. If status is 'void' or 'cancelled', it's 'void'.
 * 3. If 'pending' and due_date < now, it's 'overdue'.
 * 4. Otherwise 'pending'.
 */
export function resolveInvoiceStatus(invoice: Partial<Invoice>): InvoiceStatus {
    if (!invoice.status) return 'draft'

    const currentStatus = invoice.status.toLowerCase()

    // 1. Terminal States
    if (currentStatus === 'paid') return 'paid'
    if (currentStatus === 'void' || currentStatus === 'cancelled') return 'void'

    // 2. Time-bound Logic for Pending
    if (currentStatus === 'pending' || currentStatus === 'draft') {
        if (!invoice.due_date) return 'pending'

        const dueDate = new Date(invoice.due_date)
        const now = new Date()

        // Remove time component for fair comparison (due EOD)
        dueDate.setHours(23, 59, 59, 999)

        if (now > dueDate) {
            return 'overdue'
        }

        return 'pending'
    }

    // 3. Explicit Overdue (persisted)
    if (currentStatus === 'overdue') return 'overdue'

    return 'pending' // Fallback
}

/**
 * Returns true if the invoice demands attention (overdue or pending).
 */
export function isInvoiceActionable(status: InvoiceStatus): boolean {
    return ['pending', 'overdue'].includes(status)
}
