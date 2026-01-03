import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

// ==========================================
// DICTIONARY (Simple Server-Side i18n)
// ==========================================

export type Language = 'es' | 'en'

const dictionaries = {
    es: {
        admin: {
            title: "Plantillas de Solución",
            description: "Paquetes de módulos pre-configurados para diferentes verticales",
            create_button: "Crear Plantilla",
            create_dialog_title: "Crear Plantilla de Solución",
            edit_dialog_title: "Editar Plantilla de Solución",
            back_button: "Volver a Plantillas",
            current_template: "Plantilla de Solución Actual",
            using_template: "Usando esta plantilla",
            featured: "Destacado",
            inactive: "Inactivo",
            active_organizations: "Organizaciones Activas",
            per_month: "/mes",
            trial_days_label: "días de prueba",
            form: {
                name: "Nombre de Plantilla",
                description: "Descripción",
                category: "Categoría",
                price: "Precio Mensual",
                save: "Guardar Cambios",
                create: "Crear"
            },
            toast: {
                created: "¡Plantilla creada exitosamente!",
                updated: "¡Plantilla actualizada exitosamente!",
                error: "Error al guardar"
            }
        }
    },
    en: {
        admin: {
            title: "Solution Templates",
            description: "Pre-configured module bundles for different use cases",
            create_button: "Create Template",
            create_dialog_title: "Create Solution Template",
            edit_dialog_title: "Edit Solution Template",
            back_button: "Back to Templates",
            current_template: "Current Solution Template",
            using_template: "Using this template",
            featured: "Featured",
            inactive: "Inactive",
            active_organizations: "Active Organizations",
            per_month: "/month",
            trial_days_label: "day trial",
            form: {
                name: "Template Name",
                description: "Description",
                category: "Category",
                price: "Monthly Price",
                save: "Save Changes",
                create: "Create"
            },
            toast: {
                created: "Template created successfully!",
                updated: "Template updated successfully!",
                error: "Error saving"
            }
        }
    }
}

// ==========================================
// RESOLVER LOGIC
// ==========================================

export async function resolveLanguage(): Promise<Language> {
    const supabase = await createClient()

    // 1. Check User Preference (Super Admin Consistency)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('language_preference')
            .eq('id', user.id)
            .single()

        if (profile?.language_preference) {
            return profile.language_preference as Language
        }
    }

    // 2. Check Organization Setting (Vertical Isolation)
    const orgId = await getCurrentOrganizationId()
    if (orgId) {
        const { data: settings } = await supabase
            .from('organization_settings')
            .select('default_language')
            .eq('organization_id', orgId)
            .single()

        if (settings?.default_language) {
            return settings.default_language as Language
        }
    }

    // 3. Fallback
    return 'es' // Default to Spanish as requested
}

export async function getDictionary(lang?: Language) {
    const resolvedLang = lang || await resolveLanguage()
    return dictionaries[resolvedLang] || dictionaries.es
}
