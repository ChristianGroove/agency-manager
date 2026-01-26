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

    // OPTIMIZED: Parallel fetch with minimal dependencies
    const [userResponse, currentOrgId] = await Promise.all([
        supabase.auth.getUser(),
        getCurrentOrganizationId()
    ])

    const { data: { user }, error: authError } = userResponse
    
    // Fetch settings separately since it doesn't block auth flow
    const settings = await getSettings()

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


    // OPTIMIZED: Parallel non-blocking fetches
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
