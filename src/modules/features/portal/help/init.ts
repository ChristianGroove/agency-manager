import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerPortalHelp() {
    const articles: HelpArticle[] = [
        {
            id: "portal-experience",
            title: "La Experiencia del Cliente",
            description: "Qué ven tus clientes cuando entran a su portal.",
            relatedViews: ["portal", "settings"],
            relatedActions: [],
            keywords: ["portal", "cliente", "vista", "transparencia"],
            contentBlocks: [
                { type: "text", content: "El Portal de Cliente es tu cara digital. Aquí tus clientes pueden:" },
                { type: "text", content: "1. Ver y pagar facturas pendientes.\n2. Aprobar cotizaciones con un clic.\n3. Rellenar briefings de proyectos." },
                { type: "callout", content: "Puedes personalizar el portal con tu logo y colores en {{action:save-settings|Configuración de Marca}}.", variant: "info" }
            ]
        },
        {
            id: "client-access",
            title: "Invitaciones y Accesos",
            description: "Cómo dar acceso a tus clientes al portal.",
            relatedViews: ["crm", "contacts"],
            relatedActions: ["new-client"],
            keywords: ["invitar", "acceso", "login", "password"],
            contentBlocks: [
                { type: "text", content: "Al crear un cliente, puedes enviarle una invitación automática por correo." },
                { type: "text", content: "Si olvidan su contraseña, pueden restablecerla ellos mismos desde la página de inicio de sesión." }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
