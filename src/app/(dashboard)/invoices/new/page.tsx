import { InvoiceForm } from "@/modules/verticals/agency/finance/invoice-form"

export default function NewInvoicePage() {
    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Generar Cuenta de Cobro</h2>
            </div>
            <InvoiceForm />
        </div>
    )
}
