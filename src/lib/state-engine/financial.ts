
import { Invoice } from "@/types"
import { resolveInvoiceStatus } from "./document"

type FinancialState = {
    total_debt: number
    future_debt: number
    overdue_count: number
}

/**
 * PURE FUNCTION: Calculates financial standing based on invoice list.
 */
export function deriveFinancialState(invoices: Partial<Invoice>[]): FinancialState {
    const state = {
        total_debt: 0,
        future_debt: 0,
        overdue_count: 0
    }

    if (!invoices || invoices.length === 0) return state

    const now = new Date()
    now.setHours(0, 0, 0, 0) // Start of today

    invoices.forEach(inv => {
        if (inv.deleted_at) return // Skip deleted

        const status = resolveInvoiceStatus(inv)

        // Only active debts count
        if (status === 'overdue') {
            state.total_debt += inv.total || 0
            state.overdue_count++
        } else if (status === 'pending') {
            // Is it future/current debt?
            // If pending and not overdue, it's future/current debt.
            // Let's call it "future_debt" (payable soon).
            // Actually, pending means issued but not paid. It IS debt, just not bad debt effectively.
            // Usually "Debt" implies "Bad Debt" in some contexts, but financially "AR" (Accounts Receivable) is all unpaid.
            // Requirement asks for "total_debt" likely meaning OVERDUE debt for alerts, or total AR?
            // "total_debt" usually implies what they owe RIGHT NOW that SHOULD have been paid?
            // Let's stick to the definition used in the UI: 
            // - Debt (Vencido)
            // - Future Debt (Por Vencer)

            state.future_debt += inv.total || 0
        }
    })

    return state
}
