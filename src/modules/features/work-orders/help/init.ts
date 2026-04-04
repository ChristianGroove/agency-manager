import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerWorkOrdersHelp() {
    const articles: HelpArticle[] = [
        {
            id: "work-orders-intro",
            title: "Órdenes de Trabajo",
            description: "Gestiona la entrega de servicios de principio a fin.",
            relatedViews: ["work-orders", "projects"],
            relatedActions: ["create-work-order"],
            keywords: ["orden", "trabajo", "proyecto", "entrega"],
            contentBlocks: [
                { type: "text", content: "Una Orden de Trabajo representa un servicio vendido que debe ejecutarse. Es el puente entre la venta y la entrega." },
                { type: "text", content: "**Ciclo de vida**:\n1. **Creada**: Se genera desde una cotización aprobada.\n2. **En Progreso**: Tu equipo trabaja en ella.\n3. **Revisión**: El cliente revisa entregables.\n4. **Completada**: Servicio entregado y aprobado." },
                { type: "text", content: "{{action:create-work-order|Nueva Orden de Trabajo}}." }
            ]
        },
        {
            id: "work-order-tasks",
            title: "Sub-tareas y Checklists",
            description: "Divide el trabajo en pasos manejables.",
            relatedViews: ["work-orders"],
            relatedActions: [],
            keywords: ["tarea", "checklist", "subtarea"],
            contentBlocks: [
                { type: "text", content: "Cada orden puede tener múltiples tareas asignadas a diferentes miembros del equipo." },
                { type: "text", content: "Usa checklists para asegurar que nada se olvide:\n- [ ] Recibir briefing\n- [ ] Diseñar propuesta\n- [ ] Revisar con cliente\n- [ ] Entregar final" },
                { type: "callout", content: "Las tareas completadas actualizan automáticamente el progreso de la orden.", variant: "info" }
            ]
        },
        {
            id: "work-order-delivery",
            title: "Entregables y Archivos",
            description: "Sube y comparte archivos con tu cliente.",
            relatedViews: ["work-orders", "portal"],
            relatedActions: [],
            keywords: ["archivo", "entrega", "upload", "compartir"],
            contentBlocks: [
                { type: "text", content: "Los archivos subidos a una orden se sincronizan automáticamente al portal del cliente." },
                { type: "text", content: "Soportamos: Imágenes, PDFs, Videos, Archivos comprimidos." },
                { type: "callout", content: "Usa la función de 'Versiones' para mantener historial de cambios.", variant: "warning" }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
