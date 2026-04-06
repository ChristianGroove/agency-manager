import { ClientServicesList } from "../../../client-services-list"
import { Client } from "@/types"

interface ServicesTabProps {
    client: Client
    onEditService: (service: any) => void
    onDeleteService: (id: string) => void
    onPauseService: (id: string) => void
    onDetailService: (service: any) => void
}

export function ServicesTab({
    client,
    onEditService,
    onDeleteService,
    onPauseService,
    onDetailService
}: ServicesTabProps) {
    return (
        <div className="space-y-6 m-0 animate-in fade-in-50">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Servicios Activos</h3>
                    <p className="text-sm text-gray-500 font-medium">Gestiona suscripciones y servicios recurrentes del cliente.</p>
                </div>
            </div>
            
            <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-2 overflow-hidden">
                <ClientServicesList
                    services={client.services || []}
                    subscriptions={client.subscriptions || []}
                    onEdit={onEditService}
                    onDelete={onDeleteService}
                    onPause={onPauseService}
                    onDetail={onDetailService}
                />
            </div>
        </div>
    )
}
