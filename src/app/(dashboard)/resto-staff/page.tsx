import { Suspense } from "react"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { getSidebarContext } from "@/modules/core/saas/saas-actions"
import { hasPermission } from "@/modules/core/iam/services/role-service"
import { PERMISSIONS } from "@/modules/core/iam/actions/permissions"
import { getZonesAndTables } from "@/modules/features/resto/tables/actions"
import { RestoStaffPageContainer } from "@/modules/features/resto-orders/components/resto-staff-page-container"
import { GlobalLoader } from "@/components/ui/global-loader"

export const metadata: Metadata = {
    title: "Personal Operativo | Pixy",
    description: "Gestión de colaboradores operativos, asignación de zonas, PINs y enlaces de acceso a portales.",
}

export default async function RestoStaffPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const orgId = await getCurrentOrganizationId()
    if (!orgId) redirect("/setup/wizard")

    // Security: Module + Role guard (IAM V2)
    const { modules: activeModules, organizationType, userRole, capabilities } = await getSidebarContext(orgId)
    const normalizedRole = userRole?.toLowerCase()
    const isOwner = normalizedRole === 'owner' || normalizedRole === 'dueño' || capabilities?.all === true
    const isOwnerBypass = isOwner && organizationType === 'platform'

    if (!activeModules.includes('module_resto_staff') && !activeModules.includes('module_resto_orders') && !isOwnerBypass) {
        redirect('/dashboard?error=unauthorized_module')
    }

    const canView = await hasPermission(PERMISSIONS.OPERATIONS.RESTO_STAFF_VIEW)
    if (!canView) {
        redirect('/dashboard?error=unauthorized_role')
    }

    const { zones } = await getZonesAndTables(orgId)

    return (
        <Suspense fallback={<GlobalLoader />}>
            <RestoStaffPageContainer orgId={orgId} zones={zones || []} />
        </Suspense>
    )
}
