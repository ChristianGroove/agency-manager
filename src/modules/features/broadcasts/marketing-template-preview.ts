import type { CampaignTemplate, TemplateSelection } from './marketing-template-contract'

/** Fictional contact examples for UI only. Never used to build a provider message. */
export function previewMarketingTemplate(template: CampaignTemplate, selection: TemplateSelection | null) {
    const example: Record<string, string> = { nombre: 'María Ejemplo', empresa: 'Empresa de ejemplo', telefono: 'Teléfono de ejemplo' }
    const personalize = (value: string) => value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => example[key] || match)
    return template.components.flatMap(component => {
        if (component.type === 'HEADER' && component.format !== 'TEXT') return [{ label: 'Archivo de encabezado', text: selection?.bindings['header.media'] ? `${component.format} configurado` : 'Completa el archivo requerido' }]
        if (!['HEADER', 'BODY', 'FOOTER'].includes(component.type)) return []
        const text = (component.text || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
            const binding = selection?.bindings[`${component.type.toLowerCase()}.${key}`]
            return binding ? personalize(binding) : match
        })
        return [{ label: ({ HEADER: 'Encabezado', BODY: 'Mensaje', FOOTER: 'Pie' } as Record<string, string>)[component.type], text }]
    })
}
