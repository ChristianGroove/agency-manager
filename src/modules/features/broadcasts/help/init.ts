import { helpRegistry } from "@/modules/features/caa/registry"
import { HelpArticle } from "@/modules/features/caa/types"

export function registerBroadcastsHelp() {
    const articles: HelpArticle[] = [
        {
            id: "broadcasts-intro",
            title: "Difusiones Masivas",
            description: "Prepara campañas WhatsApp con plantillas, autorización y resultados.",
            relatedViews: ["broadcasts", "marketing"],
            relatedActions: ["create-broadcast"],
            keywords: ["difusión", "masivo", "whatsapp", "campaña"],
            contentBlocks: [
                { type: "text", content: "Las campañas envían plantillas de WhatsApp a destinatarios con autorización vigente. Se excluyen duplicados, bajas y contactos sin autorización." },
                { type: "text", content: "**Recorrido**:\n1. Elige el número y los destinatarios.\n2. Selecciona una plantilla aprobada.\n3. Define la programación.\n4. Revisa y confirma. Guardar un borrador no envía mensajes. Email y SMS no están habilitados para estas campañas." },
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
                { type: "text", content: "Selecciona una plantilla MARKETING aprobada y sincronizada para el número emisor. Completa sus variables; la revisión señalará datos faltantes o cambios de disponibilidad." },
                { type: "callout", content: "Ningún ritmo garantiza evitar restricciones. Consulta la salud del canal y las incidencias en los resultados de la campaña.", variant: "info" }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
