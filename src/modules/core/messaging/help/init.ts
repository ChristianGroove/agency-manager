import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerMessagingHelp() {
    const articles: HelpArticle[] = [
        {
            id: "inbox-central",
            title: "Gestión Centralizada (Inbox)",
            description: "Tu centro de comando para WhatsApp, Correo y Redes Sociales.",
            relatedViews: ["inbox", "dashboard"],
            relatedActions: ["view-inbox"],
            keywords: ["whatsapp", "chat", "correo", "omnicanal", "mensajes"],
            contentBlocks: [
                { type: "text", content: "El Inbox unifica todas tus conversaciones en un solo lugar. Ya no tienes que saltar entre pestañas para atender a tus clientes." },
                { type: "callout", content: "Tip Pro: Puedes filtrar conversaciones por 'No leídos' o 'Asignados a mí' para mayor velocidad.", variant: "info" },
                { type: "text", content: "¿Listo para responder? Ve al {{action:view-inbox|Inbox Unificado}} ahora." }
            ]
        },
        {
            id: "ai-copilot",
            title: "Respuestas con IA",
            description: "Acelera tu atención al cliente con sugerencias inteligentes.",
            relatedViews: ["inbox", "settings"],
            relatedActions: [],
            keywords: ["ia", "inteligencia", "bot", "respuestas", "automatización"],
            contentBlocks: [
                { type: "text", content: "Pixy analiza el sentimiento del cliente y te sugiere respuestas contextuales. Solo tienes que revisar y enviar." },
                { type: "callout", content: "La IA aprende de tus correcciones. Cuanto más la uses, más precisa se vuelve.", variant: "warning" } // Using warning for 'Star/Sparkle' look usually
            ]
        },
        {
            id: "agent-assignment",
            title: "Asignación de Agentes",
            description: "Distribuye la carga de trabajo eficientemente.",
            relatedViews: ["inbox", "settings", "role-management"],
            relatedActions: ["manage-team"],
            keywords: ["equipo", "asignar", "agente", "colaboración"],
            contentBlocks: [
                { type: "text", content: "Evita que dos personas respondan lo mismo. Asigna conversaciones a miembros específicos de tu equipo." },
                { type: "text", content: "Puedes configurar reglas automáticas o hacerlo manualmente desde el chat." },
                { type: "text", content: "Gestiona tu equipo en {{action:manage-team|Configuración de Equipo}}." }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
