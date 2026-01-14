import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerBillingHelp() {
    const articles: HelpArticle[] = [
        {
            id: "billing-overview",
            title: "Entendiendo tu Facturación",
            description: "Todo lo que necesitas saber sobre tu plan, ciclos de cobro y métodos de pago.",
            relatedViews: ["settings", "dashboard"],
            relatedActions: ["view-billing"], // Kept for metadata, but hidden from list
            keywords: ["factura", "pago", "ciclo", "tarjeta", "plan"],
            contentBlocks: [
                { type: "text", content: "El ciclo de facturación de Pixy es mensual. Puedes revisar tu estado actual y descargar comprobantes fiscales directamente en la plataforma." },
                { type: "text", content: "**Acción Rápida**: Puedes ir directamente a la gestión de tu suscripción aquí: {{action:view-billing|Gestionar Mi Plan}}." },
                { type: "callout", content: "Si tu pago falla, tienes 3 días de gracia antes de la suspensión.", variant: "warning" }
            ]
        },
        {
            id: "invoice-creation",
            title: "Cómo crear una factura de venta",
            description: "Guía paso a paso para facturar a tus clientes.",
            relatedViews: ["dashboard", "invoices", "crm"],
            relatedActions: ["new-invoice"],
            keywords: ["factura", "crear", "cliente", "impuestos", "dian"],
            contentBlocks: [
                { type: "text", content: "Crear una factura es un proceso vital. Puedes iniciarlo desde cualquier lugar usando el botón principal." },
                { type: "text", content: "Para empezar ahora mismo: {{action:new-invoice|Crear Nueva Factura}}." },
                { type: "text", content: "Recuerda tener a mano el RUT del cliente si es la primera vez que le facturas." }
            ]
        },
        {
            id: "payment-methods",
            title: "Actualizar Método de Pago",
            description: "Gestiona tus tarjetas de crédito y débito.",
            relatedViews: ["settings"],
            relatedActions: ["view-billing"],
            keywords: ["tarjeta", "crédito", "pago"],
            contentBlocks: [
                { type: "text", content: "Asegúrate de mantener una tarjeta activa para evitar interrupciones." },
                { type: "text", content: "Ve a {{action:view-billing|Métodos de Pago}} para agregar una nueva tarjeta." }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
