"use client"

import { useParams } from "next/navigation"
import { ClientDetailView } from "@/modules/core/clients/components/detail/client-detail-view"

export default function ClientPage() {
    const params = useParams()
    const id = params?.id as string

    if (!id) return null

    return <ClientDetailView clientId={id} />
}
