"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Quote } from "@/types"
import { QuoteTemplate } from "@/modules/core/quotes/quote-template"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getPublicQuote } from "@/modules/core/quotes/actions"

export default function PublicQuotePage() {
    const params = useParams()
    const [quote, setQuote] = useState<Quote | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        if (params.id) {
            loadQuote(params.id as string)
        }
    }, [params.id])

    const loadQuote = async (id: string) => {
        try {
            const result = await getPublicQuote(id)
            if (result.success && result.data) {
                setQuote(result.data)
            } else {
                setError(result.error || "No se pudo cargar la cotización")
            }
        } catch (err) {
            console.error(err)
            setError("Error al cargar la cotización")
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (error || !quote) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
                <p className="text-gray-500">{error || "Cotización no encontrada"}</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4 flex justify-center">
            <div className="w-full max-w-[800px]">
                <QuoteTemplate
                    quote={quote}
                    // Pass specific settings if needed, or QuoteTemplate handles it?
                    // QuoteTemplate usually needs 'settings' prop for branding.
                    // We need to fetch branding in getPublicQuote and return it.
                    settings={(quote as any).organization_settings}
                />
            </div>
        </div>
    )
}
