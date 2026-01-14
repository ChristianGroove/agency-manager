import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerSettingsHelp() {
    const articles: HelpArticle[] = [
        {
            id: "branding-config",
            title: "Personaliza tu Marca",
            description: "Haz que el portal se sienta propio con tus colores y logo.",
            relatedViews: ["settings", "branding"],
            relatedActions: ["save-settings"],
            keywords: ["logo", "color", "marca", "whitelabel"],
            contentBlocks: [
                { type: "text", content: "Sube tu logo y define tu color primario. Estos se aplicarán a todo el sistema inmediatamente." },
                { type: "text", content: "No olvides {{action:save-settings|Guardar Cambios}} después de subir tus assets." }
            ]
        },
        {
            id: "team-management",
            title: "Usuarios y Permisos",
            description: "Controla quién tiene acceso a tu organización.",
            relatedViews: ["settings", "roles"],
            relatedActions: ["manage-team"],
            keywords: ["equipo", "invitar", "admin", "miembro"],
            contentBlocks: [
                { type: "text", content: "Invita a tu equipo y asigna roles granulares (Admin, Miembro, Contador)." },
                { type: "text", content: "Accede a {{action:manage-team|Gestión de Equipo}} para ver la lista actual." }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
