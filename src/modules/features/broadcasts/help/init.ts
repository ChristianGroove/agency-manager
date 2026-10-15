import { helpRegistry } from "@/modules/features/caa/registry"
import { HelpArticle } from "@/modules/features/caa/types"

export function registerBroadcastsHelp() {
    const articles: HelpArticle[] = [
        {
            id: "broadcasts-intro",
            title: "Campañas masivas",
            description: "Prepara campañas de WhatsApp y email con autorización y seguimiento.",
            relatedViews: ["broadcasts", "marketing"],
            relatedActions: ["create-broadcast"],
            keywords: ["difusión", "masivo", "whatsapp", "email", "campaña"],
            contentBlocks: [
                { type: "text", content: "Elige WhatsApp o email y un emisor de tu organización. WhatsApp usa plantillas MARKETING aprobadas; email usa una cuenta SMTP verificada. Solo se incluyen destinatarios con autorización vigente para ese canal." },
                { type: "text", content: "**Recorrido**:\n1. Completa nombre y emisor.\n2. Prepara el mensaje y elige destinatarios del CRM o una lista importada.\n3. Ajusta inicio, horario y ritmo en Envío si lo necesitas.\n4. Guarda el borrador o pulsa Iniciar campaña. Con fecha futura, la acción se llama Programar campaña. Se guardan y validan los datos sin abrir otra confirmación." },
                { type: "callout", content: "Guardar e importar no envían mensajes ni conceden permiso comercial. Las bajas y los contactos sin autorización se excluyen del envío.", variant: "info" },
                { type: "text", content: "Consulta resultados, incidencias e historial en Actividad. Pausar conserva el avance; Reanudar campaña valida y retoma los destinatarios originales. La ejecución debe estar habilitada en el entorno." },
                { type: "text", content: "{{action:create-broadcast|Crear campaña}}." }
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
                { type: "text", content: "Selecciona una plantilla MARKETING aprobada y sincronizada para el número emisor. Completa las variables y comprueba la vista previa. Al iniciar se validan los datos y la disponibilidad de la plantilla." },
                { type: "callout", content: "Ningún ritmo garantiza evitar restricciones. Consulta la salud del canal y las incidencias en los resultados de la campaña.", variant: "info" }
            ]
        },
        {
            id: "broadcasts-email",
            title: "Campañas de email",
            description: "Emisor SMTP, consentimiento, resultados y bajas.",
            relatedViews: ["broadcasts", "marketing"],
            relatedActions: [],
            keywords: ["email", "smtp", "correo", "baja", "campaña"],
            contentBlocks: [
                { type: "text", content: "Configura y verifica el SMTP de tu organización en Motor de correos. En la campaña, completa asunto y mensaje; puedes personalizarlos con {{nombre}}, {{empresa}} y {{email}}. El permiso de email es independiente del de WhatsApp." },
                { type: "text", content: "Cada correo incluye un enlace de baja. Las respuestas llegan al buzón del emisor. SMTP confirma aceptación del servidor; no acredita entrega en bandeja, lectura ni apertura." },
                { type: "callout", content: "Un envío sin resultado confirmado puede haberse enviado y no se reenvía automáticamente. Consulta el historial y contrástalo con el registro del proveedor antes de resolverlo.", variant: "warning" }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
