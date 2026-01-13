import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { MarketplacePage } from "@/modules/core/integrations/marketplace/components/marketplace-page"
import { getMarketplaceProviders, getInstalledIntegrations } from "@/modules/core/integrations/marketplace/actions"
import { getAICredentials, getAIProviders } from "@/modules/core/ai-engine/actions"

export default async function Page() {
    const [providers, installed, aiCredentials, aiProviders] = await Promise.all([
        getMarketplaceProviders(),
        getInstalledIntegrations(),
        getAICredentials(),
        getAIProviders()
    ])

    return (
        <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
            <MarketplacePage
                providers={providers}
                installedIntegrations={installed}
                aiCredentials={aiCredentials}
                aiProviders={aiProviders}
            />
        </Suspense>
    )
}
