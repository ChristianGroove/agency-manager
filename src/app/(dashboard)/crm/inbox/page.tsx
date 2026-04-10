import { InboxLayout } from "@/modules/features/messaging/components/inbox-layout"
import { getDictionary } from "@/modules/core/i18n/get-dictionary"

export async function generateMetadata() {
    const dict = await getDictionary()
    return {
        title: dict.crm.meta.inbox_title,
        description: dict.crm.meta.inbox_desc,
    }
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
