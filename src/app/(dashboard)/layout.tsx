import { getDashboardTemplate } from "@/components/portals/portal-registry"
import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { getCurrentOrganizationId, getCurrentOrgDetails } from "@/modules/core/organizations/actions"
import { isSuperAdmin } from "@/lib/auth/platform-roles"
import { getSettings } from "@/modules/core/settings/actions"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { I18nProvider } from "@/lib/i18n/context"
import { Locale } from "@/lib/i18n/dictionaries"

import { getCurrentOrganizationApp } from "@/modules/core/saas/app-data-actions"
import { getOrganizationSubscription } from "@/modules/core/billing/billing-actions"
import { SaaSProvider } from "@/components/providers/saas-provider"
import { SuspendedDashboardView } from "@/components/dashboard/SuspendedDashboardView"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    // 1. Fetch User First
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        console.error("❌ [LAYOUT] Auth Error details:", {
            error: authError,
            user: user ? 'User exists' : 'User is null'
        })
        redirect('/login')
    }

    // 2. PARALLEL FETCH: All critical data including subscription and app
    const [currentOrgId, orgDetails, settings, isAdmin, appResult, subscription] = await Promise.all([
        getCurrentOrganizationId(),
        getCurrentOrgDetails(),
        getSettings(),
        isSuperAdmin(user.id),
        getCurrentOrganizationApp(),
        getOrganizationSubscription()
    ])

    // Lógica de Suspensión (Canceled / Unpaid)
    // El SuperAdmin siempre tiene bypass
    const isSuspended = !isAdmin && (subscription?.status === 'canceled' || subscription?.status === 'unpaid')

    // ... Correct layout detection basándose en el "Space" actual
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

    const PortalLayoutComponent = getDashboardTemplate(portalTemplateKey)
    const locale = (settings?.default_language as Locale) || 'es'
    const dictionary = getDictionary(locale)

    return (
        <I18nProvider dict={dictionary} locale={locale}>
            <SaaSProvider initialData={{
                app: appResult?.app || null,
                subscription,
                orgDetails
            }}>
                <PortalLayoutComponent
                    user={user}
                    currentOrgId={currentOrgId}
                    isAdmin={isAdmin}
                    orgData={orgDetails}
                >
                    {isSuspended ? (
                        <SuspendedDashboardView />
                    ) : (
                        children
                    )}
                </PortalLayoutComponent>
            </SaaSProvider>
        </I18nProvider>
    )
}
