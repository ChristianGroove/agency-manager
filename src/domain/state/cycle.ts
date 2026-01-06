
import { CycleStatus, InvoiceStatus } from "@/types"

// UI Helpers (Consolidated)
const STATUS_LABELS: Record<string, string> = {
    future: 'Futuro',
    running: 'En Curso',
    completed: 'Completado',
    skipped: 'Omitido',
    // Fallback/Legacy
    pending: 'En Curso',
    next: 'Futuro',
    paid: 'Completado',
    invoiced: 'Completado',
    overdue: 'Completado'
}

const STATUS_COLORS: Record<string, string> = {
    future: 'bg-slate-100 dark:bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-500/20 dashed border',
    running: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    completed: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
    skipped: 'bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-white/10'
}

export type CycleState = {
    status: CycleStatus
    label: string
    color: string
    isActionable: boolean // True if it needs invoicing
}

/**
 * PURE FUNCTION: Resolves the state of a billing cycle.
 */
export function resolveCycleState(cycle: any): CycleState {
    let status: CycleStatus = 'running'
    const rawStatus = (cycle.status || '').toLowerCase()

    // 1. Normalize
    if (['future', 'running', 'completed', 'skipped'].includes(rawStatus)) {
        status = rawStatus as CycleStatus
    } else {
        // Legacy Mappings
        if (['paid', 'invoiced', 'overdue'].includes(rawStatus)) status = 'completed'
        else if (rawStatus === 'pending') status = 'running'
        else if (rawStatus === 'next') status = 'future'
    }

    // 2. Derive UI
    const label = STATUS_LABELS[status] || STATUS_LABELS[rawStatus] || status
    const color = STATUS_COLORS[status] || 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white'

    // 3. Actionable Logic (e.g. Needs Invoice)
    // A cycle is actionable if it's 'running' (pending in legacy terms) and end_date < now?
    // Or simply if it's 'running' and we want to allow early invoicing? 
    // For now, let's say 'running' cycles are potentially actionable.
    const isActionable = status === 'running'

    return {
        status,
        label,
        color,
        isActionable
    }
}
