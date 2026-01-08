import { Metadata } from "next"
import { RoleManager } from "@/modules/core/iam/components/role-manager"
import { getOrganizationRoles } from "@/modules/core/iam/services/role-service"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { hasPermission } from "@/modules/core/iam/services/role-service"
import { PERMISSIONS } from "@/modules/core/iam/permissions"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

export const metadata: Metadata = {
    title: "Role Management",
    description: "Manage organization roles and permissions",
}

export default async function RolesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const currentOrgId = await getCurrentOrganizationId()

    if (!user || !currentOrgId) {
        redirect("/auth/login")
    }

    // 1. Security Check
    const canView = await hasPermission(PERMISSIONS.ORG.MANAGE_ROLES)

    if (!canView) {
        redirect("/platform/settings")
    }

    // 2. Data Fetching
    const roles = await getOrganizationRoles()

    return (
        <DashboardShell user={user} currentOrgId={currentOrgId} isSuperAdmin={false}>
            <div className="flex items-center justify-between px-2 mb-6">
                <div className="grid gap-1">
                    <h1 className="font-heading text-3xl md:text-4xl">Roles & Permissions</h1>
                    <p className="text-lg text-muted-foreground">Manage access control and assign permissions to custom roles.</p>
                </div>
            </div>

            <div className="mt-6">
                <RoleManager initialRoles={roles} />
            </div>
        </DashboardShell>
    )
}
