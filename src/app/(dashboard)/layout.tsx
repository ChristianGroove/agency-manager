import { DashboardShell } from "@/components/layout/dashboard-shell"
import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { isSuperAdmin } from "@/lib/auth/platform-roles"
import { SystemAlertBanner } from "@/components/layout/system-alert-banner"
import { Suspense } from "react"
import { GlobalLoader } from "@/components/ui/global-loader"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    // Parallel fetch: User Auth AND Current Org ID
    // Note: getCurrentOrganizationId hits cookies first (fast), if fallback hits DB it runs parallel with Auth
    const [userResponse, currentOrgId] = await Promise.all([
        supabase.auth.getUser(),
        getCurrentOrganizationId()
    ])

    const { data: { user }, error: authError } = userResponse

    if (authError || !user) {
        console.error("❌ [LAYOUT] Auth Error details:", {
            error: authError,
            user: user ? 'User exists' : 'User is null'
        })
        redirect('/login')
    }

    const isAdmin = await isSuperAdmin(user.id)

    // Key forces a complete remount of the shell when organization changes,
    // solving the "stale UI" issue without needing a full browser reload.
    return (
        <DashboardShell key={currentOrgId} user={user} currentOrgId={currentOrgId} isSuperAdmin={isAdmin}>
            <SystemAlertBanner />
            <Suspense fallback={<GlobalLoader />}>
                {children}
            </Suspense>
        </DashboardShell>
    )
}
