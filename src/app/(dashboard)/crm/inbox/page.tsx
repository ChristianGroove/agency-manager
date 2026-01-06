import { InboxLayout } from "@/modules/core/messaging/components/inbox-layout"

export const metadata = {
    title: "Inbox | CRM",
    description: "Centro de mensajería unificado",
}

export default function CRMInboxPage() {
    return (
        <div className="h-[calc(100vh-3rem)] w-[calc(100%-3rem)] mx-auto flex flex-col overflow-hidden">
            <InboxLayout />
        </div>
    )
}
