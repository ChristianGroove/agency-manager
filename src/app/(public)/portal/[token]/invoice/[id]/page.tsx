import { getPortalInvoice, getPortalMetadata } from "@/modules/core/portal/actions"
import { notFound } from "next/navigation"
import { InvoiceTemplate } from "@/modules/verticals/agency/invoicing/invoice-template"
import { Printer } from "lucide-react"

interface PageProps {
    params: {
        token: string
        id: string
    }
}

export default async function PortalInvoicePrintPage({ params }: PageProps) {
    const { token, id } = await params
    let invoice
    let settings

    try {
        invoice = await getPortalInvoice(token, id)
        settings = await getPortalMetadata(token)
    } catch (error) {
        console.error(error)
        notFound()
    }

    if (!invoice) return notFound()

    return (
        <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
            {/* Floating Print Button */}
            <div className="fixed bottom-8 right-8 print:hidden z-50">
                <button
                    id="print-btn"
                    className="shadow-xl bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-4 h-auto text-lg gap-2 flex items-center transition-transform active:scale-95"
                >
                    <Printer className="h-5 w-5" />
                    Imprimir / Guardar PDF
                </button>
                {/* Inline script for actual click handler since onClick above is limited in Server Component */}
                <script dangerouslySetInnerHTML={{
                    __html: `
document.getElementById('print-btn').addEventListener('click', () => window.print());
`}} />
            </div>

            <div className="w-full max-w-[816px] bg-white shadow-xl print:shadow-none print:w-full print:max-w-none">
                <InvoiceTemplate
                    invoice={invoice}
                    settings={settings}
                />
            </div>
            <div className="mt-8 text-gray-400 text-sm print:hidden">
                Vista previa de impresión
            </div>
        </div>
    )
}
