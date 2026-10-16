import { QuoteBuilder } from "@/modules/features/quotes/components/quote-builder"
import { getActiveEmitters } from "@/modules/core/settings/emitters-actions"
import { hasPermission } from "@/modules/core/iam/services/role-service"
import { PERMISSIONS } from "@/modules/core/iam/actions/permissions"
import { redirect } from "next/navigation"

export default async function CreateQuotePage() {
    if (!await hasPermission(PERMISSIONS.QUOTES.MANAGE)) {
        redirect('/quotes?error=unauthorized')
    }

    const emitters = await getActiveEmitters()

    return (
        <div className="-m-8">
            <div className="p-8 bg-white min-h-screen">
                <QuoteBuilder emitters={emitters} />
            </div>
        </div>
    )
}
