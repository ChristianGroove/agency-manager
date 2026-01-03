import { InboxLayout } from "@/modules/core/messaging/components/inbox-layout"

export const metadata = {
    title: "Inbox | Ultra-Modern",
    description: "Unified Messaging Center",
}

export default function InboxPage() {
    return (
        <div className="h-[calc(100vh-4rem)] overflow-hidden">
            <InboxLayout />
        </div>
    )
}
