import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerCRMHelp() {
    const articles: HelpArticle[] = [
        {
            id: "crm-pipeline",
            title: "Gestionando el Pipeline",
            description: "Visualiza y mueve tus oportunidades de venta hasta el cierre.",
            relatedViews: ["crm", "dashboard", "pipeline"],
            relatedActions: ["new-quote"],
            keywords: ["pipeline", "etapas", "kanban", "prospecto"],
            contentBlocks: [
                { type: "text", content: "El Pipeline te da una visión clara de tu embudo de ventas. Arrastra las tarjetas para avanzar etapas o márcalas como 'Ganadas' y 'Perdidas'." },
                { type: "callout", content: "Tip: Mantén tu pipeline limpio archivando los tratos estancados.", variant: "info" },
                { type: "text", content: "¿Tienes un cliente interesado? {{action:new-quote|Crear Cotización}} para enviarle una propuesta formal." }
            ]
        },
        {
            id: "integrated-quoter",
            title: "Cotizador Integrado",
            description: "Crea propuestas profesionales en segundos, no horas.",
            relatedViews: ["crm", "quotes"],
            relatedActions: ["new-quote"],
            keywords: ["cotización", "propuesta", "presupuesto", "pdf"],
            contentBlocks: [
                { type: "text", content: "Olvídate de Word o Excel. El cotizador de Pixy toma tus productos del inventario y genera un PDF con tu branding automáticamente." },
                { type: "text", content: "Puedes enviar la cotización por correo directamente desde la plataforma." },
                { type: "text", content: "Empieza una ahora: {{action:new-quote|Nueva Cotización}}." }
            ]
        },
        {
            id: "crm-contacts",
            title: "Base de Datos de Clientes",
            description: "Mantén organizada la información y el historial de tus contactos.",
            relatedViews: ["crm", "contacts", "dashboard"],
            relatedActions: ["new-client"],
            keywords: ["contactos", "importar", "csv", "clientes"],
            contentBlocks: [
                { type: "text", content: "Una base de datos centralizada es el activo más valioso de tu agencia. Registra cada interacción, nota y correos en el perfil del cliente." },
                { type: "text", content: "{{action:new-client|Registrar Nuevo Cliente}} manualmente." },
                { type: "callout", content: "El sistema detectará duplicados por correo electrónico automáticamente para evitar caos.", variant: "info" }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
