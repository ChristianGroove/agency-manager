import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerMarketingHelp() {
    const articles: HelpArticle[] = [
        {
            id: "marketing-overview",
            title: "Marketing Engine",
            description: "Atrae, convierte y retén clientes desde un solo lugar.",
            relatedViews: ["marketing", "dashboard"],
            relatedActions: [],
            keywords: ["marketing", "campaña", "audiencia", "email"],
            contentBlocks: [
                { type: "text", content: "El Marketing Engine de Pixy te permite lanzar campañas multicanal sin salir de la plataforma." },
                { type: "text", content: "**Capacidades**:\n- Segmentación de audiencias\n- Campañas de email\n- Difusiones de WhatsApp\n- Landing pages\n- Formularios de captura" },
                { type: "callout", content: "Todo lo que capturas se conecta automáticamente al CRM.", variant: "info" }
            ]
        },
        {
            id: "audience-segmentation",
            title: "Segmentación de Audiencias",
            description: "El mensaje correcto, para la persona correcta.",
            relatedViews: ["marketing", "crm"],
            relatedActions: ["create-audience"],
            keywords: ["audiencia", "segmento", "filtro", "targeting"],
            contentBlocks: [
                { type: "text", content: "Crea audiencias basadas en comportamiento, datos demográficos o historial de compras." },
                { type: "text", content: "Ejemplos:\n- 'Clientes que no compran hace 90 días'\n- 'Leads de Facebook del último mes'\n- 'Clientes con suscripciones activas'" },
                { type: "text", content: "{{action:create-audience|Crear Nueva Audiencia}}." }
            ]
        },
        {
            id: "campaign-creation",
            title: "Lanzar una Campaña",
            description: "Paso a paso para tu primera campaña exitosa.",
            relatedViews: ["marketing"],
            relatedActions: ["create-campaign"],
            keywords: ["campaña", "enviar", "lanzar"],
            contentBlocks: [
                { type: "text", content: "**Paso 1**: Elige el canal (Email, WhatsApp, SMS).\n**Paso 2**: Selecciona o crea una audiencia.\n**Paso 3**: Diseña el mensaje (usa nuestros templates).\n**Paso 4**: Programa o envía inmediatamente.\n**Paso 5**: Revisa métricas en tiempo real." },
                { type: "callout", content: "Siempre envía un test a ti mismo antes de lanzar a toda la audiencia.", variant: "warning" }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
