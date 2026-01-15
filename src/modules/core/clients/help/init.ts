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
            id: "contact-card-guide",
            title: "Guía de Tarjeta de Contacto",
            description: "Entiende cada detalle de la tarjeta de tus clientes y sus acciones rápidas.",
            relatedViews: ["clients"],
            relatedActions: [],
            keywords: ["tarjeta", "contacto", "whatsapp", "portal", "acciones", "estado"],
            contentBlocks: [
                { type: "text", content: "La tarjeta de contacto es tu centro de mando para cada cliente. Aquí te explicamos qué hace cada elemento:" },
                { type: "text", content: "**1. Estado y Salud Financiera**\nEl borde de color y los iconos te indican el estado real:\n- **Verde (Al día)**: Cliente sin deudas vencidas.\n- **Rojo (Vencido)**: Tiene facturas pendientes con fecha pasada.\n- **Ámbar (Por Vencer)**: Tiene facturas próximas a vencer o deudas futuras." },
                { type: "text", content: "**2. Botones de Acción Rápida (Inferior)**\nEstán diseñados para tareas de un solo clic:\n- 📞 **Contactar/WhatsApp**: Abre el **Centro de Comunicaciones**. Aquí puedes seleccionar plantillas (Cobro, Cotización, Portal) y enviar mensajes pre-llenados o iniciar un chat libre.\n- 📄 **Documentos Rápidos**: Muestra un resumen de facturas para marcarlas como pagadas rápidamente.\n- 🌐 **Portal Web**: Abre el portal del cliente en una ventana nueva (vista de solo lectura para ti).\n- **Botón Gestionar**: Abre el panel completo con historial, servicios y configuraciones avanzadas." },
                { type: "text", content: "**3. Menú de Opciones (··· Arriba Derecha)**\nAccede a configuraciones profundas:\n- **Editar Información**: Datos básicos, logo y contacto.\n- **Conectividad**: (Si tienes módulos activos) Configura accesos a APIs o servicios conectados.\n- **Gobernanza del Portal**: Controla a qué secciones tiene acceso este cliente específico." },
                { type: "callout", content: "Tip: Si usas la opción 'Contactar', selecciona la casilla 'Incluir Resumen' para enviar un total consolidado de todas las facturas pendientes en un solo mensaje profesional.", variant: "info" }
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
