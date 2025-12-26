
import { CycleStatus, InvoiceStatus } from "@/types"
import { resolveInvoiceStatus } from "./document"

type CycleLike = {
    start_date: string
    end_date: string
    status: string // stored status
    invoice?: { status: string; due_date?: string } | null
}

/**
 * PURE FUNCTION: Resolves the effective state of a billing cycle.
 * 
 * Rules:
 * 1. If invoice is 'paid' -> 'completed'.
 * 2. If invoice is 'void' -> 'skipped' (or should it be 'completed' with 0 val? Let's say skipped/void).
 * 3. If no invoice:
 *    - now < start_date -> 'future'
 *    - now between and inclusive -> 'running'
 *    - now > end_date -> 'completed' (conceptually pending calculation, but operationally done).
 *      Actually, if end_date past and no invoice, it's 'completed' (waiting for invoice generation) 
 *      or should we map it to 'running' to indicate it's not "closed"?
 *      The domain-logic says: paid/invoiced -> completed. pending -> running.
 *      
 *      Let's stick to the canonical definition:
 *      - Future: Not started.
 *      - Running: Currently active OR finished but not yet invoiced/paid.
 *      - Completed: Fully settled (invoiced).
 *      - Skipped: Explicitly skipped.
 */
export function resolveCycleStatus(cycle: CycleLike): CycleStatus {
    const rawStatus = cycle.status.toLowerCase()

    // 1. Explicit Overrides
    if (rawStatus === 'skipped') return 'skipped'

    // 2. Invoice-driven State (Strongest Signal)
    if (cycle.invoice) {
        const invStatus = resolveInvoiceStatus(cycle.invoice as any)
        if (invStatus === 'paid') return 'completed'
        if (invStatus === 'void') return 'skipped'
        // If invoice is pending/overdue, the cycle is technically "Invoiced" (completed operational phase, waiting payment)
        // Previous logic mapped 'invoiced' to 'completed'.
        return 'completed'
    }

    // 3. Time-driven State (No Invoice)
    const start = new Date(cycle.start_date)
    const end = new Date(cycle.end_date)
    const now = new Date()

    // Reset times for date comparison
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999) // End of day

    if (now < start) return 'future'
    if (now > end) {
        // Cycle finished but no invoice yet. 
        // In legacy logic this might be 'pending', which maps to 'running'.
        // Let's call it 'running' to indicate "work in progress/not settled".
        return 'running'
    }

    return 'running' // Current
}
