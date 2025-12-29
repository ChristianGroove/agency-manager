"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { InvoiceTemplate } from "@/modules/verticals/agency/invoicing/invoice-template"
import { Loader2, Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Toaster } from "sonner"

export default function PublicInvoicePage() {
    const params = useParams()
    const id = params?.id as string
    const [invoice, setInvoice] = useState<any>(null)
    const [settings, setSettings] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchInvoice = async () => {
            if (!id) return

            try {
                // Use Server Action to fetch data securely bypassing RLS
                const { getPublicInvoice } = await import("@/lib/actions/public-invoices")
                const result = await getPublicInvoice(id)

                if (result.error) {
                    throw new Error(result.error)
                }

                setInvoice(result.invoice)
                setSettings(result.settings)
            } catch (err: any) {
                console.error("Error loading invoice:", err)
                setError("No se pudo cargar la factura. Es posible que el enlace no sea válido o haya expirado.")
            } finally {
                setLoading(false)
            }
        }

        fetchInvoice()
    }, [id])

    const handlePrint = () => {
        window.print()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        )
    }

    if (error || !invoice) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="text-center max-w-md">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
                    <p className="text-gray-600 mb-6">{error || "Factura no encontrada"}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4 print:p-0 print:bg-white">
            <Toaster position="top-center" />

            {/* Action Bar - Hidden when printing */}
            <div className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center pointer-events-none print:hidden z-50">
                <div className="bg-white/90 backdrop-blur shadow-sm border border-gray-200 rounded-full px-4 py-2 pointer-events-auto">
                    <p className="text-xs font-medium text-gray-600">
                        Vista Previa de Factura
                    </p>
                </div>
                <div className="flex gap-2 pointer-events-auto">
                    <Button
                        onClick={handlePrint}
                        className="bg-black text-white hover:bg-gray-800 shadow-lg rounded-full"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir / Guardar PDF
                    </Button>
                </div>
            </div>

            {/* Centered Invoice */}
            <div className="flex justify-center print:block print:w-full">
                <InvoiceTemplate
                    invoice={invoice}
                    settings={settings}
                />
            </div>

            {/* Print Styles for clean output */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: letter;
                        margin: 0;
                    }
                    body {
                        background: white;
                    }
                    /* Hide everything that isn't the invoice template (though structured layout usually handles this) */
                }
            `}</style>
        </div>
    )
}
