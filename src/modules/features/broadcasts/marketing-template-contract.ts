import { z } from 'zod'

export interface CampaignTemplate {
    id: string; channel_id: string | null; name: string; language: string;
    status: string; category: string; meta_id?: string | null;
    components: Array<{ type: string; format?: string; text?: string; buttons?: Array<{ type: string; url?: string; text?: string }> }>
}
export const templateSelectionSchema = z.object({
    template_id: z.string().uuid(), template_name: z.string().min(1).max(512),
    template_language: z.string().min(1).max(32),
    bindings: z.record(z.string().max(100), z.string().max(2000)).default({}),
}).strict()
export type TemplateSelection = z.infer<typeof templateSelectionSchema>
export interface TemplateField { key: string; label: string; kind: 'text' | 'media' | 'payload' }

function variables(text = '') {
    return [...new Set([...text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map(match => match[1]))]
        .sort((a, b) => /^\d+$/.test(a) && /^\d+$/.test(b) ? Number(a) - Number(b) : a.localeCompare(b))
}

/** Describes the required inputs without constructing or sending a Graph request. */
export function describeCampaignTemplate(template: CampaignTemplate) {
    const fields: TemplateField[] = [], issues: string[] = []
    if (template.status !== 'APPROVED' || !template.meta_id) issues.push('La plantilla no está aprobada o no tiene identificador de Meta.')
    if (template.category !== 'MARKETING') issues.push('Las campañas promocionales requieren una plantilla de categoría MARKETING.')
    if (!Array.isArray(template.components) || template.components.filter(c => c.type === 'BODY').length !== 1) {
        return { fields, issues: [...issues, 'La definición de la plantilla está incompleta.'] }
    }
    for (const component of template.components) {
        if (component.type === 'BODY' || (component.type === 'HEADER' && component.format === 'TEXT')) {
            const keys = variables(component.text)
            const numeric = keys.filter(key => /^\d+$/.test(key))
            if (numeric.length && (numeric.length !== keys.length || numeric.some((key, index) => Number(key) !== index + 1))) {
                issues.push('Las variables posicionales deben ser consecutivas desde 1 y no mezclarse con nombres.')
            }
            keys.forEach(key => fields.push({ key: `${component.type.toLowerCase()}.${key}`, label: `${component.type} · {{${key}}}`, kind: 'text' }))
        } else if (component.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(component.format || '')) {
            fields.push({ key: 'header.media', label: `HEADER · URL HTTPS de ${component.format}`, kind: 'media' })
        } else if (component.type === 'BUTTONS') {
            component.buttons?.forEach((button, index) => {
                if (button.type === 'URL') {
                    const keys = variables(button.url)
                    if (keys.length > 1 || (keys.length && !/\{\{\s*[a-zA-Z0-9_]+\s*\}\}$/.test(button.url || ''))) issues.push(`Botón ${index + 1}: URL dinámica no compatible.`)
                    if (keys.length) fields.push({ key: `button.${index}.url`, label: `Botón ${index + 1} · sufijo URL`, kind: 'text' })
                } else if (button.type === 'QUICK_REPLY') {
                    fields.push({ key: `button.${index}.payload`, label: `Botón ${index + 1} · respuesta (${button.text || ''})`, kind: 'payload' })
                } else if (button.type !== 'PHONE_NUMBER') issues.push(`Botón ${index + 1}: tipo ${button.type} todavía no soportado en campañas.`)
            })
        } else if (component.type === 'FOOTER') {
            if (variables(component.text).length) issues.push('El pie de la plantilla no admite variables.')
        } else if (component.type !== 'UI_METADATA') issues.push(`Componente ${component.type} todavía no soportado en campañas.`)
    }
    if (new Set(fields.map(field => field.key)).size !== fields.length) issues.push('La plantilla contiene componentes repetidos.')
    return { fields, issues }
}

function resolveBinding(value: string, lead?: { name?: string | null; company?: string | null; phone?: string | null }) {
    return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
        if (!['nombre', 'empresa', 'telefono'].includes(key)) throw new Error(`Variable de contacto desconocida: ${key}.`)
        if (!lead) return `{{${key}}}`
        const resolved = key === 'nombre' ? lead.name : key === 'empresa' ? lead.company : lead.phone
        if (!resolved?.trim()) throw new Error(`El destinatario no tiene ${key}.`)
        return resolved.trim()
    })
}

export function validateCampaignTemplate(template: CampaignTemplate, selection: unknown, connectionId: string,
    lead?: { name?: string | null; company?: string | null; phone?: string | null }) {
    const parsed = templateSelectionSchema.parse(selection)
    if (template.id !== parsed.template_id || template.channel_id !== connectionId || template.name !== parsed.template_name || template.language !== parsed.template_language) {
        throw new Error('La plantilla no corresponde al número emisor seleccionado.')
    }
    const description = describeCampaignTemplate(template)
    if (description.issues.length) throw new Error(description.issues.join(' '))
    const allowed = new Set(description.fields.map(field => field.key))
    if (Object.keys(parsed.bindings).some(key => !allowed.has(key))) throw new Error('Hay variables que no pertenecen a esta plantilla.')
    for (const field of description.fields) {
        const value = parsed.bindings[field.key]?.trim()
        if (!value) throw new Error(`Completa ${field.label}.`)
        const resolved = resolveBinding(value, lead)
        if (field.kind === 'payload' && resolved.length > 128) throw new Error('La respuesta del botón excede 128 caracteres.')
        if (field.kind === 'media') {
            const url = new URL(resolved)
            if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.') ||
                /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) || url.hostname.includes(':') || /\.(localhost|local|internal)$/.test(url.hostname)) {
                throw new Error('El encabezado multimedia requiere una URL HTTPS pública, sin credenciales.')
            }
        }
    }
    return parsed
}

/** Uses the existing outbox/Meta adapter contract; never calls Meta directly. */
export function buildCampaignTemplateMessage(template: CampaignTemplate, input: unknown, connectionId: string,
    lead: { name?: string | null; company?: string | null; phone?: string | null }) {
    const selection = validateCampaignTemplate(template, input, connectionId, lead)
    const fields = describeCampaignTemplate(template).fields
    const components: Array<Record<string, unknown>> = []
    for (const section of ['header', 'body']) {
        const textFields = fields.filter(field => field.key.startsWith(`${section}.`) && field.kind === 'text')
        if (textFields.length) components.push({ type: section, parameters: textFields.map(field => {
            const key = field.key.slice(section.length + 1)
            return { type: 'text', text: resolveBinding(selection.bindings[field.key].trim(), lead),
                ...(/^\d+$/.test(key) ? {} : { parameter_name: key }) }
        }) })
    }
    const media = template.components.find(component => component.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(component.format || ''))
    if (media) {
        const type = media.format!.toLowerCase()
        components.push({ type: 'header', parameters: [{ type, [type]: { link: resolveBinding(selection.bindings['header.media'].trim(), lead) } }] })
    }
    for (const field of fields.filter(field => field.key.startsWith('button.'))) {
        const [, index, kind] = field.key.split('.')
        const value = resolveBinding(selection.bindings[field.key].trim(), lead)
        components.push({ type: 'button', sub_type: kind === 'url' ? 'url' : 'quick_reply', index,
            parameters: [kind === 'url' ? { type: 'text', text: value } : { type: 'payload', payload: value }] })
    }
    return { type: 'template', templateName: selection.template_name, templateLanguage: selection.template_language, templateComponents: components }
}
