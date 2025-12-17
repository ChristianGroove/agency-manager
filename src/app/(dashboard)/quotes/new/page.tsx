import { QuoteForm } from "@/components/modules/finance/quote-form"

export default function NewQuotePage() {
    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Generar Cotización</h2>
            </div>
            <QuoteForm />
        </div>
    )
}
