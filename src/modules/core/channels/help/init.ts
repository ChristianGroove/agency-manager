import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerChannelsHelp() {
    const articles: HelpArticle[] = [
        {
            id: "channels-overview",
            title: "Canales de Comunicación",
            description: "Gestiona todos tus canales desde un solo lugar.",
            relatedViews: ["channels", "messaging"],
            relatedActions: [],
            keywords: ["canal", "whatsapp", "email", "instagram"],
            contentBlocks: [
                { type: "text", content: "Los canales son las vías por las que recibes y envías mensajes. Cada canal conectado aparece en tu Inbox unificado." },
                { type: "text", content: "**Canales soportados**:\n- WhatsApp Business API\n- Instagram DMs\n- Facebook Messenger\n- Email (SMTP/IMAP)\n- Widget web (chat en tu sitio)" }
            ]
        },
        {
            id: "channel-assignment",
            title: "Asignación por Canal",
            description: "Ruteá conversaciones automáticamente al equipo correcto.",
            relatedViews: ["channels", "settings"],
            relatedActions: [],
            keywords: ["asignar", "routing", "equipo"],
            contentBlocks: [
                { type: "text", content: "Puedes configurar reglas para que los mensajes de ciertos canales vayan a equipos específicos." },
                { type: "text", content: "Ejemplo: 'Mensajes de Instagram → Equipo de Marketing'" },
                { type: "callout", content: "Combina esto con automatizaciones para respuestas automáticas fuera de horario.", variant: "info" }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
