import { QuoteBuilder } from "@/modules/core/quotes/quote-builder"
import { getActiveEmitters } from "@/modules/core/settings/emitters-actions"

export default async function CreateQuotePage() {
    const emitters = await getActiveEmitters()

    return (
        <div className="-m-8">
            <div className="p-8 bg-white min-h-screen">
                <QuoteBuilder emitters={emitters} />
            </div>
        </div>
    )
}
