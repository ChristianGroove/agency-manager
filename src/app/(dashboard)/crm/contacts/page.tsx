import { getPaginatedClients } from "@/modules/core/clients/actions"
import { getSettings } from "@/modules/core/settings/actions"
import { getCurrentOrgDetails } from "@/modules/core/organizations/actions"
import { ClientsView } from "@/modules/core/clients/components/clients-view"
import { Suspense } from "react"

export const metadata = {
    title: "Contactos | CRM",
    description: "Gestión de cartera de clientes",
}

export default async function CRMContactsPage({
    searchParams
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1
    const search = typeof searchParams.search === 'string' ? searchParams.search : ''
    const filter = typeof searchParams.filter === 'string' ? searchParams.filter : 'all'
    const orgData = await getCurrentOrgDetails()
    let spaceType = 'agency-workspace' // default
    if (orgData?.active_app_id) {
        const { createClient } = await import("@/lib/supabase-server")
        const supabase = await createClient()
        const { data: appData } = await supabase.from('saas_apps').select('slug').eq('id', orgData.active_app_id).single()
        if (appData?.slug) spaceType = appData.slug
    }

    const [paginatedData, settings] = await Promise.all([
        getPaginatedClients(page, 50, search, filter),
        getSettings()
    ])

    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando contactos...</div>}>
            <ClientsView
                initialData={paginatedData}
                initialSettings={settings}
                currentPage={page}
                currentSearch={search}
                currentFilter={filter}
                spaceType={spaceType}
            />
        </Suspense>
    )
}
