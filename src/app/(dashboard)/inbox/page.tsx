import { InboxLayout } from "@/modules/core/messaging/components/inbox-layout"
import { GrowthEcosystemShell } from "@/modules/core/layout/growth-ecosystem-shell"

export const metadata = {
    title: "Inbox | Ultra-Modern",
    description: "Unified Messaging Center",
}

export default function InboxPage() {
    return (
        <GrowthEcosystemShell fullHeight noPadding>
            <div className="h-[calc(100vh-8.5rem)] overflow-hidden">
                <InboxLayout />
            </div>
        </GrowthEcosystemShell>
    )
}
