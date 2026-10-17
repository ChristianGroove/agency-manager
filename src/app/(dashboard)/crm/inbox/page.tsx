import { InboxLayout } from "@/modules/features/messaging/components/inbox-layout"
import { getDictionary } from "@/modules/core/i18n/get-dictionary"
import { hasPermission } from "@/modules/core/iam/services/role-service"
import { PERMISSIONS } from "@/modules/core/iam/actions/permissions"
import { redirect } from "next/navigation"

export async function generateMetadata() {
    const dict = await getDictionary()
    return {
        title: dict.crm.meta.inbox_title,
        description: dict.crm.meta.inbox_desc,
    }
}

export default async function CRMInboxPage() {
    if (!await hasPermission(PERMISSIONS.INBOX.VIEW)) {
        redirect("/dashboard?error=unauthorized")
    }

    return (
        <div className="-m-8 h-screen overflow-hidden">
            <div className="p-8 h-full">
                <InboxLayout />
            </div>
        </div>
    )
}
