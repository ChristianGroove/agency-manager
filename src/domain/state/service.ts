
import { Service, ServiceStatus, Invoice } from "@/types"

// UI Helpers
const STATUS_LABELS: Record<string, string> = {
    draft: 'Borrador',
    active: 'Activo',
    paused: 'Pausado',
    cancelled: 'Cancelado',
    archived: 'Cancelado'
}

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    paused: 'bg-amber-100 text-amber-700 border-amber-200',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
    draft: 'bg-slate-100 text-slate-600 border-slate-200'
}

export type ServiceHealth = 'healthy' | 'at_risk' | 'churned' | 'invariant'

export type ServiceState = {
    status: ServiceStatus
    health: ServiceHealth
    label: string
    color: string
    isEditable: boolean
}

/**
 * PURE FUNCTION: Resolves the state of a Service.
 */
export function resolveServiceState(service: Partial<Service>, relatedInvoices: Invoice[] = []): ServiceState {
    let status: ServiceStatus = 'draft'
    const rawStatus = (service.status || '').toLowerCase()

    // 1. Normalize Status
    if (rawStatus === 'archived') status = 'cancelled'
    else if (['draft', 'active', 'paused', 'cancelled'].includes(rawStatus)) {
        status = rawStatus as ServiceStatus
    }

    // 2. Derive Health
    let health: ServiceHealth = 'invariant'
    if (status === 'active') {
        health = 'healthy'
        // Check for overdue invoices
        const hasOverdue = relatedInvoices.some(inv =>
            (inv.status === 'overdue' || (inv.status === 'pending' && inv.due_date && new Date(inv.due_date) < new Date()))
        )
        if (hasOverdue) health = 'at_risk'
    } else if (status === 'cancelled') {
        health = 'churned'
    }

    // 3. Derive UI
    const label = STATUS_LABELS[status] || status
    const color = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'
    const isEditable = ['draft', 'active', 'paused'].includes(status)

    return {
        status,
        health,
        label,
        color,
        isEditable
    }
}
