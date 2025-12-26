
import { Service, Invoice, BillingCycle, ServiceStatus, InvoiceStatus, CycleStatus } from "@/types"

/**
 * CAPA 2: Lógica de Dominio y Estados Derivados
 * ------------------------------------------------
 * Estas funciones puras calculan el estado real de las entidades
 * basándose en sus datos y relaciones. 
 * NO modifican datos, solo interpretan.
 */

// --- Normalización de Estados (Compatibilidad) ---

/**
 * Normaliza el estado de una factura, mapeando términos antiguos a los canónicos.
 * @param status Estado crudo de la BD
 */
export function normalizeInvoiceStatus(status: string): InvoiceStatus {
    const s = status.toLowerCase()
    if (s === 'cancelled') return 'void' // Map legacy cancelled to void
    if (['draft', 'pending', 'paid', 'overdue', 'void'].includes(s)) {
        return s as InvoiceStatus
    }
    return 'pending' // Fallback seguro
}

/**
 * Normaliza el estado de un servicio.
 */
export function normalizeServiceStatus(status: string): ServiceStatus {
    const s = status.toLowerCase()
    if (s === 'archived') return 'cancelled'
    if (['draft', 'active', 'paused', 'cancelled'].includes(s)) return s as ServiceStatus
    return 'draft' // Fallback
}

/**
 * Normaliza el estado de un ciclo de facturación.
 * Mapea estados financieros antiguos (invoiced, paid) a estados operativos (completed).
 */
export function normalizeCycleStatus(status: string): CycleStatus {
    const s = status.toLowerCase()

    // Legacy Mapping
    if (['paid', 'invoiced', 'overdue'].includes(s)) return 'completed'
    if (s === 'pending') return 'running' // Asumption: pending usually means active/current
    if (s === 'next') return 'future'

    if (['future', 'running', 'completed', 'skipped'].includes(s)) return s as CycleStatus

    return 'running' // Fallback safe
}

// --- Estados Derivados ---

export type ServiceHealth = 'healthy' | 'at_risk' | 'churned' | 'invariant'

/**
 * Calcula la salud financiera/operativa de un servicio.
 */
export function deriveServiceHealth(service: Service, invoices: Invoice[] = []): ServiceHealth {
    if (service.status !== 'active') return 'invariant'

    // Check for overdue invoices related to this service
    const hasOverdue = invoices.some(inv =>
        inv.service_id === service.id &&
        normalizeInvoiceStatus(inv.status) === 'overdue'
    )

    if (hasOverdue) return 'at_risk'
    return 'healthy'
}

/**
 * Determina si el servicio es editable (bloqueo por estado).
 */
export function isServiceEditable(service: Service): boolean {
    return ['draft', 'active', 'paused'].includes(normalizeServiceStatus(service.status || ''))
}

// --- UI Helpers (Capa 3 - Preparación) ---

export const STATUS_LABELS: Record<string, string> = {
    // Service
    draft: 'Borrador',
    active: 'Activo',
    paused: 'Pausado',
    cancelled: 'Cancelado',
    // Invoice
    pending: 'Pendiente',
    paid: 'Pagada',
    overdue: 'Vencida',
    void: 'Anulada',
    // Cycle
    future: 'Futuro',
    running: 'En Curso',
    completed: 'Completado',
    skipped: 'Omitido'
}

export const STATUS_COLORS: Record<string, string> = {
    // Service
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    paused: 'bg-amber-100 text-amber-700 border-amber-200',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    // Invoice
    paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-slate-100 text-slate-700 border-slate-200',
    overdue: 'bg-red-100 text-red-700 border-red-200',
    void: 'bg-gray-100 text-gray-400 border-gray-200 line-through',
    // Cycle
    future: 'bg-slate-100 text-slate-500 border-slate-200 dashed border',
    running: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    skipped: 'bg-gray-100 text-gray-400 border-gray-200'
}
