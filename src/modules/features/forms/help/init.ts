import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerFormsHelp() {
    const articles: HelpArticle[] = [
        {
            id: "automated-briefings",
            title: "Briefings Automatizados",
            description: "Olvídate de perseguir clientes para que te envíen la información.",
            relatedViews: ["forms", "projects"],
            relatedActions: ["create-form"],
            keywords: ["briefing", "formulario", "requisitos", "automatización"],
            contentBlocks: [
                { type: "text", content: "Crea formularios dinámicos para recolectar información de tus clientes antes de iniciar un proyecto." },
                { type: "text", content: "Puedes enviar el enlace directo o embeberlo en tu sitio web." },
                { type: "text", content: "Crea tu primer briefing en {{action:create-form|Constructor de Formularios}}." }
            ]
        },
        {
            id: "form-builder-magic",
            title: "Constructor Magic",
            description: "Crea formularios arrastrando y soltando bloques.",
            relatedViews: ["forms"],
            relatedActions: ["create-form"],
            keywords: ["builder", "drag", "drop", "campos"],
            contentBlocks: [
                { type: "text", content: "Nuestro constructor visual te permite añadir campos de texto, selección múltiple, carga de archivos y más." },
                { type: "callout", content: "Usa la lógica condicional para mostrar preguntas solo si el cliente responde 'Sí' a la anterior.", variant: "warning" }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
