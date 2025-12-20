import { getBriefings } from "@/lib/actions/briefings"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { BriefingList } from "@/components/modules/briefings/briefing-list"

export default async function BriefingsPage() {
    const briefings = await getBriefings()

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Briefings</h2>
                    <p className="text-muted-foreground mt-1">Gestiona los formularios de requerimientos de tus clientes.</p>
                </div>
                <div className="w-full md:w-auto">
                    <Link href="/briefings/new">
                        <Button className="w-full md:w-auto bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0">
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Briefing
                        </Button>
                    </Link>
                </div>
            </div>

            <BriefingList briefings={briefings || []} />
        </div>
    )
}
