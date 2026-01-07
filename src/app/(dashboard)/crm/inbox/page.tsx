import { InboxLayout } from "@/modules/core/messaging/components/inbox-layout"

export const metadata = {
    title: "Inbox | CRM",
    description: "Centro de mensajería unificado",
}

export default function CRMInboxPage() {
    return (
        <div className="-m-8 h-screen overflow-hidden">
            <div className="p-8 h-full">
                <InboxLayout />
            </div>
        </div>
    )
}
