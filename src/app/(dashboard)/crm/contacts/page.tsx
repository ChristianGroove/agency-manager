import { getClients } from "@/modules/core/clients/actions"
import { getSettings } from "@/modules/core/settings/actions"
import { ClientsView } from "@/modules/core/clients/components/clients-view"
import { Suspense } from "react"

export const metadata = {
    title: "Contactos | CRM",
    description: "Gestión de cartera de clientes",
}

export default async function CRMContactsPage() {
    const [clients, settings] = await Promise.all([
        getClients(),
        getSettings()
    ])

    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando contactos...</div>}>
            <ClientsView
                initialClients={clients || []}
                initialSettings={settings}
            />
        </Suspense>
    )
}
