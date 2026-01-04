import { InboxLayout } from "@/modules/core/messaging/components/inbox-layout"

export const metadata = {
    title: "Inbox | CRM",
    description: "Centro de mensajería unificado",
}

export default function CRMInboxPage() {
    return (
        <div className="h-[calc(100vh-10rem)] overflow-hidden">
            <InboxLayout />
        </div>
    )
}
