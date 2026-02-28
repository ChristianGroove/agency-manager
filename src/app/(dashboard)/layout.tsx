import { getPortalTemplate } from "@/components/portals/portal-registry"
import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { getCurrentOrganizationId, getCurrentOrgDetails } from "@/modules/core/organizations/actions"
import { isSuperAdmin } from "@/lib/auth/platform-roles"
import { getSettings } from "@/modules/core/settings/actions"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { I18nProvider } from "@/lib/i18n/context"
import { Locale } from "@/lib/i18n/dictionaries"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    // 1. Fetch User First (Required for auth check and subsequent queries)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        console.error("❌ [LAYOUT] Auth Error details:", {
            error: authError,
            user: user ? 'User exists' : 'User is null'
        })
        redirect('/login')
    }

    // 2. PARALLEL FETCH: Now that we have the user, fetch everything else simultaneously.
    // getCurrentOrganizationId is wrapped in React cache() so it won't duplicate DB calls.
    const [currentOrgId, orgDetails, settings, isAdmin] = await Promise.all([
        getCurrentOrganizationId(),
        getCurrentOrgDetails(),
        getSettings(),
        isSuperAdmin(user.id)
    ])

    // 3. Obtener el layout correcto basándose en el "Space" actual
    let portalTemplateKey = 'b2b_dashboard'
    if (orgDetails?.active_app_id) {
        const { data: appData } = await supabase
            .from('saas_apps')
            .select('portal_template')
            .eq('id', orgDetails.active_app_id)
            .single()

        if (appData?.portal_template) {
            portalTemplateKey = appData.portal_template
        }
    }

    // 4. Instanciar la plantilla dinámicamente
    const PortalLayoutComponent = getPortalTemplate(portalTemplateKey)

    // Determine Language & Load Dictionary (Default to 'es')
    const locale = (settings?.default_language as Locale) || 'es'
    const dictionary = getDictionary(locale)

    return (
        // Key forces a complete remount of the shell when organization changes,
        // solving the "stale UI" issue without needing a full browser reload.
        // WRAP with I18nProvider
        <I18nProvider
            dict={dictionary}
            locale={locale}
        >
            <PortalLayoutComponent
                user={user}
                currentOrgId={currentOrgId}
                isAdmin={isAdmin}
                orgData={orgDetails}
            >
                {children}
            </PortalLayoutComponent>
        </I18nProvider>
    )
}
