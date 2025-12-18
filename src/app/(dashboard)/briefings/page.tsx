import { getBriefings } from "@/lib/actions/briefings"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { BriefingList } from "@/components/modules/briefings/briefing-list"

export default async function BriefingsPage() {
    const briefings = await getBriefings()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Briefings</h1>
                    <p className="text-muted-foreground">
                        Gestiona los formularios de requerimientos de tus clientes.
                    </p>
                </div>
                <Link href="/briefings/new">
                    <Button className="bg-[#F205E2] hover:bg-[#D104C3] text-white">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Briefing
                    </Button>
                </Link>
            </div>

            <BriefingList briefings={briefings || []} />
        </div>
    )
}
