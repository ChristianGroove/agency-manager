import { Suspense } from "react"
import { getChannels } from "@/modules/core/channels/actions"
import { ChannelsList } from "@/modules/core/channels/components/channels-list"

export const metadata = {
    title: "Canales de Mensajería | CRM",
    description: "Gestiona tus conexiones de WhatsApp y otros canales",
}

export default async function ChannelsPage() {
    const channels = await getChannels()

    return (
        <Suspense fallback={<div>Loading channels...</div>}>
            <ChannelsList channels={channels} />
        </Suspense>
    )
}
