import { ClientInvoicesList } from "../../../client-invoices-list"
import { Client } from "@/types"

interface BillingTabProps {
    client: Client
    onMarkPaid: (id: string) => void
    onShare: (invoice: any) => void
}

export function BillingTab({
    client,
    onMarkPaid,
    onShare
}: BillingTabProps) {
    return (
        <div className="space-y-6 m-0 animate-in fade-in-50">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Historial de Facturación</h3>
                    <p className="text-sm text-gray-500 font-medium">Consulta y gestiona todas las facturas emitidas para este cliente.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-4">
                <ClientInvoicesList
                    invoices={client.invoices || []}
                    onMarkPaid={onMarkPaid}
                    onShare={onShare}
                />
            </div>
        </div>
    )
}
