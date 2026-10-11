import { z } from 'zod'
import Papa from 'papaparse'

export const normalizeMarketingEmail = (value: unknown): string | null => {
    if (typeof value !== 'string') return null
    const email = value.trim().toLowerCase()
    return email.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email) ? email : null
}
const variables = ['nombre', 'empresa', 'email']
export const emailContentSchema = z.object({
    subject: z.string().trim().min(1).max(200).refine(value => !/[\r\n\x00]/.test(value), 'El asunto debe ocupar una sola línea.'),
    body: z.string().trim().min(1).max(20000),
}).strict().superRefine((value, ctx) => {
    for (const text of [value.subject, value.body]) {
        const clean = text.replace(/\{\{(nombre|empresa|email)\}\}/g, '')
        if (clean.includes('{{') || clean.includes('}}')) ctx.addIssue({ code: 'custom', message: `Variables disponibles: ${variables.map(key => `{{${key}}}`).join(', ')}.` })
    }
})
export type EmailContent = z.infer<typeof emailContentSchema>
export const escapeEmailHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
export function personalizeEmail(content: EmailContent, contact: { name?: string | null; company?: string | null; email: string }) {
    const parsed = emailContentSchema.parse(content)
    const values: Record<string, string> = { nombre: contact.name || '', empresa: contact.company || '', email: contact.email }
    const replace = (text: string) => text.replace(/\{\{(nombre|empresa|email)\}\}/g, (_, key: string) => {
        if (!values[key]) throw new Error(`Falta el dato ${key} de este destinatario.`)
        return values[key]
    })
    const subject = replace(parsed.subject).replace(/[\r\n\x00]/g, ' ').slice(0, 200)
    return { subject, body: replace(parsed.body) }
}
export function renderCampaignEmail(content: EmailContent, sender: string, unsubscribeUrl: string) {
    const body = escapeEmailHtml(content.body).replace(/\n/g, '<br>')
    return { subject: content.subject, text: `${content.body}\n\n${sender}\nDejar de recibir estos correos: ${unsubscribeUrl}`,
        html: `<!doctype html><html><body><main style="max-width:600px;margin:24px auto;font-family:Arial,sans-serif;line-height:1.6;color:#202020"><div>${body}</div><footer style="margin-top:28px;border-top:1px solid #eee;padding-top:16px;font-size:12px;color:#666">${escapeEmailHtml(sender)}<br><a href="${escapeEmailHtml(unsubscribeUrl)}">Dejar de recibir estos correos</a></footer></main></body></html>` }
}
export const emailImportRowSchema = z.object({ row: z.number().int().min(2).max(10002), name: z.string().trim().min(1).max(160),
    email: z.string().refine(value => normalizeMarketingEmail(value) === value, 'Email inválido.') }).strict()
export function parseEmailListImport(text: string) {
    if (new TextEncoder().encode(text).length > 5 * 1024 * 1024) throw new Error('El CSV supera 5 MB.')
    const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { skipEmptyLines: 'greedy', delimiter: ',' })
    if (parsed.errors.length) throw new Error('Revisa las columnas y comillas del CSV.')
    const [headers, ...rows] = parsed.data
    const keys = headers?.map(value => value.trim().toLowerCase()) || []
    if (!keys.includes('email') || new Set(keys).size !== keys.length || keys.some(key => !['email', 'nombre'].includes(key))) throw new Error('Incluye email; nombre es opcional.')
    if (!rows.length || rows.length > 1000) throw new Error('Carga entre 1 y 1000 contactos.')
    const valid: z.infer<typeof emailImportRowSchema>[] = [], invalid: Array<{ row: number; name: string; phone: string; eligible: boolean; reason: string }> = []
    rows.forEach((values, index) => {
        const raw = (values[keys.indexOf('email')] || '').trim(), email = normalizeMarketingEmail(raw)
        const name = (values[keys.indexOf('nombre')] || '').trim() || email || raw
        const result = emailImportRowSchema.safeParse({ row: index + 2, name, email: email || '' })
        if (values.length !== headers.length || !result.success) invalid.push({ row: index + 2, name, phone: raw, eligible: false, reason: 'Revisa el email y las columnas.' })
        else valid.push(result.data)
    })
    return { mode: 'contacts' as const, valid, invalid }
}
