import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerBroadcastsHelp() {
    const articles: HelpArticle[] = [
        {
            id: "broadcasts-intro",
            title: "Difusiones Masivas",
            description: "Envía mensajes a cientos de contactos en segundos.",
            relatedViews: ["broadcasts", "marketing"],
            relatedActions: ["create-broadcast"],
            keywords: ["difusión", "masivo", "whatsapp", "sms"],
            contentBlocks: [
                { type: "text", content: "Las difusiones te permiten comunicarte con toda tu base de contactos de manera eficiente." },
                { type: "text", content: "**Canales soportados**:\n- WhatsApp (requiere plantillas aprobadas)\n- Email\n- SMS" },
                { type: "callout", content: "Respeta las políticas de WhatsApp: solo envía a contactos que hayan dado consentimiento.", variant: "warning" },
                { type: "text", content: "{{action:create-broadcast|Crear Difusión}}." }
            ]
        },
        {
            id: "broadcast-templates",
            title: "Plantillas de WhatsApp",
            description: "Mensajes pre-aprobados por Meta para difusiones.",
            relatedViews: ["broadcasts", "settings"],
            relatedActions: [],
            keywords: ["plantilla", "template", "meta", "aprobación"],
            contentBlocks: [
                { type: "text", content: "WhatsApp requiere que uses plantillas aprobadas para mensajes iniciados por ti (no respuestas)." },
                { type: "text", content: "**Proceso**:\n1. Crea la plantilla en Pixy.\n2. La enviamos a Meta para revisión.\n3. Una vez aprobada (~24-48h), puedes usarla." },
                { type: "callout", content: "Evita lenguaje promocional agresivo; Meta rechaza plantillas 'spammy'.", variant: "info" }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
