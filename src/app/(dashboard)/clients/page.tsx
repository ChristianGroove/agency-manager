
import { getClients } from "@/modules/core/clients/actions"
import { getSettings } from "@/modules/core/settings/actions"
import { ClientsView } from "@/modules/core/clients/components/clients-view"
import { GrowthEcosystemShell } from "@/modules/core/layout/growth-ecosystem-shell"
import { Suspense } from "react"

export const metadata = {
    title: "Clientes",
    description: "Gestión de cartera de clientes",
}

export default async function ClientsPage() {
    // Parallel data fetching for maximum performance
    const [clients, settings] = await Promise.all([
        getClients(),
        getSettings()
    ])

    return (
        <GrowthEcosystemShell>
            <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando clientes...</div>}>
                <ClientsView
                    initialClients={clients || []}
                    initialSettings={settings}
                />
            </Suspense>
        </GrowthEcosystemShell>
    )
}
