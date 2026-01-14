import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerDashboardHelp() {
    const articles: HelpArticle[] = [
        {
            id: "metrics-101",
            title: "Interpretando tus Métricas",
            description: "Domina los números que impulsan tu negocio: MRR, Churn y LTV.",
            relatedViews: ["dashboard", "reports"],
            relatedActions: [],
            keywords: ["mrr", "ingresos", "ventas", "estadísticas", "reportes"],
            contentBlocks: [
                { type: "text", content: "**MRR (Ingreso Recurrente Mensual)**: Es el pulso de tu agencia. Muestra cuánto facturas de forma predecible cada mes." },
                { type: "text", content: "**Churn Rate**: El porcentaje de clientes que cancelan. Mantenlo bajo para crecer saludablemente." },
                { type: "callout", content: "Puedes ver el desglose detallado haciendo clic en cualquier tarjeta del dashboard.", variant: "info" }
            ]
        },
        {
            id: "dashboard-customization",
            title: "Personalizar tu Espacio",
            description: "Organiza los widgets para ver lo que realmente importa.",
            relatedViews: ["dashboard"],
            relatedActions: [],
            keywords: ["widgets", "mover", "ordenar", "vista"],
            contentBlocks: [
                { type: "text", content: "Tu dashboard es tuyo. Arrastra y suelta los widgets para priorizar la información que consultas a diario." },
                { type: "text", content: "Si necesitas ocultar información sensible, usa el modo 'Privacidad' en la esquina superior." }
            ]
        },
        {
            id: "productivity-shortcuts",
            title: "Atajos de Productividad",
            description: "Muévete por Pixy a la velocidad del pensamiento.",
            relatedViews: ["dashboard", "settings"],
            relatedActions: [],
            keywords: ["teclado", "atajos", "búsqueda", "cmd", "ctrl"],
            contentBlocks: [
                { type: "text", content: "No pierdas tiempo buscando en menús. Usa **Cmd+K** (o Ctrl+K) para abrir este asistente desde cualquier lugar." },
                { type: "callout", content: "Prueba escribir acciones como 'Crear Factura' o 'Ver Cliente' directamente en la barra.", variant: "warning" }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
