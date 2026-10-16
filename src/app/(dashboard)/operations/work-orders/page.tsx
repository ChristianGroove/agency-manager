
import { WorkOrdersDashboard } from "@/modules/features/work-orders/components/universal/work-orders-dashboard"
import { hasPermission } from "@/modules/core/iam/services/role-service"
import { PERMISSIONS } from "@/modules/core/iam/actions/permissions"
import { redirect } from "next/navigation"

export const metadata = {
    title: "Operaciones | Work Orders",
    description: "Gestión de órdenes de trabajo y operaciones.",
}

export default async function WorkOrdersPage() {
    if (!await hasPermission(PERMISSIONS.WORK_ORDERS.VIEW)) {
        redirect("/dashboard?error=unauthorized")
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 h-full overflow-hidden">
            <WorkOrdersDashboard />
        </div>
    )
}

