import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { MarketplacePage } from "@/modules/core/integrations/marketplace/components/marketplace-page"
import { getMarketplaceProviders, getInstalledIntegrations } from "@/modules/core/integrations/marketplace/actions"

export default async function Page() {
    const [providers, installed] = await Promise.all([
        getMarketplaceProviders(),
        getInstalledIntegrations()
    ])

    return (
        <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
            <MarketplacePage
                providers={providers}
                installedIntegrations={installed}
            />
        </Suspense>
    )
}
