
import { WorkOrdersDashboard } from "@/modules/core/work-orders/components/universal/work-orders-dashboard"

export const metadata = {
    title: "Operaciones | Work Orders",
    description: "Gestión de órdenes de trabajo y operaciones.",
}

export default function WorkOrdersPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6 h-full overflow-hidden">
            <WorkOrdersDashboard />
        </div>
    )
}
