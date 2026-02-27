import { DashboardShell } from "@/components/layout/dashboard-shell"
import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { getCurrentOrganizationId, getCurrentOrgDetails } from "@/modules/core/organizations/actions"
import { getActiveModules } from "@/modules/core/saas/actions"
import { isSuperAdmin } from "@/lib/auth/platform-roles"
import { SystemAlertBanner } from "@/components/layout/system-alert-banner"
import { Suspense } from "react"
import { GlobalLoader } from "@/components/ui/global-loader"
import { GlobalInboxProvider } from "@/modules/core/messaging/context/global-inbox-context"
import { InboxOverlay } from "@/modules/core/messaging/components/floating-inbox/inbox-overlay"
import { GlobalMessageListener } from "@/modules/core/messaging/components/floating-inbox/global-message-listener"
import { FabController } from "@/components/layout/fab-controller"
import { SidebarLoader } from "@/components/layout/sidebar-loader"
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
            <DashboardShell
                user={user}
                currentOrgId={currentOrgId}
                isSuperAdmin={isAdmin}
                sidebarSlot={
                    <Suspense fallback={<div className="w-64 h-full bg-white/50 dark:bg-black/20 animate-pulse border-r" />}>
                        <SidebarLoader />
                    </Suspense>
                }
            >
                <GlobalInboxProvider>
                    <GlobalMessageListener />
                    <InboxOverlay />
                    <FabController orgSlug={orgDetails?.slug} />
                    <SystemAlertBanner />
                    <Suspense fallback={<GlobalLoader />}>
                        {children}
                    </Suspense>
                </GlobalInboxProvider>
            </DashboardShell>
        </I18nProvider>
    )
}
