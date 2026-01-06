import { InvoiceStatus } from "@/types"

export type DocumentStatus = InvoiceStatus

// Consolidating UI Helpers here to make this the single source of truth
const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente',
    paid: 'Pagada',
    overdue: 'Vencida',
    void: 'Anulada',
    draft: 'Borrador'
}

const STATUS_COLORS: Record<string, string> = {
    paid: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    pending: 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-500/20',
    overdue: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20',
    void: 'bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-white/10 line-through',
    draft: 'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/20'
}

export type DocumentState = {
    status: DocumentStatus
    isLateIssued: boolean
    label: string
    color: string
}

/**
 * PURE FUNCTION: Centralized logic for Document (Invoice) state.
 * Combines status normalization, business rules (overdue), and UI representation.
 */
export function resolveDocumentState(doc: any): DocumentState {
    // 1. Resolve Status
    let status: DocumentStatus = 'draft'

    // Normalize raw status
    const rawStatus = (doc.status || '').toLowerCase()

    if (rawStatus === 'paid') status = 'paid'
    else if (rawStatus === 'void' || rawStatus === 'cancelled') status = 'void'
    else if (rawStatus === 'overdue') status = 'overdue' // Explicit persistence
    else if (rawStatus === 'pending' || rawStatus === 'draft') {
        // Time-bound logic
        status = 'pending'
        if (doc.due_date) {
            const dueDate = new Date(doc.due_date)
            const now = new Date()
            // EOD comparison
            dueDate.setHours(23, 59, 59, 999)

            if (now > dueDate) {
                status = 'overdue'
            }
        }
    }

    // 2. Resolve Flags
    const isLateIssued = !!doc.is_late_issued // Or check metadata

    // 3. Resolve UI
    const label = STATUS_LABELS[status] || status
    const color = STATUS_COLORS[status] || 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white'

    return {
        status,
        isLateIssued,
        label,
        color
    }
}
