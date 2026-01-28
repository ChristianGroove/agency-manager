import { Grid } from "lucide-react"
import { SectionHeader } from "@/components/layout/section-header"

export const metadata = {
    title: "Store",
    description: "Explora módulos para tu organización",
}

export default function StorePage() {
    return (
        <div className="-m-8">
            <div className="h-full flex flex-col p-8 space-y-6">
                <SectionHeader
                    title="Store"
                    subtitle="Próximamente..."
                    icon={Grid}
                />

                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <div className="text-center space-y-2">
                        <Grid className="w-12 h-12 text-slate-300 mx-auto" />
                        <p className="text-slate-500 font-medium">Store en construcción</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
