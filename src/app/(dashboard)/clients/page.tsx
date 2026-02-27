import { getPaginatedClients } from "@/modules/core/clients/actions"
import { getSettings } from "@/modules/core/settings/actions"
import { ClientsView } from "@/modules/core/clients/components/clients-view"
import { GrowthEcosystemShell } from "@/modules/core/layout/growth-ecosystem-shell"
import { Suspense } from "react"

export const metadata = {
    title: "Clientes",
    description: "Gestión de cartera de clientes",
}

export default async function ClientsPage({
    searchParams
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1
    const search = typeof searchParams.search === 'string' ? searchParams.search : ''
    const filter = typeof searchParams.filter === 'string' ? searchParams.filter : 'all'

    // Parallel data fetching for maximum performance
    const [paginatedData, settings] = await Promise.all([
        getPaginatedClients(page, 50, search, filter),
        getSettings()
    ])

    return (
        <GrowthEcosystemShell>
            <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando clientes...</div>}>
                <ClientsView
                    initialData={paginatedData}
                    initialSettings={settings}
                    currentPage={page}
                    currentSearch={search}
                    currentFilter={filter}
                />
            </Suspense>
        </GrowthEcosystemShell>
    )
}
