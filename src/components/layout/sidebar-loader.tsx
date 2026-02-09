import { Sidebar } from "./sidebar"
import { getSidebarContext } from "@/modules/core/saas/actions"
import { createClient } from "@/lib/supabase-server"
import { isSuperAdmin } from "@/lib/auth/platform-roles"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

export async function SidebarLoader() {
    // Parallel Fetching for Sidebar Data
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // We need currentOrgId to fetch context. 
    // Optimization: We could pass it if we already had it in layout,
    // but fetching here isolates the data requirements.
    // getCurrentOrganizationId uses cache() so it's cheap if already called.
    const currentOrgId = await getCurrentOrganizationId()

    const [sidebarContext, isAdmin, orgs] = await Promise.all([
        getSidebarContext(currentOrgId || undefined, user),
        user ? isSuperAdmin(user.id) : false,
        import("@/modules/core/organizations/actions").then(mod => mod.getUserOrganizations())
    ])

    return (
        <Sidebar
            currentOrgId={currentOrgId}
            user={user}
            isSuperAdmin={isAdmin}
            sidebarContext={sidebarContext}
            orgCount={orgs.length}
        />
    )
}
