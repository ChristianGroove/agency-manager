import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerCatalogHelp() {
    const articles: HelpArticle[] = [
        {
            id: "catalog-basics",
            title: "Construye tu Catálogo",
            description: "Estandariza tus servicios para cotizar más rápido.",
            relatedViews: ["catalog", "dashboard"],
            relatedActions: ["new-service"],
            keywords: ["catalogo", "servicios", "productos", "precio"],
            contentBlocks: [
                { type: "text", content: "El secreto de la escalabilidad está en no reinventar la rueda. Define tus servicios principales (ej. 'Gestión de Redes', 'Diseño Web') una sola vez." },
                { type: "callout", content: "Al cotizar, solo tendrás que seleccionar el servicio y el sistema cargará el precio y descripción automáticamente.", variant: "info" },
                { type: "text", content: "Empieza añadiendo tu primer servicio: {{action:new-service|Nuevo Servicio}}." }
            ]
        },
        {
            id: "service-templates",
            title: "Plantillas de Servicio",
            description: "Paquetes predefinidos listos para vender.",
            relatedViews: ["catalog"],
            relatedActions: [],
            keywords: ["plantilla", "paquete", "bundle"],
            contentBlocks: [
                { type: "text", content: "Crea variaciones de tus servicios (ej. 'Plan Básico' vs 'Plan Premium')." },
                { type: "text", content: "Esto permite a tu equipo de ventas ofrecer opciones claras sin dudar en el alcance." }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
