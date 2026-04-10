import { BroadcastDetailView } from "@/modules/features/broadcasts/components/broadcast-detail-view"

export default function BroadcastDetailPage({ params }: { params: { id: string } }) {
    return (
        <BroadcastDetailView id={params.id} />
    )
}
