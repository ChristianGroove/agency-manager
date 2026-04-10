import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { MarketplacePage } from "@/modules/infrastructure/integrations/marketplace/components/marketplace-page"
import { getMarketplaceProviders, getInstalledIntegrations } from "@/modules/infrastructure/integrations/marketplace/marketplace-actions"
import { getAICredentials, getAIProviders } from "@/modules/infrastructure/ai-engine/actions"

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
