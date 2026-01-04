import { BroadcastDetailView } from "@/modules/core/broadcasts/components/broadcast-detail-view"

export default function BroadcastDetailPage({ params }: { params: { id: string } }) {
    return (
        <BroadcastDetailView id={params.id} />
    )
}
