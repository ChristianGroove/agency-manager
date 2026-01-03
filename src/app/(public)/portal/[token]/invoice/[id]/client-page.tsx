"use client"

import { InvoiceTemplate } from "@/modules/core/billing/invoice-template"
import { Printer } from "lucide-react"

interface ClientPageProps {
    invoice: any
    settings: any
}

export function PortalInvoiceClientPage({ invoice, settings }: ClientPageProps) {
    return (
        <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center print:p-0 print:bg-white">
            {/* Global Print Styles - Safe in Client Component */}
            {/* Global Print Styles - Safe in Client Component */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { margin: 0; size: auto; }
                    body { margin: 0; padding: 0; }
                }
            `}} />

            {/* Floating Print Button */}
            <div className="fixed bottom-8 right-8 print:hidden z-[9999]">
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.print();
                    }}
                    className="shadow-xl bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-4 h-auto text-lg gap-2 flex items-center transition-transform active:scale-95 cursor-pointer"
                >
                    <Printer className="h-5 w-5" />
                    <span>Imprimir / Guardar PDF</span>
                </button>
            </div>

            {/* Invoice Container - Scaled for Print */}
            <div className="w-full max-w-[816px] bg-white shadow-xl print:shadow-none print:w-full print:max-w-none print:m-0 print:scale-[0.98] origin-top">
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
