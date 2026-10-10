import Papa from 'papaparse'
import { z } from 'zod'
import { normalizeMarketingPhone } from './marketing-contracts'

export const IMPORT_ROW_LIMIT = 100
export const IMPORT_BYTE_LIMIT = 1024 * 1024
export const CONTACT_LIST_ROW_LIMIT = 1000
export const CONTACT_LIST_BYTE_LIMIT = 5 * 1024 * 1024
export const contactImportRowSchema = z.object({ row: z.number().int().min(2).max(1001), name: z.string().trim().min(1).max(160),
        phone: z.string().regex(/^[1-9][0-9]{7,14}$/).refine(value => normalizeMarketingPhone(value) === value),
        email: z.union([z.literal(''), z.string().email().max(254)]) }).strict()
export const importRowSchema = z.object({
    row: z.number().int().min(2).max(10002), name: z.string().trim().min(1).max(160),
    phone: z.string().regex(/^[1-9][0-9]{7,14}$/).refine(value => normalizeMarketingPhone(value) === value),
    email: z.union([z.literal(''), z.string().email().max(254)]),
    source: z.string().trim().min(1).max(120), evidence: z.string().trim().min(1).max(2000),
    occurredAt: z.string().datetime({ offset: true }).refine(value => Date.parse(value) <= Date.now()),
}).strict()
export type MarketingImportRow = z.infer<typeof importRowSchema>
export interface ImportReviewRow { row: number; name: string; phone: string; eligible: boolean; reason: string; source?: string; evidence?: string; occurredAt?: string }
export interface ImportReview { token: string; expiresAt: string; rows: ImportReviewRow[] }
export const importReason: Record<string, string> = {
    contact_new: 'Crear contacto de marketing', contact_existing: 'Conservar contacto existente',
    contact_withdrawn: 'Conservar baja: se importa, pero no recibirá mensajes',
    new: 'Crear contacto y registrar autorización', existing: 'Registrar autorización; conservar datos del contacto',
    opted_out: 'Baja registrada: requiere renovación independiente', pending: 'Baja pendiente de procesar',
    duplicate: 'Teléfono repetido en el archivo', multiple: 'Hay varios contactos con este teléfono; resuelve el duplicado',
    stale: 'La evidencia es anterior al último cambio de consentimiento',
}

/** Simple contact storage does not create or infer marketing permission. */
export function parseContactListImport(text: string): { valid: z.infer<typeof contactImportRowSchema>[]; invalid: ImportReviewRow[] } {
    if (new TextEncoder().encode(text).length > CONTACT_LIST_BYTE_LIMIT) throw new Error('El CSV supera 5 MB.')
    const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { delimiter: ',', skipEmptyLines: 'greedy' })
    if (parsed.errors.length) throw new Error('El CSV tiene columnas o comillas inválidas.')
    const [headers, ...rows] = parsed.data
    const normalized = headers?.map(value => value.trim().toLowerCase()) || []
    if (!normalized.includes('telefono') || new Set(normalized).size !== normalized.length || normalized.some(key => !['nombre', 'telefono', 'email'].includes(key)))
        throw new Error('Incluye telefono. nombre y email son opcionales.')
    if (!rows.length || rows.length > CONTACT_LIST_ROW_LIMIT) throw new Error('Carga entre 1 y 1000 contactos por lista.')
    const valid: z.infer<typeof contactImportRowSchema>[] = [], invalid: ImportReviewRow[] = []
    rows.forEach((values, index) => {
        const cell = (key: string) => (values[normalized.indexOf(key)] || '').trim()
        const rawPhone = cell('telefono'), phone = normalizeMarketingPhone(rawPhone), name = cell('nombre') || phone || rawPhone
        const result = contactImportRowSchema.safeParse({ row: index + 2, name, phone: phone || '', email: cell('email') })
        if (values.length !== headers.length || !result.success) invalid.push({ row: index + 2, name, phone: rawPhone, eligible: false, reason: 'Revisa teléfono internacional, nombre y email.' })
        else valid.push(result.data)
    })
    return { valid, invalid }
}

export function parseMarketingListFile(text: string) {
    if (new TextEncoder().encode(text).length > CONTACT_LIST_BYTE_LIMIT) throw new Error('El CSV supera 5 MB.')
    const headers = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { preview: 1 }).data[0]?.map(value => value.trim().toLowerCase()) || []
    return headers.some(key => ['origen_autorizacion', 'evidencia', 'fecha_autorizacion'].includes(key))
        ? { mode: 'consent' as const, ...parseMarketingImport(text) }
        : { mode: 'contacts' as const, ...parseContactListImport(text) }
}

/** Explicit headers, RFC-style quoting, no automatic country code or consent defaults. */
export function parseMarketingImport(text: string): { valid: MarketingImportRow[]; invalid: ImportReviewRow[] } {
    if (new TextEncoder().encode(text).length > IMPORT_BYTE_LIMIT) throw new Error('El CSV supera 1 MB.')
    const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { skipEmptyLines: 'greedy' })
    if (parsed.errors.length) throw new Error('El CSV tiene columnas o comillas inválidas. Corrige el archivo antes de revisarlo.')
    const [headers, ...rows] = parsed.data
    const required = ['nombre', 'telefono', 'email', 'origen_autorizacion', 'evidencia', 'fecha_autorizacion']
    const normalized = headers?.map(value => value.trim().toLowerCase()) || []
    if (normalized.length !== required.length || new Set(normalized).size !== required.length || required.some(key => !normalized.includes(key))) {
        throw new Error(`Usa exactamente estas columnas: ${required.join(', ')}.`)
    }
    if (!rows.length || rows.length > IMPORT_ROW_LIMIT) throw new Error(`Carga entre 1 y ${IMPORT_ROW_LIMIT} contactos por revisión.`)
    const valid: MarketingImportRow[] = [], invalid: ImportReviewRow[] = []
    rows.forEach((values, index) => {
        const cell = (key: string) => (values[normalized.indexOf(key)] || '').trim()
        const name = cell('nombre'), rawPhone = cell('telefono'), phone = normalizeMarketingPhone(rawPhone)
        const result = importRowSchema.safeParse({ row: index + 2, name, phone: phone || '', email: cell('email'),
            source: cell('origen_autorizacion'), evidence: cell('evidencia'), occurredAt: cell('fecha_autorizacion') })
        if (values.length !== headers.length || !result.success) invalid.push({ row: index + 2, name, phone: rawPhone, eligible: false,
            reason: 'Revisa nombre, teléfono internacional, email, evidencia y fecha ISO con zona horaria (sin fechas futuras).' })
        else valid.push(result.data)
    })
    return { valid, invalid }
}
