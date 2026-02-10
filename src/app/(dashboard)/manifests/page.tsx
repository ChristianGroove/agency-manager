
import { Metadata } from 'next'
import { getManifests } from '@/modules/custom/manifests/actions'
import { ManifestsDashboard } from '@/modules/custom/manifests/components/manifests-dashboard'
import { Sparkles, Wrench } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Manifiestos IMEI | Dannicel',
    description: 'Gestión y Búsqueda de Manifiestos de Carga',
}

export default async function ManifestsPage() {
    const manifests = await getManifests()

    return (
        <div className="flex flex-col gap-6 p-8">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-primary" />
                        Manifiestos IMEI
                    </h2>
                    <p className="text-muted-foreground">
                        Sube tus manifiestos en PDF y busca equipos por IMEI instantáneamente.
                    </p>
                </div>
            </div>

            <ManifestsDashboard initialDocs={manifests} />
        </div>
    )
}
