import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerIntegrationsHelp() {
    const articles: HelpArticle[] = [
        {
            id: "integrations-overview",
            title: "Conecta tus Herramientas",
            description: "Pixy se integra con todo tu stack tecnológico.",
            relatedViews: ["integrations", "settings"],
            relatedActions: [],
            keywords: ["integración", "conexión", "api", "webhook"],
            contentBlocks: [
                { type: "text", content: "No trabajes en silos. Conecta Pixy con las herramientas que ya usas para crear un flujo de trabajo unificado." },
                { type: "text", content: "**Integraciones Populares**:\n- WhatsApp Business\n- Google Calendar\n- Stripe / PayU\n- Slack / Discord\n- Zapier / Make" },
                { type: "callout", content: "Cada integración tiene su propia guía de configuración. Ve a Integraciones para empezar.", variant: "info" }
            ]
        },
        {
            id: "whatsapp-setup",
            title: "Conectar WhatsApp Business",
            description: "Atiende a tus clientes desde el Inbox unificado.",
            relatedViews: ["integrations", "messaging"],
            relatedActions: ["setup-whatsapp"],
            keywords: ["whatsapp", "meta", "business", "api"],
            contentBlocks: [
                { type: "text", content: "Necesitarás una cuenta de Meta Business verificada y un número de teléfono dedicado." },
                { type: "text", content: "**Pasos**:\n1. Ve a Integraciones → WhatsApp.\n2. Inicia sesión con Facebook.\n3. Acepta permisos.\n4. Verifica tu número.\n5. ¡Listo! Los mensajes llegarán al Inbox." },
                { type: "callout", content: "El proceso toma ~24 horas la primera vez por verificaciones de Meta.", variant: "warning" }
            ]
        },
        {
            id: "payment-gateways",
            title: "Pasarelas de Pago",
            description: "Acepta pagos online de forma segura.",
            relatedViews: ["integrations", "billing"],
            relatedActions: [],
            keywords: ["stripe", "payu", "pago", "tarjeta"],
            contentBlocks: [
                { type: "text", content: "Conecta Stripe o PayU para que tus clientes paguen facturas directamente desde el portal." },
                { type: "text", content: "Los pagos se reconcilian automáticamente y actualizan el estado de la factura." }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
