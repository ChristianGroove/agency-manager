import { z } from 'zod'

export const historyFiltersSchema = z.object({
    status: z.enum(['all', 'active', 'completed', 'failed', 'cancelled']).default('all'),
    search: z.string().trim().max(80).default(''),
    delivery: z.enum(['all', 'queued', 'sending', 'accepted', 'delivered', 'read', 'failed', 'unknown']).default('all'),
}).strict()
export type HistoryFilters = z.infer<typeof historyFiltersSchema>
export const stepCursorSchema = z.object({ enrollmentId: z.string().uuid(), order: z.number().int(), stepId: z.string().uuid() }).strict()
export type StepCursor = z.infer<typeof stepCursorSchema>
export interface HistoryRecipient {
    id: string; name: string; phone: string; status: string; issue: string | null
    started_at: string | null; last_run_at: string | null; completed_at: string | null; next_run_at: string | null
    counts: Record<'total' | 'queued' | 'sending' | 'accepted' | 'delivered' | 'read' | 'failed' | 'unknown', number>
}
export interface HistoryStep {
    enrollment_id: string; enrollment_status: string; name: string; phone: string; step_id: string; order_index: number
    step_name: string; type: string; template_name: string | null; progress: 'advanced' | 'current' | 'not_started'
    delivery: string; queued_at: string | null; updated_at: string | null; receipt_at: string | null; error_code: number | null
}
export interface HistoryPage<T, C> { items: T[]; hasMore: boolean; nextCursor: C | null; queriedAt: string; total?: number | null }
export const executionLabels: Record<string, string> = { active: 'En proceso', completed: 'Procesamiento terminado', failed: 'Requiere revisión', cancelled: 'Cancelado' }
export const deliveryLabels: Record<string, string> = {
    queued: 'En cola', sending: 'Enviándose', accepted: 'Aceptado por Meta', delivered: 'Entregado', read: 'Leído',
    failed: 'Fallido', unknown: 'Sin resultado confirmado', not_started: 'Sin registro de envío',
}
