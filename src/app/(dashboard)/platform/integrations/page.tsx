import { Suspense } from "react"
import { IntegrationsGrid } from "@/components/integrations/integrations-grid"
import { getConnections } from "@/modules/core/integrations/actions"
import { Loader2 } from "lucide-react"

export default async function Page() {
    const result = await getConnections()

    // In a real app, handle error UI gracefully
    const connections = result.data || []

    return (
        <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
            <IntegrationsGrid initialConnections={connections} />
        </Suspense>
    )
}
