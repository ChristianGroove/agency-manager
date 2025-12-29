import { DashboardShell } from "@/components/layout/dashboard-shell"
import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { isSuperAdmin } from "@/lib/auth/platform-roles"
import { SystemAlertBanner } from "@/components/layout/system-alert-banner"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        console.error("❌ [LAYOUT] Auth Error details:", {
            error: authError,
            user: user ? 'User exists' : 'User is null'
        })
        redirect('/login')
    }

    const currentOrgId = await getCurrentOrganizationId()
    const isAdmin = await isSuperAdmin(user.id)

    // Key forces a complete remount of the shell when organization changes,
    // solving the "stale UI" issue without needing a full browser reload.
    return (
        <DashboardShell key={currentOrgId} user={user} currentOrgId={currentOrgId} isSuperAdmin={isAdmin}>
            <SystemAlertBanner />
            {children}
        </DashboardShell>
    )
}
