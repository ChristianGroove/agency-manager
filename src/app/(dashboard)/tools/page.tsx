import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { getEffectiveBranding } from "@/modules/core/branding/actions"
import { ToolsView } from "@/modules/core/tools/components/tools-view"
import { getSettings } from "@/modules/core/settings/actions"
import { BrandingConfig } from "@/types/branding"

export const metadata = {
    title: "Herramientas",
    description: "Utilidades para tu agencia"
}

export default async function ToolsPage() {
    const orgId = await getCurrentOrganizationId()
    const branding = await getEffectiveBranding(orgId)

    return (
        <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
            <ToolsView initialSettings={branding} />
        </Suspense>
    )
}
