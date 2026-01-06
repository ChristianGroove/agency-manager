import { Grid } from "lucide-react"

export const metadata = {
    title: "Store",
    description: "Explora módulos para tu organización",
}

export default function StorePage() {
    return (
        <div className="h-full flex flex-col p-6 space-y-6">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <Grid className="w-6 h-6" />
                        </div>
                        Store
                    </h1>
                    <p className="text-muted-foreground ml-12">
                        Próximamente...
                    </p>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <div className="text-center space-y-2">
                    <Grid className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-slate-500 font-medium">Store en construcción</p>
                </div>
            </div>
        </div>
    )
}
