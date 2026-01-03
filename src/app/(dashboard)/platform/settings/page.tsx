import { Suspense } from "react"
import { SettingsForm } from "@/modules/core/settings/settings-form"
import { getSettings } from "@/modules/core/settings/actions"
import { getOrganizationModules, getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { getSubscriptionApp } from "@/modules/core/catalog/actions"
import { Loader2 } from "lucide-react"

export const metadata = {
    title: "Configuración",
    description: "Gestiona la configuración de tu organización",
}

export default async function SettingsPage() {
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        return <div>Error: Organización no encontrada</div>
    }

    // Fetch data in parallel
    const [settings, activeModules, subscriptionApp] = await Promise.all([
        getSettings(),
        getOrganizationModules(orgId),
        getSubscriptionApp()
    ])

    return (
        <div className="space-y-6">
            <Suspense fallback={<SettingsLoading />}>
                <SettingsForm
                    initialSettings={settings || {}}
                    activeModules={activeModules || []}
                    subscriptionApp={subscriptionApp}
                />
            </Suspense>
        </div>
    )
}

function SettingsLoading() {
    return (
        <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    )
}
