import { getCurrentOrganizationId, getCurrentOrgDetails } from "@/modules/core/organizations/organization-actions"
import { getSidebarContext } from "@/modules/core/saas/saas-actions"
import { hasPermission } from "@/modules/core/iam/services/role-service"
import { PERMISSIONS } from "@/modules/core/iam/actions/permissions"
import { redirect } from "next/navigation"
import { getRestoOrders, getGroupedOrders } from "@/modules/features/resto-orders/actions"
import { getZonesAndTables } from "@/modules/features/resto/tables/actions"
import { RestoOrdersViewManager } from "@/modules/features/resto-orders/components/resto-orders-view-manager"

export default async function RestoOrdersPage() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return <div>Unauthorized</div>

    const orgDetails = await getCurrentOrgDetails(orgId)
    const orgSlug = orgDetails?.slug || orgId

    const { modules: activeModules, organizationType, userRole, capabilities } = await getSidebarContext(orgId)
    
    const normalizedRole = userRole?.toLowerCase()
    const isOwner = normalizedRole === 'owner' || normalizedRole === 'dueño' || capabilities?.all === true
    const isOwnerBypass = isOwner && organizationType === 'platform'

    if (!activeModules.includes('module_resto_orders') && !isOwnerBypass) {
        redirect('/dashboard?error=unauthorized_module')
    }

    // IAM V2: Granular permission check (supports custom roles)
    const canView = await hasPermission(PERMISSIONS.OPERATIONS.RESTO_ORDERS_VIEW)
    if (!canView) {
        redirect('/dashboard?error=unauthorized_role')
    }

    const [orders, groupedOrders, { zones, tables }] = await Promise.all([
        getRestoOrders(),
        getGroupedOrders(),
        getZonesAndTables(orgId)
    ])

    return (
        <div className="w-full h-full flex flex-col space-y-6 min-h-[calc(100vh-8rem)] pb-20">
            {/* View Manager (Tabs, Map, List, Editor, KDS) */}
            <RestoOrdersViewManager 
                orders={orders} 
                groupedOrders={groupedOrders}
                zones={zones} 
                tables={tables} 
                orgId={orgId} 
                orgSlug={orgSlug}
            />
        </div>
    )
}
