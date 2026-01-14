import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerClientsHelp() {
    const articles: HelpArticle[] = [
        {
            id: "clients-overview",
            title: "Gestión de Clientes",
            description: "Tu base de datos de clientes es tu activo más valioso.",
            relatedViews: ["clients", "crm"],
            relatedActions: ["new-client"],
            keywords: ["cliente", "contacto", "base", "datos"],
            contentBlocks: [
                { type: "text", content: "Cada cliente en Pixy tiene un perfil completo con historial de interacciones, facturas, proyectos y más." },
                { type: "text", content: "**Información del cliente**:\n- Datos de contacto\n- Empresa y cargo\n- Historial de compras\n- Notas y archivos adjuntos\n- Timeline de actividad" },
                { type: "text", content: "{{action:new-client|Agregar Nuevo Cliente}}." }
            ]
        },
        {
            id: "client-import",
            title: "Importar Clientes",
            description: "Migra tu base existente sin perder datos.",
            relatedViews: ["clients", "settings"],
            relatedActions: [],
            keywords: ["importar", "csv", "excel", "migrar"],
            contentBlocks: [
                { type: "text", content: "Puedes importar clientes desde un archivo CSV o Excel." },
                { type: "text", content: "**Pasos**:\n1. Descarga nuestra plantilla de importación.\n2. Llena los campos con tus datos.\n3. Sube el archivo.\n4. Mapea las columnas.\n5. Revisa y confirma." },
                { type: "callout", content: "El sistema detecta duplicados por email automáticamente.", variant: "info" }
            ]
        },
        {
            id: "client-360",
            title: "Vista 360° del Cliente",
            description: "Todo sobre tu cliente en una sola pantalla.",
            relatedViews: ["clients"],
            relatedActions: [],
            keywords: ["perfil", "vista", "historial", "360"],
            contentBlocks: [
                { type: "text", content: "La vista de cliente te muestra:\n- Todas las conversaciones\n- Cotizaciones y facturas\n- Proyectos activos\n- Archivos compartidos\n- Notas del equipo" },
                { type: "callout", content: "Usa esta vista antes de una llamada para estar 100% preparado.", variant: "warning" }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
