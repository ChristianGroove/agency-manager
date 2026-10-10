import { z } from 'zod'

export const audienceFiltersSchema = z.object({
    status: z.string().max(100).optional(), source: z.string().max(100).optional(),
    has_phone: z.boolean().optional(), has_email: z.boolean().optional(),
    score_min: z.number().finite().optional(), score_max: z.number().finite().optional(),
    tags: z.array(z.string().max(100)).max(50).optional(),
    created_after: z.string().datetime({ offset: true }).optional(), created_before: z.string().datetime({ offset: true }).optional(),
    last_contact_after: z.string().datetime({ offset: true }).optional(), last_contact_before: z.string().datetime({ offset: true }).optional(),
    assigned_to: z.union([z.string().uuid(), z.literal('')]).optional(),
}).strict()

export function applyAudienceFilters<T>(query: T, input: unknown): T {
    const filters = audienceFiltersSchema.parse(input || {})
    let q: any = query
    for (const key of ['status', 'source', 'assigned_to'] as const) if (filters[key]) q = q.eq(key, filters[key])
    if (filters.has_phone) q = q.not('phone', 'is', null)
    if (filters.has_email) q = q.not('email', 'is', null)
    if (filters.score_min !== undefined) q = q.gte('score', filters.score_min)
    if (filters.score_max !== undefined) q = q.lte('score', filters.score_max)
    if (filters.tags?.length) q = q.overlaps('tags', filters.tags)
    for (const [key, field, op] of [
        ['created_after', 'created_at', 'gte'], ['created_before', 'created_at', 'lte'],
        ['last_contact_after', 'last_contact_at', 'gte'], ['last_contact_before', 'last_contact_at', 'lte'],
    ] as const) if (filters[key]) q = q[op](field, filters[key])
    return q
}

export function normalizeMarketingPhone(phone: unknown): string | null {
    const value = String(phone || '').replace(/[\s()+.-]/g, '')
    return /^[1-9]\d{7,14}$/.test(value) ? value : null
}

export const delaySchema = z.object({ value: z.coerce.number().finite().min(1).max(365), unit: z.enum(['minutes', 'hours', 'days']) })
export function normalizeDelay(input: any) {
    return delaySchema.parse({ value: input?.value ?? input?.duration, unit: input?.unit })
}

export function publicMarketingError(error: unknown): string {
    if (error instanceof z.ZodError) return 'Revisa los campos de configuración: hay valores inválidos.'
    if (error instanceof Error) return error.message
    return 'No se pudo completar la operación. Reintenta o consulta el registro del servidor.'
}
