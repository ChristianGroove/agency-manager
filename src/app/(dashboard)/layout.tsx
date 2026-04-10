import { getDashboardTemplate } from "@/components/portals/portal-registry"
import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { getCurrentOrganizationId, getCurrentOrgDetails } from "@/modules/core/organizations/organization-actions"
import { resolveOrgCapabilities } from "@/modules/core/organizations/space-helpers"
import { isSuperAdmin } from "@/lib/auth/platform-roles"
import { getSettings } from "@/modules/core/settings/settings-actions"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { I18nProvider } from "@/lib/i18n/context"
import { Locale } from "@/lib/i18n/dictionaries"

import { getCurrentOrganizationApp } from "@/modules/core/saas/app-data-actions"
import { getActiveModules } from "@/modules/core/saas/saas-actions"
import { getOrganizationSubscription } from "@/modules/features/billing/billing-actions"
import { SaaSProvider } from "@/components/providers/saas-provider"
import { SuspendedDashboardView } from "@/modules/core/organizations/components/dashboard/SuspendedDashboardView"
import { SidebarLoader } from "@/components/layout/sidebar-loader"
import { Suspense } from "react"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    // 1. Fetch User First
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        console.error("âŒ [LAYOUT] Auth Error details:", {
            error: authError,
            user: user ? 'User exists' : 'User is null'
        })
        redirect('/login')
    }

    // 2. PARALLEL FETCH: All critical data including subscription, app and template metadata
    const [currentOrgId, orgDetails, settings, isAdmin, appResult, subscription, activeModules] = await Promise.all([
        getCurrentOrganizationId(),
        getCurrentOrgDetails(),
        getSettings(),
        isSuperAdmin(user.id),
        getCurrentOrganizationApp(),
        getOrganizationSubscription(),
        getActiveModules()
    ])

    const uiConfig = currentOrgId ? await resolveOrgCapabilities(currentOrgId) : null

    // LÃ³gica de SuspensiÃ³n (Canceled / Unpaid)
    // El SuperAdmin siempre tiene bypass
    const isSuspended = !isAdmin && (subscription?.status === 'canceled' || subscription?.status === 'unpaid')

    // Determinamos el Portal Template de forma eficiente
    // Si orgDetails tiene portal_template (vÃ­a join o precarga), lo usamos. 
    // Si no, b2b_dashboard es el default.
    const portalTemplateKey = orgDetails?.active_app?.portal_template || 'b2b_dashboard'

    const PortalLayoutComponent = getDashboardTemplate(portalTemplateKey)
    const locale = (settings?.default_language as Locale) || 'es'
    const dictionary = getDictionary(locale)

    return (
        <I18nProvider dict={dictionary} locale={locale}>
            <SaaSProvider initialData={{
                app: appResult?.app || null,
                subscription,
                orgDetails,
                uiConfig
            }}>
                <PortalLayoutComponent
                    user={user}
                    currentOrgId={currentOrgId}
                    isAdmin={isAdmin}
                    orgData={orgDetails}
                    activeModules={activeModules}
                    sidebarSlot={
                        <Suspense fallback={<div className="w-64 h-full bg-white/50 dark:bg-black/20 animate-pulse border-r" />}>
                            <SidebarLoader 
                                user={user} 
                                currentOrgId={currentOrgId} 
                                isSuperAdmin={isAdmin} 
                                activeModules={activeModules}
                            />
                        </Suspense>
                    }
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

