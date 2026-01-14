import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerQuotesHelp() {
    const articles: HelpArticle[] = [
        {
            id: "quote-creation",
            title: "Crea Cotizaciones Profesionales",
            description: "Convierte oportunidades en propuestas ganadoras.",
            relatedViews: ["quotes", "crm", "pipeline"],
            relatedActions: ["new-quote"],
            keywords: ["cotización", "propuesta", "precio", "cliente"],
            contentBlocks: [
                { type: "text", content: "Una cotización bien presentada puede ser la diferencia entre cerrar o perder un trato. Pixy genera PDFs con tu marca automáticamente." },
                { type: "text", content: "**Paso 1**: Selecciona el cliente (o crea uno nuevo).\n**Paso 2**: Añade servicios del catálogo o items personalizados.\n**Paso 3**: Revisa totales e impuestos.\n**Paso 4**: Envía por correo o comparte el enlace." },
                { type: "callout", content: "Tu cliente puede aprobar la cotización con un clic desde su portal.", variant: "info" },
                { type: "text", content: "¿Listo? {{action:new-quote|Crear Nueva Cotización}}." }
            ]
        },
        {
            id: "quote-templates",
            title: "Plantillas de Cotización",
            description: "Acelera tu proceso de ventas con plantillas reutilizables.",
            relatedViews: ["quotes", "settings"],
            relatedActions: [],
            keywords: ["plantilla", "template", "rápido"],
            contentBlocks: [
                { type: "text", content: "Si vendes los mismos paquetes frecuentemente, crea plantillas para no empezar de cero cada vez." },
                { type: "text", content: "Las plantillas guardan: servicios, descuentos, términos y condiciones." },
                { type: "callout", content: "Pro Tip: Crea plantillas por industria o tamaño de cliente.", variant: "warning" }
            ]
        },
        {
            id: "quote-tracking",
            title: "Seguimiento de Cotizaciones",
            description: "Sabe exactamente cuándo tu cliente abre tu propuesta.",
            relatedViews: ["quotes", "crm"],
            relatedActions: [],
            keywords: ["tracking", "abrir", "visto", "estado"],
            contentBlocks: [
                { type: "text", content: "Cada cotización tiene un estado: **Borrador**, **Enviada**, **Vista**, **Aprobada** o **Rechazada**." },
                { type: "text", content: "Cuando tu cliente abre el link, el estado cambia a 'Vista' y puedes hacer seguimiento inteligente." },
                { type: "callout", content: "Recibirás una notificación cuando tu cliente interactúe con la cotización.", variant: "info" }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
