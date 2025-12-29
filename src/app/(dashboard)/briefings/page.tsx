import { getBriefings } from "@/modules/verticals/agency/briefings/actions"
import { BriefingsPageHeader } from "@/modules/verticals/agency/briefings/briefings-page-header"
import { DynamicBriefingList } from "@/modules/verticals/agency/briefings/dynamic-briefing-list"

export default async function BriefingsPage() {
    const briefings = await getBriefings()

    return (
        <div className="space-y-8">
            <BriefingsPageHeader />

            <DynamicBriefingList briefings={briefings || []} />
        </div>
    )
}

