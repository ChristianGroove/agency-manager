import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerBrandingHelp() {
    const articles: HelpArticle[] = [
        {
            id: "branding-whitelabel",
            title: "Marca Blanca (Whitelabel)",
            description: "Haz que Pixy luzca como tu propia plataforma.",
            relatedViews: ["branding", "settings"],
            relatedActions: ["save-settings"],
            keywords: ["marca", "logo", "color", "whitelabel", "personalizar"],
            contentBlocks: [
                { type: "text", content: "Con la marca blanca, tus clientes nunca sabrán que usas Pixy. Todo llevará tu branding." },
                { type: "text", content: "**Elementos personalizables**:\n- Logo (claro y oscuro)\n- Colores primarios y secundarios\n- Favicon\n- Nombre de la plataforma\n- Dominio personalizado (plan Enterprise)" },
                { type: "text", content: "{{action:save-settings|Configurar Mi Marca}}." }
            ]
        },
        {
            id: "branding-documents",
            title: "Documentos con tu Marca",
            description: "Cotizaciones, facturas y reportes personalizados.",
            relatedViews: ["branding", "billing"],
            relatedActions: [],
            keywords: ["pdf", "factura", "cotización", "documento"],
            contentBlocks: [
                { type: "text", content: "Todos los documentos que generes llevarán automáticamente tu logo, colores y datos fiscales." },
                { type: "callout", content: "Puedes personalizar el pie de página con términos y condiciones.", variant: "info" }
            ]
        },
        {
            id: "branding-portal",
            title: "Portal de Cliente Personalizado",
            description: "La experiencia de tus clientes, a tu imagen.",
            relatedViews: ["branding", "portal"],
            relatedActions: [],
            keywords: ["portal", "cliente", "experiencia"],
            contentBlocks: [
                { type: "text", content: "El portal hereda tu marca automáticamente. Tus clientes verán tu logo, colores y nombre." },
                { type: "text", content: "En planes avanzados, puedes usar tu propio dominio (ej. portal.tuempresa.com)." }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
