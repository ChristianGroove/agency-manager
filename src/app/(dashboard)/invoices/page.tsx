
import { getInvoices } from "@/modules/core/billing/invoices-actions"
import { BillingControlCenter } from "@/modules/verticals/agency/invoicing/components/billing-control-center"
import { Suspense } from "react"

export const metadata = {
    title: "Centro de Facturación",
    description: "Gestión centralizada de documentos y cumplimiento fiscal",
}

export default async function InvoicesPage() {
    const invoices = await getInvoices()

    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando Centro de Facturación...</div>}>
            <BillingControlCenter
                initialInvoices={invoices || []}
            />
        </Suspense>
    )
}
