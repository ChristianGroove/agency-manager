import { Suspense } from "react"
import { SettingsForm } from "@/modules/core/settings/settings-form"
import { getSettings } from "@/modules/core/settings/actions"
import { getEffectiveBranding } from "@/modules/core/branding/actions"
import { getCurrentBrandingTier } from "@/modules/core/branding/tier-actions"
import { getOrganizationModules, getCurrentOrganizationId, getOrganizationCardDetails } from "@/modules/core/organizations/actions"
import { getSubscriptionApp } from "@/modules/core/catalog/actions"
import { getCurrentOrgRole } from "@/lib/auth/org-roles"
import { Loader2 } from "lucide-react"

export const metadata = {
    title: "Configuración",
    description: "Gestiona la configuración de tu organización",
}


import { getSnapshots, getVaultConfig } from "@/modules/core/data-vault/actions"

export default async function SettingsPage() {
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        return <div>Error: Organización no encontrada</div>
    }

    const [settings, activeModules, subscriptionApp, brandingSettings, userRole, tierData, snapshots, vaultConfig, organization] = await Promise.all([
        getSettings(),
        getOrganizationModules(orgId),
        getSubscriptionApp(),
        getEffectiveBranding(orgId),
        getCurrentOrgRole(),
        getCurrentBrandingTier(),
        getSnapshots(),
        getVaultConfig(),
        getOrganizationCardDetails(orgId)
    ])

    const tierFeatures = tierData?.tier?.features || {}
    const isReseller = organization?.type === 'reseller'

    return (
        <div className="space-y-6">
            <Suspense fallback={<SettingsLoading />}>
                <SettingsForm
                    initialSettings={settings || {}}
                    brandingSettings={brandingSettings}
                    activeModules={activeModules || []}
                    subscriptionApp={subscriptionApp}
                    userRole={userRole || 'member'}
                    tierFeatures={tierFeatures}
                    snapshots={snapshots}
                    vaultConfig={vaultConfig || { enabled: false, frequency: 'weekly' }}
                    organizationId={orgId}
                    isReseller={isReseller}
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

