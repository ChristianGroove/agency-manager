
import { getQuotes } from "@/modules/verticals/agency/quotes/actions"
import { createClient } from "@/lib/supabase-server"
import { QuotesView } from "@/modules/verticals/agency/quotes/components/quotes-view"
import { Suspense } from "react"

export const metadata = {
    title: "Cotizaciones",
    description: "Gestión de propuestas comerciales",
}

async function getActiveEmitters() {
    const supabase = await createClient()
    const { data } = await supabase.from('emitters').select('*').eq('is_active', true)
    return data || []
}

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
