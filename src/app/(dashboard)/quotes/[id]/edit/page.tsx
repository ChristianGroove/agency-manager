"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { QuoteEditor } from "@/modules/verticals/agency/quotes/quote-editor"
import { supabase } from "@/lib/supabase"
import { Quote } from "@/types"
import { Loader2 } from "lucide-react"

export default function EditQuotePage() {
    const params = useParams()
    const [quote, setQuote] = useState<Quote | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (params.id) {
            fetchQuote(params.id as string)
        }
    }, [params.id])

    const fetchQuote = async (id: string) => {
        try {
            const { data, error } = await supabase
                .from('quotes')
                .select(`
                    *,
                    client:clients (*),
                    lead:leads (*)
                `)
                .eq('id', id)
                .single()

            if (error) throw error
            setQuote(data)
        } catch (error) {
            console.error("Error fetching quote:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-pink" />
        </div>
    }

    if (!quote) {
        return <div className="min-h-screen flex items-center justify-center">Cotización no encontrada</div>
    }

    return (
        <div className="container max-w-4xl mx-auto py-10">
            <QuoteEditor quote={quote} />
        </div>
    )
}
