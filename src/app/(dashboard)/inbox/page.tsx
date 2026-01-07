import { InboxLayout } from "@/modules/core/messaging/components/inbox-layout"

export const metadata = {
    title: "Inbox | Ultra-Modern",
    description: "Unified Messaging Center",
}

export default function InboxPage() {
    return (
        <div className="h-screen p-6">
            <div className="h-full">
                <InboxLayout />
            </div>
        </div>
    )
}
