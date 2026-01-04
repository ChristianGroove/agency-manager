import { Wrench } from "lucide-react"

export default function WorkOrdersPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
            <div className="bg-gray-100 p-6 rounded-full mb-6">
                <Wrench className="h-12 w-12 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Módulo de Órdenes de Trabajo Deshabilitado</h1>
            <p className="text-gray-500 max-w-md mx-auto">
                Esta sección está temporalmente fuera de servicio por mantenimiento y mejoras en la arquitectura.
                Las funcionalidades principales volverán a estar disponibles pronto.
            </p>
        </div>
    )
}
