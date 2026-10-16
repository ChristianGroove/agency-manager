import { getInvoices } from "@/modules/features/billing/billing-actions"
import { BillingControlCenter } from "@/modules/features/billing/components/billing-control-center"
import { hasPermission } from "@/modules/core/iam/services/role-service"
import { PERMISSIONS } from "@/modules/core/iam/actions/permissions"
import { redirect } from "next/navigation"
import { Suspense } from "react"

export const metadata = {
    title: "Centro de Facturación",
    description: "Gestión centralizada de documentos y cumplimiento fiscal",
}

export default async function InvoicesPage() {
    if (!await hasPermission(PERMISSIONS.INVOICING.VIEW)) {
        redirect('/dashboard?error=unauthorized')
    }

    const invoices = await getInvoices()

    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando Centro de Facturación...</div>}>
            <BillingControlCenter
                initialInvoices={invoices || []}
            />
        </Suspense>
    )
}
