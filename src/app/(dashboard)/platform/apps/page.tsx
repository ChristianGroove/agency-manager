import { AppStoreCanvas } from "@/modules/core/apps/components/app-store-canvas"
import { Grid } from "lucide-react"

export const metadata = {
    title: "App Store Marketplace",
    description: "Explora y activa módulos para potenciar tu organización",
}

export default function AppStorePage() {
    return (
        <div className="h-full flex flex-col p-6 space-y-6">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <Grid className="w-6 h-6" />
                        </div>
                        App Store & Addons
                    </h1>
                    <p className="text-muted-foreground ml-12">
                        Construye tu ecosistema ideal activando los módulos que necesitas.
                    </p>
                </div>
            </div>

            <AppStoreCanvas />
        </div>
    )
}
