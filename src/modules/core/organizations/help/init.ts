import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerOrganizationsHelp() {
    const articles: HelpArticle[] = [
        {
            id: "orgs-overview",
            title: "Multi-Organización",
            description: "Gestiona múltiples empresas o marcas desde una sola cuenta.",
            relatedViews: ["organizations", "settings"],
            relatedActions: ["create-organization"],
            keywords: ["organización", "empresa", "multi", "tenant"],
            contentBlocks: [
                { type: "text", content: "Si manejas varias empresas o marcas, puedes crear organizaciones separadas con sus propios datos, equipos y configuraciones." },
                { type: "text", content: "**Cada organización tiene**:\n- Su propia base de clientes\n- Marca y colores independientes\n- Equipo y permisos separados\n- Facturación propia" },
                { type: "callout", content: "Cambia entre organizaciones desde el selector en la barra superior.", variant: "info" },
                { type: "text", content: "{{action:create-organization|Crear Nueva Organización}}." }
            ]
        },
        {
            id: "org-switching",
            title: "Cambiar de Organización",
            description: "Navega entre tus empresas sin cerrar sesión.",
            relatedViews: ["dashboard"],
            relatedActions: [],
            keywords: ["cambiar", "switch", "selector"],
            contentBlocks: [
                { type: "text", content: "Usa el selector en la esquina superior izquierda para cambiar entre organizaciones." },
                { type: "text", content: "Cada organización mantiene su contexto: al cambiar, verás solo los datos de esa empresa." }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
