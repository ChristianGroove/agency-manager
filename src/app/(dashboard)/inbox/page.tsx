import { InboxLayout } from "@/modules/features/messaging/components/inbox-layout"
import { hasPermission } from "@/modules/core/iam/services/role-service"
import { PERMISSIONS } from "@/modules/core/iam/actions/permissions"
import { redirect } from "next/navigation"

export const metadata = {
    title: "Inbox | Ultra-Modern",
    description: "Unified Messaging Center",
}

export default async function InboxPage() {
    if (!await hasPermission(PERMISSIONS.INBOX.VIEW)) {
        redirect("/dashboard?error=unauthorized")
    }

    return (
        <div className="h-screen p-6">
            <div className="h-full">
                <InboxLayout />
            </div>
        </div>
    )
}
