import { deliveryConfigSchema, normalizeDelay, publicMarketingError } from './marketing-contracts'
import { CampaignTemplate, validateCampaignTemplate } from './marketing-template-contract'
import { emailContentSchema } from './marketing-email-contracts'

/** The same design validation is used for review and the server activation boundary. */
export function campaignDesignIssues(input: any, existingRecipients = false): string[] {
    const { campaign, channel, sequences, templates, audience, missingData } = input
    const issues: string[] = []
    const email = campaign.channel === 'email'
    if (!channel || channel.status !== 'active' || !(email ? channel.provider === 'smtp' : ['whatsapp_cloud', 'meta_whatsapp'].includes(channel.provider))) issues.push(email ? 'Selecciona y guarda un emisor SMTP verificado.' : 'Selecciona y guarda un número WhatsApp activo.')
    if (channel?.health && !channel.health.ready) issues.push('Comprueba la calidad del número y revisa sus restricciones en Resultados antes de activar.');
    if (!existingRecipients) {
        if (!audience) issues.push('Vincula una audiencia guardada.')
        else if (!audience.eligible) issues.push('La audiencia no contiene destinatarios con autorización vigente.')
    }
    try { deliveryConfigSchema.parse(campaign.delivery_config) } catch { issues.push('Revisa el horario y la zona horaria de envío.') }
    const active = sequences.filter((sequence: any) => sequence.is_active)
    if (active.length !== 1) issues.push('La campaña requiere exactamente una secuencia activa; elige un único flujo principal.')
    const steps = active.length === 1 ? active[0].steps : []
    if (!steps.some((step: any) => step.type === (email ? 'email' : 'whatsapp'))) issues.push(email ? 'Añade al menos un correo con asunto y mensaje.' : 'Añade al menos un paso con una plantilla WhatsApp.')
    if (new Set(steps.map((step: any) => step.order_index)).size !== steps.length) issues.push('La secuencia tiene posiciones duplicadas; corrige el orden antes de activarla.')
    for (const step of steps) {
        try {
            if (step.type === 'delay') normalizeDelay(step.delay_config)
            else if (step.type === 'email' && email) emailContentSchema.parse(step.content)
            else if (step.type === 'whatsapp' && !email) {
                const template = templates.find((item: CampaignTemplate) => item.id === step.content?.template_id)
                if (!template) throw new Error('Selecciona una plantilla aprobada del número emisor; un mensaje libre no sirve para una campaña.')
                validateCampaignTemplate(template, step.content, campaign.connection_id)
            } else throw new Error(`El tipo ${step.type} no está soportado en este motor.`)
        } catch (error) { issues.push(`${step.name}: ${publicMarketingError(error)}`) }
    }
    if (!existingRecipients && missingData) issues.push(`${missingData} destinatarios autorizados no tienen datos requeridos por las variables del mensaje.`)
    return issues
}
