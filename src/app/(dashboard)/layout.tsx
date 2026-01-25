import { DashboardShell } from "@/components/layout/dashboard-shell"
import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { getActiveModules } from "@/modules/core/saas/actions"
import { isSuperAdmin } from "@/lib/auth/platform-roles"
import { SystemAlertBanner } from "@/components/layout/system-alert-banner"
import { Suspense } from "react"
import { GlobalLoader } from "@/components/ui/global-loader"
import { GlobalInboxProvider } from "@/modules/core/messaging/context/global-inbox-context"
import { InboxOverlay } from "@/modules/core/messaging/components/floating-inbox/inbox-overlay"
import { GlobalMessageListener } from "@/modules/core/messaging/components/floating-inbox/global-message-listener"
import MetaControlSheet from "@/components/meta/MetaControlSheet"
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

    // PERF: Parallel fetch of ALL initial data needed for dashboard
    const [userResponse, currentOrgId, settings] = await Promise.all([
        supabase.auth.getUser(),
        getCurrentOrganizationId(),
        getSettings()
    ])

    const { data: { user }, error: authError } = userResponse

    if (authError || !user) {
        console.error("❌ [LAYOUT] Auth Error details:", {
            error: authError,
            user: user ? 'User exists' : 'User is null'
        })
        redirect('/login')
    }

    // Determine Language & Load Dictionary
    // 1. Settings from DB
    // 2. Default to 'es'
    const locale = (settings?.default_language as Locale) || 'es'
    const dictionary = getDictionary(locale)


    // PERF: Fetch modules and admin status in parallel (after we have user/orgId)
    const [isAdmin, activeModules] = await Promise.all([
        isSuperAdmin(user.id),
        currentOrgId ? getActiveModules(currentOrgId) : Promise.resolve([])
    ])

    return (
        // Key forces a complete remount of the shell when organization changes,
        // solving the "stale UI" issue without needing a full browser reload.
        // WRAP with I18nProvider
        < I18nProvider
            dict={dictionary}
            locale={locale}
        >
            <DashboardShell
                key={currentOrgId}
                user={user}
                currentOrgId={currentOrgId}
                isSuperAdmin={isAdmin}
                prefetchedModules={activeModules}
            >
                <GlobalInboxProvider>
                    <GlobalMessageListener />
                    <InboxOverlay />
                    <MetaControlSheet />
                    <SystemAlertBanner />
                    <Suspense fallback={<GlobalLoader />}>
                        {children}
                    </Suspense>
                </GlobalInboxProvider>
            </DashboardShell>
        </I18nProvider >
    )
}
