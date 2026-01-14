import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerKnowledgeHelp() {
    const articles: HelpArticle[] = [
        {
            id: "knowledge-base-ai",
            title: "Base de Conocimiento para IA",
            description: "Entrena a la IA con información de tu negocio.",
            relatedViews: ["knowledge", "ai-engine"],
            relatedActions: ["add-knowledge"],
            keywords: ["conocimiento", "ia", "entrenar", "base"],
            contentBlocks: [
                { type: "text", content: "La Base de Conocimiento es donde subes información que la IA usará para responder preguntas de tus clientes." },
                { type: "text", content: "**Tipos de contenido soportados**:\n- PDFs (manuales, políticas)\n- Páginas web (URLs)\n- Texto libre (FAQs)\n- Documentos Word" },
                { type: "callout", content: "Entre más información subas, más inteligentes serán las respuestas de la IA.", variant: "info" },
                { type: "text", content: "{{action:add-knowledge|Agregar Contenido}}." }
            ]
        },
        {
            id: "knowledge-training",
            title: "Entrenar la IA",
            description: "Paso a paso para que tu IA sea experta en tu negocio.",
            relatedViews: ["knowledge"],
            relatedActions: [],
            keywords: ["entrenar", "proceso", "indexar"],
            contentBlocks: [
                { type: "text", content: "**Proceso**:\n1. Sube tu contenido (PDFs, URLs, texto).\n2. El sistema lo procesa y 'entiende'.\n3. La IA puede ahora responder preguntas basadas en ese contenido.\n4. Revisa las respuestas y ajusta si es necesario." },
                { type: "callout", content: "Pro Tip: Sube tus FAQs más comunes para resultados inmediatos.", variant: "warning" }
            ]
        },
        {
            id: "knowledge-qa",
            title: "Preguntas y Respuestas",
            description: "Revisa cómo la IA responde a tus clientes.",
            relatedViews: ["knowledge", "messaging"],
            relatedActions: [],
            keywords: ["qa", "revisar", "calidad"],
            contentBlocks: [
                { type: "text", content: "En la sección de Q&A puedes ver todas las preguntas que la IA ha respondido y calificar su precisión." },
                { type: "text", content: "Si una respuesta es incorrecta, puedes corregirla y la IA aprenderá para futuras consultas." }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
