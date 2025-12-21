import { getBriefings } from "@/lib/actions/briefings"
import { BriefingsPageHeader } from "@/components/modules/briefings/briefings-page-header"
import { BriefingList } from "@/components/modules/briefings/briefing-list"

export default async function BriefingsPage() {
    const briefings = await getBriefings()

    return (
        <div className="space-y-8">
            <BriefingsPageHeader />

            <BriefingList briefings={briefings || []} />
        </div>
    )
}

