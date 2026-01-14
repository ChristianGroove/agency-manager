import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerCRMHelp() {
    const articles: HelpArticle[] = [
        {
            id: "crm-pipeline",
            title: "Gestionando el Pipeline",
            description: "Mueve tus oportunidades de venta hasta el cierre.",
            relatedViews: ["crm", "dashboard", "pipeline"],
            relatedActions: ["new-quote"],
            keywords: ["pipeline", "etapas", "kanban", "prospecto"],
            contentBlocks: [
                { type: "text", content: "El Pipeline es el corazón de tus ventas. Arrastra las tarjetas para avanzar etapas." },
                { type: "text", content: "¿Tienes un cliente interesado? {{action:new-quote|Crear Cotización}} para enviarle una propuesta formal." }
            ]
        },
        {
            id: "crm-contacts",
            title: "Base de Datos de Clientes",
            description: "Mantén organizada la información de tus contactos.",
            relatedViews: ["crm", "contacts", "dashboard"],
            relatedActions: ["new-client"],
            keywords: ["contactos", "importar", "csv", "clientes"],
            contentBlocks: [
                { type: "text", content: "Una base de datos limpia es clave. Puedes añadir clientes manualmente o importarlos." },
                { type: "text", content: "{{action:new-client|Registrar Nuevo Cliente}} manualmente ahora." },
                { type: "callout", content: "El sistema detectará duplicados por correo electrónico automáticamente.", variant: "info" }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
