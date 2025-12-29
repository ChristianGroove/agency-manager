
import { getInvoices } from "@/modules/core/billing/invoices-actions"
import { InvoicesView } from "@/modules/verticals/agency/invoicing/components/invoices-view"
import { Suspense } from "react"

export const metadata = {
    title: "Facturación",
    description: "Gestión de documentos de cobro",
}

export default async function InvoicesPage() {
    const invoices = await getInvoices()

    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando facturas...</div>}>
            <InvoicesView
                initialInvoices={invoices || []}
            />
        </Suspense>
    )
}
