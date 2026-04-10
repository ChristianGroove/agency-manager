
export const COMMUNICATION_VARIABLES = {
    invoice_sent: ['{{cliente}}', '{{factura}}', '{{monto}}', '{{link}}'],
    payment_reminder: ['{{cliente}}', '{{factura}}', '{{monto}}', '{{link}}'],
    payment_confirmation: ['{{cliente}}', '{{factura}}', '{{monto}}'],
    briefing_sent: ['{{cliente}}', '{{link}}'],
    briefing_completed: ['{{cliente}}']
}

export const DEFAULT_TEMPLATES = {
    invoice_sent: "Hola {{cliente}}, te enviamos tu factura #{{factura}} por valor de {{monto}}. Puedes verla y pagarla aquí: {{link}}",
    payment_reminder: "Hola {{cliente}}, recordatorio amable de tu factura #{{factura}} pendiente por {{monto}}. Link de pago: {{link}}",
    payment_confirmation: "¡Gracias {{cliente}}! Hemos recibido tu pago de {{monto}} por la factura #{{factura}}.",
    briefing_sent: "Hola {{cliente}}, necesitamos tu ayuda con este briefing para avanzar: {{link}}",
    briefing_completed: "¡Gracias {{cliente}}! Hemos recibido tu briefing completado."
}

export function generateMessage(templateKey: keyof typeof DEFAULT_TEMPLATES, data: Record<string, string>, settings: any): string {
    let template = settings?.comm_templates?.[templateKey] || DEFAULT_TEMPLATES[templateKey]

    // Replace variables
    Object.keys(data).forEach(key => {
        const placeholder = `{{${key}}}`
        template = template.replaceAll(placeholder, data[key])
    })

    return template
}

export function getWhatsAppLink(phone: string, message: string, settings?: any): string {
    // Use settings prefix if available, otherwise default to 57 (Colombia) or extract from phone if possible
    let cleanPhone = phone?.replace(/\D/g, '') || ''

    // If phone doesn't start with settings prefix, prepend it (basic logic)
    // Ideally we should trust the input phone to be full or handle this more robustly
    // For now, we assume cleanPhone is the full number or local number

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}
