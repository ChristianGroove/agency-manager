
import { getQuotes } from "@/modules/core/quotes/actions"
import { getActiveEmitters } from "@/modules/core/settings/emitters-actions" // Secure import
import { createClient } from "@/lib/supabase-server"
import { QuotesView } from "@/modules/core/quotes/components/quotes-view"
import { Suspense } from "react"

export const metadata = {
    title: "Cotizaciones",
    description: "Gestión de propuestas comerciales",
}

// Local helper removed in favor of imported action for security


export default async function QuotesPage() {
    // Parallel fetching for performance
    const [quotes, emitters] = await Promise.all([
        getQuotes(),
        getActiveEmitters()
    ])

    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando cotizaciones...</div>}>
            <QuotesView
                initialQuotes={quotes || []}
                initialEmitters={emitters}
            />
        </Suspense>
    )
}
