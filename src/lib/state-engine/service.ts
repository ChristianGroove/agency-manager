
import { ServiceStatus, Service, Invoice } from "@/types"
import { resolveInvoiceStatus } from "./document"

type ServiceHealth = 'healthy' | 'at_risk' | 'churned' | 'invariant'

/**
 * PURE FUNCTION: Resolves the effective operational status of a service.
 * @param service The service object
 * @param invoices List of invoices associated with this service
 */
export function resolveServiceState(service: Partial<Service>): ServiceStatus {
    const rawStatus = (service.status || 'draft').toLowerCase()

    if (rawStatus === 'active') return 'active'
    if (rawStatus === 'paused') return 'paused'
    if (rawStatus === 'cancelled') return 'cancelled'

    // Actually, completed services usually mean the project is done.
    // If we map to 'active', it implies ongoing. 'paused' implies temporary stop.
    // Let's keep 'cancelled' for 'completed' projects that are no longer active, or introduce 'archived'?
    // For now, let's map 'completed' to 'cancelled' (churned/finished).
    if (rawStatus === 'completed') return 'cancelled'

    return 'draft'
}

/**
 * Derives the health of a service based on financial standing.
 */
export function deriveServiceHealth(
    service: Partial<Service>,
    invoices: Partial<Invoice>[] = []
): ServiceHealth {
    const state = resolveServiceState(service)

    // 1. Invariant states
    if (state === 'cancelled') return 'churned'
    if (state === 'draft' || state === 'paused') return 'invariant'

    // 2. Financial Health (Active Service)
    // Filter relevant invoices
    const relevantInvoices = invoices.filter(inv => !inv.deleted_at)

    // Check for overdue
    const overdueCount = relevantInvoices.filter(inv =>
        resolveInvoiceStatus(inv) === 'overdue'
    ).length

    if (overdueCount > 0) return 'at_risk'

    return 'healthy'
}
