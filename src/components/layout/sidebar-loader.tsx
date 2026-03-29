import { Sidebar } from "./sidebar"
import { getSidebarContext } from "@/modules/core/saas/actions"
import { createClient } from "@/lib/supabase-server"
import { isSuperAdmin } from "@/lib/auth/platform-roles"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

export async function SidebarLoader({
    user,
    currentOrgId,
    isSuperAdmin: isAdmin,
    activeModules
}: {
    user: any,
    currentOrgId: string | null,
    isSuperAdmin: boolean,
    activeModules?: string[]
}) {
    // Parallel Fetching for Sidebar Data
    // We already have User, OrgId and Admin flag from Layout.
    const [sidebarContext, orgs] = await Promise.all([
        getSidebarContext(currentOrgId || undefined, user, activeModules),
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
