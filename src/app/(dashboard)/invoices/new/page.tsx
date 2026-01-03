"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CreateInvoiceSheet } from "@/modules/core/billing/components/create-invoice-sheet"
import { Loader2 } from "lucide-react"

export default function NewInvoicePage() {
    const router = useRouter()
    const [open, setOpen] = useState(true)

    // Redirect to list if sheet is closed
    useEffect(() => {
        if (!open) {
            router.push('/invoices')
        }
    }, [open, router])

    return (
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-gray-50">
            <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-300" />
                <p className="text-gray-500 font-medium">Abriendo editor de facturas...</p>
            </div>

            <CreateInvoiceSheet
                open={open}
                onOpenChange={setOpen}
                onSuccess={() => router.push('/invoices')}
            />
        </div>
    )
}
