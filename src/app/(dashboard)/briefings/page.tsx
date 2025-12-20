import { getBriefings } from "@/lib/actions/briefings"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { BriefingList } from "@/components/modules/briefings/briefing-list"

export default async function BriefingsPage() {
    const briefings = await getBriefings()

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Briefings</h1>
                    <p className="text-muted-foreground">
                        Gestiona los formularios de requerimientos de tus clientes.
                    </p>
                </div>
                <Link href="/briefings/new" className="w-full md:w-auto">
                    <Button className="w-full md:w-auto bg-[#F205E2] hover:bg-[#D104C3] text-white">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Briefing
                    </Button>
                </Link>
            </div>

            <BriefingList briefings={briefings || []} />
        </div>
    )
}
