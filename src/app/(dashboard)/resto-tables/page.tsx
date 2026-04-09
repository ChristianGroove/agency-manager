import { RestoTablesCanvas } from '@/modules/features/resto/tables/components/resto-tables-canvas'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Info, Utensils } from 'lucide-react'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'
import { getZonesAndTables } from '@/modules/features/resto/tables/actions'
import { redirect } from 'next/navigation'

export default async function RestoTablesPage({
    searchParams
}: {
    searchParams: { dev?: string }
}) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) redirect('/dashboard')

    // Standby Guard: Only accessible via ?dev=true until officially launched
    const isDev = searchParams.dev === 'true'

    if (!isDev) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] p-6 text-center space-y-4 max-w-md mx-auto">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Utensils className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">GestiÃ³n de Mesas Interactivas</h1>
                <p className="text-muted-foreground">
                    Este mÃ³dulo se encuentra actualmente en <strong>Standby</strong> mientras finalizamos la integraciÃ³n de pedidos en vivo.
                </p>
                <div className="p-4 bg-muted rounded-lg text-sm text-left w-full">
                    <p className="font-semibold mb-2">Estado del MÃ³dulo:</p>
                    <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                        <li>Arquitectura de Salones: <span className="text-green-600 font-medium">Completada</span></li>
                        <li>DiseÃ±o de Mesas (Builder): <span className="text-green-600 font-medium">Completado</span></li>
                        <li>SincronizaciÃ³n de Pedidos: <span className="text-amber-600 font-medium">En cola</span></li>
                    </ul>
                </div>
                <p className="text-xs text-muted-foreground pt-4 italic">
                    Referencia: resto_tables_architecture_reference.md
                </p>
            </div>
        )
    }

    const { zones, tables, error } = await getZonesAndTables(orgId)

    return (
        <div className="flex flex-col flex-1 h-full w-full p-4 md:p-6 lg:p-8 space-y-4 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">GestiÃ³n de Salas y Mesas (Dev)</h1>
                    <p className="text-muted-foreground mt-1">
                        Controla el layout de tu restaurante en tiempo real. 
                    </p>
                </div>
            </div>

            <Alert className="bg-primary/5 text-primary border-primary/20">
                <Info className="h-4 w-4" />
                <AlertTitle>Fase Beta: Arquitectura Zero-Waste</AlertTitle>
                <AlertDescription>
                    Este mÃ³dulo utiliza un motor de renderizado asÃ­ncrono basado en DOM absoluto. 
                    En el modo <strong>Builder</strong> los cambios se guardan localmente para evitar consumo innecesario de base de datos.
                </AlertDescription>
            </Alert>

            <Card className="flex-1 overflow-hidden shadow-sm border-muted/60 p-1">
                <RestoTablesCanvas initialZones={zones} initialTables={tables} orgId={orgId} />
            </Card>
        </div>
    )
}

